import {initialScrollSpeed,scrollSpeed} from './scroll.js';

export class SongScrollSpeeds {
  constructor(read,write){this.read=read;this.write=write;this.defaultSpeed=initialScrollSpeed(read('music-center.scroll-speed.v2',null),read('music-center.scroll-speed',null));}
  key(id){return 'music-center.song-scroll-speed.v1.'+id;}
  forSong(id){return scrollSpeed(this.read(this.key(id),null),this.defaultSpeed);}
  save(id,value){if(id)this.write(this.key(id),scrollSpeed(value,this.defaultSpeed));}
}
