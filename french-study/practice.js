'use strict';
const Practice=(()=>{
  const {D,state,by,all,unitBy,esc,icon,button,rg,head,notice,save,toast,shuffled}=C;
  const audioURLs=new Map(),temporaryTakes=new Map();let rec=null,activeRecordId=null,pendingRecord=false;
  const speeds=[.8,1,1.15], typeNames={choice:'Multiple choice',type:'Short answer',order:'Word order',self:'Writing or speaking response',card:'Recall card'};
  const render=()=>window.CarnetApp.render(false);
  const select=(key,vals,current,label)=>`<label class="field"><span>${esc(label)}</span><select data-filter="${key}">${vals.map(([v,n])=>`<option value="${esc(v)}" ${String(v)===String(current)?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  const speedChoice=()=>`<select data-speed class="form" aria-label="Playback speed">${speeds.map(v=>`<option value="${v}" ${v===+state.speed?'selected':''}>${v}×</option>`).join('')}</select>`;
  function audioBox(text) {
    const path=D.audio[text];
    const control=path?`<audio controls preload="metadata" data-pass-audio src="${esc(path)}" aria-label="French listening passage"></audio>`:button('Play French audio','speak-text',text,'btn-soft','volume-2');
    return `<div class="player">${control}${speedChoice()}</div><div data-audio-fallback hidden>${button('Use device French voice','speak-text',text,'btn-soft','volume-2')}${path?'<a class="link" href="'+esc(path)+'" download>Save audio file</a>':''}</div><details class="transcript"><summary>Show French transcript</summary><p class="fr-text" lang="fr">${esc(text)}</p></details>`;
  }
  function say(text){
    if(!('speechSynthesis' in window)){toast('Speech playback is unavailable in this browser. Use the transcript.');return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const voices=speechSynthesis.getVoices();const fr=voices.find(v=>v.lang.toLowerCase()==='fr-fr')||voices.find(v=>/^fr/i.test(v.lang));u.lang='fr-FR';if(fr)u.voice=fr;u.rate=state.speed;u.onerror=()=>toast('The French voice could not play. Use the transcript or a French system voice.');speechSynthesis.speak(u);
  }
  function eligible(f=state.filters){return all.filter(q=>(f.level==='All'||f.level===q.level)&&(f.skill==='All'||f.skill===q.skill)&&(f.type==='All'||f.type===q.type)&&!q.cap&&(!q.bookTrack||BookFiles.has(q.book)));}
  function sortedPractice(pool,n){return shuffled(pool).sort((a,b)=>(state.history[a.id]?.last||0)-(state.history[b.id]?.last||0)).slice(0,n);}
  function start(ids,title,source='bank',lesson=null){
    if(!ids.length){toast('There are no matching questions. Try another filter.');return;}
    state.session={ids:[...new Set(ids)],pos:0,title,source,lesson,results:[],order:{},tokens:[],checks:[],feedback:null,selfReady:false};
    save();if(location.hash==='#/session')render();else location.hash='/session';
  }
  function startBank(){const f=state.filters;const qs=sortedPractice(eligible(),+f.length||8);start(qs.map(q=>q.id),[f.level==='All'?'Mixed levels':f.level,f.skill==='All'?'Mixed practice':f.skill].join(' · '));}
  function unitSession(id,skill){
    const u=unitBy[id];if(!u)return;const qs=all.filter(q=>q.lesson===id&&q.type!=='card'&&(!skill||q.skill===skill));
    start(qs.map(q=>q.id),u.title,skill?'skill':u.id.endsWith('checkpoint')?'checkpoint':'unit',id);
  }
  function bookSession(level){const qs=sortedPractice(D.missions.filter(q=>q.book===level),8);if(!BookFiles.has(level)){toast('Attach the book archive to play its recordings.');return;}start(qs.map(q=>q.id),level+' · Textbook listening','book');}
  function review(){const ids=C.due().sort((a,b)=>state.history[a].due.localeCompare(state.history[b].due));start(ids.slice(0,15),'Due for review','review');}
  function bankPage(){
    const f=state.filters,options=s=>s.map(x=>[x,x]),pool=eligible(),count=pool.length;
    return head('Practice bank','Build a session by level, skill and question format.')+
      `<div class="panel"><div class="section-head"><h2>Build a practice set</h2><span class="tag">${count} matching</span></div><div class="filters">
      ${select('level',options(['All','Starter',...C.levels]),f.level,'Level')}
      ${select('skill',options(['All','Listening','Speaking','Reading','Writing','Grammar','Vocabulary']),f.skill,'Skill')}
      ${select('type',[['All','All formats'],...Object.entries(typeNames)],f.type,'Format')}
      ${select('length',[[5,'5 questions'],[8,'8 questions'],[15,'15 questions'],[25,'25 questions']],f.length,'Session length')}</div>
      <p class="muted">${count?`This set draws up to ${Math.min(+f.length,count)} different items. You’ll see new material before questions you have already practised.`:'Choose a different combination to find matching activities.'}</p>
      <div class="buttons"><button class="btn" data-act="start-bank" ${count?'':'disabled'}>${icon('play')} Start practice</button>${state.session?rg('session','Resume current session','btn-outline'):''}</div></div>
      <section class="section"><div class="section-head"><h2>Practice by skill</h2></div>${window.CarnetApp.skillCards()}</section>
      <section class="section grid-two"><div class="panel"><h2>Spaced review</h2><p>Return to missed items today and revisit successful answers after a growing interval.</p>${rg('review',C.due().length+' due for review','link','rotate-ccw')}</div>
      <div class="panel"><h2>Train your ear</h2><p>Compare vowels, listen for linked words and rehearse a phrase with recorded French speakers.</p>${rg('sounds','Open sound studio','link','headphones')}</div></section>`;
  }
  function optionOrder(q,run){
    if(!run.order[q.id]){const idx=q.options.map((_,i)=>i);let seq=shuffled(idx);
      if(q.type==='order'&&seq.length>1&&C.score(q,seq.map(i=>q.options[i]).join(' ')))seq=[...seq.slice(1),seq[0]];
      run.order[q.id]=seq;save();}
    return run.order[q.id];
  }
  function responseWidget(q,run){
    if(q.type==='choice')return `<fieldset class="choice-list"><legend class="sr-only">Answer choices</legend>${optionOrder(q,run).map(i=>`<label class="choice"><input type="radio" name="choice" value="${i}" required> <span>${esc(q.options[i])}</span></label>`).join('')}</fieldset>`;
    if(q.type==='type')return `<div class="entryarea"><label class="formlabel" for="typed-answer">Your answer</label><input class="answerinput" id="typed-answer" name="typed" autocomplete="off" required autocapitalize="off" spellcheck="false" value="${esc(run.temp||'')}"><small class="fade">Accents count. Capitalization and final punctuation are flexible.</small></div>`;
    if(q.type==='order'){const order=optionOrder(q,run),taken=run.tokens||[];return `<p class="muted">Select the chunks in order. Select a placed chunk to remove it.</p><div class="ordertray" aria-label="Your sentence">${taken.map((i,k)=>button(q.options[i],'token-remove',k,'token')).join('')}</div><div class="tokens">${order.filter(i=>!taken.includes(i)).map(i=>button(q.options[i],'token-add',i,'token')).join('')}</div>`;}
    return '';
  }
  function production(q){
    const value=state.drafts[q.id]||'';const speaking=q.skill==='Speaking';
    return `<div class="entryarea">${speaking?`<p>Say your response aloud. You can record and listen back on this device.</p><div class="buttons capture-tools">${button('Record my response','record',q.id,'btn-outline','mic')}${button('Stop recording','record-stop',q.id,'btn-outline','square')}<span class="meta" data-rec-for="${esc(q.id)}" data-record-status></span></div><div data-record-play="${esc(q.id)}"></div>`:''}
    <label class="formlabel" for="draft-answer">${speaking?'Optional speaking notes':'Your written response'}</label><textarea id="draft-answer" lang="fr" data-draft="${esc(q.id)}" placeholder="${speaking?'Jot down key expressions…':'Écrivez votre réponse…'}">${esc(value)}</textarea><small class="wordcount" data-wordcount>${C.words(value)} words · saved on this device</small></div>`;
  }
  function rubrics(q,run){const t=unitBy[q.lesson]?.teaching||unitBy[q.lesson]?.translation;return `<div class="study-text"><p class="label">One possible response</p><p class="fr-text" lang="fr">${esc(q.model)}</p>${SoundPlayer.hear(q.model,{label:'Listen to the model'})}${Studio.translation(q.modelEn||(q.skill==='Writing'?t?.writeEn:t?.speakEn))}</div><p>Compare your response with these criteria.</p><div class="rubric">${q.rubric.map((r,i)=>`<label><input type="checkbox" data-criteria="${i}" ${run.checks.includes(i)?'checked':''}><span>${esc(r)}</span></label>`).join('')}</div><div class="buttons">${button('Needs more practice','rate','0','btn-outline')}<button class="btn" id="met" data-act="rate" data-arg="1" ${run.checks.length===q.rubric.length?'':'disabled'}>I met these criteria</button></div>`;}
  function questionPage(){
    const run=state.session;if(!run)return state.previousSummary?summaryPage():bankPage();
    const q=by[run.ids[run.pos]],done=!!run.feedback;
    let context='';
    const speaker=q.humanId&&(D.voices||[]).find(v=>v.id===q.humanId);
    if(speaker)context=`<div class="study-text">${SoundPlayer.hear(speaker.fr,{voice:speaker,label:'Play the interview',blind:true})} ${speedChoice()}${done?Studio.translation(speaker.fr,'Read the French transcript')+Studio.translation(speaker.en,'Read the English meaning'):''}</div>`;
    else if(q.listenOnly)context='<div class="study-text">'+SoundPlayer.hear(q.listenOnly,{label:'Play sound',blind:true})+' '+speedChoice()+(done?'<p lang="fr">'+esc(q.listenOnly)+'</p>':'')+'</div>';
    else if(q.bookTrack)context=`<div class="study-text"><p class="label">${esc(q.title)}</p>${window.Shelf.trackControl(q)}</div>`;
    else if(q.audio)context=audioBox(q.audio);
    if(q.stimulus)context+=`<div class="study-text"><p class="fr-text" lang="fr">${esc(q.stimulus)}</p>${q.type==='card'?SoundPlayer.hear(q.stimulus):''}</div>`;
    const u=q.lesson?unitBy[q.lesson]:null,t=u?.teaching||u?.translation||{};
    if(done&&(q.stimulus||q.audio)){
      const en=q.skill==='Reading'&&q.stimulus===u?.reading?t.readEn:q.audio&&q.audio===u?.audio?t.listenEn:D.textHelp[q.audio||q.stimulus];
      context+=Studio.translation(en,'See the meaning in English');
    }
    if(q.type==='self'&&q.lesson){const u=unitBy[q.lesson];context=`<details class="transcript"><summary>Revisit the passage and recording</summary><div class="study-text"><p class="fr-text" lang="fr">${esc(u.reading)}</p></div>${audioBox(u.audio)}${Studio.translation(t.readEn,'English meaning of the reading')}${Studio.translation(t.listenEn,'English meaning of the recording')}</details>`;}
    const pager=button(run.pos+1===run.ids.length?'See session results':'Next question','next-question');
    let body;
    if(done){
      const f=run.feedback;const self=['card','self'].includes(q.type);
      body=`<div class="feedback ${f.ok?'':'miss'}" role="status"><b>${self?(f.ok?(q.type==='self'?'Criteria met':'Marked as remembered'):'Added to today’s review'):(f.ok?'Correct':'Review this answer')}</b>
      ${f.value?`<p>Your response: ${esc(f.value)}</p>`:''}${q.answer?`<p>Answer: <strong>${esc(q.answer)}</strong></p>`:''}${q.why?`<p>${esc(q.why)}</p>`:''}</div><div class="buttons">${pager}</div>`;
    }else if(q.type==='self'){body=production(q)+(run.selfReady?rubrics(q,run):button('Compare with the model','reveal-self','','btn','list-checks'));}
    else if(q.type==='card'){body=run.selfReady?`<div class="study-text"><b>${esc(q.answer)}</b></div><div class="buttons">${button('Review again','rate','0','btn-outline')}${button('I remembered','rate','1')}</div>`:button('Reveal meaning','reveal-self');}
    else body=`<form id="question-form">${responseWidget(q,run)}<button type="submit" class="btn">Check answer</button></form>`;
    return rg('practice','Practice bank','backlink')+`<div class="panel question"><div class="qmeta"><span>${esc(run.title)}</span><span>${run.pos+1} of ${run.ids.length}</span></div><div class="thinbar"><i style="width:${100*run.pos/run.ids.length}%"></i></div>
    <p class="eyeline">${esc(q.level)} · ${esc(q.skill)} · ${esc(typeNames[q.type]||'Practice')}</p><h2>${esc(q.prompt)}</h2>${context}${body}</div>`;
  }
  function evaluateForm(form){const run=state.session,q=run&&by[run.ids[run.pos]];if(!q||run.feedback)return;let ans='';
    if(q.type==='choice'){const i=new FormData(form).get('choice');if(i==null)return;ans=q.options[Number(i)];}
    else if(q.type==='order'){if((run.tokens||[]).length!==q.options.length){toast('Place every chunk before checking.');return;}ans=run.tokens.map(i=>q.options[i]).join(' ');}
    else ans=form.elements.typed?.value.trim();if(!ans){toast('Enter an answer first.');return;}finishQuestion(C.score(q,ans),ans);
  }
  function finishQuestion(ok,value=''){const r=state.session;if(!r||r.feedback)return;const id=r.ids[r.pos];const q=by[id];C.record(id,ok);
    r.results.push({id,ok,self:q.type==='self'||q.type==='card'});r.feedback={ok,value};save();render();C.announce(ok?'Answer recorded.':'Item added to review.');}
  function nextQuestion(){stopRecorder();SoundPlayer.stop();document.querySelectorAll('audio').forEach(a=>a.pause());const r=state.session;if(!r?.feedback)return;
    if(r.pos+1>=r.ids.length){if(['unit','checkpoint','foundation'].includes(r.source))state.completed[r.lesson]=C.dateKey();state.previousSummary={title:r.title,lesson:r.lesson,source:r.source,results:r.results,date:C.dateKey()};state.session=null;save();location.hash='/results';}
    else{r.pos++;r.feedback=null;r.selfReady=false;r.tokens=[];r.checks=[];r.temp='';save();render();window.scrollTo({top:0});}}
  function summaryPage(){
    const s=state.previousSummary;if(!s)return bankPage();
    const u=C.unitBy[s.lesson],primer=Studio.learnBy(s.lesson),sound=Studio.labBy(s.lesson),speaker=D.voices.find(v=>v.id===s.lesson);
    const nextStarter=primer&&D.foundations[D.foundations.indexOf(primer)+1];
    const back=primer?(nextStarter?rg('start/'+nextStarter.id,'Continue to '+nextStarter.title,'btn'):rg('lesson/a1-01/learn','Continue to A1','btn')):u?rg('lesson/'+u.id+'/learn','Back to this lesson','btn-outline'):sound?rg('sounds/'+sound.id,'Back to this sound workshop','btn-outline'):speaker?rg('voices/'+speaker.level,'Back to the recordings','btn-outline'):'';
    const objective=s.results.filter(r=>!r.self),self=s.results.filter(r=>r.self),miss=s.results.filter(r=>!r.ok);
    return head('Session complete',s.title)+`<div class="stats"><div class="stat"><b>${s.results.length}</b><small>Activities completed</small></div><div class="stat"><b>${objective.length?objective.filter(r=>r.ok).length+' / '+objective.length:'—'}</b><small>Checked answers correct</small></div><div class="stat"><b>${self.length?self.filter(r=>r.ok).length+' / '+self.length:'—'}</b><small>Self-rated as met</small></div></div><div class="section panel"><h2>What to revisit</h2>${miss.length?`<ul class="resource-list">${miss.map(r=>`<li>${esc(by[r.id]?.prompt||'Practice item')}</li>`).join('')}</ul>`:'<p>Every item in this session is scheduled for a later review.</p>'}<div class="buttons">${miss.length?button('Retry these items','retry-missed','','btn','rotate-ccw'):''}${back}${rg('practice','Choose another set','btn-outline')}${rg('','Back to my desk','link')}</div></div>`;
  }
  function reviewPage(){const ids=C.due(),up=Object.entries(state.history).filter(([id,h])=>h.due>C.dateKey()&&(!by[id].bookTrack||BookFiles.has(by[id].book))).sort((a,b)=>a[1].due.localeCompare(b[1].due));
    return head('Spaced review','Missed answers return today. Successful answers return after 1, 3, 7, 14, 30 and 60 days.')+`<div class="grid-two"><div class="panel"><h2>Due today</h2><p>${ids.length?esc(ids.length+' items are ready to practise again.'):'Your review queue is clear. Answer questions in the practice bank to start your schedule.'}</p><div class="buttons">${ids.length?button('Review up to '+Math.min(ids.length,15)+' items','review','','btn','rotate-ccw'):rg('practice','Open practice bank','btn')}</div></div><div class="panel"><h2>Coming up</h2>${up.length?`<ul class="resource-list">${[...new Set(up.map(([,h])=>h.due))].slice(0,5).map(d=>`<li>${C.shortDay(d)} · ${up.filter(([,h])=>h.due===d).length} items</li>`).join('')}</ul>`:'<p>Your next review dates will appear here after a practice session.</p>'}</div></div>`;
  }
  function stopRecorder(){if(rec?.state==='recording')rec.stop();}
  function cleanMedia(){stopRecorder();if('speechSynthesis' in window)speechSynthesis.cancel();for(const u of audioURLs.values())URL.revokeObjectURL(u);audioURLs.clear();}
  async function recording(id){try{return temporaryTakes.get(id)||await BookFiles.getRecording(id);}catch{return temporaryTakes.get(id);}}
  async function showRecording(id,blob){const host=[...document.querySelectorAll('[data-record-play]')].find(e=>e.dataset.recordPlay===id);if(!host)return;try{blob=blob||await recording(id);}catch{}if(!blob||!host.isConnected)return;
    const old=audioURLs.get(id);if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(blob);audioURLs.set(id,url);host.innerHTML=`<p class="meta">Your recording</p><audio controls src="${esc(url)}" aria-label="Your recorded French response"></audio>`;}
  async function recordAudio(id){if(pendingRecord||rec?.state==='recording'){toast('A recording is already in progress.');return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Recording is unavailable here. Say the response aloud and use the speaking rubric.');return;}
    let mic;const host=[...document.querySelectorAll('[data-rec-for]')].find(h=>h.dataset.recFor===id);
    SoundPlayer.stop();document.querySelectorAll('audio').forEach(a=>a.pause());
    pendingRecord=true;
    try{mic=await navigator.mediaDevices.getUserMedia({audio:true});if(!host?.isConnected){mic.getTracks().forEach(t=>t.stop());return;}
      const recorder=new MediaRecorder(mic),chunks=[];rec=recorder;activeRecordId=id;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      recorder.onstop=async()=>{mic.getTracks().forEach(t=>t.stop());if(rec===recorder){rec=null;activeRecordId=null;}
        const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});let kept=true;try{await BookFiles.saveRecording(id,blob);temporaryTakes.delete(id);}catch{kept=false;temporaryTakes.set(id,blob);}
        if(host.isConnected)host.textContent=kept?'Recording saved on this device.':'Recording available until you leave this page.';await showRecording(id,blob);};
      recorder.start();host.textContent='Recording…';}catch(e){if(mic)mic.getTracks().forEach(t=>t.stop());toast('Microphone access is unavailable. You can speak aloud and compare with the model.');}finally{pendingRecord=false;}}
  function events(a,arg){const r=state.session;switch(a){
    case 'start-bank':startBank();break;case 'review':review();break;case 'unit-practice':{const [id,skill]=arg.split('|');unitSession(id,skill);break;}case 'book-practice':bookSession(arg);break;
    case 'speak-text':say(arg);break;case 'record':recordAudio(arg);break;case 'record-stop':if(rec?.state==='recording'&&activeRecordId===arg)rec.stop();else toast('There is no recording in progress.');break;
    case 'next-question':nextQuestion();break;case 'retry-missed':{const s=state.previousSummary;if(s)start(s.results.filter(x=>!x.ok).map(x=>x.id),'Retry missed items','retry');break;}
    case 'reveal-self':if(r){stopRecorder();const q=by[r.ids[r.pos]];if(q.skill==='Writing'&&!state.drafts[q.id]?.trim()){toast('Write your response before comparing it.');return true;}r.selfReady=true;save();render();}break;
    case 'rate':if(r?.selfReady){const q=by[r.ids[r.pos]];if(arg==='1'&&q.type==='self'&&r.checks.length<q.rubric.length)return true;finishQuestion(arg==='1');}break;
    case 'token-add':if(r&&!r.tokens.includes(+arg)){r.tokens.push(+arg);save();render();}break;case 'token-remove':if(r){r.tokens.splice(+arg,1);save();render();}break;
    default:return false;
  }return true;}
  function hydrate(){document.querySelectorAll('[data-pass-audio]').forEach(a=>{
    a.playbackRate=state.speed;const fallback=a.closest('.player')?.nextElementSibling;
    if(fallback?.hasAttribute('data-audio-fallback')){a.addEventListener('error',()=>fallback.hidden=false,{once:true});if(a.error)fallback.hidden=false;}
  });document.querySelectorAll('[data-record-play]').forEach(e=>showRecording(e.dataset.recordPlay));}
  return {bankPage,questionPage,reviewPage,summaryPage,startBank,events,eligible,unitSession,start,production,rubrics,audioBox,hydrate,cleanMedia,recording,form:evaluateForm};
})();
