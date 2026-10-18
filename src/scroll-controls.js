import {SCROLL_MIN,SCROLL_MAX,scrollSpeed} from './scroll.js';

export function initScrollControls({scroller,initialSpeed,saveSpeed,beforeStart,onManualPause,onManualStart,onCannotStart}){
  const get=id=>document.getElementById(id),dock=get('scroll-dock'),pause=get('scroll-pause'),paused=get('scroll-paused'),start=get('scroll-start'),remove=get('scroll-remove'),toggle=get('scroll-toggle');
  const inputs=[get('scroll-speed'),get('dock-scroll-speed')],outputs=[get('speed-value'),get('dock-speed-value')],minus=get('scroll-slower'),plus=get('scroll-faster');
  let visible=false;
  const height=()=>dock.hidden?0:dock.offsetHeight;
  function measure(){document.documentElement.style.setProperty('--scroll-dock-height',height()+'px');document.body.classList.toggle('has-scroll-dock',visible);}
  function setActive(active){
    if(active)visible=true;
    const focused=document.activeElement;
    dock.hidden=!visible;pause.hidden=!active;paused.hidden=active;
    toggle.textContent=active?'Ⅱ Pause':'▶ Auto-scroll';toggle.setAttribute('aria-pressed',String(active));
    get('scroll-help').textContent=active?'Scrolling · use Pause Auto Scroll below to pause.':'Taps keep scrolling. Pause and adjust speed in the bottom bar.';
    measure();
    if(visible&&focused===(active?start:pause))(active?pause:start).focus({preventScroll:true});
  }
  function pauseScroll(){onManualPause();scroller.stop();setActive(false);}
  function startScroll(){beforeStart();if(scroller.start())onManualStart();else onCannotStart();}
  function setSpeed(value){
    scroller.speed=scrollSpeed(value);const label=scroller.speed+' px/s';
    for(const input of inputs){input.value=String(scroller.speed);input.setAttribute('aria-valuetext',label);}
    for(const output of outputs)output.textContent=label;
    minus.disabled=scroller.speed<=SCROLL_MIN;plus.disabled=scroller.speed>=SCROLL_MAX;saveSpeed(scroller.speed);
  }
  toggle.onclick=()=>scroller.active?pauseScroll():startScroll();pause.onclick=pauseScroll;start.onclick=startScroll;
  remove.onclick=()=>{pauseScroll();visible=false;setActive(false);toggle.focus({preventScroll:true});};
  for(const input of inputs)input.oninput=()=>setSpeed(input.value);
  minus.onclick=()=>setSpeed(scroller.speed-.5);plus.onclick=()=>setSpeed(scroller.speed+.5);
  if(globalThis.ResizeObserver)new ResizeObserver(measure).observe(dock);
  globalThis.addEventListener?.('resize',measure);
  setSpeed(initialSpeed);setActive(false);
  return {setActive,height,reset(){scroller.stop('song');visible=false;setActive(false);}};
}
