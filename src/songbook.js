import {isConfigured} from './config.js';
import {validateSong} from './song-format.js';

export class Songbook {
  constructor(community){this.community=community;this.base=new Map();this.live=new Map();this.records={};this.liveReady=!isConfigured();}
  get songs(){return [...new Set([...this.base.keys(),...this.live.keys()])].map(id=>this.get(id));}
  get(id){return this.live.get(id)||this.base.get(id);}
  accept(song,record){this.records[song.id]=record;this.live.set(song.id,song);this.onChange?.();}
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
    entries.forEach(song=>this.base.set(song.id,song));onChange();
    if(!isConfigured())return;
    onStatus('Connecting live song updates…');
    const unavailable=()=>{this.liveReady=true;onChange();onStatus('Live updates unavailable. Showing the available song files.');};
    try{
      await this.community.init();
      this.stopLive=this.community.watchSongEdits(edits=>{
        this.records=edits;this.live.clear();let invalid=false;
        for(const [id,record] of Object.entries(edits)){
          try{const song=validateSong(JSON.parse(record.content));if(song.id!==id)throw new Error();this.live.set(id,song);}catch{invalid=true;}
        }
        this.liveReady=true;onChange();onStatus(invalid?'One live edit could not be read. Its repository version is shown.':'Live song updates connected.');
      },unavailable);
    }catch{unavailable();}
  }
}
