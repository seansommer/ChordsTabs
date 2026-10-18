import test from 'node:test';
import assert from 'node:assert/strict';
import {quickMatches,artistGroups,songHref} from '../src/catalog-view.js';
import {AutoScroller,initialScrollSpeed,scrollSpeed} from '../src/scroll.js';
import {initScrollControls} from '../src/scroll-controls.js';

test('compact search returns at most three songs; artist browsing retains every matching song',()=>{
  const songs=Array.from({length:6},(_,i)=>({id:'song-'+i,title:'Song '+i,artist:i<4?'Álvaro':'Zed'}));
  assert.equal(quickMatches(songs,'song').length,3);
  assert.deepEqual(quickMatches(songs,'alvaro').map(s=>s.id),['song-0','song-1','song-2']);
  assert.equal(quickMatches(songs,'').length,0);
  assert.equal(artistGroups(songs)[0].songs.length,4);
  assert.equal(artistGroups(songs,'song 5')[0].name,'Zed');
  assert.equal(new URL(songHref('song-5'),'https://example.com/ChordsTabs/browse.html').searchParams.get('song'),'song-5');
});

test('the full scroll range and existing speed preferences are halved exactly once',()=>{
  assert.equal(scrollSpeed(0),2.5);assert.equal(scrollSpeed(90),45);
  assert.equal(initialScrollSpeed(null,null),11);
  assert.equal(initialScrollSpeed(null,22),11);
  assert.equal(initialScrollSpeed(null,5),2.5);
  assert.equal(initialScrollSpeed(null,90),45);
  assert.equal(initialScrollSpeed(13.5,22),13.5);
});

test('page scrolling clears the heading and stops at the end of the chart',()=>{
  const events=new Map();
  globalThis.document={addEventListener:(name,fn)=>events.set(name,fn)};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  const page={scrollTop:0,scrollHeight:2500,clientHeight:700},states=[];
  const scroller=new AutoScroller(page,active=>states.push(active),()=>({start:200,end:230}));
  scroller.speed=10;assert.equal(scroller.start(),true);assert.equal(page.scrollTop,200);
  scroller.tick(0);for(let t=100;t<=1000;t+=100)scroller.tick(t);
  assert.equal(page.scrollTop,210);assert.equal(scroller.active,true);
  for(let t=1100;t<=3100;t+=100)scroller.tick(t);
  assert.equal(page.scrollTop,230);assert.equal(scroller.active,false);assert.deepEqual(states,[true,false]);
  scroller.start();assert.equal(page.scrollTop,200);
  for(const name of ['pointerdown','touchstart','wheel','keydown'])events.get(name)?.({target:{closest:()=>null}});
  assert.equal(scroller.active,true,'ordinary screen interaction must not pause');
  document.hidden=true;events.get('visibilitychange')();assert.equal(scroller.active,false);
  const short=new AutoScroller(page,()=>{},()=>({start:100,end:50}));assert.equal(short.start(),false);
});

test('slow scrolling keeps fractional progress and adopts manual movement without jumping back',()=>{
  globalThis.document={addEventListener:()=>{}};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  let top=0;const page={scrollHeight:3000,clientHeight:700,get scrollTop(){return top;},set scrollTop(value){top=Math.round(value);}};
  const scroller=new AutoScroller(page);scroller.speed=2.5;scroller.start();scroller.tick(0);
  for(let t=20;t<=2000;t+=20)scroller.tick(t);
  assert.equal(page.scrollTop,5,'minimum speed must advance even with rounded browser positions');
  page.scrollTop=400;scroller.tick(2020);assert.equal(scroller.active,true);assert.equal(page.scrollTop,400);
  for(let t=2040;t<=4020;t+=20)scroller.tick(t);
  assert.equal(page.scrollTop,405);
  page.scrollTop=200;scroller.tick(4040);assert.equal(page.scrollTop,200);assert.equal(scroller.active,true);
});

test('bottom controls pause, resume, remove and reappear, with synchronized saved speed',()=>{
  const nodes=new Map(),style=new Map(),classes=new Set();
  globalThis.document={hidden:false,activeElement:null,addEventListener:()=>{},documentElement:{style:{setProperty:(key,value)=>style.set(key,value)}},body:{classList:{toggle:(key,value)=>value?classes.add(key):classes.delete(key)}},getElementById(id){
    if(!nodes.has(id))nodes.set(id,{hidden:false,offsetHeight:71,attributes:{},setAttribute(key,value){this.attributes[key]=value;},focus(){document.activeElement=this;}});
    return nodes.get(id);
  }};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  const page={scrollTop:0,scrollHeight:2000,clientHeight:700};let controls,linked=true,saved;
  const scroller=new AutoScroller(page,active=>controls.setActive(active));
  controls=initScrollControls({scroller,initialSpeed:11,saveSpeed:value=>saved=value,beforeStart:()=>{},onManualPause:()=>linked=false,onManualStart:()=>linked=true,onCannotStart:()=>assert.fail('Long chart should scroll')});
  const get=id=>document.getElementById(id),click=id=>get(id).onclick();
  assert.equal(get('scroll-dock').hidden,true);
  click('scroll-toggle');assert.equal(scroller.active,true);assert.equal(get('scroll-dock').hidden,false);assert.equal(get('scroll-paused').hidden,true);assert.equal(controls.height(),71);
  assert.equal(style.get('--scroll-dock-height'),'71px');
  get('scroll-pause').focus();click('scroll-pause');assert.equal(scroller.active,false);assert.equal(linked,false);assert.equal(get('scroll-paused').hidden,false);assert.equal(document.activeElement,get('scroll-start'));
  click('scroll-start');assert.equal(scroller.active,true);assert.equal(linked,true);assert.equal(document.activeElement,get('scroll-pause'));
  get('dock-scroll-speed').value='15.5';get('dock-scroll-speed').oninput();assert.equal(saved,15.5);assert.equal(get('scroll-speed').value,'15.5');assert.equal(scroller.active,true);
  click('scroll-faster');assert.equal(scroller.speed,16);click('scroll-slower');assert.equal(scroller.speed,15.5);
  get('scroll-speed').value='45';get('scroll-speed').oninput();assert.equal(get('dock-scroll-speed').value,'45');assert.equal(get('scroll-faster').disabled,true);
  get('scroll-speed').value='2.5';get('scroll-speed').oninput();assert.equal(get('scroll-slower').disabled,true);
  click('scroll-pause');click('scroll-remove');assert.equal(scroller.active,false);assert.equal(linked,false);assert.equal(get('scroll-dock').hidden,true);assert.equal(controls.height(),0);assert.equal(document.activeElement,get('scroll-toggle'));
  controls.setActive(false);assert.equal(get('scroll-dock').hidden,true,'a media pause must not reveal removed controls');
  click('scroll-toggle');assert.equal(get('scroll-dock').hidden,false);assert.equal(linked,true);
  scroller.stop('end');assert.equal(get('scroll-paused').hidden,false);assert.equal(get('scroll-dock').hidden,false);
  controls.reset();assert.equal(get('scroll-dock').hidden,true);assert.equal(classes.has('has-scroll-dock'),false);
});
