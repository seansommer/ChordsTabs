import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isDeletedSong,nextSongRecord} from '../src/song-records.js';
import {PlaybackLoop} from '../src/playback-loop.js';
import {directMediaSource,mediaSource} from '../src/music.js';
import {validateSong} from '../src/song-format.js';
globalThis.location=new URL('https://seansommer.github.io/ChordsTabs/');
const {Songbook}=await import('../src/songbook.js');
const {Community}=await import('../src/community.js');
const catalog=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url)));
const song=JSON.parse(await readFile(new URL('../data/'+catalog[0].file,import.meta.url)));

test('deleting a repository song hides it, reserves its ID, and restores its latest published content',()=>{
  const book=new Songbook({});book.base.set(song.id,song);
  const updated={...song,title:'An edited title'};
  const publish=nextSongRecord(null,{content:JSON.stringify(updated),previousContent:JSON.stringify(song),expectedRevision:0,uid:'master',timestamp:1});
  book.accept(updated,publish);assert.equal(book.get(song.id).title,updated.title);
  const marker={schemaVersion:1,id:song.id,title:updated.title,artist:song.artist,deleted:true};
  const deleted=nextSongRecord(publish,{content:JSON.stringify(marker),previousContent:JSON.stringify(updated),expectedRevision:1,uid:'master',timestamp:2});
  book.accept(updated,deleted);assert.equal(book.get(song.id),undefined);assert.equal(book.songs.length,0);assert.equal(book.has(song.id),true);assert.equal(isDeletedSong(book.deleted.get(song.id),song.id),true);
  assert.deepEqual(JSON.parse(deleted.previousContent),updated);
  const restored=nextSongRecord(deleted,{content:deleted.previousContent,expectedRevision:2,uid:'master',timestamp:3});
  book.accept(updated,restored);assert.equal(book.songs.length,1);assert.equal(book.deleted.size,0);assert.equal(book.get(song.id).title,updated.title);
  assert.equal(nextSongRecord(restored,{expectedRevision:2}),undefined,'A stale delete/edit cannot overwrite a restore');
});

test('delete requires a master and writes a revision marker instead of removing repository data',async()=>{
  const community=new Community();community.profile={uid:'ordinary',isMaster:false};
  await assert.rejects(community.deleteSong(song,0),/Master access/);
  let current=null;community.profile={uid:'master',isMaster:true};community.ref=path=>path;
  community.api={serverTimestamp:()=>123,runTransaction:async(path,fn)=>{assert.equal(path,'songEdits/'+song.id);const value=fn(current);if(!value)return {committed:false};current=value;return {committed:true,snapshot:{val:()=>value}};}};
  const record=await community.deleteSong(song,0);assert.equal(record.revision,1);assert.equal(JSON.parse(record.content).deleted,true);assert.deepEqual(JSON.parse(record.previousContent),song);
  await assert.rejects(community.publishSong(song,0),/changed while/);
});

test('repeat seeks and plays, resetting the chart only on actual playback',async()=>{
  const events=[];let repeat=true;
  const loop=new PlaybackLoop({repeat:()=>repeat,seek:async time=>events.push(['seek',time]),play:async()=>events.push('play'),onPlaying:()=>events.push('scroll'),onPause:()=>events.push('pause-scroll'),onRestart:()=>events.push('reset-chart'),onError:error=>{throw error;}});
  await loop.state('ended');assert.deepEqual(events,['pause-scroll',['seek',0],'play']);
  loop.state('buffering');assert.equal(events.includes('reset-chart'),false);
  loop.state('playing');assert.equal(events.at(-1),'reset-chart');
  loop.state('playing');assert.equal(events.at(-1),'scroll');
  repeat=false;events.length=0;await loop.state('ended');assert.deepEqual(events,['pause-scroll']);
});

test('blocked replay never resets the chart, and changing songs cancels pending replay',async()=>{
  let resets=0,plays=0,errors=0,finishSeek;
  const common={repeat:()=>true,onPlaying:()=>{},onPause:()=>{},onRestart:()=>resets++,onError:()=>errors++};
  const blocked=new PlaybackLoop({...common,seek:async()=>{},play:async()=>{throw new Error('Blocked');}});
  await blocked.state('ended');assert.equal(errors,1);assert.equal(resets,0);assert.equal(blocked.restartPending,false);
  const pending=new PlaybackLoop({...common,seek:()=>new Promise(resolve=>finishSeek=resolve),play:async()=>plays++});
  const work=pending.state('ended');pending.dispose();finishSeek();await work;pending.state('playing');assert.equal(plays,0);assert.equal(resets,0);
});

test('direct audio is separate from social embeds and unsafe media links are rejected',()=>{
  assert.equal(directMediaSource('https://example.com/song.m4a?download=1'),'https://example.com/song.m4a?download=1');
  for(const value of ['javascript:alert(1)','http://example.com/song.mp3','https://user:secret@example.com/song.mp3','https://www.instagram.com/reel/abc/'])assert.equal(directMediaSource(value),null);
  assert.equal(mediaSource('https://youtu.be/dQw4w9WgXcQ').provider,'youtube');
  assert.equal(mediaSource('https://vimeo.com/12345').provider,'vimeo');
  assert.throws(()=>validateSong({...song,audioUrl:'https://www.instagram.com/reel/abc/'}),/direct HTTPS/);
  assert.equal(validateSong({...song,audioUrl:'https://example.com/song.mp3'}).audioUrl,'https://example.com/song.mp3');
});
