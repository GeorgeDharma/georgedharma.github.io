'use strict';
const Studio = (() => {
  const {D,state,esc,icon,button,rg,head,save,toast} = C;
  const learnBy = (id) => D.foundations.find(u=>u.id===id);
  const labBy = (id) => D.soundLab.find(u=>u.id===id);
  const selection=new Map();
  const voiceCredits=(v)=>`<span class="audio-credit">${esc(v.speaker)}${v.region?' · '+esc(v.region):''} · ${C.ext(v.source,'Recording source')} · ${C.ext(v.licenseUrl,v.license)}</span>`;
  const para=text=>`<p>${esc(text)}</p>`;
  
  function line(row) {
    return `<div class="worked-example"><div><b lang="fr">${esc(row.fr)}</b><span>${esc(row.en)}</span>${row.why?`<p class="example-reason">${esc(row.why)}</p>`:''}</div>${SoundPlayer.hear(row.fr)}</div>`;
  }
  function translation(text,label='Show the English meaning') {
    return text?`<details class="translation"><summary>${esc(label)}</summary><p>${esc(text)}</p></details>`:'';
  }
  function wordBank(rows) {
    if(!rows?.length)return '';
    return `<section class="panel vocabulary"><h2>Words you’ll need</h2><div class="word-grid">${rows.map(row=>`<div class="word-card"><div class="word-pair"><b lang="fr">${esc(row.fr)}</b>${SoundPlayer.hear(row.fr,{label:'Hear'})}</div><span>${esc(row.en)}</span><small>${esc(row.note)}</small></div>`).join('')}</div></section>`;
  }
  function firstWords(where, value) {
    const groups=(D.firstWords||[]).filter(group=>group[where]===value);
    if(!groups.length)return '';
    const entries=rows=>`<div class="sound-grid">${rows.map(r=>`<div class="sound-tile"><span class="sound-label">${esc(r.label)}</span><b lang="fr">${esc(r.fr)}</b><span>${esc(r.en)}</span>${SoundPlayer.hear(r.fr,{label:'Hear'})}</div>`).join('')}</div>`;
    const section=g=>{
      if(g.rows.length<=35)return entries(g.rows);
      const ranges=new Map();
      for(const r of g.rows){
        const n=Number(r.label),start=Math.floor(n/10)*10;
        if(!ranges.has(start))ranges.set(start,[]);
        ranges.get(start).push(r);
      }
      return [...ranges.values()].map(rows=>`<details class="number-band"><summary>${esc(rows[0].label)}${rows.length>1?' – '+esc(rows.at(-1).label):''}</summary>${entries(rows)}</details>`).join('');
    };
    return `<section class="panel"><h2>Listen and repeat one at a time</h2>${groups.map(g=>`<details class="sound-list"><summary>${esc(g.title)}</summary><p>${esc(g.intro)}</p>${section(g)}</details>`).join('')}</section>`;
  }
  function comparisonTables(tables) {
    return tables.map(table=>{
      const label='table-'+table.id;
      const headings=table.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('');
      const body=table.rows.map(row=>{
        const cells=row.map((value,column)=>{
          const language=table.frColumns.includes(column)?' lang="fr"':'';
          const tag=column===0?'th':'td';
          const scope=column===0?' scope="row"':'';
          const model=table.audioColumns.includes(column)?SoundPlayer.hear(value):'';
          return `<${tag}${scope}${language}>${esc(value)}${model}</${tag}>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<figure class="grammar-comparison">
        <figcaption id="${label}">${esc(table.caption)}</figcaption>
        <p id="${label}-note" class="comparison-note">${esc(table.note)}</p>
        <div class="table-scroll" tabindex="0" role="region" aria-labelledby="${label}">
          <table aria-labelledby="${label}" aria-describedby="${label}-note" data-columns="${table.headers.length}">
            <thead><tr>${headings}</tr></thead><tbody>${body}</tbody>
          </table>
        </div></figure>`;
    }).join('');
  }
  function chapterBody(id,sections) {
    return `<div class="chapter-map"><h2>In this chapter</h2><ol>${sections.map((s,i)=>`<li>${button(s.title,'jump-section',id+'-'+i,'act-link')}</li>`).join('')}</ol></div>
    ${sections.map((s,i)=>`<section class="panel teaching-section" aria-labelledby="${esc(id)}-${i}"><h2 tabindex="-1" id="${esc(id)}-${i}">${esc(s.title)}</h2><div class="prose-block">${s.body.map(para).join('')}</div>${comparisonTables(D.comparisons.filter(t=>t.places[id]===s.title))}<div class="examples-block">${s.examples.map(line).join('')}</div></section>`).join('')}`;
  }
  function corrections(rows) {
    if(!rows?.length)return '';
    return `<section class="panel"><h2>Spot and repair a mistake</h2>${rows.map(r=>`<div class="repair"><p class="meta">Attempt</p><p lang="fr">${esc(r.try)}</p><details class="translation"><summary>See the correction and reason</summary><b lang="fr">${esc(r.fix)}</b><p>${esc(r.why)}</p></details></div>`).join('')}</section>`;
  }
  function guided(u,t) {
    if(!t?.guided?.length)return '';
    return `<section class="panel"><h2>Try it with guidance</h2>${t.guided.map((r,i)=>{const k=u.id+'-'+i;return `<article class="guided"><h3>${esc(r.ask)}</h3><div class="controls"><details class="translation"><summary>Give me a hint</summary><p>${esc(r.hint)}</p></details></div><label class="formlabel" for="guided-${k}">Your attempt</label><textarea id="guided-${k}" class="short-draft" lang="fr" data-study-draft="${k}" rows="2">${esc(state.studyNotes[k]||'')}</textarea><details class="translation"><summary>Compare with a worked answer</summary><p class="model-answer">${esc(r.answer)}</p><p>${esc(r.why)}</p></details></article>`;}).join('')}</section>`;
  }
  function lessonText(u){
    const t=u.teaching;
    const known=new Set(t.sections.flatMap(s=>s.examples.map(e=>e.fr)).concat(t.before.map(r=>r.fr)));
    const extra=[...u.examples,...u.words].filter(([fr])=>!known.has(fr)).map(([fr,en])=>line({fr,en})).join('');
    const extraExamples=extra?`<details class="panel"><summary>More phrases from this chapter</summary>${extra}</details>`:'';
    return `<article class="panel chapter-start"><p class="eyeline">Chapter guide</p><h2>What you are learning to do</h2>${para(u.rule)}${SoundPlayer.hear(t.dialogue[0].fr,{label:'Play the opening line'})}</article>${wordBank(t.before)}${chapterBody(u.id,t.sections)}${extraExamples}${corrections(t.traps)}${guided(u,t)}<div class="buttons section">${rg('lesson/'+u.id+'/conversation','Use it in a conversation','btn','mic')}${rg('lesson/'+u.id+'/read','Continue to reading','btn-outline')}</div>`;
  }
  function dialogue(u){
    const t=u.teaching;
    return `<article class="panel"><h2>Follow the conversation</h2><p>Listen to one turn, check its meaning, then take that person’s part. For a second pass, cover the English.</p>
    <div class="dialogue-lines">${t.dialogue.map(row=>`<div class="turn"><span class="voice-name">${esc(row.who)}</span>${line(row)}</div>`).join('')}</div></article>
    ${coach('dialogue-'+u.id,t.dialogue.map(r=>({fr:r.fr,en:r.en,listen:'Listen for the grouping in this turn. Repeat it as one speaker, leaving room for the reply.'})),'Rehearse one turn')}
    <div class="buttons section">${rg('lesson/'+u.id+'/read','Continue to reading','btn')}</div>`;
  }
  function coach(id,models,title='Listen, record and compare'){
    if(!models?.length)return '';
    const idx=Math.min(selection.get(id)||0,models.length-1),m=models[idx],v=m.voice;
    const clip=SoundPlayer.get(m.fr,v),ref=SoundPlayer.reference(clip),recKey='voice-'+id+'-'+idx;
    return `<section class="panel coach" data-coach="${esc(id)}"><p class="eyeline">${icon('headphones')} Pronunciation practice</p><h2>${esc(title)}</h2>
    ${models.length>1?`<label class="field"><span>Choose a model</span><select data-voice-select="${esc(id)}">${models.map((q,j)=>`<option value="${j}" ${idx===j?'selected':''}>${esc(q.voice?.title||q.fr)}${q.voice?' · '+esc(q.voice.speaker):''}</option>`).join('')}</select></label>`:''}
    <div class="coach-model"><p class="fr-text" lang="fr">${esc(m.fr)}</p><p>${esc(m.en)}</p><small>${v?voiceCredits(v):clip?.human?'Human recording · '+esc(clip.speaker):'Synthesized French voice'}</small></div>
    ${v?.credit?`<details class="translation mini-credit"><summary>Recording credits</summary><p>${esc(v.credit)}</p></details>`:''}
    ${m.listen?`<p class="listen-for"><b>Listen for</b> ${esc(m.listen)}</p>`:''}
    <div class="controls model-controls">${SoundPlayer.hear(m.fr,{voice:v,label:'Play model'})}<label class="speed-label">Model speed <select class="form" data-speed aria-label="Model speed">${[.8,1,1.15].map(x=>`<option value="${x}" ${+state.speed===x?'selected':''}>${x}×</option>`).join('')}</select></label></div>
    <div class="record-bar"><div class="controls">${button('Record my turn','record',recKey,'btn-outline','mic')}${button('Stop recording','record-stop',recKey,'btn-outline','square')}</div><span class="meta" data-rec-for="${esc(recKey)}" data-record-status></span><div data-record-play="${esc(recKey)}"></div></div>
    ${clip?button('Play model, then my turn','compare-take',JSON.stringify([ref,recKey]),'btn-soft','headphones'):''}
    ${v?.checks?.length?button('Try the listening questions','human-check',v.id,'btn-soft','headphones'):''}${m.replay?`<p class="meta rulegap"><b>When you replay</b> ${esc(m.replay)}</p>`:''}</section>`;
  }
  function unitCoach(u){
    const sound=u.teaching?.sound;
    if(!sound)return '';
    const workshop=labBy(sound.workshop);
    const next=workshop?`<p class="related-sound">${rg('sounds/'+workshop.id,'Practise this sound · '+workshop.title,'link','headphones')}</p>`:'';
    return coach('lesson-'+u.id,[{fr:sound.model,en:sound.meaning,listen:sound.cue,replay:sound.replay}],sound.target)+next;
  }
  function basics(a){
    const chapters=D.foundations;
    const u=learnBy(a);
    if(!u){
      const next=chapters.find(ch=>!state.completed[ch.id])||chapters[0];
      return head('Start from zero','An English-guided course for your first French sounds, words and conversations.')+
      `<div class="panel start-callout"><div><p class="eyeline">Your next starter chapter</p><h2>${esc(next.title)}</h2><p>${esc(next.goal)}</p></div>${rg('start/'+next.id,'Open chapter','btn','play')}</div><section class="section"><div class="section-head"><h2>The first six chapters</h2></div><div class="unit-list">${chapters.map((r,i)=>`<a class="unit-row" href="#/start/${r.id}"><span class="unitno">${state.completed[r.id]?icon('check'):i+1}</span><span class="utitle"><b>${esc(r.title)}</b><small>${esc(r.goal)}</small></span></a>`).join('')}</div></section><div class="buttons section">${rg('path/A1','Continue into A1','btn-outline')}</div>`;
    }
    const n=chapters.indexOf(u)+1;
    return rg('start','All starter chapters','backlink')+`<p class="eyeline">Start from zero · Chapter ${n} of ${chapters.length}</p>`+head(u.title,u.goal)+`<div class="lesson-body"><article class="panel intro-start"><h2>Begin here</h2><p>${esc(u.intro)}</p>${SoundPlayer.hear(u.sections[0].examples[0].fr,{label:'Play the first example'})}</article>${chapterBody(u.id,u.sections)}${firstWords('starter',u.id)}${unitCoach({id:u.id,teaching:u})}<section class="panel"><h2>Check what you can use</h2><p>Answer three short questions. You can return to any explanation or replay a model while you study.</p>${button('Take the chapter check','primer-check',u.id,'btn','play')}</section><div class="buttons section">${n<chapters.length?rg('start/'+chapters[n].id,'Read the next chapter','btn-outline'):rg('lesson/a1-01/learn','Open your first A1 lesson','btn-outline')}</div></div>`;
  }
  function interviewLinks(u){
    const rows=D.voices.filter(v=>v.lessons?.includes(u.id));
    if(!rows.length)return '';
    return `<section class="panel"><h2>Hear it in a real interview</h2>${rows.map(v=>`<div class="voice-entry"><div><b>${esc(v.title)}</b><span>${esc(v.speaker)} · ${esc(v.level)}</span></div>${button('Listen and answer','human-check',v.id,'btn-outline','headphones')}</div>`).join('')}</section>`;
  }
  function people(level) {
    const voices=D.voices||[];
    const dis=voices.filter(v=>level==='All'||v.level===level);
    const available=['All',...C.levels.filter(l=>voices.some(v=>v.level===l))];
    const recordings=[...new Map(dis.filter(v=>v.fullPerformance).map(v=>[v.fullPerformance.file,v])).values()];
    const readingRoom=recordings.length?`<section class="panel"><h2>Listen to a longer recording</h2>${recordings.map(v=>{const f=v.fullPerformance;return `<article class="long-audio"><h3 lang="fr">${esc(f.title)}</h3><p>${esc(f.enTitle)} · ${esc(v.speaker)}</p><audio controls preload="none" data-pass-audio id="full-${esc(v.id)}" src="${esc(f.file)}" aria-label="${esc(f.title)}"></audio>${f.cues?.length?`<div class="chips">${f.cues.map(c=>button(c.label,'cue-performance',JSON.stringify([v.id,c.at]),'chip')).join('')}</div>`:''}<details class="translation"><summary>Read the French text</summary><p lang="fr" class="fr-text">${esc(f.frText)}</p></details>${translation(f.enText,'Read the complete English translation')}<details class="translation"><summary>Recording credits</summary><p>${esc(f.credit)}</p>${voiceCredits(v)}</details></article>`;}).join('')}</section>`:'';
    const interviews=dis.filter(v=>v.checks?.length);
    const everyday=interviews.length?`<section class="panel"><h2>Everyday interviews</h2><p>Listen to a recorded exchange and answer questions about what the speakers mean. After you answer, you can read the French and English together.</p>${interviews.map(v=>`<div class="voice-entry"><div><b>${esc(v.title||v.sourceTitle)}</b><small>${esc(v.level)} · ${esc(v.speaker)}</small></div>${button('Listen and answer','human-check',v.id,'btn-outline','headphones')}</div>`).join('')}</section>`:'';
    return rg('sounds','Sound studio','backlink')+head('Human voices','Listen to recorded French, copy the timing, and play the speaker beside your own take.')+`<div class="chips">${available.map(k=>rg('voices/'+k,k==='All'?'All levels':k,'chip'+(level===k?' on':''))).join('')}</div>
    <div class="lesson-body section">${everyday}${dis.length?coach('humans-'+level,dis.map(v=>({fr:v.fr,en:v.en,listen:v.listen,replay:v.focus,voice:v})),'Practise with a recorded speaker'):'<p>Choose an available level.</p>'}${readingRoom}
    ${dis.length?`<section class="panel"><h2>Recordings in this selection</h2><div class="voice-catalog">${dis.map((v,i)=>`<div class="voice-entry"><div><b lang="fr">${esc(v.fr)}</b><span>${esc(v.en)}</span><small>${esc(v.level)} · ${esc(v.speaker)}</small></div><div class="voice-actions">${SoundPlayer.hear(v.fr,{voice:v,label:'Hear'})}${button('Practise','use-sample',JSON.stringify(['humans-'+level,i]),'act-link')}</div></div>`).join('')}</div></section>`:''}</div>`;
  }
  function sounds(a){
    const u=labBy(a);
    if(!u)return head('Sound studio','Train your ear, then practise the same distinction in your own voice.')+
      `<article class="panel start-callout"><div><p class="eyeline">Recorded speakers</p><h2>Human voices</h2><p>${D.voices.length} recordings with transcripts, English meanings, speaker credits and a model-to-recording comparison.</p></div>${rg('voices/All','Hear the speakers','btn','headphones')}</article><section class="section"><div class="section-head"><h2>Pronunciation workshops</h2></div><div class="unit-list">${D.soundLab.map(t=>`<a class="unit-row" href="#/sounds/${esc(t.id)}"><span class="unitno">${icon('headphones')}</span><span class="utitle"><b>${esc(t.title)}</b><small>${esc(t.goal)}</small></span><span class="tag">${esc(t.level)}</span></a>`).join('')}</div></section>`;
    const human=(D.voices||[]).filter(v=>v.lab===u.id).map(v=>({fr:v.fr,en:v.en,listen:v.listen,replay:v.focus,voice:v}));
    return rg('sounds','All pronunciation workshops','backlink')+head(u.title,u.goal)+`<div class="lesson-body"><section class="panel"><h2>What to hear</h2><div class="prose-block">${u.explain.map(para).join('')}</div><h3>Try it aloud</h3><ol class="coach-steps">${u.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section>${human.length?coach('lab-human-'+u.id,human,'Hear the contrast from recorded speakers'):''}${coach('lab-'+u.id,u.models)}<section class="panel"><h2>Check your ear</h2><p>Listen without the written French. Choose what you heard, then check the explanation.</p>${button('Start listening check','ear-check',u.id,'btn','headphones')}</section></div>`;
  }
  function choose(key,idx,scroll=false){
    selection.set(key,idx);Practice.cleanMedia();SoundPlayer.stop();window.CarnetApp.render(false);
    const host=[...document.querySelectorAll('[data-coach]')].find(e=>e.dataset.coach===key);
    if(scroll)host?.scrollIntoView({block:'start'});host?.querySelector('select')?.focus({preventScroll:!scroll});
  }
  function action(a,arg,el){
    if(a==='jump-section'){const h=document.getElementById(arg);h?.focus({preventScroll:true});h?.scrollIntoView({block:'start'});}
    else if(a==='primer-check'){const u=learnBy(arg);if(u)Practice.start(u.checks.map((_,i)=>u.id+'-check-'+i),u.title,'foundation',u.id);}
    else if(a==='ear-check'){const u=labBy(arg);if(u)Practice.start(u.ear.map((_,i)=>'ear-'+u.id+'-'+i),u.title,'ear',u.id);}
    else if(a==='human-check'){const v=D.voices.find(x=>x.id===arg);if(v?.checks?.length)Practice.start(v.checks.map((_,i)=>'human-'+v.id+'-'+i),v.title||v.sourceTitle,'human',v.id);}
    else if(a==='play-clip')SoundPlayer.playButton(arg,el);
    else if(a==='compare-take'){const [ref,id]=JSON.parse(arg);SoundPlayer.compare(ref,id,el);}
    else if(a==='cue-performance'){const [id,at]=JSON.parse(arg),audio=document.getElementById('full-'+id);if(audio){SoundPlayer.stop();audio.currentTime=Number(at);audio.play().catch(()=>toast('Use the audio player to resume this performance.'));}}
    else if(a==='use-sample'){const [key,i]=JSON.parse(arg);choose(key,i,true);}
    else return false;
    return true;
  }
  return {basics,lessonText,dialogue,firstWords,interviewLinks,comparisonTables,line,translation,unitCoach,people,sounds,choose,action,learnBy,labBy};
})();
