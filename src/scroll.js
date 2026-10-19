export const SCROLL_MIN=2.5,SCROLL_MAX=45,SCROLL_DEFAULT=11;
export function scrollSpeed(value,fallback=SCROLL_DEFAULT){
  if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return fallback;
  return Math.max(SCROLL_MIN,Math.min(SCROLL_MAX,Math.round(Number(value)*2)/2));
}
export function initialScrollSpeed(value,legacy){return scrollSpeed(value,scrollSpeed(legacy===null?null:Number(legacy)/2));}

export class AutoScroller {
  constructor(target,onChange=()=>{},bounds=()=>({}),content=null){
    this.target=target;this.onChange=onChange;this.bounds=bounds;this.content=content;this.visualOffset=0;this.limits=null;this.speed=SCROLL_DEFAULT;this.active=false;this.tick=this.tick.bind(this);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
    globalThis.addEventListener?.('pagehide',()=>this.stop());
    const invalidate=()=>this.invalidate();
    globalThis.addEventListener?.('resize',invalidate);
    globalThis.visualViewport?.addEventListener('resize',invalidate);
    if(globalThis.ResizeObserver){
      this.resizeObserver=new ResizeObserver(invalidate);this.resizeObserver.observe(target);
      if(content)this.resizeObserver.observe(content);
    }
  }
  invalidate(){this.limits=null;}
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
    this.content?.classList.add('is-auto-scrolling');this.writePosition();this.active=true;this.previous=null;this.onChange(true);this.invalidate();this.frame=requestAnimationFrame(this.tick);return true;
  }
  restart(){this.stop('restart');this.target.scrollTop=this.range().start;return this.start();}
  stop(reason='pause'){
    if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);
    this.content?.classList.remove('is-auto-scrolling');this.content?.style.removeProperty('--auto-scroll-offset');this.visualOffset=0;
    this.onChange(false,reason);this.invalidate();
  }
  writePosition(){
    // Move the document only when its whole-pixel position changes. Animate the
    // fraction on the sheet so slow speeds do not wait, then jump by a pixel.
    const nativePosition=this.content?Math.round(this.position):this.position;
    if(this.target.scrollTop!==nativePosition)this.target.scrollTop=nativePosition;
    this.lastWritten=this.target.scrollTop;
    this.visualOffset=this.content?this.lastWritten-this.position:0;
    this.content?.style.setProperty('--auto-scroll-offset',this.visualOffset.toFixed(4)+'px');
  }
  tick(time){
    if(!this.active)return;
    // Layout changes invalidate this cache; steady scrolling needs no geometry reads.
    const {end}=this.limits||(this.limits=this.range());
    // Follow a manual swipe or keyboard scroll without cancelling auto-scroll.
    // Include the visual fraction so adopting the gesture does not jump the text.
    if(Math.abs(this.target.scrollTop-this.lastWritten)>1)this.position=Math.max(0,this.target.scrollTop-this.visualOffset);
    if(this.previous!==null){this.position=Math.min(end,this.position+Math.min(time-this.previous,100)/1000*this.speed);this.writePosition();}
    this.previous=time;
    if(this.position>=end-.001){this.stop('end');return;}
    this.frame=requestAnimationFrame(this.tick);
  }
}
