export const SHARPS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const FLATS=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NATURALS={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export const mod=(n,m=12)=>((n%m)+m)%m;
export function noteValue(note){const m=/^([A-G])([#b♯♭]?)$/.exec(note);if(!m)throw new Error(`Invalid note: ${note}`);return mod(NATURALS[m[1]]+(['#','♯'].includes(m[2])?1:['b','♭'].includes(m[2])?-1:0));}
export function transposeNote(note,steps,flats=false){return(flats?FLATS:SHARPS)[mod(noteValue(note)+steps)];}
export function transposeChord(chord,steps,flats=false){
  if(['N.C.','NC','N/C','—'].includes(chord))return chord;
  const m=/^([A-G][#b♯♭]?)([^/]*)(?:\/([A-G][#b♯♭]?))?$/.exec(chord);
  if(!m)throw new Error(`Unsupported chord: ${chord}`);
  return transposeNote(m[1],steps,flats)+m[2]+(m[3]?'/'+transposeNote(m[3],steps,flats):'');
}
export function shapeShift(song,transpose,capo){return transpose+(song.capo||0)-capo;}
export function transposeTab(rows,shift,maxFret=24){
  let invalid=false;const result=rows.map(row=>({...row,frets:row.frets.map(f=>{if(f===null)return null;const n=f+shift;if(!Number.isInteger(n)||n<0||n>maxFret)invalid=true;return n;})}));
  return {rows:result,playable:!invalid};
}
export function tabText(rows){
  const width=Math.max(2,...rows.flatMap(row=>row.frets.filter(f=>f!==null).map(f=>String(f).length+1)));
  return rows.map(row=>`${row.string.padStart(2)} |${row.frets.map(f=>(f===null?'':String(f)).padEnd(width,'-')).join('')}|`).join('\n');
}
export function textSegments(line){
  const result=[];const changes=[...(line.chords||[])].sort((a,b)=>a.at-b.at);
  if(!changes.length)return[{chord:'',text:line.lyrics||''}];
  if(changes[0].at>0)result.push({chord:'',text:line.lyrics.slice(0,changes[0].at)});
  changes.forEach((c,i)=>result.push({chord:c.chord,text:line.lyrics.slice(c.at,changes[i+1]?.at??line.lyrics.length)||' '}));
  return result;
}
export const normalizeSearch=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function searchSongs(songs,query,sort='artist'){
  const words=normalizeSearch(query).split(/\s+/).filter(Boolean);
  return songs.filter(s=>words.every(w=>normalizeSearch(`${s.title} ${s.artist} ${(s.tags||[]).join(' ')}`).includes(w))).sort((a,b)=>{
    const first=sort==='title'?'title':'artist',second=sort==='title'?'artist':'title';
    return a[first].localeCompare(b[first],undefined,{sensitivity:'base'})||a[second].localeCompare(b[second],undefined,{sensitivity:'base'});
  });
}
export function mediaSource(value){
  let u;try{u=new URL(value);}catch{return null;}
  if(u.protocol!=='https:'||u.username||u.password)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');let embed=null,provider=null,videoId=null;
  if(['youtube.com','m.youtube.com','youtu.be'].includes(host)){
    const id=host==='youtu.be'?u.pathname.split('/')[1]:u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.searchParams.get('v');
    if(/^[A-Za-z0-9_-]{11}$/.test(id||'')){embed=`https://www.youtube-nocookie.com/embed/${id}`;provider='youtube';videoId=id;}
  }else if(host==='vimeo.com'&&/^\/\d+\/?$/.test(u.pathname)){videoId=u.pathname.split('/')[1];embed=`https://player.vimeo.com/video/${videoId}`;provider='vimeo';
  }else if(host==='instagram.com'){
    const m=/^\/(reel|p)\/([A-Za-z0-9_-]+)\/?$/.exec(u.pathname);if(m)embed=`https://www.instagram.com/${m[1]}/${m[2]}/embed/`;
  }
  return {url:u.href,embed,provider,videoId,kind:host==='instagram.com'?'instagram':'video'};
}
export function directMediaSource(value){
  const source=mediaSource(value);if(!source||source.embed)return null;
  return /\.(mp3|m4a|aac|wav|ogg|oga|opus|mp4|m4v|mov|webm)$/i.test(new URL(source.url).pathname)?source.url:null;
}
