import {transposeChord,noteValue,mediaSource,directMediaSource} from './music.js';
export function validateSong(song){
  if(!song||typeof song!=='object')throw new Error('Invalid song file.');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.id||'')||song.id.length>100)throw new Error('Invalid song ID.');
  for(const key of ['title','artist'])if(typeof song[key]!=='string'||!song[key].trim()||song[key].length>120)throw new Error(`Enter a ${key} up to 120 characters.`);
  noteValue(song.key);if(!Number.isInteger(song.capo)||song.capo<0||song.capo>12)throw new Error('Choose an original capo fret between 0 and 12.');
  if(song.sourceUrl&&!mediaSource(song.sourceUrl))throw new Error('Use an HTTPS song/video link.');
  if(song.audioUrl&&!directMediaSource(song.audioUrl))throw new Error('Use a direct HTTPS audio or video file link, such as .mp3, .m4a, or .mp4. Keep social-post links in Original song / video link.');
  if(typeof song.status!=='string'||song.status.length>80)throw new Error('Invalid arrangement status.');
  if(song.tags!==undefined&&(!Array.isArray(song.tags)||song.tags.some(t=>typeof t!=='string')))throw new Error('Invalid song tags.');
  if(!Array.isArray(song.notes)||song.notes.some(n=>typeof n!=='string'||n.length>5000))throw new Error('Invalid arrangement notes.');
  if(!Array.isArray(song.sections)||!song.sections.length||song.sections.length>100)throw new Error('Add between 1 and 100 song sections.');
  let lineCount=0;
  for(const section of song.sections){
    if(typeof section.name!=='string'||!section.name.trim()||section.name.length>100)throw new Error('Give each section a name up to 100 characters.');
    if(section.tab){
      if(!Array.isArray(section.tab)||section.tab.length!==6)throw new Error('Guitar tabs need six string rows.');
      const columns=section.tab[0]?.frets?.length;
      if(!columns||columns>500)throw new Error('A tab section needs 1–500 note positions.');
      section.tab.forEach(r=>{if(typeof r.string!=='string'||r.string.length>3||!Array.isArray(r.frets)||r.frets.length!==columns||r.frets.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f>24)))throw new Error('Tab rows must have matching lengths and fret numbers from 0 to 24, or null for rests.');});
    }else{
      if(!Array.isArray(section.lines)||!section.lines.length)throw new Error(`Add lyrics or chords to ${section.name}.`);
      for(const line of section.lines){
        lineCount++;if(typeof line.lyrics!=='string'||line.lyrics.length>2000||!Array.isArray(line.chords))throw new Error('Invalid lyric line.');
        let previous=-1;
        for(const c of line.chords){if(!Number.isInteger(c.at)||c.at<0||c.at>line.lyrics.length||c.at<previous||typeof c.chord!=='string'||c.chord.length>24)throw new Error('A chord is outside its lyric line.');transposeChord(c.chord,0);previous=c.at;}
      }
    }
  }
  if(lineCount>2000||JSON.stringify(song).length>200000)throw new Error('This song is too long.');
  return song;
}
export function serializeChart(sections){
  return sections.filter(s=>!s.tab).map(s=>'# '+s.name+'\n'+s.lines.map(line=>{
    let result='',cursor=0;
    for(const c of [...line.chords].sort((a,b)=>a.at-b.at)){result+=line.lyrics.slice(cursor,c.at)+`[${c.chord}]`;cursor=c.at;}
    return result+line.lyrics.slice(cursor);
  }).join('\n')).join('\n\n');
}
export function parseChart(text){
  const sections=[];let section=null;
  for(const raw of text.replace(/\r/g,'').split('\n')){
    if(!raw.trim())continue;
    if(/^#\s+/.test(raw)){section={name:raw.replace(/^#\s+/,''),lines:[]};sections.push(section);continue;}
    if(!section){section={name:'Song',lines:[]};sections.push(section);}
    const chords=[];let lyrics='',cursor=0;
    for(const m of raw.matchAll(/\[([^\]\n]+)\]/g)){
      let valid=false;try{transposeChord(m[1],0);valid=true;}catch{}
      if(!valid)continue;
      lyrics+=raw.slice(cursor,m.index);chords.push({at:lyrics.length,chord:m[1]});cursor=m.index+m[0].length;
    }
    lyrics+=raw.slice(cursor);section.lines.push({lyrics,chords});
  }
  return sections;
}
