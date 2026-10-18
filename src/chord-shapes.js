import {noteValue,mod} from './music.js';

export const GUITAR_TUNING=[40,45,50,55,59,64]; // Low E to high e, standard tuning.
export const CHORD_INTERVALS={
  '':[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],
  sus2:[0,2,7],sus4:[0,5,7],'7sus4':[0,5,7,10],'6':[0,4,7,9],m6:[0,3,7,9],
  add9:[0,2,4,7],'9':[0,2,4,7,10],dim:[0,3,6],dim7:[0,3,6,9],m7b5:[0,3,6,10],aug:[0,4,8]
};
const ALIASES={maj:'',major:'',min:'m',minor:'m',min7:'m7',M7:'maj7','Δ7':'maj7',sus:'sus4','7sus':'7sus4','+':'aug','°':'dim','°7':'dim7','ø':'m7b5','ø7':'m7b5','m7(b5)':'m7b5'};
export function parseDiagramChord(value){
  const match=/^([A-G][#b♯♭]?)([^/]*)(?:\/([A-G][#b♯♭]?))?$/.exec(value||'');if(!match)return null;
  const quality=ALIASES[match[2]]??match[2];if(!Object.hasOwn(CHORD_INTERVALS,quality))return null;
  const root=noteValue(match[1]);return {root,quality,bass:match[3]?noteValue(match[3]):root,slash:!!match[3]};
}
const shape=(frets,fingers,barres=[])=>({frets,fingers,barres});
const barre=(fret,from,to,finger=1)=>({fret,from,to,finger});
// Common open fingerings are preferred. Numbers name fingers, not fret numbers.
const OPEN={
  C:shape([null,3,2,0,1,0],[null,3,2,0,1,0]),
  C7:shape([null,3,2,3,1,0],[null,3,2,4,1,0]),
  Cmaj7:shape([null,3,2,0,0,0],[null,3,2,0,0,0]),
  Cadd9:shape([null,3,2,0,3,0],[null,3,2,0,4,0]),
  D:shape([null,null,0,2,3,2],[null,null,0,1,3,2]),
  Dm:shape([null,null,0,2,3,1],[null,null,0,2,3,1]),
  D7:shape([null,null,0,2,1,2],[null,null,0,2,1,3]),
  Dm7:shape([null,null,0,2,1,1],[null,null,0,2,1,1],[barre(1,4,5)]),
  Dmaj7:shape([null,null,0,2,2,2],[null,null,0,1,1,1],[barre(2,3,5)]),
  Dsus2:shape([null,null,0,2,3,0],[null,null,0,1,3,0]),
  Dsus4:shape([null,null,0,2,3,3],[null,null,0,1,3,4]),
  E:shape([0,2,2,1,0,0],[0,2,3,1,0,0]),
  Em:shape([0,2,2,0,0,0],[0,2,3,0,0,0]),
  E7:shape([0,2,0,1,0,0],[0,2,0,1,0,0]),
  Em7:shape([0,2,0,0,0,0],[0,2,0,0,0,0]),
  Emaj7:shape([0,2,1,1,0,0],[0,3,1,2,0,0]),
  Esus4:shape([0,2,2,2,0,0],[0,2,3,4,0,0]),
  F:shape([null,null,3,2,1,1],[null,null,3,2,1,1],[barre(1,4,5)]),
  Fmaj7:shape([null,null,3,2,1,0],[null,null,3,2,1,0]),
  G:shape([3,2,0,0,0,3],[2,1,0,0,0,3]),
  G7:shape([3,2,0,0,0,1],[3,2,0,0,0,1]),
  Gmaj7:shape([3,2,0,0,0,2],[3,1,0,0,0,2]),
  A:shape([null,0,2,2,2,0],[null,0,1,2,3,0]),
  Am:shape([null,0,2,2,1,0],[null,0,2,3,1,0]),
  A7:shape([null,0,2,0,2,0],[null,0,2,0,3,0]),
  Am7:shape([null,0,2,0,1,0],[null,0,2,0,1,0]),
  Amaj7:shape([null,0,2,1,2,0],[null,0,2,1,3,0]),
  Asus2:shape([null,0,2,2,0,0],[null,0,2,3,0,0]),
  Asus4:shape([null,0,2,2,3,0],[null,0,1,2,3,0]),
  B7:shape([null,2,1,2,0,2],[null,2,1,3,0,4]),
  'C/E':shape([0,3,2,0,1,0],[0,3,2,0,1,0]),
  'C/G':shape([3,3,2,0,1,0],[4,3,2,0,1,0]),
  'D/F#':shape([2,null,0,2,3,null],[1,null,0,2,3,null]),
  'D/C':shape([null,3,0,2,3,2],[null,4,0,1,3,2]),
  'G/B':shape([null,2,0,0,0,3],[null,1,0,0,0,3]),
  'G/D':shape([null,null,0,0,0,3],[null,null,0,0,0,3]),
  'Am/G':shape([3,0,2,2,1,0],[4,0,2,3,1,0]),
  'A/C#':shape([null,4,2,2,2,0],[null,3,1,1,1,0],[barre(2,2,4)]),
  'E/G#':shape([4,2,2,1,0,0],[4,2,3,1,0,0])
};
// Movable forms cover every chromatic root without an external chord service.
const E_FORMS={
  '':shape([0,2,2,1,0,0],[1,3,4,2,1,1]),m:shape([0,2,2,0,0,0],[1,3,4,1,1,1]),
  '7':shape([0,2,0,1,0,0],[1,3,1,2,1,1]),m7:shape([0,2,0,0,0,0],[1,3,1,1,1,1]),
  maj7:shape([0,2,1,1,0,0],[1,4,2,3,1,1]),sus4:shape([0,2,2,2,0,0],[1,2,3,4,1,1]),
  '7sus4':shape([0,2,0,2,0,0],[1,3,1,4,1,1]),
  '6':shape([0,2,2,1,2,0],[1,3,3,2,4,1],[barre(2,1,2,3)]),m6:shape([0,2,2,0,2,0],[1,2,3,1,4,1]),
  add9:shape([0,2,4,1,0,0],[1,3,4,2,1,1]),aug:shape([0,3,2,1,1,0],[1,4,3,2,2,1],[barre(1,3,4,2)])
};
const A_FORMS={
  '':shape([null,0,2,2,2,0],[null,1,2,3,4,1]),m:shape([null,0,2,2,1,0],[null,1,3,4,2,1]),
  '7':shape([null,0,2,0,2,0],[null,1,3,1,4,1]),m7:shape([null,0,2,0,1,0],[null,1,3,1,2,1]),
  maj7:shape([null,0,2,1,2,0],[null,1,3,2,4,1]),sus2:shape([null,0,2,2,0,0],[null,1,3,4,1,1]),
  sus4:shape([null,0,2,2,3,0],[null,1,2,3,4,1]),'7sus4':shape([null,0,2,0,3,0],[null,1,3,1,4,1]),
  '6':shape([null,0,2,2,2,2],[null,1,3,3,3,3],[barre(2,2,5,3)]),
  m6:shape([null,0,2,2,1,2],[null,1,3,3,2,4],[barre(2,2,3,3)]),
  add9:shape([null,0,2,4,2,0],[null,1,2,4,3,1]),
  '9':shape([null,0,2,4,2,3],[null,1,2,4,2,3],[barre(2,2,4,2)]),
  dim:shape([null,0,1,2,1,null],[null,1,2,4,3,null]),
  dim7:shape([null,0,1,2,1,2],[null,1,2,4,2,3],[barre(1,2,4,2)]),
  m7b5:shape([null,0,1,0,1,null],[null,1,2,1,3,null])
};
function shifted(form,offset,firstString){
  const frets=form.frets.map(f=>f===null?null:f+offset),fingers=form.fingers.map((finger,i)=>frets[i]===0?0:finger);
  const barres=form.barres.map(b=>({...b,fret:b.fret+offset}));
  if(offset>0)barres.unshift(barre(offset,firstString,5));
  return {frets,fingers,barres};
}
function pitches(voicing){return voicing.frets.flatMap((f,i)=>f===null?[]:[GUITAR_TUNING[i]+f]);}
function matches(voicing,chord,maxFret){
  if(voicing.frets.some(f=>f!==null&&(f<0||f>maxFret)))return false;
  const notes=pitches(voicing);if(!notes.length||mod(Math.min(...notes))!==chord.bass)return false;
  const wanted=new Set(CHORD_INTERVALS[chord.quality].map(n=>mod(chord.root+n)));wanted.add(chord.bass);
  const actual=new Set(notes.map(n=>mod(n)));
  return actual.size===wanted.size&&[...wanted].every(n=>actual.has(n));
}
function tidy(voicing){
  const frets=[...voicing.frets],fingers=voicing.fingers.map((f,i)=>frets[i]===null?null:f);
  const barres=voicing.barres.flatMap(b=>{
    const covered=frets.map((f,i)=>f===b.fret&&fingers[i]===b.finger&&i>=b.from&&i<=b.to?i:null).filter(i=>i!==null);
    return covered.length>1?[{...b,from:Math.min(...covered),to:Math.max(...covered)}]:[];
  });
  const positive=frets.filter(f=>f>0);return {frets,fingers,barres,baseFret:Math.max(...positive,0)<=5?1:Math.min(...positive)};
}
export function chordShape(value,capo=0){
  const chord=parseDiagramChord(value);if(!chord||!Number.isInteger(capo)||capo<0||capo>12)return null;
  // Match enharmonic names, too (for example A# and Bb).
  for(const [name,voicing] of Object.entries(OPEN)){
    const parsed=parseDiagramChord(name);
    if(parsed.root===chord.root&&parsed.quality===chord.quality&&matches(voicing,chord,24-capo))return tidy(voicing);
  }
  const candidates=[];
  for(const [forms,root,first] of [[E_FORMS,4,0],[A_FORMS,9,1]]){
    const form=forms[chord.quality];if(!form)continue;
    const voicing=shifted(form,mod(chord.root-root),first);candidates.push(voicing);
    if(chord.slash)for(let cut=first+1;cut<5;cut++)candidates.push({...voicing,frets:voicing.frets.map((f,i)=>i<cut?null:f)});
  }
  const available=candidates.filter(v=>matches(v,chord,24-capo));
  available.sort((a,b)=>Math.max(...a.frets)-Math.max(...b.frets)||pitches(b).length-pitches(a).length);
  return available.length?tidy(available[0]):null;
}
