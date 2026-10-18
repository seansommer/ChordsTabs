export class ScreenAwake {
  constructor({wakeLock,isVisible,onChange}){this.wakeLock=wakeLock;this.isVisible=isVisible;this.onChange=onChange;this.enabled=false;this.pageActive=true;this.lock=null;this.pending=null;this.supported=typeof wakeLock?.request==='function';}
  wanted(){return this.enabled&&this.pageActive&&this.isVisible();}
  idleState(){return this.enabled?'waiting':'off';}
  setEnabled(value){this.enabled=Boolean(value);return this.refresh();}
  setPageActive(value){this.pageActive=value;return this.refresh();}
  refresh(){
    if(!this.supported){this.onChange('unsupported');return Promise.resolve();}
    if(!this.wanted()){
      const old=this.lock;this.lock=null;
      if(old)Promise.resolve(old.release()).catch(()=>{});
      this.onChange(this.idleState());return this.pending||Promise.resolve();
    }
    if(this.lock&&!this.lock.released){this.onChange('active');return Promise.resolve();}
    if(this.pending)return this.pending;
    this.onChange('requesting');
    this.pending=this.acquire().finally(()=>{this.pending=null;});return this.pending;
  }
  async acquire(){
    try{
      const lock=await this.wakeLock.request('screen');
      if(!this.wanted()){Promise.resolve(lock.release()).catch(()=>{});this.onChange(this.idleState());return;}
      if(lock.released){this.onChange('released');return;}
      this.lock=lock;
      lock.addEventListener('release',()=>{if(this.lock!==lock)return;this.lock=null;this.onChange(this.wanted()?'released':this.idleState());});
      this.onChange('active');
    }catch{this.onChange(this.wanted()?'blocked':this.idleState());}
  }
}

export function initScreenAwake({read,write}){
  const toggle=document.getElementById('keep-screen-awake'),status=document.getElementById('screen-awake-status'),retry=document.getElementById('screen-awake-retry');
  const messages={off:'Keep the screen on while this song page is open.',requesting:'Keeping the screen awake…',active:'Screen stays awake while this page is visible.',waiting:'Screen awake will resume when you return.',unsupported:'This browser does not support keeping the screen awake.',blocked:'Your device could not keep the screen awake. Retry or check battery-saving settings.',released:'Your device released screen awake. Tap Retry to enable it again.'};
  const controller=new ScreenAwake({wakeLock:navigator.wakeLock,isVisible:()=>!document.hidden,onChange:state=>{status.textContent=messages[state];retry.hidden=!['blocked','released'].includes(state);toggle.disabled=state==='unsupported';}});
  toggle.checked=read('music-center.keep-screen-awake.v1',false)===true;
  toggle.onchange=()=>{write('music-center.keep-screen-awake.v1',toggle.checked);controller.setEnabled(toggle.checked);};
  retry.onclick=()=>controller.refresh();
  document.addEventListener('visibilitychange',()=>controller.refresh());
  window.addEventListener('pagehide',()=>controller.setPageActive(false));
  window.addEventListener('pageshow',()=>controller.setPageActive(true));
  controller.setEnabled(toggle.checked);return controller;
}
