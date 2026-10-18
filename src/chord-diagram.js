import {chordShape} from './chord-shapes.js';
import {transposeChord} from './music.js';

const STRINGS=['low E','A','D','G','B','high e'];
function svgNode(tag,attributes={},text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;}
export function drawChordDiagram(voicing,chord,capo){
  const {frets,fingers,barres,baseFret}=voicing;
  const description=frets.map((f,i)=>`${STRINGS[i]}: ${f===null?'muted':f===0?'open':'fret '+f}`).join(', ');
  const svg=svgNode('svg',{viewBox:'0 0 240 238',role:'img','aria-label':`${chord} fingering. ${description}. ${capo?'Frets relative to capo '+capo+'.':'No capo.'}`});
  const x=i=>45+i*30,y=f=>46+(f-baseFret+.5)*32;
  for(let row=0;row<=5;row++)svg.append(svgNode('line',{x1:x(0),x2:x(5),y1:46+row*32,y2:46+row*32,stroke:'currentColor','stroke-width':row===0&&baseFret===1?4:1}));
  for(let string=0;string<6;string++)svg.append(svgNode('line',{x1:x(string),x2:x(string),y1:46,y2:206,stroke:'currentColor','stroke-width':1.5}));
  for(let row=0;row<5;row++)svg.append(svgNode('text',{x:23,y:66+row*32,'text-anchor':'middle','font-size':11,fill:'currentColor'},baseFret+row));
  for(const b of barres){svg.append(svgNode('line',{x1:x(b.from),x2:x(b.to),y1:y(b.fret),y2:y(b.fret),class:'fingering-mark','stroke-width':19,'stroke-linecap':'round'}));}
  frets.forEach((f,i)=>{
    svg.append(svgNode('text',{x:x(i),y:229,'text-anchor':'middle','font-size':12,fill:'currentColor'},['E','A','D','G','B','e'][i]));
    if(f===null){svg.append(svgNode('text',{x:x(i),y:30,'text-anchor':'middle','font-size':20,fill:'currentColor'},'×'));return;}
    if(f===0){svg.append(svgNode('circle',{cx:x(i),cy:24,r:6,fill:'none',stroke:'currentColor','stroke-width':1.5}));return;}
    if(barres.some(b=>b.fret===f&&b.finger===fingers[i]&&i>=b.from&&i<=b.to))return;
    svg.append(svgNode('circle',{cx:x(i),cy:y(f),r:10,class:'fingering-dot'}),svgNode('text',{x:x(i),y:y(f)+4,'text-anchor':'middle','font-size':12,class:'fingering-number'},fingers[i]));
  });
  for(const b of barres)svg.append(svgNode('text',{x:(x(b.from)+x(b.to))/2,y:y(b.fret)+4,'text-anchor':'middle','font-size':12,class:'fingering-number'},b.finger));
  return svg;
}

export function initChordDiagrams({getSettings,getVideoHeight}){
  const get=id=>document.getElementById(id),card=get('chord-card');let trigger=null;
  const resize=()=>card.style.setProperty('--chord-video-space',(getVideoHeight()||0)+'px');
  function close(restore=false){if(card.open)card.close();if(restore&&trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;}
  function open(chord,button){
    const {capo=0,flats=false}=getSettings(),voicing=chordShape(chord,capo);trigger=button;
    get('chord-card-title').textContent=chord;
    get('chord-card-context').textContent=capo?`Capo ${capo} · sounds as ${transposeChord(chord,capo,flats)}`:'Standard tuning · no capo';
    get('chord-card-diagram').replaceChildren(...(voicing?[drawChordDiagram(voicing,chord,capo)]:[]));
    get('chord-card-unavailable').hidden=!!voicing;get('chord-card-legend').hidden=!voicing;
    get('chord-card-open').textContent=capo?`○ Open at capo ${capo} · × Do not play`:'○ Open string · × Do not play';
    resize();if(!card.open){card.show();get('close-chord-card').focus({preventScroll:true});}
  }
  get('close-chord-card').onclick=()=>close(true);
  document.addEventListener('pointerdown',event=>{if(card.open&&!card.contains(event.target)&&!event.target.closest?.('.chord-trigger'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&card.open){event.preventDefault();close(true);}});
  window.addEventListener('resize',resize);window.addEventListener('pagehide',()=>close());
  return {open,close};
}
