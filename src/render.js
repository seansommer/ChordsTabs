import {element} from './ui.js';
import {textSegments,transposeChord,transposeTab,tabText,shapeShift} from './music.js';
export function renderSheet(target,song,{transpose=0,capo=song.capo,font=20,flats=false,lyricsOnly=false,onChord=null}={}){
  target.replaceChildren();target.style.setProperty('--song-size',`${font}px`);target.classList.toggle('lyrics-only',lyricsOnly);
  const shift=shapeShift(song,transpose,capo);let rendered=0;
  for(const section of song.sections){
    if(lyricsOnly&&(section.tab||section.lines.every(l=>!l.lyrics.trim())))continue;
    const node=element('section','song-section');node.append(element('h3','',section.name));
    if(section.tab){
      const transposed=transposeTab(section.tab,shift,24-capo);
      if(transposed.playable){const pre=element('pre','tab-block',tabText(transposed.rows));pre.setAttribute('aria-label',`${section.name}, guitar tablature`);node.append(pre);}
      else node.append(element('p','tab-warning','This key and capo combination puts some notes outside the fretboard. Lower the capo or change the key shift to see a playable tab on the same strings.'));
    }else for(const line of section.lines){
      if(lyricsOnly&&!line.lyrics.trim())continue;
      const row=element('div',`song-line${!line.lyrics.trim()?' chord-line-only':''}`);
      if(lyricsOnly)row.append(element('span','lyric-text',line.lyrics));
      else for(const segment of textSegments(line)){
        const piece=element('span','lyric-piece'),name=segment.chord?transposeChord(segment.chord,shift,flats):'\u00a0';
        const interactive=onChord&&segment.chord&&!['N.C.','NC','N/C','—'].includes(name),label=element(interactive?'button':'span',interactive?'chord chord-trigger':'chord',name);
        if(interactive){label.type='button';label.setAttribute('aria-label',`Show ${name} guitar fingering`);label.setAttribute('aria-haspopup','dialog');label.setAttribute('aria-controls','chord-card');label.onclick=()=>onChord(name,label);}
        piece.append(label,element('span','lyric-text',segment.text));row.append(piece);
      }
      node.append(row);
    }
    target.append(node);rendered++;
  }
  if(!rendered)target.append(element('p','tab-warning','This arrangement is instrumental, so there are no lyrics to display. Choose Chords & tabs to play it.'));
}
