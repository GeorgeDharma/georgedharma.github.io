'use strict';
window.CarnetApp=(()=>{
  const {D,levels,labels,descriptors,skills,unitBy,all,state,icon,esc,button,rg,head,save,toast}=C;
  const nav=[['','Study desk','layout-dashboard'],['start','Start from zero','book-open'],['path','Learning path','route'],['topics','Topic library','library-big'],['sounds','Sound studio','headphones'],['practice','Practice bank','layers'],['review','Spaced review','rotate-ccw'],['materials','My materials','library-big'],['progress','Progress','chart-column-increasing']];
  const $=id=>document.getElementById(id);
  const current=()=>location.hash.replace(/^#\/?/,'').split('/').map(s=>{try{return decodeURIComponent(s)}catch{return ''}});
  function lessonStats(throughLevel=null){
    const lessons=throughLevel?D.lessons.filter(u=>levels.indexOf(u.level)<=levels.indexOf(throughLevel)):D.lessons;
    return [lessons.filter(u=>state.completed[u.id]).length,lessons.length];
  }
  const firstStarter=()=>D.foundations.find(ch=>!state.completed[ch.id]);
  const progressBar=(n,m)=>`<span class="thinbar" aria-hidden="true"><i style="width:${m?100*n/m:0}%"></i></span>`;
  function skillCards(){return `<div class="skills">${Object.entries(skills).map(([s,v])=>`<a class="skillcard" href="#/practice/${s}" style="--tone:${v.color};--wash:${v.wash}"><span class="icon-patch">${icon(v.icon)}</span><h3 lang="fr">${v.fr}</h3><small>${s} · ${all.filter(q=>q.skill===s&&!q.cap&&(!q.bookTrack||BookFiles.has(q.book))).length} items</small></a>`).join('')}</div>`;}
  function home(){const u=C.next(),nl=D.lessons.filter(l=>l.level===u.level).findIndex(l=>l.id===u.id)+1,have=Object.keys(state.history).length>0;
    const primer=firstStarter(),showPrimer=primer&&!state.lastLesson&&D.lessons.every(x=>!state.completed[x.id]);
    const heroTitle=showPrimer?primer.title:u.title,heroGoal=showPrimer?primer.goal:u.goal,heroRoute=showPrimer?'start/'+primer.id:'lesson/'+u.id+'/learn';
    return `<div class="headline"><div><h1 lang="fr">Bonjour</h1><p>${have?'Pick up where you left off in your French studies.':'Your next lesson and four ways to practise French.'}</p></div></div>
    <section class="hero"><div class="hero-copy"><div class="hero-label">${icon('bookmark')} ${showPrimer?'Start from zero · Chapter '+(D.foundations.indexOf(primer)+1):u.level+' · Lesson '+String(nl).padStart(2,'0')}</div><h2>${esc(heroTitle)}</h2><p>${esc(heroGoal)}</p>${rg(heroRoute,showPrimer?'Begin here':state.lastLesson===u.id?'Continue lesson':'Start lesson','btn','play')}</div><img src="assets/cafe.webp" width="1448" height="1086" alt="A bicycle outside a terracotta Parisian café" fetchpriority="high"></section>
    ${state.session?`<div class="home-note">${icon('play')}${rg('session','Resume practice · '+state.session.title)}</div>`:''}
    <div class="desk-tools"><a href="#/start">${icon('book-open')}<span><b>Start from zero</b><small>French explained in English</small></span></a><a href="#/sounds">${icon('headphones')}<span><b>Sound studio</b><small>Hear real speakers and compare your voice</small></span></a></div>
    <section class="section"><div class="section-head"><h2>Practice by skill</h2>${rg('practice','All practice','link')}</div>${skillCards()}</section>
    <section class="section"><div class="section-head"><h2>Your learning path</h2>${rg('path/'+u.level,'Explore path','link')}</div><div class="level-tiles">${levels.map(l=>{const units=D.lessons.filter(v=>v.level===l);return `<a class="level-tile" href="#/path/${l}"><strong>${l}</strong><small>${units.length} lessons</small>${progressBar(units.filter(v=>state.completed[v.id]).length,units.length)}</a>`;}).join('')}</div></section>`;
  }
  function path(raw){const l=levels.includes(raw)?raw:C.next().level,units=D.lessons.filter(u=>u.level===l),cap=D.checkpoints.find(u=>u.level===l);
    const row=(u,i)=>`<a class="unit-row" href="#/lesson/${u.id}/learn"><span class="unitno">${state.completed[u.id]?icon('check'):i===null?icon('flag'):String(i+1).padStart(2,'0')}</span><span class="utitle"><b>${esc(u.title)}</b><small>${esc(u.goal)}</small></span>${state.completed[u.id]?'<span class="tag">Completed</span>':''}</a>`;
    return head('Learning path','Study each lesson in order, or open a topic you need today.')+`<div class="chips">${levels.map(v=>rg('path/'+v,v,'chip'+(v===l?' on':''))).join('')}</div>
    ${l==='A1'&&firstStarter()?`<div class="panel start-callout"><div><h2>New to French?</h2><p>Learn your first sounds, words and café exchange in six English-guided chapters.</p></div>${rg('start','Start from zero','btn-outline')}</div>`:''}
    <section class="section"><p class="eyeline">${l} · ${units.length} lessons</p><div class="section-head"><h2>${esc(labels[l])}</h2></div><p class="intro">${esc(descriptors[l])}</p><div class="unit-list">${units.map(row).join('')}</div></section>
    <section class="section"><div class="section-head"><h2>Four-skill checkpoint</h2></div>${row(cap,null)}</section>`;
  }
  const tabs=[['learn','Learn'],['conversation','Conversation'],['read','Read'],['listen','Listen'],['write','Write'],['speak','Speak']];
  function lesson(u,part){
    if(!u)return path();const cap=u.id.endsWith('checkpoint');const t=u.teaching||u.translation||{};if(cap&&part==='conversation')part='learn';part=tabs.some(t=>t[0]===part)?part:'learn';
    const id=u.id,at=(p)=>'lesson/'+id+'/'+p,drill=(label,skill='',cls='btn')=>button(label,'unit-practice',id+(skill?'|'+skill:''),cls,'play');
    if(!cap&&state.lastLesson!==id){state.lastLesson=id;save();}
    const examples=u.examples.map(([fr,en])=>`<div class="example"><b lang="fr">${esc(fr)}</b><span>${esc(en)}</span></div>`).join('');
    const partB=u.workshop;
    const workshop=partB?'<article class="panel workshop"><p class="eyeline">Language workshop</p><h2>'+esc(partB.title)+'</h2><p>'+esc(partB.explanation)+'</p><div class="example"><b lang="fr">'+esc(partB.example)+'</b><span>'+esc(partB.meaning)+'</span>'+SoundPlayer.hear(partB.example)+'</div><div class="buttons">'+button('Try this in French','workshop',partB.practice,'btn-soft','pen-line')+'</div></article>':'';
    const vocab=u.words.map(([fr,en])=>`<div><dt lang="fr">${esc(fr)}</dt><dd>${esc(en)}</dd></div>`).join('');
    let body='';
    if(part==='learn'&&u.teaching)body=Studio.lessonText(u);
    else if(part==='conversation')body=Studio.dialogue(u);
    else if(part==='learn')body=`<article class="panel"><h2>${cap?'Your task':'How it works'}</h2><p class="lead">${esc(u.rule)}</p>${examples?'<h3>French in context</h3>'+examples:''}${vocab?'<h3>Words to keep</h3><dl class="vocab">'+vocab+'</dl>':''}<div class="buttons">${rg(at('read'),'Continue to reading','btn')}</div></article>`;
    else if(part==='read')body=`<article class="panel"><h2>Read the passage</h2><div class="study-text"><p class="fr-text" lang="fr">${esc(u.reading)}</p></div>${SoundPlayer.hear(u.reading,{label:'Listen to the passage'})}${Studio.translation(t.readEn)}<div class="buttons">${drill('Check my reading','Reading')}${rg(at('listen'),'Continue to listening','btn-outline')}</div></article>`;
    else if(part==='listen')body=`<article class="panel"><h2>Listen for meaning</h2><p>Listen once for the situation. Replay for details, then compare with the transcript.</p>${Practice.audioBox(u.audio)}${Studio.translation(t.listenEn)}<div class="buttons">${drill('Check my listening','Listening')}${rg(at('write'),'Continue to writing','btn-outline')}</div></article>`;
    else {const kind=part==='write'?'writing':'speaking',q=C.by[id+'-'+kind];body=(part==='speak'?Studio.unitCoach(u):'')+`<article class="panel"><h2>${part==='write'?'Write in French':'Speak in French'}</h2><p class="lead">${esc(q.prompt)}</p>${u.teaching?`<details class="translation"><summary>Find words to get started</summary>${u.teaching.before.slice(0,4).map(v=>`<p><b lang="fr">${esc(v.fr)}</b> · ${esc(v.en)}</p>`).join('')}</details>`:''}${Practice.production(q)}<details class="transcript"><summary>Compare with a model response</summary><p class="fr-text" lang="fr">${esc(q.model)}</p>${part==='speak'?SoundPlayer.hear(q.model,{label:'Hear the full model'}):''}${Studio.translation(part==='write'?t.writeEn:t.speakEn)}<ul class="resource-list">${q.rubric.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details><div class="buttons">${drill('Assess my '+kind,q.skill)}${part==='write'?rg(at('speak'),'Continue to speaking','btn-outline'):''}</div></article>`;}
    return rg('path/'+u.level,u.level+' learning path','backlink')+`<p class="eyeline">${u.level} · ${cap?'Four-skill checkpoint':'Lesson '+Number(id.slice(-2))}${state.completed[id]?' · Completed':''}</p>`+head(u.title,u.goal)+`<nav class="chips lesson-steps" aria-label="Lesson activities">${tabs.filter(([k])=>k!=='conversation'||!cap).map(([k,l])=>rg(at(k),l,'chip'+(k===part?' on':''))).join('')}</nav><div class="lesson-body">${body}${part==='listen'||part==='conversation'?Studio.interviewLinks(u):''}${part==='learn'?TopicLibrary.links(u)+workshop:''}<section class="panel"><h2>${cap?'Take the checkpoint':'Complete this lesson'}</h2><p>Work through the reading, listening, writing and speaking tasks to record completion on your learning path.</p><div class="buttons">${drill(cap?'Start checkpoint':'Start full lesson practice')}</div></section>${Shelf.notes(u)}</div>`;
  }
  function progress(){
    const history=Object.entries(state.history),count=history.reduce((n,[,h])=>n+h.seen,0),goal=lessonStats(state.goal),active=Object.keys(state.activity).length;
    return head('My progress','Your lessons and practice history.')+`<div class="stats"><div class="stat"><b>${goal[0]} / ${goal[1]}</b><small>${state.goal?'Lessons toward '+state.goal:'Lessons completed'}</small></div><div class="stat"><b>${count}</b><small>Practice responses</small></div><div class="stat"><b>${active}</b><small>Study days</small></div></div>
    <div class="section grid-two"><section class="panel"><h2>Progress by level</h2><div class="fileline">${rg('start','Start from zero')}<span class="meta">${D.foundations.filter(v=>state.completed[v.id]).length} / ${D.foundations.length} chapters</span></div>${levels.map(l=>{const us=D.lessons.filter(v=>v.level===l),n=us.filter(v=>state.completed[v.id]).length;return `<div class="row-section"><div class="goalrow">${rg('path/'+l,l+' · '+labels[l])}<span class="meta"> ${n} / ${us.length} lessons</span></div>${progressBar(n,us.length)}<span class="meta">Checkpoint ${state.completed[l.toLowerCase()+'-checkpoint']?'completed':'available'}</span></div>`}).join('')}</section>
    <section class="panel"><h2>Practice by skill</h2>${['Reading','Listening','Writing','Speaking','Grammar','Vocabulary'].map(s=>{const xs=history.filter(([id])=>C.by[id]?.skill===s),n=xs.reduce((a,[,h])=>a+h.seen,0);return `<div class="fileline"><span>${s}</span><b>${n} responses</b></div>`}).join('')}<p class="meta rulegap">Writing and speaking use self-assessment against a model and criteria. Completing a checkpoint records an attempt.</p></section></div>
    <section class="panel section"><h2>Study target</h2><p>Track the whole course or choose a level to work toward.</p><div class="chips rulegap">${['',...levels].map(l=>`<button class="chip" data-act="goal" data-arg="${l}" aria-pressed="${(state.goal||'')===l}">${l||'All levels'}</button>`).join('')}</div></section>
    <section class="panel section"><h2>Progress backup</h2><p>Your history and drafts are saved in this browser. Export them before moving to another device or to your portfolio. Book ZIPs and microphone recordings stay on the device where you attached or recorded them.</p><div class="buttons">${button('Export progress','export','','btn-outline','download')}${button('Import progress','import','','btn-outline','upload')}</div></section>`;
  }
  const closeMenu=()=>{$('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');$('scrim').hidden=true;};
  let lastRoute='';
  function render(moved=true){
    const [route='',a,b]=current(),hash=location.hash;
    if(hash!==lastRoute){SoundPlayer.stopForPage();Practice.cleanMedia();Shelf.hideModal();closeMenu();lastRoute=hash;}
    const section=route==='lesson'?'path':route==='voices'?'sounds':route==='topic'?'topics':['session','results'].includes(route)?'practice':nav.some(([k])=>k===route)?route:'';
    let title=nav.find(([k])=>k===section)[1];
    const pages={topics:()=>TopicLibrary.page(a),topic:()=>TopicLibrary.topic(a),start:()=>Studio.basics(a),sounds:()=>Studio.sounds(a),voices:()=>Studio.people(a||'All'),path:()=>path(a),lesson:()=>lesson(unitBy[a],b),practice:()=>Practice.bankPage(),session:()=>Practice.questionPage(),results:()=>Practice.summaryPage(),review:()=>Practice.reviewPage(),materials:()=>Shelf.shelfPage(a),progress};
    const body=(Object.hasOwn(pages,route)?pages[route]:home)();
    if(route==='lesson'&&unitBy[a])title=unitBy[a].title;else if(route==='start'&&Studio.learnBy(a))title=Studio.learnBy(a).title;else if(route==='sounds'&&Studio.labBy(a))title=Studio.labBy(a).title;else if(route==='voices')title='Human voices';else if(route==='topic'&&TopicLibrary.find(a))title=TopicLibrary.find(a).title;
    else if(route==='session')title=state.session?.title||'Practice session';else if(route==='results')title='Session results';
    document.title=title+' · Carnet de français';
    $('mainnav').innerHTML=nav.map(([k,l,i])=>`<a class="navitem ${section===k?'current':''}" ${section===k?'aria-current="page"':''} href="#/${k}">${icon(i)}<span>${l}</span>${k==='review'&&C.due().length?`<span class="num">${C.due().length}</span>`:''}</a>`).join('');
    const [n,m]=lessonStats();$('side-progress').innerHTML=`<div class="goalrow">${icon('book-open')} Course progress</div><p>${n} of ${m} lessons completed</p>${progressBar(n,m)}`;
    $('crumb').innerHTML=`${icon('notebook-pen')}<span>My workspace</span><i>/</i><b>${esc(title)}</b>`;
    $('bar-date').innerHTML=icon('calendar-days')+' '+new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'long'}).format(new Date());
    $('workspace').innerHTML=body;Shelf.filter();Practice.hydrate();
    if(moved){window.scrollTo({top:0,behavior:'instant'});$('workspace').focus({preventScroll:true});}
  }
  function routeChange(){const [route,skill]=current();if(route==='practice'&&skills[skill]){state.filters.skill=skill;state.filters.type='All';save();history.replaceState(null,'','#/practice');}render(true);}
  function exportProgress(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.download='Carnet-progress-'+C.dateKey()+'.json';a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function importProgress(){const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.onchange=async()=>{if(!picker.files.length)return;try{
    const s=C.normalizeState(JSON.parse(await picker.files[0].text()));const merged={};
    for(const k of new Set([...Object.keys(state.history),...Object.keys(s.history)])){const a=state.history[k],b=s.history[k];merged[k]=!a?b:!b?a:(b.last||0)>(a.last||0)?b:a;}
    const activity={...state.activity};for(const [k,n] of Object.entries(s.activity))activity[k]=Math.max(n,activity[k]||0);
    Object.assign(state,{goal:s.goal,completed:{...s.completed,...state.completed},history:merged,drafts:{...s.drafts,...state.drafts},studyNotes:{...s.studyNotes,...state.studyNotes},activity,session:state.session||s.session,previousSummary:state.previousSummary||s.previousSummary,lastLesson:state.lastLesson||s.lastLesson});save();render(false);toast('Progress imported. Existing drafts and active practice were kept.');
    }catch{toast('Choose a valid Carnet progress JSON file.');}};picker.click();}
  $('menu').innerHTML=icon('menu');$('menu').onclick=()=>{const open=$('sidebar').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open));$('scrim').hidden=!open;};$('scrim').onclick=closeMenu;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('sidebar').classList.contains('open')){closeMenu();$('menu').focus();}});
  document.addEventListener('click',e=>{const button=e.target.closest('[data-act]');if(!button||button.disabled)return;
    const a=button.dataset.act,arg=button.dataset.arg||'';if(Studio.action(a,arg,button)||Practice.events(a,arg)||Shelf.events(a,arg))return;
    if(a==='goal'&&(arg===''||levels.includes(arg))){state.goal=arg||null;save();render(false);toast(arg?'Study target updated to '+arg+'.':'Tracking all levels.');}
    if(a==='workshop'&&C.by[arg])Practice.start([arg],C.by[arg].title,'workshop');
    if(a==='export')exportProgress();if(a==='import')importProgress();});
  document.addEventListener('submit',e=>{if(e.target.id==='question-form'){e.preventDefault();Practice.form(e.target);}});
  document.addEventListener('input',e=>{const t=e.target;if(t.hasAttribute('data-study-draft')){state.studyNotes[t.dataset.studyDraft]=t.value;save();}if(t.hasAttribute('data-draft')){state.drafts[t.dataset.draft]=t.value;save();const n=document.querySelector('[data-wordcount]');if(n)n.textContent=C.words(t.value)+' words · saved on this device';}
    if(t.id==='typed-answer'&&state.session){state.session.temp=t.value;save();}if(t.id==='source-find')Shelf.filter();if(t.id==='topic-search')TopicLibrary.filter(t);});
  document.addEventListener('change',e=>{const t=e.target;
    if(t.hasAttribute('data-voice-select')){Studio.choose(t.dataset.voiceSelect,Number(t.value));}
    if(t.hasAttribute('data-filter')){const k=t.dataset.filter;state.filters[k]=k==='length'?Number(t.value):t.value;save();render(false);document.querySelector('[data-filter="'+k+'"]')?.focus();}
    if(t.id==='source-level')Shelf.filter();
    if(t.hasAttribute('data-speed')){state.speed=+t.value;save();SoundPlayer.speed(state.speed);document.querySelectorAll('[data-speed]').forEach(sel=>sel.value=String(state.speed));document.querySelectorAll('[data-pass-audio]').forEach(a=>a.playbackRate=state.speed);}
    if(t.hasAttribute('data-criteria')&&state.session){const s=state.session,i=+t.dataset.criteria;s.checks=s.checks.filter(x=>x!==i);if(t.checked)s.checks.push(i);save();const q=C.by[s.ids[s.pos]];if($('met'))$('met').disabled=s.checks.length!==q.rubric.length;}});
  document.addEventListener('play',e=>{if(e.target?.tagName==='AUDIO'){SoundPlayer.stop();document.querySelectorAll('audio').forEach(a=>{if(a!==e.target&&!a.paused)a.pause();});}},true);
  window.addEventListener('hashchange',routeChange);
  return {render,skillCards,start(){routeChange();BookFiles.restore().then(()=>{if(['','materials','review','practice'].includes(current()[0])||(current()[0]==='session'&&state.session&&C.by[state.session.ids[state.session.pos]]?.bookTrack))render(false);});}};
})();
window.CarnetApp.start();
