import {$,element,initShell,community,readStore,writeStore} from './ui.js';
import {searchSongs,normalizeSearch} from './music.js';
import {artistGroups,songHref} from './catalog-view.js';
import {Songbook} from './songbook.js';

initShell('chords');
const book=new Songbook(community);let tab='artists',artist='';
const layoutKey='music-center.browse-layout.v1',readLayout=()=>readStore(layoutKey,'cards')==='list'?'list':'cards';
let layout=readLayout();
const saved=readStore('music-center.saved-songs.v1',[]),favorites=new Set(Array.isArray(saved)?saved:[]);
const last=readStore('music-center.last-song',null);if(typeof last==='string')$('#return-song').href=songHref(last);
function refreshSaved(){
  layout=readLayout();
  const saved=readStore('music-center.saved-songs.v1',[]);favorites.clear();
  if(Array.isArray(saved))for(const id of saved)if(typeof id==='string')favorites.add(id);
  const last=readStore('music-center.last-song',null);if(typeof last==='string')$('#return-song').href=songHref(last);
  render();
}
function readUrl(){const params=new URL(location.href).searchParams;tab=['artists','songs','saved'].includes(params.get('tab'))?params.get('tab'):'artists';artist=tab==='artists'?(params.get('artist')||''):'';$('#browse-search').value=params.get('q')||'';}
function syncUrl(push=false){
  const url=new URL(location.href);url.search='';url.searchParams.set('tab',tab);
  if(artist)url.searchParams.set('artist',artist);if($('#browse-search').value.trim())url.searchParams.set('q',$('#browse-search').value.trim());
  if(push)history.pushState({},'',url);else history.replaceState({},'',url);
}
function songRow(song){
  const row=element('a','browse-song');row.href=songHref(song.id);
  const copy=element('span');copy.append(element('strong','',song.title),element('small','',song.artist));
  row.append(copy,element('span','browse-song-type',song.status==='Original exercise'?'Tabs':'Chords & lyrics'),element('span','browse-arrow','↗'));
  return row;
}
function applyLayout(){
  const list=$('#browse-list');list.classList.toggle('compact-list',layout==='list');list.classList.toggle('artist-grid',layout==='cards'&&tab==='artists'&&!artist);
  for(const button of document.querySelectorAll('[data-browse-layout]')){const active=button.dataset.browseLayout===layout;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
}
function render(){
  const list=$('#browse-list');list.replaceChildren();applyLayout();
  for(const button of document.querySelectorAll('[data-browse-tab]')){const active=button.dataset.browseTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  $('#all-artists').hidden=!artist;const query=$('#browse-search').value;
  if(tab==='artists'&&!artist){
    const groups=artistGroups(book.songs,query);$('#browse-title').textContent='Artists';$('#browse-count').textContent=`${groups.length} ${groups.length===1?'artist':'artists'}`;
    for(const group of groups){
      const button=element('button','artist-card');button.type='button';
      button.append(element('span','artist-initial',Array.from(group.name)[0]),element('strong','',group.name),element('small','',`${group.songs.length} ${group.songs.length===1?'song':'songs'}`));
      button.onclick=()=>{artist=group.name;syncUrl(true);render();};list.append(button);
    }
    if(!groups.length)list.append(element('p','empty-list','No artists match your search.'));
  }else{
    let songs=book.songs;if(tab==='saved')songs=songs.filter(song=>favorites.has(song.id));if(artist)songs=songs.filter(song=>normalizeSearch(song.artist)===normalizeSearch(artist));
    songs=searchSongs(songs,query,'title');$('#browse-title').textContent=artist||(tab==='saved'?'Saved songs':'All songs');$('#browse-count').textContent=`${songs.length} ${songs.length===1?'song':'songs'}`;
    list.append(...songs.map(songRow));if(!songs.length)list.append(element('p','empty-list',tab==='saved'?'No saved songs match. Tap ☆ Save on a song to keep it here.':'No songs match your search.'));
  }
}
for(const button of document.querySelectorAll('[data-browse-tab]'))button.onclick=()=>{tab=button.dataset.browseTab;artist='';syncUrl(true);render();};
for(const button of document.querySelectorAll('[data-browse-layout]'))button.onclick=()=>{layout=button.dataset.browseLayout;writeStore(layoutKey,layout);applyLayout();};
$('#all-artists').onclick=()=>{artist='';syncUrl(true);render();};
$('#browse-search').oninput=()=>{syncUrl();render();};
window.addEventListener('popstate',()=>{readUrl();render();});
window.addEventListener('pageshow',event=>{if(event.persisted)refreshSaved();});
window.addEventListener('storage',event=>{if(event.key===null||['music-center.saved-songs.v1','music-center.last-song',layoutKey].includes(event.key))refreshSaved();});
readUrl();applyLayout();book.start(render,message=>$('#browse-status').textContent=message).catch(error=>{$('#browse-count').textContent='';$('#browse-status').textContent=error.message+' Please refresh to try again.';});
