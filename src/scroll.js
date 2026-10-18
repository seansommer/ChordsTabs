export const SCROLL_MIN=2.5,SCROLL_MAX=45,SCROLL_DEFAULT=11;
export function scrollSpeed(value,fallback=SCROLL_DEFAULT){
  if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return fallback;
  return Math.max(SCROLL_MIN,Math.min(SCROLL_MAX,Math.round(Number(value)*2)/2));
}
export function initialScrollSpeed(value,legacy){return scrollSpeed(value,scrollSpeed(legacy===null?null:Number(legacy)/2));}

export class AutoScroller {
  constructor(target,onChange=()=>{},bounds=()=>({})){
    this.target=target;this.onChange=onChange;this.bounds=bounds;this.speed=SCROLL_DEFAULT;this.active=false;this.tick=this.tick.bind(this);
    const interrupt=event=>{if(event.target?.closest?.('[data-scroll-control]'))return;this.stop('interaction');};
    for(const event of ['wheel','touchstart','pointerdown','keydown'])document.addEventListener(event,interrupt,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
    globalThis.addEventListener?.('pagehide',()=>this.stop());
  }
  range(){
    const max=Math.max(0,this.target.scrollHeight-this.target.clientHeight),requested=this.bounds();
    const start=Math.max(0,Math.min(max,requested.start||0));
    return {start,end:Math.max(start,Math.min(max,requested.end??max))};
  }
  start(){
    if(this.active)return true;
    const {start,end}=this.range();if(end<=start+1)return false;
    this.position=this.target.scrollTop;
    if(this.position<start||this.position>=end-1)this.position=start;
    this.target.scrollTop=this.position;this.active=true;this.previous=null;this.onChange(true);this.frame=requestAnimationFrame(this.tick);return true;
  }
  restart(){this.stop('restart');this.target.scrollTop=this.range().start;return this.start();}
  stop(reason='pause'){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);this.onChange(false,reason);}
  tick(time){
    if(!this.active)return;
    const {end}=this.range();
    if(this.previous!==null){this.position=Math.min(end,this.position+Math.min(time-this.previous,100)/1000*this.speed);this.target.scrollTop=this.position;}
    this.previous=time;
    if(this.position>=end-.5){this.stop('end');return;}
    this.frame=requestAnimationFrame(this.tick);
  }
}
