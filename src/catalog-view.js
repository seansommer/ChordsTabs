import {searchSongs,normalizeSearch} from './music.js';

export function quickMatches(songs,query){
  return query.trim()?searchSongs(songs,query,'title').slice(0,3):[];
}

export function artistGroups(songs,query=''){
  const groups=new Map();
  for(const song of searchSongs(songs,query,'title')){
    const key=normalizeSearch(song.artist);
    if(!groups.has(key))groups.set(key,{name:song.artist,songs:[]});
    groups.get(key).songs.push(song);
  }
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
}

export function songHref(id){return './?'+new URLSearchParams({song:id});}
