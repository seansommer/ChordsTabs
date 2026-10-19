import {$,element,initShell,community,readStore,writeStore,notify,share} from './ui.js';
import {searchSongs,transposeNote,mediaSource} from './music.js';
import {quickMatches} from './catalog-view.js';
import {Songbook} from './songbook.js';
import {renderSheet} from './render.js';
import {AutoScroller} from './scroll.js';
import {initScrollControls} from './scroll-controls.js';
import {SongScrollSpeeds} from './practice-preferences.js';
import {initScreenAwake} from './screen-awake.js';
import {initChordDiagrams} from './chord-diagram.js';
import {initEditor} from './editor.js';
import {initPlayback} from './playback.js';

initShell('chords');
const book=new Songbook(community),page=document.scrollingElement,sheet=$('#sheet');
let current=null,settings={},currentSignature='',pendingId=new URL(location.href).searchParams.get('song'),playback=null,scrollControls=null;
let lyricsOnly=new URL(location.href).searchParams.get('view')==='lyrics';
const storedFavorites=readStore('music-center.saved-songs.v1',[]);
const favorites=new Set(Array.isArray(storedFavorites)?storedFavorites.filter(s=>typeof s==='string'):[]);
const clamp=(n,min,max,def)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Math.round(Number(n)))):def;
const sheetTop=()=>sheet.getBoundingClientRect().top+page.scrollTop-scroller.visualOffset;
function scrollStart(){
  const firstLine=sheet.querySelector('.song-line,.tab-block')||sheet,viewport=globalThis.visualViewport;
  // Leave half the visible screen above the first line when starting or repeating.
  return Math.max(0,firstLine.getBoundingClientRect().top+page.scrollTop-scroller.visualOffset-(viewport?.offsetTop||0)-(viewport?.height||page.clientHeight)*.5);
}
const songSpeeds=new SongScrollSpeeds(readStore,writeStore);
const scroller=new AutoScroller(page,active=>scrollControls?.setActive(active),()=>({start:scrollStart(),end:sheetTop()+sheet.offsetHeight-page.clientHeight+18+(playback?.videoHeight()||0)+(scrollControls?.height()||0)}),sheet);
playback=initPlayback({scroller,beforeScroll:()=>{$('#practice-settings').open=false;$('#playback-panel').open=false;}});
scrollControls=initScrollControls({scroller,initialSpeed:songSpeeds.defaultSpeed,saveSpeed:speed=>songSpeeds.save(current?.id,speed),beforeStart:()=>{$('#practice-settings').open=false;},onManualPause:()=>playback.suspendScroll(),onManualStart:()=>playback.enableScroll(),onCannotStart:()=>notify('This song fits on screen. Increase text size for a closer view.')});
initScreenAwake({read:readStore,write:writeStore});
const chordDiagrams=initChordDiagrams({getSettings:()=>settings,getVideoHeight:()=>playback.videoHeight()});

function hideSearch(){$('#search-results').hidden=true;$('#song-search').setAttribute('aria-expanded','false');}
function renderSearch(){
  const query=$('#song-search').value,results=quickMatches(book.songs,query),list=$('#search-matches');
  list.replaceChildren();
  if(!query.trim()){hideSearch();return;}
  const total=searchSongs(book.songs,query).length;
  $('#search-status').textContent=total?`${Math.min(total,3)} of ${total} matching ${total===1?'song':'songs'}`:'No matches. Try another title or artist.';
  for(const song of results){
    const li=element('li'),button=element('button','search-match');button.type='button';
    button.append(element('strong','',song.title),element('span','',song.artist));
    button.onclick=()=>{pendingId=null;openSong(song.id,{navigate:true});$('#song-search').value='';hideSearch();$('#song-search').blur();};
    li.append(button);list.append(li);
  }
  $('#search-all').href='browse.html?'+new URLSearchParams({tab:'songs',q:query});
  $('#search-results').hidden=false;$('#song-search').setAttribute('aria-expanded','true');
}
$('#song-search').oninput=renderSearch;
$('#song-search').onfocus=renderSearch;
$('#quick-search').addEventListener('keydown',event=>{
  if(event.key==='Escape'){$('#song-search').focus();hideSearch();return;}
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;
  const matches=[...$('#search-matches').querySelectorAll('button')];if(!matches.length)return;
  event.preventDefault();const index=matches.indexOf(document.activeElement),direction=event.key==='ArrowDown'?1:-1;
  matches[index<0?(direction>0?0:matches.length-1):(index+direction+matches.length)%matches.length].focus();
});
document.addEventListener('click',event=>{if(!$('#quick-search').contains(event.target))hideSearch();});
$('#quick-search').addEventListener('focusout',()=>setTimeout(()=>{if(!$('#quick-search').contains(document.activeElement))hideSearch();},0));

function syncUrl(push=false){
  if(!current)return;const url=new URL(location.href);url.searchParams.set('song',current.id);
  if(lyricsOnly)url.searchParams.set('view','lyrics');else url.searchParams.delete('view');
  if(push&&url.href!==location.href)history.pushState({},'',url);else history.replaceState({},'',url);
}
function updateFavorite(){const saved=favorites.has(current.id);$('#favorite-button').textContent=saved?'★ Saved':'☆ Save';$('#favorite-button').setAttribute('aria-pressed',String(saved));}
function openSong(id,{navigate=false,preserve=false}={}){
  const song=book.get(id);if(!song)return;
  chordDiagrams.close();scrollControls.reset();current=song;currentSignature=JSON.stringify(song);scrollControls.loadSpeed(songSpeeds.forSong(id));
  playback.setSong(song);
  const stored=readStore('music-center.song-settings.'+id,{});
  settings={transpose:clamp(stored?.transpose,-12,12,0),capo:clamp(stored?.capo,0,12,song.capo),font:clamp(readStore('music-center.song-font',20),14,36,20),flats:typeof stored?.flats==='boolean'?stored.flats:/b/.test(song.key)};
  $('#song-artist').textContent=song.artist;$('#song-title').textContent=song.title;$('#song-meta').textContent=song.tuning||'Standard tuning';
  $('#arrangement-status').textContent=song.status+' · notes';$('#notes-content').replaceChildren(...song.notes.map(n=>element('p','',n)));
  const source=mediaSource(song.sourceUrl);$('#song-source').hidden=!source;
  if(source)$('#original-song-link').href=source.url;$('#source-button').hidden=!source?.embed;
  document.title=`${song.title} — ${song.artist} · Chords & Tabs`;$('#reader-loading').hidden=true;$('#reader-content').hidden=false;
  writeStore('music-center.last-song',song.id);updateControls(preserve);updateFavorite();syncUrl(navigate);
  if(navigate){$('#practice-settings').open=false;page.scrollTop=0;}
}
function updateControls(preserve=true){
  if(!current)return;const oldScroll=page.scrollTop,oldTop=sheetTop(),inside=preserve&&oldScroll>oldTop;
  const progress=inside?(oldScroll-oldTop)/Math.max(1,sheet.offsetHeight):0;
  $('#transpose-value').textContent=settings.transpose>0?'+'+settings.transpose:String(settings.transpose);$('#capo').value=String(settings.capo);$('#font-value').textContent=String(settings.font);$('#prefer-flats').checked=settings.flats;
  $('#transpose-down').disabled=settings.transpose<=-12;$('#transpose-up').disabled=settings.transpose>=12;$('#font-down').disabled=settings.font<=14;$('#font-up').disabled=settings.font>=36;
  $('#chords-view').classList.toggle('active',!lyricsOnly);$('#chords-view').setAttribute('aria-pressed',String(!lyricsOnly));$('#lyrics-view').classList.toggle('active',lyricsOnly);$('#lyrics-view').setAttribute('aria-pressed',String(lyricsOnly));
  $('#chord-tap-hint').hidden=lyricsOnly||!current.sections.some(section=>section.lines?.some(line=>line.chords.length));
  const sounding=transposeNote(current.key,settings.transpose,settings.flats),shapes=transposeNote(current.key,settings.transpose-settings.capo,settings.flats);
  $('#key-summary').textContent=`Sounding key: ${sounding} · Chord-shape key: ${shapes} · ${settings.capo?'Capo '+settings.capo:'No capo'}`;
  $('#settings-summary').textContent=`${lyricsOnly?'Lyrics':sounding} · ${settings.capo?'Capo '+settings.capo:'No capo'} · ${settings.font}px`;
  chordDiagrams.close();renderSheet(sheet,current,{...settings,lyricsOnly,onChord:(chord,trigger)=>chordDiagrams.open(chord,trigger)});
  if(preserve)page.scrollTop=inside?sheetTop()+progress*sheet.offsetHeight:oldScroll;
  writeStore('music-center.song-settings.'+current.id,{transpose:settings.transpose,capo:settings.capo,flats:settings.flats});writeStore('music-center.song-font',settings.font);
}
$('#favorite-button').onclick=()=>{if(!current)return;favorites.has(current.id)?favorites.delete(current.id):favorites.add(current.id);writeStore('music-center.saved-songs.v1',[...favorites]);updateFavorite();};
for(const [id,key,delta,min,max] of [['transpose-down','transpose',-1,-12,12],['transpose-up','transpose',1,-12,12],['font-down','font',-2,14,36],['font-up','font',2,14,36]])$('#'+id).onclick=()=>{settings[key]=Math.max(min,Math.min(max,settings[key]+delta));updateControls();};
$('#capo').onchange=()=>{settings.capo=Number($('#capo').value);updateControls();};$('#prefer-flats').onchange=()=>{settings.flats=$('#prefer-flats').checked;updateControls();};
$('#reset-controls').onclick=()=>{settings={transpose:0,capo:current.capo,font:20,flats:/b/.test(current.key)};updateControls();};
$('#chords-view').onclick=()=>{lyricsOnly=false;updateControls();syncUrl();};$('#lyrics-view').onclick=()=>{lyricsOnly=true;updateControls();syncUrl();};
$('#back-to-top').onclick=()=>{scroller.stop();page.scrollTop=0;};
$('#share-song').onclick=()=>share(`${current.title} — ${current.artist}`,location.href);$('#print-song').onclick=()=>{scroller.stop();window.print();};
$('#source-button').onclick=()=>{const source=mediaSource(current.sourceUrl);if(!source)return;playback.stop();scroller.stop();$('#source-title').textContent=current.title+' · '+current.artist;$('#source-link').href=source.url;$('#load-video').hidden=!source.embed;$('#video-area').replaceChildren();$('#video-area').classList.toggle('instagram',source.kind==='instagram');$('#source-dialog').showModal();};
$('#load-video').onclick=()=>{const source=mediaSource(current.sourceUrl);if(!source?.embed)return;const iframe=document.createElement('iframe');iframe.src=source.embed;iframe.title='Original song performance';iframe.allow='fullscreen; encrypted-media; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';$('#video-area').replaceChildren(iframe);$('#load-video').hidden=true;};
$('#source-dialog').addEventListener('close',()=>$('#video-area').replaceChildren());
initEditor({getCurrent:()=>current,getRecord:id=>book.records[id],hasSong:id=>book.has(id),onPublish:(song,record)=>{book.accept(song,record);openSong(song.id,{navigate:true});}});

function refreshSongs(){
  if(current&&!book.get(current.id)){chordDiagrams.close();playback.setSong(null);scrollControls.reset();current=null;currentSignature='';$('#reader-content').hidden=true;$('#reader-loading').hidden=false;$('#reader-loading').textContent='This song has been deleted. Browse the songbook or add a song from your master menu.';notify('This song has been removed from the songbook.');}
  if(book.liveReady&&!book.songs.length){$('#reader-content').hidden=true;$('#reader-loading').hidden=false;$('#reader-loading').textContent='Your songbook is empty. Add or restore songs from your account’s Master song manager.';hideSearch();return;}
  if(!$('#search-results').hidden)renderSearch();
  if(pendingId&&book.get(pendingId)){const id=pendingId;pendingId=null;openSong(id);return;}
  if(!current&&(!pendingId||book.liveReady)){if(pendingId){notify('That song was not found. Choose another from the songbook.');pendingId=null;}if(book.songs.length)openSong(book.songs[0].id);}
  else if(current){const latest=book.get(current.id);if(latest&&JSON.stringify(latest)!==currentSignature)openSong(current.id,{preserve:true});}
}
window.addEventListener('popstate',()=>{scroller.stop();const url=new URL(location.href);lyricsOnly=url.searchParams.get('view')==='lyrics';const id=url.searchParams.get('song');if(book.get(id))openSong(id,{preserve:false});page.scrollTop=0;});
book.start(refreshSongs,message=>{$('#live-library-status').hidden=false;$('#live-library-status').textContent=message;}).catch(error=>{$('#reader-loading').textContent=error.message+' Please refresh to try again.';});
