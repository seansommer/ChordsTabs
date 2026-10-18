import test from 'node:test';
import assert from 'node:assert/strict';
import {quickMatches,artistGroups,songHref} from '../src/catalog-view.js';
import {AutoScroller,initialScrollSpeed,scrollSpeed} from '../src/scroll.js';

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
  events.get('pointerdown')({target:{closest:()=>true}});assert.equal(scroller.active,true);
  events.get('pointerdown')({target:{closest:()=>null}});assert.equal(scroller.active,false);
  const short=new AutoScroller(page,()=>{},()=>({start:100,end:50}));assert.equal(short.start(),false);
});
