import {$,element,initShell,community,readStore,writeStore,notify,share} from './ui.js';
import {isConfigured} from './config.js';
import {searchSongs,transposeNote,shapeShift,mediaSource} from './music.js';
import {validateSong} from './song-format.js';
import {renderSheet} from './render.js';
import {AutoScroller} from './scroll.js';
import {initEditor} from './editor.js';
initShell('chords');
const baseSongs=new Map(),liveSongs=new Map();let records={},current=null,savedOnly=false,settings={},songs=[];
const storedFavorites=readStore('music-center.saved-songs.v1',[]);
const favorites=new Set(Array.isArray(storedFavorites)?storedFavorites.filter(s=>typeof s==='string'):[]);
let requestedId=new URL(location.href).searchParams.get('song');
let lyricsOnly=new URL(location.href).searchParams.get('view')==='lyrics';
const scroller=new AutoScroller($('#sheet'),active=>{$('#scroll-toggle').textContent=active?'Ⅱ Pause':'▶ Auto-scroll';$('#scroll-toggle').setAttribute('aria-pressed',String(active));});
const clamp=(n,min,max,def)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Math.round(Number(n)))):def;
function rebuildSongs(){songs=[...baseSongs.keys(),...liveSongs.keys()].filter((id,i,a)=>a.indexOf(id)===i).map(id=>liveSongs.get(id)||baseSongs.get(id));renderLibrary();}
function renderLibrary(){
  const list=searchSongs(savedOnly?songs.filter(s=>favorites.has(s.id)):songs,$('#song-search').value,$('#song-sort').value);
  $('#song-list').replaceChildren();$('#song-count').textContent=`${list.length} ${list.length===1?'song':'songs'}`;
  list.forEach((song,index)=>{const button=element('button','song-row');button.type='button';if(song.id===current?.id)button.setAttribute('aria-current','true');button.append(element('span','song-number',String(index+1).padStart(2,'0')));const copy=element('span');copy.append(element('strong','',song.title),element('small','',song.artist),element('span','mini-tag',song.status==='Original exercise'?'Practice · tabs':'Chords · lyrics'));button.append(copy);button.onclick=()=>openSong(song.id,true);$('#song-list').append(button);});
  if(!list.length)$('#song-list').append(element('p','empty-list',savedOnly?'No saved songs match. Use ☆ Save on a song to add it here.':'No matches. Try another song title or artist.'));
}
function syncUrl(){const url=new URL(location.href);url.searchParams.set('song',current.id);if(lyricsOnly)url.searchParams.set('view','lyrics');else url.searchParams.delete('view');history.replaceState({},'',url);}
function openSong(id,collapse=false){
  const song=liveSongs.get(id)||baseSongs.get(id);if(!song)return;
  scroller.stop();current=song;
  const stored=readStore('music-center.song-settings.'+id,{});
  settings={transpose:clamp(stored?.transpose,-12,12,0),capo:clamp(stored?.capo,0,12,song.capo),font:clamp(readStore('music-center.song-font',20),14,36,20),flats:typeof stored?.flats==='boolean'?stored.flats:/b/.test(song.key)};
  $('#song-artist').textContent=song.artist;$('#song-title').textContent=song.title;$('#song-meta').textContent=song.tuning||'Standard tuning';
  $('#arrangement-status').textContent=song.status+' · notes';$('#notes-content').replaceChildren(...song.notes.map(n=>element('p','',n)));
  const source=mediaSource(song.sourceUrl);$('#source-button').hidden=!source;
  document.title=`${song.title} — ${song.artist} · Chords & Tabs`;$('#reader-loading').hidden=true;$('#reader-content').hidden=false;
  if(collapse&&matchMedia('(max-width:620px)').matches){$('#library-panel').classList.add('mobile-collapsed');$('#library-toggle').setAttribute('aria-expanded','false');}
  updateControls(false);syncUrl();renderLibrary();updateFavorite();
}
function updateFavorite(){const saved=favorites.has(current.id);$('#favorite-button').textContent=saved?'★ Saved':'☆ Save';$('#favorite-button').setAttribute('aria-pressed',String(saved));}
function updateControls(preserve=true){
  if(!current)return;scroller.stop();const sheet=$('#sheet');const progress=preserve?sheet.scrollTop/Math.max(1,sheet.scrollHeight-sheet.clientHeight):0;
  $('#transpose-value').textContent=settings.transpose>0?'+'+settings.transpose:String(settings.transpose);$('#capo').value=String(settings.capo);$('#font-value').textContent=String(settings.font);$('#prefer-flats').checked=settings.flats;
  $('#transpose-down').disabled=settings.transpose<=-12;$('#transpose-up').disabled=settings.transpose>=12;$('#font-down').disabled=settings.font<=14;$('#font-up').disabled=settings.font>=36;
  $('#chords-view').classList.toggle('active',!lyricsOnly);$('#chords-view').setAttribute('aria-pressed',String(!lyricsOnly));$('#lyrics-view').classList.toggle('active',lyricsOnly);$('#lyrics-view').setAttribute('aria-pressed',String(lyricsOnly));
  const sounding=transposeNote(current.key,settings.transpose,settings.flats),shapes=transposeNote(current.key,settings.transpose-settings.capo,settings.flats);
  $('#key-summary').textContent=`Sounding key: ${sounding} · Chord-shape key: ${shapes} · ${settings.capo?'Capo '+settings.capo:'No capo'}`;
  renderSheet(sheet,current,{...settings,lyricsOnly});sheet.scrollTop=progress*Math.max(0,sheet.scrollHeight-sheet.clientHeight);
  writeStore('music-center.song-settings.'+current.id,{transpose:settings.transpose,capo:settings.capo,flats:settings.flats});writeStore('music-center.song-font',settings.font);
}
$('#song-search').oninput=renderLibrary;$('#song-sort').onchange=renderLibrary;
$('#all-songs').onclick=()=>{savedOnly=false;$('#all-songs').classList.add('active');$('#saved-songs').classList.remove('active');$('#all-songs').setAttribute('aria-pressed','true');$('#saved-songs').setAttribute('aria-pressed','false');renderLibrary();};
$('#saved-songs').onclick=()=>{savedOnly=true;$('#saved-songs').classList.add('active');$('#all-songs').classList.remove('active');$('#saved-songs').setAttribute('aria-pressed','true');$('#all-songs').setAttribute('aria-pressed','false');renderLibrary();};
$('#favorite-button').onclick=()=>{if(!current)return;favorites.has(current.id)?favorites.delete(current.id):favorites.add(current.id);writeStore('music-center.saved-songs.v1',[...favorites]);updateFavorite();renderLibrary();};
$('#library-toggle').onclick=()=>{const hidden=$('#library-panel').classList.toggle('mobile-collapsed');$('#library-toggle').setAttribute('aria-expanded',String(!hidden));};
for(const [id,key,delta,min,max] of [['transpose-down','transpose',-1,-12,12],['transpose-up','transpose',1,-12,12],['font-down','font',-2,14,36],['font-up','font',2,14,36]])$('#'+id).onclick=()=>{settings[key]=Math.max(min,Math.min(max,settings[key]+delta));updateControls();};
$('#capo').onchange=()=>{settings.capo=Number($('#capo').value);updateControls();};$('#prefer-flats').onchange=()=>{settings.flats=$('#prefer-flats').checked;updateControls();};
$('#reset-controls').onclick=()=>{settings={transpose:0,capo:current.capo,font:20,flats:/b/.test(current.key)};updateControls();};
$('#chords-view').onclick=()=>{lyricsOnly=false;updateControls();syncUrl();};$('#lyrics-view').onclick=()=>{lyricsOnly=true;updateControls();syncUrl();};
$('#scroll-toggle').onclick=()=>{if(scroller.active)scroller.stop();else if(!scroller.start())notify('This song fits on screen. Increase text size if you’d like a closer view.');};
$('#scroll-speed').oninput=()=>{scroller.speed=Number($('#scroll-speed').value);$('#speed-value').textContent=scroller.speed+' px/s';writeStore('music-center.scroll-speed',scroller.speed);};
$('#scroll-speed').value=String(clamp(readStore('music-center.scroll-speed',22),5,90,22));$('#scroll-speed').oninput();
$('#back-to-top').onclick=()=>{scroller.stop();$('#sheet').scrollTop=0;};
$('#share-song').onclick=()=>share(`${current.title} — ${current.artist}`,location.href);$('#print-song').onclick=()=>{scroller.stop();window.print();};
$('#source-button').onclick=()=>{const source=mediaSource(current.sourceUrl);if(!source)return;scroller.stop();$('#source-title').textContent=current.title+' · '+current.artist;$('#source-link').href=source.url;$('#load-video').hidden=!source.embed;$('#video-area').replaceChildren();$('#video-area').classList.toggle('instagram',source.kind==='instagram');$('#source-dialog').showModal();};
$('#load-video').onclick=()=>{const source=mediaSource(current.sourceUrl);if(!source?.embed)return;const iframe=document.createElement('iframe');iframe.src=source.embed;iframe.title='Original song performance';iframe.allow='fullscreen; encrypted-media; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';$('#video-area').replaceChildren(iframe);$('#load-video').hidden=true;};
$('#source-dialog').addEventListener('close',()=>$('#video-area').replaceChildren());
initEditor({getCurrent:()=>current,getRecord:id=>records[id],hasSong:id=>baseSongs.has(id)||liveSongs.has(id),onPublish:(song,record)=>{records[song.id]=record;liveSongs.set(song.id,song);rebuildSongs();openSong(song.id,true);}});
async function boot(){
  try{
    const response=await fetch('data/catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('The song catalog could not be loaded.');const catalog=await response.json();
    if(!Array.isArray(catalog))throw new Error('Invalid song catalog.');
    const entries=await Promise.all(catalog.map(async entry=>{if(!/^songs\/[a-z0-9-]+\.json$/.test(entry.file))throw new Error('Invalid song path.');const res=await fetch('data/'+entry.file,{cache:'no-cache'});if(!res.ok)throw new Error('A song could not be loaded.');const song=validateSong(await res.json());if(song.id!==entry.id)throw new Error('Song catalog IDs do not match.');return song;}));
    entries.forEach(song=>baseSongs.set(song.id,song));rebuildSongs();if(songs.length)openSong(baseSongs.has(requestedId)?requestedId:songs[0].id);
    if(isConfigured()){
      $('#live-library-status').hidden=false;$('#live-library-status').textContent='Connecting live song updates…';
      await community.init();community.watchSongEdits(edits=>{
        records=edits;liveSongs.clear();let invalid=false;
        for(const [id,record] of Object.entries(edits)){try{const song=validateSong(JSON.parse(record.content));if(song.id!==id)throw new Error();liveSongs.set(id,song);}catch{invalid=true;}}
        rebuildSongs();const desired=requestedId&&liveSongs.has(requestedId)?requestedId:current?.id;requestedId=null;if(desired)openSong(desired);
        $('#live-library-status').textContent=invalid?'One live edit could not be read. Its repository version is shown.':'Live song updates connected.';
      },()=>{$('#live-library-status').textContent='Live updates unavailable. Showing the available song files.';});
    }
  }catch(error){
    if(current){$('#live-library-status').hidden=false;$('#live-library-status').textContent='Live updates unavailable. Showing the available song files.';return;}
    $('#reader-loading').textContent=error.message+' Please refresh to try again.';$('#song-list').append(element('p','empty-list','The library could not be opened.'));
  }
}
boot();
