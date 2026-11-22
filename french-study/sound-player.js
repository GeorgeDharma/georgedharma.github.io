'use strict';
const SoundPlayer = (() => {
  const {D, button, esc, icon, state, toast} = C;
  const normal = value => String(value || '').normalize('NFC').trim().replace(/\s+/g,' ');
  const humanKey = value => normal(value).toLocaleLowerCase('fr').replace(/[.,!;:«»“”’'‑-]/g,'').replace(/\s+/g,' ').trim();
  const humanByText = new Map();
  const refs = new Map();
  const ids = new Map();
  let media, ticket = 0, stopClip = null, loadedUrl = '', activeButton = null;
  for (const sample of D.voices || []) {
    const k=humanKey(sample.fr);
    if (!humanByText.has(k)) humanByText.set(k,sample);
  }
  function get(text, voice) {
    const fr=normal(text);
    const human = voice || humanByText.get(humanKey(fr));
    if(human) return {src:human.file,start:0,end:null,human:true,speaker:human.speaker,fr};
    const packed=D.examplesAudio?.[fr];
    if(packed) return {src:packed[0],start:packed[1],end:packed[2],human:false,fr};
    if(D.audio[fr]) return {src:D.audio[fr],start:0,end:null,human:false,fr};
    return null;
  }
  function reference(clip) {
    if(!clip)return '';
    const key=[clip.src,clip.start,clip.end].join('|');
    if(ids.has(key))return ids.get(key);
    const id=String(ids.size+1);
    ids.set(key,id);refs.set(id,clip);return id;
  }
  function hear(text, {voice=null,label='Listen',blind=false}={}) {
    const clip=get(text,voice);if(!clip)return '';
    const id=reference(clip), hint=blind?'Listen to the sound':label==='Listen'?'Listen to '+clip.fr:label==='Hear'?'Hear '+clip.fr:label+' · '+clip.fr;
    return `<button type="button" class="listen-mini" data-act="play-clip" data-arg="${id}" aria-pressed="false" aria-label="${esc(hint)}" title="${esc(hint)}">${icon('volume-2')}<span>${esc(label)}</span></button>`;
  }
  function setPlaying(b) {
    if(activeButton?.isConnected)activeButton.setAttribute('aria-pressed','false');
    activeButton=b||null;
    if(activeButton?.isConnected)activeButton.setAttribute('aria-pressed','true');
  }
  function stop() {
    ticket++;
    if(stopClip)stopClip(false);
    if(media){media.pause();media.onloadedmetadata=null;media.ontimeupdate=null;media.onended=null;media.onerror=null;}
    setPlaying(null);
  }
  function play(clip, b=null, own=false) {
    if(!clip)return Promise.resolve(false);
    stop();
    const seq=ticket;
    if(!media)media=new Audio();
    const a=media;
    return new Promise(resolve=>{
      let watchdog=null,finished=false;
      const finish=ok=>{
        if(finished)return;finished=true;clearInterval(watchdog);
        if(seq===ticket){a.pause();setPlaying(null);}
        if(stopClip===finish)stopClip=null;
        resolve(ok);
      };
      stopClip=finish;setPlaying(b);
      const clipEnd=Number.isFinite(clip.end)?clip.end:null;
      const atStart=()=>{try{a.currentTime=clip.start||0;}catch{/* Browsers also read the media fragment. */}};
      const atEnd=()=>{if(seq===ticket&&clipEnd!==null&&a.currentTime>=clipEnd-0.025)finish(true);};
      a.ontimeupdate=atEnd;
      a.onended=()=>finish(true);
      a.onerror=()=>{if(seq===ticket)toast('Audio could not be played. Reopen the page or try the downloaded course.');finish(false);};
      a.onloadedmetadata=()=>{if(seq===ticket)atStart();};
      if(loadedUrl!==clip.src){
        loadedUrl=clip.src;
        a.src=clip.src+(clip.start>0?'#t='+clip.start:'');
        a.preload='auto';
      }
      atStart();a.playbackRate=own?1:state.speed;
      if('preservesPitch' in a)a.preservesPitch=true;
      watchdog=setInterval(atEnd,40);
      a.play().catch(()=>{if(seq===ticket&&!finished)toast('Tap Listen again to play the model.');finish(false);});
    });
  }
  function playButton(id,button) {
    if(activeButton===button){stop();return;}
    document.querySelectorAll('audio').forEach(a=>a.pause());
    play(refs.get(id),button);
  }
  function speed(value){if(media&&!media.paused)media.playbackRate=value;}
  async function compare(id,recordId,b) {
    const blob=await Practice.recording(recordId);
    if(!blob){toast('Record a take first, then compare it with the model.');return;}
    const clip=refs.get(id);
    if(!clip||!b?.isConnected)return;
    document.querySelectorAll('audio').forEach(a=>a.pause());
    const done=await play(clip,b);
    if(!done||!b.isConnected)return;
    const src=URL.createObjectURL(blob);
    try{await play({src,start:0,end:null},b,true);}
    finally{URL.revokeObjectURL(src);}
  }
  function stopForPage(){stop();refs.clear();ids.clear();}
  return {get,reference,hear,playButton,stop,stopForPage,compare,speed};
})();
