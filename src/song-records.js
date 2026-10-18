// Deletion is a versioned marker so a repository song cannot reappear underneath it.
export function isDeletedSong(value,id=value?.id){
  return value?.schemaVersion===1&&value.id===id&&value.deleted===true&&typeof value.title==='string'&&typeof value.artist==='string';
}
export function readRecord(record){try{return JSON.parse(record.content);}catch{return null;}}
export function nextSongRecord(current,{content,previousContent,expectedRevision,uid,timestamp}){
  if((current?.revision||0)!==expectedRevision)return;
  const previous=current&&!isDeletedSong(readRecord(current))?current.content:current?.previousContent||previousContent||content;
  return {content,previousContent:previous,revision:expectedRevision+1,updatedBy:uid,updatedAt:timestamp};
}
