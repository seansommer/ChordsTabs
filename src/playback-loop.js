// Restart the chart only after the repeated track actually begins playing.
export class PlaybackLoop {
  constructor({repeat,seek,play,onPlaying,onPause,onRestart,onError}){Object.assign(this,{repeat,seek,play,onPlaying,onPause,onRestart,onError});this.version=0;this.restartPending=false;this.disposed=false;}
  state(state){
    if(this.disposed)return;
    if(state==='playing'){if(this.restartPending){this.restartPending=false;this.onRestart();}else this.onPlaying();}
    else if(state==='paused'||state==='buffering')this.onPause();
    else if(state==='ended'){this.onPause();if(this.repeat())return this.restart();}
  }
  async restart(){
    const version=++this.version;this.restartPending=true;
    try{await this.seek(0);if(!this.disposed&&version===this.version)await this.play();}
    catch(error){if(!this.disposed&&version===this.version){this.restartPending=false;this.onPause();this.onError(error);}}
  }
  cancel(){this.version++;this.restartPending=false;}
  dispose(){this.cancel();this.disposed=true;}
}
