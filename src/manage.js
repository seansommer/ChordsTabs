import {$,element,initShell,community,notify} from './ui.js';
import {friendlyError} from './community.js';
import {searchSongs} from './music.js';
import {songHref} from './catalog-view.js';
import {Songbook} from './songbook.js';
import {initEditor} from './editor.js';
import {validateSong} from './song-format.js';

initShell('chords');
const book=new Songbook(community);let tab='published',deleting=null;
const editor=initEditor({getCurrent:()=>null,getRecord:id=>book.records[id],hasSong:id=>book.has(id),onPublish:(song,record)=>{book.accept(song,record);render();}});
function render(){
  const master=Boolean(community.profile?.isMaster);
  $('#manager-locked').hidden=master;$('#manager-content').hidden=!master;
  $('#manager-lock-copy').textContent=community.profile?'Song management is available to the master account.':'Sign in with your master account to manage the songbook.';
  if(!master){$('#manager-list').replaceChildren();$('#delete-dialog').close();return;}
  const ready=book.connected;$('#manager-add').disabled=!ready;
  for(const button of document.querySelectorAll('[data-manager-tab]')){const active=button.dataset.managerTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  const songs=searchSongs(tab==='deleted'?[...book.deleted.values()]:book.songs,$('#manager-search').value,'artist');
  $('#manager-count').textContent=book.liveReady?`${songs.length} ${tab==='deleted'?'deleted':'published'} ${songs.length===1?'song':'songs'}`:'Loading the live songbook…';
  const list=$('#manager-list');list.replaceChildren();
  if(!book.liveReady)return;
  for(const song of songs){
    const row=element('article','manager-song'),copy=element('div','manager-song-copy');copy.append(element('strong','',song.title),element('span','',song.artist));
    const actions=element('div','manager-song-actions');
    if(tab==='deleted'){
      const restore=element('button','button secondary compact','Restore');restore.type='button';restore.disabled=!ready;
      restore.onclick=async()=>{
        restore.disabled=true;
        try{
          const record=book.records[song.id];if(!record)throw new Error('Refresh the songbook and try again.');
          const restored=validateSong(JSON.parse(record.previousContent));if(restored.id!==song.id)throw new Error('The saved song ID does not match.');
          const updated=await community.publishSong(restored,record.revision,record.previousContent);book.accept(restored,updated);notify('Song restored to the songbook.');
        }catch(error){notify(friendlyError(error));restore.disabled=!book.connected;}
      };actions.append(restore);
    }else{
      const open=element('a','text-button','Open');open.href=songHref(song.id);
      const edit=element('button','button secondary compact','Edit');edit.type='button';edit.disabled=!ready;edit.onclick=()=>editor.edit(song);
      const remove=element('button','text-button danger-text','Delete');remove.type='button';remove.disabled=!ready;
      remove.onclick=()=>{deleting={song:structuredClone(song),revision:book.records[song.id]?.revision||0};$('#delete-song-name').textContent=song.title+' — '+song.artist;$('#delete-error').textContent='';$('#delete-dialog').showModal();};
      actions.append(open,edit,remove);
    }
    row.append(copy,actions);list.append(row);
  }
  if(!songs.length)list.append(element('p','empty-list',tab==='deleted'?'No deleted songs match your search.':'No songs match. Add a song or try another search.'));
}
$('#manager-signin').onclick=()=>$('#profile-button').click();
$('#manager-add').onclick=()=>editor.add();
$('#manager-search').oninput=render;
for(const button of document.querySelectorAll('[data-manager-tab]'))button.onclick=()=>{tab=button.dataset.managerTab;render();};
$('#confirm-delete').onclick=async()=>{
  if(!deleting)return;const pending=deleting;$('#confirm-delete').disabled=true;$('#delete-error').textContent='';
  try{
    if(!navigator.onLine)throw new Error('Reconnect before deleting a song.');
    const record=await community.deleteSong(pending.song,pending.revision);book.accept(pending.song,record);$('#delete-dialog').close();notify('Song deleted. You can restore it from Deleted songs.');
  }catch(error){$('#delete-error').textContent=friendlyError(error);}finally{$('#confirm-delete').disabled=false;}
};
$('#delete-dialog').addEventListener('close',()=>{deleting=null;});
community.subscribe(render);
book.start(render,message=>$('#manager-status').textContent=message).catch(error=>{$('#manager-status').textContent=error.message+' Please refresh to try again.';});
