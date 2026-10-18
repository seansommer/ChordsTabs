import {isConfigured} from './config.js';
import {validateSong} from './song-format.js';
import {isDeletedSong,readRecord} from './song-records.js';

export class Songbook {
  constructor(community){this.community=community;this.base=new Map();this.live=new Map();this.deleted=new Map();this.records={};this.liveReady=!isConfigured();this.connected=false;}
  get songs(){return [...new Set([...this.base.keys(),...this.live.keys()])].map(id=>this.get(id)).filter(Boolean);}
  get(id){return this.deleted.has(id)?undefined:this.live.get(id)||this.base.get(id);}
  has(id){return this.base.has(id)||Object.hasOwn(this.records,id);}
  accept(song,record){this.records[song.id]=record;this.applyRecord(song.id,record);this.onChange?.();}
  applyRecord(id,record){
    const content=readRecord(record);this.live.delete(id);this.deleted.delete(id);
    if(isDeletedSong(content,id)){this.deleted.set(id,content);return;}
    const song=validateSong(content);if(song.id!==id)throw new Error('Mismatched song ID.');this.live.set(id,song);
  }
  async start(onChange,onStatus=()=>{}){
    this.onChange=onChange;
    const response=await fetch('data/catalog.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('The song catalog could not be loaded.');
    const catalog=await response.json();if(!Array.isArray(catalog))throw new Error('Invalid song catalog.');
    const entries=await Promise.all(catalog.map(async entry=>{
      if(!/^songs\/[a-z0-9-]+\.json$/.test(entry.file))throw new Error('Invalid song path.');
      const res=await fetch('data/'+entry.file,{cache:'no-cache'});if(!res.ok)throw new Error('A song could not be loaded.');
      const song=validateSong(await res.json());if(song.id!==entry.id)throw new Error('Song catalog IDs do not match.');return song;
    }));
    entries.forEach(song=>this.base.set(song.id,song));
    if(!isConfigured()){onChange();return;}
    onStatus('Connecting live song updates…');
    const unavailable=()=>{this.liveReady=true;this.connected=false;onChange();onStatus('Live updates unavailable. Showing the available song files.');};
    try{
      await this.community.init();
      this.stopLive=this.community.watchSongEdits(edits=>{
        this.records=edits;this.live.clear();this.deleted.clear();let invalid=false;
        for(const [id,record] of Object.entries(edits)){
          try{this.applyRecord(id,record);}catch{invalid=true;}
        }
        this.liveReady=true;this.connected=true;onChange();onStatus(invalid?'One live edit could not be read. Its repository version is shown.':'Live song updates connected.');
      },unavailable);
    }catch{unavailable();}
  }
}
