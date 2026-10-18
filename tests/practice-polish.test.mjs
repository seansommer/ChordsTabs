import test from 'node:test';
import assert from 'node:assert/strict';
import {SongScrollSpeeds} from '../src/practice-preferences.js';
import {ScreenAwake} from '../src/screen-awake.js';
import {chordShape,CHORD_INTERVALS,parseDiagramChord} from '../src/chord-shapes.js';
import {transposeChord,shapeShift} from '../src/music.js';
import {drawChordDiagram} from '../src/chord-diagram.js';

test('song speeds survive reopening without overwriting another song or the legacy default',()=>{
  const data=new Map([['music-center.scroll-speed',22]]),read=(key,fallback)=>data.get(key)??fallback,write=(key,value)=>data.set(key,value);
  let speeds=new SongScrollSpeeds(read,write);assert.equal(speeds.forSong('tired'),11);
  speeds.save('tired',9.5);assert.equal(speeds.forSong('every-little-thing'),11);
  speeds.save('every-little-thing',18);speeds=new SongScrollSpeeds(read,write);
  assert.equal(speeds.forSong('tired'),9.5);assert.equal(speeds.forSong('every-little-thing'),18);assert.equal(speeds.forSong('new-song'),11);
  assert.equal(data.get('music-center.scroll-speed'),22);assert.equal(data.has('music-center.scroll-speed.v2'),false);
  speeds.save('tired',100);assert.equal(speeds.forSong('tired'),45);
  data.set(speeds.key('tired'),'broken');assert.equal(speeds.forSong('tired'),11);
  data.set('music-center.scroll-speed.v2',13.5);assert.equal(new SongScrollSpeeds(read,write).forSong('new-song'),13.5);
});

function sentinel(){let released;return {released:false,addEventListener(type,fn){if(type==='release')released=fn;},async release(){this.released=true;released?.();}};}
test('screen awake acquires once, releases when hidden or disabled, and reacquires on return',async()=>{
  let visible=true,requests=0;const locks=[],states=[];
  const control=new ScreenAwake({wakeLock:{request:async type=>{assert.equal(type,'screen');requests++;const lock=sentinel();locks.push(lock);return lock;}},isVisible:()=>visible,onChange:state=>states.push(state)});
  await control.setEnabled(true);assert.equal(states.at(-1),'active');await control.refresh();assert.equal(requests,1);
  visible=false;await control.refresh();assert.equal(locks[0].released,true);assert.equal(states.at(-1),'waiting');
  visible=true;await control.refresh();assert.equal(requests,2);assert.equal(states.at(-1),'active');
  await locks[1].release();assert.equal(states.at(-1),'released');assert.equal(requests,2,'system releases must not cause a request loop');
  await control.refresh();assert.equal(requests,3);await control.setPageActive(false);assert.equal(locks[2].released,true);
  await control.setPageActive(true);assert.equal(requests,4);await control.setEnabled(false);assert.equal(locks[3].released,true);assert.equal(states.at(-1),'off');
});

test('late screen-awake grants are released, while denied and unsupported requests stay usable',async()=>{
  let grant,latest;const lock=sentinel();
  const control=new ScreenAwake({wakeLock:{request:()=>new Promise(resolve=>grant=resolve)},isVisible:()=>true,onChange:state=>latest=state});
  const waiting=control.setEnabled(true);control.setEnabled(false);grant(lock);await waiting;assert.equal(lock.released,true);assert.equal(control.lock,null);assert.equal(latest,'off');
  let denied=true,calls=0;const retry=new ScreenAwake({wakeLock:{request:async()=>{calls++;if(denied)throw new Error('Power saving');return sentinel();}},isVisible:()=>true,onChange:state=>latest=state});
  await retry.setEnabled(true);assert.equal(latest,'blocked');assert.equal(calls,1);denied=false;await retry.refresh();assert.equal(latest,'active');
  const unsupported=new ScreenAwake({wakeLock:undefined,isVisible:()=>true,onChange:state=>latest=state});await unsupported.setEnabled(true);assert.equal(latest,'unsupported');
});

const pitches=shape=>shape.frets.flatMap((f,i)=>f===null?[]:[[40,45,50,55,59,64][i]+f]);
test('diagrams use familiar open fingerings, honor slash basses, and reject unsupported symbols',()=>{
  assert.deepEqual(chordShape('C').frets,[null,3,2,0,1,0]);assert.deepEqual(chordShape('Em').frets,[0,2,2,0,0,0]);
  assert.deepEqual(chordShape('B7').frets,[null,2,1,2,0,2]);assert.deepEqual(chordShape('A#'),chordShape('Bb'));
  assert.equal(Math.min(...pitches(chordShape('C/E')))%12,4);assert.equal(Math.min(...pitches(chordShape('D/F#')))%12,6);
  assert.deepEqual([...new Set(pitches(chordShape('G7')).map(n=>n%12))].sort((a,b)=>a-b),[2,5,7,11]);
  assert.deepEqual([...new Set(pitches(chordShape('Gmaj7')).map(n=>n%12))].sort((a,b)=>a-b),[2,6,7,11]);
  for(const chord of ['N.C.','C13','Cwhatever','C/Z','<script>'])assert.equal(chordShape(chord),null);
});

test('movable fingerings cover every root and supported family with correct notes and playable finger assignments',()=>{
  const roots=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  for(const [rootIndex,root] of roots.entries())for(const [quality,intervals] of Object.entries(CHORD_INTERVALS)){
    const chord=root+quality,voicing=chordShape(chord);assert.ok(voicing,chord);
    const notes=pitches(voicing);assert.equal(Math.min(...notes)%12,rootIndex,chord+' bass');
    assert.deepEqual([...new Set(notes.map(n=>n%12))].sort((a,b)=>a-b),intervals.map(n=>(rootIndex+n)%12).sort((a,b)=>a-b),chord+' notes');
    voicing.frets.forEach((f,i)=>{if(f===null)assert.equal(voicing.fingers[i],null);else if(f===0)assert.equal(voicing.fingers[i],0);else assert.ok(voicing.fingers[i]>=1&&voicing.fingers[i]<=4,chord);});
    for(let finger=1;finger<=4;finger++){
      const strings=voicing.fingers.flatMap((f,i)=>f===finger?[i]:[]);
      if(strings.length>1){assert.equal(new Set(strings.map(i=>voicing.frets[i])).size,1,chord);assert.ok(voicing.barres.some(b=>b.finger===finger&&b.from<=Math.min(...strings)&&b.to>=Math.max(...strings)),chord+' barre');}
    }
    assert.ok(voicing.frets.every(f=>f===null||f===0||(f>=voicing.baseFret&&f<voicing.baseFret+5)),chord+' visible frets');
    const highCapo=chordShape(chord,12);if(highCapo)assert.ok(highCapo.frets.every(f=>f===null||f+12<=24));
  }
});

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={setProperty:()=>{}};this.classList={toggle:()=>{}};}
  append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(key,value){this.attributes[key]=value;}
}
const descendants=node=>[node,...node.children.flatMap(descendants)];
test('tapping a rendered chord opens its displayed shape after capo or key changes; lyrics view has no chord buttons',async()=>{
  globalThis.location=new URL('https://seansommer.github.io/ChordsTabs/');
  globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
  const {renderSheet}=await import('../src/render.js');
  const song={capo:3,sections:[{name:'Verse',lines:[{lyrics:'Sing along',chords:[{at:0,chord:'Em'}]}]}]};
  const target=new Element('article');let selected;
  for(const [transpose,capo,expected] of [[0,3,'Em'],[0,0,'Gm'],[2,3,'F#m'],[0,5,'Dm']]){
    renderSheet(target,song,{transpose,capo,onChord:name=>selected=name});
    const button=descendants(target).find(n=>n.tag==='button');assert.equal(button.textContent,expected);button.onclick();assert.equal(selected,expected);
    const sounding=transposeChord(expected,capo);assert.equal(sounding,transposeChord('Em',song.capo+transpose));
    const voicing=chordShape(selected,capo),svg=drawChordDiagram(voicing,selected,capo);assert.match(svg.attributes['aria-label'],new RegExp(selected+' fingering'));assert.ok(voicing);
  }
  renderSheet(target,song,{lyricsOnly:true,onChord:()=>assert.fail('Lyrics only must not open chord cards')});assert.equal(descendants(target).filter(n=>n.tag==='button').length,0);assert.ok(descendants(target).some(n=>n.textContent==='Sing along'));
});
