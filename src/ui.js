import {Community,friendlyError} from './community.js';
import {isConfigured,HUB_URL,CHORDS_URL} from './config.js';
export const community=new Community();
export const $=(selector,root=document)=>root.querySelector(selector);
export function element(tag,classes,text){const e=document.createElement(tag);if(classes)e.className=classes;if(text!==undefined)e.textContent=text;return e;}
export function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export function notify(message){const box=$('#toast');box.textContent=message;box.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>box.hidden=true,5000);}
export async function share(title,url=location.href){try{if(navigator.share)await navigator.share({title,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);notify('Link copied.');}else{prompt('Copy this link:',url);}}catch(e){if(e.name!=='AbortError')notify('Sharing is unavailable. Copy the address from your browser.');}}
export function initShell(current){
  $('#hub-link').href=HUB_URL;$('#chords-link').href=CHORDS_URL;
  document.querySelector(`[data-nav="${current}"]`)?.setAttribute('aria-current','page');
  const themeButton=$('#theme-button');
  function themeLabel(){themeButton.setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'Switch to light mode':'Switch to dark mode');themeButton.textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';}
  themeLabel();themeButton.onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('music-center.theme.v1',t);}catch{}themeLabel();};
  $('#share-button').onclick=()=>share(document.title);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(d.id==='editor-dialog')return;if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  const login=$('#login-dialog'),form=$('#login-form');let create=false;
  function setMode(value){create=value;$('#login-title').textContent=create?'Make yourself at home.':'Welcome back.';$('#create-fields').hidden=!create;$('#confirm-phrase').required=create;$('#auth-submit').textContent=create?'Create account':'Sign in';$('#auth-switch').textContent=create?'Already have an account? Sign in':'New here? Create an account';$('#secret-phrase').type='password';$('#show-phrase').textContent='Show';$('#secret-phrase').autocomplete=create?'new-password':'current-password';$('#auth-error').textContent='';}
  $('#auth-switch').onclick=()=>setMode(!create);
  login.addEventListener('close',()=>{form.reset();$('#auth-error').textContent='';});
  $('#profile-button').onclick=()=>{if(community.profile)$('#profile-dialog').showModal();else{setMode(false);login.showModal();}};
  $('#hero-signin')?.addEventListener('click',()=>$('#profile-button').click());
  $('#show-phrase').onclick=()=>{const input=$('#secret-phrase');input.type=input.type==='password'?'text':'password';$('#show-phrase').textContent=input.type==='password'?'Show':'Hide';};
  if(!isConfigured()){$('#auth-setup').hidden=false;$('#auth-submit').disabled=true;}
  form.onsubmit=async e=>{e.preventDefault();const button=$('#auth-submit');button.disabled=true;$('#auth-error').textContent='';let phrase=$('#secret-phrase').value;
    try{if(create&&phrase!==$('#confirm-phrase').value)throw new Error('Your phrases do not match.');await community[create?'signUp':'signIn']($('#nickname').value,phrase);login.close();notify(create?'Your musician card is ready.':'Welcome back.');}
    catch(err){$('#auth-error').textContent=friendlyError(err);}
    finally{phrase='';$('#secret-phrase').value='';$('#confirm-phrase').value='';button.disabled=!isConfigured();}
  };
  $('#signout-button').onclick=async()=>{try{await community.signOut();$('#profile-dialog').close();notify('Signed out of Music Center.');}catch(e){notify(friendlyError(e));}};
  $('#copy-message-id').onclick=async()=>{try{await navigator.clipboard.writeText(community.profile.messageId);notify('Message ID copied.');}catch{notify('Select and copy the Message ID on your card.');}};
  let stopMessages=null;
  community.subscribe(profile=>{
    $('#profile-label').textContent=profile?.displayName||'Sign in';$('#account-state')?.replaceChildren(document.createTextNode(profile?`Welcome, ${profile.displayName}`:'A little space for your music.'));
    stopMessages?.();stopMessages=null;$('#message-list').replaceChildren();
    if(profile){$('#card-name').textContent=profile.displayName;$('#card-initial').textContent=Array.from(profile.displayName)[0].toUpperCase();$('#card-id').textContent=profile.messageId;$('#card-uid').textContent=profile.uid;$('#card-role').textContent=profile.isMaster?'Master · Music Center':'At home in the Music Center';}
    else{$('#profile-dialog').close();$('#messages-dialog').close();$('#message-form').reset();}
  });
  $('#messages-button').onclick=async()=>{
    if(!community.profile){setMode(false);login.showModal();return;}
    $('#messages-dialog').showModal();$('#message-status').textContent='Loading your messages…';
    stopMessages?.();stopMessages=community.watchMessages(messages=>{
      $('#message-list').replaceChildren();$('#message-status').textContent=messages.length?'Latest 100 messages':'Your inbox is quiet. Start a conversation below.';
      for(const message of messages){const incoming=message.fromUid!==community.profile?.uid;const card=element('article','message');card.append(element('strong','',incoming?message.fromName:`To ${message.toName}`),element('p','message-body',message.body),element('small','muted',new Date(message.createdAt).toLocaleString()));
        const actions=element('div','message-actions');if(incoming){const reply=element('button','text-button','Reply');reply.onclick=()=>{$('#recipient-name').value=message.fromName;$('#recipient-id').value=message.fromMessageId;$('#message-body').focus();};actions.append(reply);}
        const remove=element('button','text-button','Remove from my inbox');remove.onclick=async()=>{try{await community.deleteMessage(message.id);}catch(e){notify(friendlyError(e));}};actions.append(remove);card.append(actions);$('#message-list').append(card);
      }
    },e=>$('#message-status').textContent=friendlyError(e));
  };
  $('#messages-dialog').addEventListener('close',()=>{stopMessages?.();stopMessages=null;});
  $('#message-form').onsubmit=async e=>{e.preventDefault();const b=$('#send-message');b.disabled=true;$('#message-error').textContent='';try{await community.sendMessage($('#recipient-id').value,$('#recipient-name').value,$('#message-body').value);$('#message-body').value='';notify('Message sent.');}catch(err){$('#message-error').textContent=friendlyError(err);}finally{b.disabled=false;}};
  if(isConfigured())community.init().catch(e=>notify(friendlyError(e)));
}
