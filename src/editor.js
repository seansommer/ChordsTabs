import {$,community,notify} from './ui.js';
import {friendlyError} from './community.js';
import {validateSong,serializeChart,parseChart} from './song-format.js';
import {renderSheet} from './render.js';
export function initEditor({getCurrent,getRecord,hasSong,onPublish}){
  let original=null,expectedRevision=0,initialForm='',previousContent='',creating=false;
  const dialog=$('#editor-dialog');
  const snapshot=()=>['id','title','artist','key','capo','status','source','chart','notes','tabs'].map(k=>$('#edit-'+k).value).join('\u0000');
  function fill(song){
    for(const key of ['id','title','artist','key','capo','status'])$('#edit-'+key).value=song[key];
    $('#edit-source').value=song.sourceUrl||'';$('#edit-chart').value=serializeChart(song.sections);
    $('#edit-notes').value=(song.notes||[]).join('\n');$('#edit-tabs').value=JSON.stringify(song.sections.filter(s=>s.tab),null,2);$('#editor-preview').hidden=true;$('#editor-error').textContent='';
  }
  function open(isNew){
    if(!community.profile?.isMaster)return;
    if(!isNew&&!getCurrent()){notify('Open a song first.');return;}
    creating=isNew;
    original=isNew?{schemaVersion:1,id:'',title:'',artist:'',key:'C',capo:0,tuning:'Standard · E A D G B E',sourceUrl:'',status:'Working arrangement',tags:['chords','lyrics'],notes:[],sections:[{name:'Verse 1',lines:[{lyrics:'',chords:[]}]}]}:structuredClone(getCurrent());
    const record=isNew?null:getRecord(original.id);expectedRevision=record?.revision||0;previousContent=JSON.stringify(original);
    fill(original);$('#edit-id').readOnly=!isNew;$('#restore-previous').hidden=!record?.previousContent;initialForm=snapshot();dialog.showModal();
  }
  function draft(){
    const tabs=JSON.parse($('#edit-tabs').value||'[]');if(!Array.isArray(tabs)||tabs.some(s=>!s.tab))throw new Error('Tab JSON must be an array of tab sections.');
    const sections=[...parseChart($('#edit-chart').value),...tabs];
    const song={...original,id:$('#edit-id').value.trim(),title:$('#edit-title').value.trim(),artist:$('#edit-artist').value.trim(),key:$('#edit-key').value,capo:Number($('#edit-capo').value),status:$('#edit-status').value,sourceUrl:$('#edit-source').value.trim(),notes:$('#edit-notes').value.split('\n').map(s=>s.trim()).filter(Boolean),sections};
    if(creating&&hasSong(song.id))throw new Error('That song ID already exists. Choose another ID, or open the existing song and use Edit song.');
    song.tags=[...(sections.some(s=>s.tab)?['tabs']:[]),...(sections.some(s=>s.lines?.some(l=>l.chords.length))?['chords']:[]),...(sections.some(s=>s.lines?.some(l=>l.lyrics.trim()))?['lyrics']:[])];
    return validateSong(song);
  }
  $('#edit-song').onclick=()=>open(false);$('#new-song').onclick=()=>open(true);
  function close(){if(snapshot()===initialForm||confirm('Discard your unpublished changes?'))dialog.close();}
  $('#close-editor').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  $('#preview-edit').onclick=()=>{try{const song=draft();renderSheet($('#editor-preview'),song,{capo:song.capo,font:18});$('#editor-preview').hidden=false;$('#editor-error').textContent='';}catch(e){$('#editor-error').textContent=e.message;}};
  $('#export-edit').onclick=()=>{try{const song=draft();const url=URL.createObjectURL(new Blob([JSON.stringify(song,null,2)+'\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=song.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('#editor-error').textContent=e.message;}};
  $('#restore-previous').onclick=()=>{try{const record=getRecord(original.id);if(record?.previousContent){fill(validateSong(JSON.parse(record.previousContent)));notify('Previous version loaded into the editor. Publish when you are ready.');}}catch(e){$('#editor-error').textContent=e.message;}};
  $('#editor-form').onsubmit=async event=>{
    event.preventDefault();$('#publish-song').disabled=true;$('#editor-error').textContent='';
    try{
      if(!navigator.onLine)throw new Error('You are offline. Reconnect before publishing; your draft is still here.');
      const song=draft();const record=await community.publishSong(song,expectedRevision,previousContent);await onPublish(song,record);initialForm=snapshot();dialog.close();notify('Song published to the live songbook.');
    }catch(e){$('#editor-error').textContent=friendlyError(e);}finally{$('#publish-song').disabled=false;}
  };
  community.subscribe(profile=>{const master=Boolean(profile?.isMaster);$('#edit-song').hidden=!master;$('#new-song').hidden=!master;if(!master&&dialog.open){dialog.close();notify('Sign in with your master account to continue editing.');}});
}
