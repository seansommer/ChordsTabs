import {$,readStore,writeStore,notify} from './ui.js';
import {mediaSource,directMediaSource} from './music.js';
import {PlaybackLoop} from './playback-loop.js';

let youtubeReady,vimeoReady;
function loadYouTube(){
  if(globalThis.YT?.Player)return Promise.resolve();
  if(youtubeReady)return youtubeReady;
  youtubeReady=new Promise((resolve,reject)=>{
    const script=document.createElement('script'),previous=globalThis.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>{script.remove();youtubeReady=null;reject(new Error('YouTube is taking too long to load. Try again or use an audio file.'));},20000);
    globalThis.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve();};
    script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);script.remove();youtubeReady=null;reject(new Error('YouTube could not load. Try an audio file instead.'));};document.head.append(script);
  });return youtubeReady;
}
function loadVimeo(){
  if(globalThis.Vimeo?.Player)return Promise.resolve();if(vimeoReady)return vimeoReady;
  vimeoReady=new Promise((resolve,reject)=>{
    const script=document.createElement('script');const fail=()=>{script.remove();vimeoReady=null;reject(new Error('Vimeo could not load. Try an audio file instead.'));};
    const timer=setTimeout(fail,20000);script.src='https://player.vimeo.com/api/player.js';script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);fail();};document.head.append(script);
  });return vimeoReady;
}

export function initPlayback({scroller,beforeScroll}){
  const audio=$('#practice-audio'),panel=$('#playback-panel'),dock=$('#practice-video-dock');
  let song=null,adapter=null,loop=null,generation=0,objectUrl=null,fileName='',playing=false,follow=true,loading=false,ready=false,lastState='';
  $('#repeat-audio').checked=readStore('music-center.repeat-audio',false)===true;
  function status(message){$('#playback-status').textContent=message;}
  function controls(){
    const video=adapter?.video||(!objectUrl&&!directMediaSource(song?.audioUrl)&&mediaSource(song?.sourceUrl)?.provider);
    $('#play-audio').textContent=playing?(video?'Ⅱ Pause video':'Ⅱ Pause audio'):video?'▶ Play video':'▶ Play audio';
    $('#play-audio').setAttribute('aria-pressed',String(playing));$('#play-audio').disabled=loading;
    $('#playback-restart').disabled=!ready;$('#playback-stop').disabled=!adapter;$('#scroll-with-audio').checked=follow;
  }
  function startScroll(reset=false){
    if(!follow||document.hidden)return;beforeScroll();
    if(reset)scroller.restart();else scroller.start();
  }
  function error(error){
    playing=false;loading=false;scroller.stop('media');
    const message=error?.name==='NotAllowedError'?'Tap Play audio again, or tap play on the video player.':error?.message||'This recording could not play. Choose another file or open the original link.';
    status(message);controls();notify(message);
  }
  function state(value,token){
    if(token!==generation)return;
    lastState=value;
    playing=value==='playing';
    if(value==='playing'){loading=false;status($('#repeat-audio').checked?'Playing · repeat is on.':'Playing.');}
    else if(value==='buffering')status('Buffering…');
    else if(value==='paused')status('Paused.');
    else if(value==='ended')status($('#repeat-audio').checked?'Starting again…':'Finished. Play again whenever you are ready.');
    controls();loop?.state(value);
  }
  function stop(){
    generation++;loop?.dispose();loop=null;const old=adapter;adapter=null;playing=false;loading=false;ready=false;lastState='';
    audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;
    try{Promise.resolve(old?.destroy?.()).catch(()=>{});}catch{}
    $('#practice-video-holder').replaceChildren();dock.hidden=true;document.body.classList.remove('has-practice-video');
    scroller.stop('media');controls();
  }
  function install(next,token){
    if(token!==generation){next.destroy?.();return false;}
    adapter=next;ready=true;loading=false;
    loop=new PlaybackLoop({repeat:()=>$('#repeat-audio').checked,seek:time=>adapter?.seek(time),play:()=>adapter?.play(),onPlaying:()=>startScroll(),onPause:()=>scroller.stop('media'),onRestart:()=>startScroll(true),onError:error});
    loop.restartPending=true;
    controls();return true;
  }
  function nativeSource(url,label){
    const token=generation;audio.hidden=false;audio.loop=false;audio.src=url;audio.load();
    audio.onplaying=()=>state('playing',token);audio.onpause=()=>state('paused',token);audio.onwaiting=()=>state('buffering',token);audio.onended=()=>state('ended',token);
    audio.onerror=()=>{if(token===generation)error(new Error('This file could not be played. Try an MP3, M4A, or MP4 with a supported audio track.'));};
    install({video:false,play:()=>audio.play(),pause:()=>audio.pause(),seek:time=>{audio.currentTime=time;},destroy:()=>{}},token);
    status(label+' · ready to play.');
  }
  async function embeddedSource(source){
    const token=generation;loading=true;controls();status('Loading the original player…');dock.hidden=false;document.body.classList.add('has-practice-video');
    $('#practice-video-caption').textContent=song.title+' — '+song.artist;
    const holder=$('#practice-video-holder');holder.replaceChildren();
    if(source.provider==='youtube'){
      await loadYouTube();if(token!==generation)return;
      const mount=document.createElement('div');holder.append(mount);
      const player=new YT.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:'203',videoId:source.videoId,playerVars:{playsinline:1,origin:location.origin,rel:0},events:{
        onReady:()=>{
          if(install({video:true,play:()=>player.playVideo(),pause:()=>player.pauseVideo(),seek:time=>player.seekTo(time,true),destroy:()=>player.destroy()},token)){status('Tap play on the video if it does not start.');player.playVideo();}
        },
        onStateChange:event=>{const value={0:'ended',1:'playing',2:'paused',3:'buffering'}[event.data];if(value)state(value,token);},
        onAutoplayBlocked:()=>{if(token===generation){loading=false;controls();status('Tap the play button on the video to begin.');}},
        onError:()=>{if(token===generation)error(new Error('YouTube cannot play this video here. Open the original link or choose an audio file.'));}
      }});
      // Allow cleanup even when the player never reaches ready.
      adapter={video:true,destroy:()=>player.destroy()};
    }else if(source.provider==='vimeo'){
      await loadVimeo();if(token!==generation)return;
      const player=new Vimeo.Player(holder,{id:Number(source.videoId),width:360,height:203,playsinline:true,loop:false});
      adapter={video:true,destroy:()=>player.destroy()};
      player.on('playing',()=>state('playing',token));player.on('pause',()=>state('paused',token));player.on('bufferstart',()=>state('buffering',token));player.on('ended',()=>state('ended',token));
      player.on('error',()=>{if(token===generation)error(new Error('Vimeo cannot play this video here. Open the original link or choose an audio file.'));});
      await player.ready();if(token!==generation)return;
      install({video:true,play:()=>player.play(),pause:()=>player.pause(),seek:time=>player.setCurrentTime(time),destroy:()=>player.destroy()},token);await player.play();
    }
  }
  async function play(){
    panel.open=true;
    let token=generation;
    try{
      if(playing){loop?.cancel();await adapter?.pause?.();return;}
      if(adapter&&ready){if(lastState==='ended')await loop.restart();else await adapter.play();return;}
      stop();token=generation;
      const url=objectUrl||directMediaSource(song?.audioUrl)||directMediaSource(song?.sourceUrl),source=mediaSource(song?.sourceUrl);
      if(url){nativeSource(url,fileName||'Song audio');await adapter.play();}
      else if(source?.provider)await embeddedSource(source);
      else{status(source?.kind==='instagram'?'Choose the audio file or a screen recording of this performance. Instagram does not provide automatic playback or repeat controls here.':'Choose an audio or video file, or add a direct audio link in the master editor.');$('#playback-file').focus();}
    }catch(cause){if(token===generation)error(cause);}
  }
  $('#play-audio').onclick=play;
  $('#playback-file').onchange=()=>{
    const file=$('#playback-file').files[0];if(!file)return;
    stop();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);fileName=file.name;
    nativeSource(objectUrl,fileName);$('#use-song-audio').hidden=false;panel.open=true;
  };
  $('#use-song-audio').onclick=()=>{stop();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;fileName='';$('#playback-file').value='';$('#use-song-audio').hidden=true;describe();};
  $('#repeat-audio').onchange=()=>{writeStore('music-center.repeat-audio',$('#repeat-audio').checked);if(playing)status($('#repeat-audio').checked?'Playing · repeat is on.':'Playing.');};
  $('#scroll-with-audio').onchange=()=>{follow=$('#scroll-with-audio').checked;if(!follow)scroller.stop('media');else if(playing)startScroll();};
  $('#playback-restart').onclick=()=>loop?.restart();
  $('#playback-stop').onclick=()=>{stop();status('Stopped.');};
  $('#close-practice-video').onclick=()=>{stop();status('Video stopped.');};
  function describe(){
    const source=mediaSource(song?.sourceUrl),direct=directMediaSource(song?.audioUrl)||directMediaSource(song?.sourceUrl);
    $('#playback-support').textContent=direct?'Play the recording behind the chart. Repeat returns the chart to the top when the recording starts again.':source?.provider?'Play along with the original video in a small visible player. For audio-only practice, choose a recording from your device.':source?.kind==='instagram'?'Instagram supports watching here, but does not provide automatic repeat controls. Choose an audio file or screen recording for background audio and repeat.':'Choose an audio or video recording to play behind the chart.';
    status('Ready when you are.');
  }
  function setSong(next){
    if(song?.id===next?.id&&song?.audioUrl===next?.audioUrl&&song?.sourceUrl===next?.sourceUrl){song=next;return;}
    stop();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;fileName='';song=next;follow=true;$('#playback-file').value='';$('#use-song-audio').hidden=true;panel.open=false;describe();controls();
  }
  function suspendScroll(){follow=false;$('#scroll-with-audio').checked=false;}
  function enableScroll(){follow=true;$('#scroll-with-audio').checked=true;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){loop?.cancel();try{Promise.resolve(adapter?.pause?.()).catch(()=>{});}catch{}scroller.stop('media');}});
  window.addEventListener('pagehide',stop);
  controls();return {setSong,stop,suspendScroll,enableScroll,hasVideo:()=>!dock.hidden,videoHeight:()=>dock.hidden?0:dock.offsetHeight+16};
}
