export class AutoScroller {
  constructor(target,onChange=()=>{}){this.target=target;this.onChange=onChange;this.speed=22;this.active=false;this.tick=this.tick.bind(this);this.stop=this.stop.bind(this);['wheel','touchstart','pointerdown','keydown'].forEach(event=>target.addEventListener(event,this.stop,{passive:true}));document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});}
  start(){if(this.target.scrollHeight<=this.target.clientHeight+2)return false;if(this.target.scrollTop+this.target.clientHeight>=this.target.scrollHeight-2)this.target.scrollTop=0;this.active=true;this.previous=null;this.position=this.target.scrollTop;this.onChange(true);this.frame=requestAnimationFrame(this.tick);return true;}
  stop(){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);this.onChange(false);}
  tick(time){if(!this.active)return;if(this.previous!==null){this.position+=Math.min(time-this.previous,100)/1000*this.speed;this.target.scrollTop=this.position;}this.previous=time;if(this.target.scrollTop+this.target.clientHeight>=this.target.scrollHeight-2){this.stop();return;}this.frame=requestAnimationFrame(this.tick);}
}
