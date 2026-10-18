import {FIREBASE_CONFIG,SDK_VERSION,FIREBASE_APP_NAME,COMMUNITY_PATH,isConfigured} from './config.js';
import {credentials,createMessageId,messageKey} from './identity.js';

export class Community {
  constructor(){ this.profile=null; this.listeners=new Set(); this.generation=0; }
  subscribe(fn){ this.listeners.add(fn); fn(this.profile); return()=>this.listeners.delete(fn); }
  emit(profile){ this.profile=profile; for(const fn of this.listeners) fn(profile); }
  ref(path=''){return this.api.ref(this.db,`${COMMUNITY_PATH}${path?'/'+path:''}`);}
  async init(){
    if(this.ready) return this;
    if(!isConfigured()) throw new Error('Accounts and messages are awaiting connection. You can explore the music library as a guest.');
    if(this.initializing) return this.initializing;
    this.initializing=this.connect();
    try{return await this.initializing;}finally{this.initializing=null;}
  }
  async connect(){
    this.api=Object.assign({},...await Promise.all(['app','auth','database'].map(s=>import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${s}.js`))));
    const app=this.api.getApps().find(a=>a.name===FIREBASE_APP_NAME)||this.api.initializeApp(FIREBASE_CONFIG,FIREBASE_APP_NAME);
    this.auth=this.api.getAuth(app); this.db=this.api.getDatabase(app);
    await this.api.setPersistence(this.auth,this.api.browserLocalPersistence);
    await this.auth.authStateReady();
    this.api.onAuthStateChanged(this.auth,user=>this.restore(user));
    this.ready=true;return this;
  }
  restore(user){
    const generation=++this.generation; this.stopProfile?.(); this.stopMaster?.(); this.master=false; this.rawProfile=null; this.emit(null);
    if(!user) return;
    const publish=()=>{if(generation===this.generation)this.emit(this.rawProfile?{...this.rawProfile,uid:user.uid,isMaster:this.master}:null);};
    this.stopProfile=this.api.onValue(this.ref(`profiles/${user.uid}`),s=>{
      if(generation===this.generation){this.rawProfile=s.val();publish();}
    },()=>{if(generation===this.generation)this.emit(null);});
    this.stopMaster=this.api.onValue(this.ref(`admins/${user.uid}`),s=>{if(generation===this.generation){this.master=s.val()===true;publish();}},()=>{if(generation===this.generation){this.master=false;publish();}});
  }
  async signIn(nickname,phrase){
    await this.init(); const login=await credentials(nickname,phrase,FIREBASE_CONFIG.projectId);
    const {user}=await this.api.signInWithEmailAndPassword(this.auth,login.email,login.password);
    let profile=(await this.api.get(this.ref(`profiles/${user.uid}`))).val();
    // Recover an interrupted signup only after authenticating the same account.
    if(!profile) profile=await this.createProfile(user.uid,nickname);
    const isMaster=(await this.api.get(this.ref(`admins/${user.uid}`))).val()===true;
    this.emit({...profile,uid:user.uid,isMaster});return this.profile;
  }
  async signUp(nickname,phrase){
    await this.init();const login=await credentials(nickname,phrase,FIREBASE_CONFIG.projectId);
    const {user}=await this.api.createUserWithEmailAndPassword(this.auth,login.email,login.password);
    const profile=await this.createProfile(user.uid,nickname);
    this.emit({...profile,uid:user.uid,isMaster:false});return this.profile;
  }
  async createProfile(uid,nickname){
    const id=createMessageId(); const lookup=await messageKey(id,nickname);
    const p={displayName:nickname.trim(),messageId:id,messageLookupKey:lookup,createdAt:this.api.serverTimestamp()};
    await this.api.update(this.ref(),{[`profiles/${uid}`]:p,[`messageLookup/${lookup}`]:uid});
    return (await this.api.get(this.ref(`profiles/${uid}`))).val();
  }
  async signOut(){if(this.auth)await this.api.signOut(this.auth);this.emit(null);}
  require(){if(!this.profile)throw new Error('Sign in to open your messages.');return this.profile;}
  watchMessages(fn,onError){const p=this.require();return this.api.onValue(this.api.query(this.ref(`mailboxes/${p.uid}`),this.api.orderByChild('createdAt'),this.api.limitToLast(100)),s=>fn(Object.entries(s.val()||{}).map(([id,m])=>({...m,id})).sort((a,b)=>b.createdAt-a.createdAt)),onError);}
  async sendMessage(messageId,nickname,body){
    const p=this.require();body=body.trim();
    if(!body||body.length>2000)throw new Error('Write a message of 1–2,000 characters.');
    if(!/^[A-Z2-9]{16}$/.test(messageId.trim().toUpperCase()))throw new Error('Enter the recipient’s 16-character Message ID.');
    const lookup=await messageKey(messageId,nickname);
    const to=(await this.api.get(this.ref(`messageLookup/${lookup}`))).val();
    if(!to)throw new Error('That nickname and Message ID do not match.');
    if(to===p.uid)throw new Error('Choose another musician to message.');
    const id=this.api.push(this.ref(`mailboxes/${p.uid}`)).key;
    const message={fromUid:p.uid,fromName:p.displayName,fromMessageId:p.messageId,toUid:to,toName:nickname.trim(),recipientKey:lookup,body,createdAt:this.api.serverTimestamp()};
    await this.api.update(this.ref(),{[`mailboxes/${p.uid}/${id}`]:message,[`mailboxes/${to}/${id}`]:message});
  }
  async deleteMessage(id){const p=this.require();if(!/^[-A-Za-z0-9_]{20}$/.test(id))throw new Error('Invalid message.');await this.api.remove(this.ref(`mailboxes/${p.uid}/${id}`));}
  watchSongEdits(fn,onError){return this.api.onValue(this.ref('songEdits'),s=>fn(s.val()||{}),onError);}
  async publishSong(song,expectedRevision,previousContent){
    const p=this.require();if(!p.isMaster)throw new Error('Master access is required to publish a song.');
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.id))throw new Error('Use a song ID made from lowercase letters, numbers, and hyphens.');
    const content=JSON.stringify(song);if(content.length>200000)throw new Error('This chart is too large. Keep it under 200,000 characters.');
    const result=await this.api.runTransaction(this.ref(`songEdits/${song.id}`),current=>{
      if((current?.revision||0)!==expectedRevision)return;
      return {content,previousContent:current?.content||previousContent||content,revision:expectedRevision+1,updatedBy:p.uid,updatedAt:this.api.serverTimestamp()};
    },{applyLocally:false});
    if(!result.committed)throw new Error('This song changed while you were editing. Copy your draft, close the editor, and reopen the latest version before publishing.');
    return result.snapshot.val();
  }
}
export function friendlyError(error){
  const code=error?.code||'';
  if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'Check your nickname and Secret Word or Phrase. Capitals and spaces in your phrase must match.';
  if(/email-already-in-use/.test(code))return 'That nickname already has an account. Sign in, or choose a different nickname.';
  if(/too-many-requests/.test(code))return 'Too many attempts. Please wait a little before trying again.';
  if(/operation-not-allowed|invalid-api-key|permission.?denied/i.test(code+' '+error?.message))return 'Accounts and messages are not fully connected yet. The music library is available as a guest.';
  if(/network|fetch|offline/.test(code+' '+error?.message))return 'Couldn’t connect. Check your connection and try again.';
  return error?.message||'Something went wrong. Please try again.';
}
