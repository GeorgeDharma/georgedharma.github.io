'use strict';
(() => {
  const root = document;
  const $ = (selector, parent = root) => parent.querySelector(selector);
  const $$ = (selector, parent = root) => Array.from(parent.querySelectorAll(selector));
  const courses = window.MERIDIAN_SUBJECTS || {};
  const lessonCount = Object.values(courses).reduce((sum, course) => sum + course.count, 0);
  const storeKey = 'meridian.finance.classroom.v1';
  const originalSections = ['complete', 'visited', 'answers', 'saved', 'drafts'];
  const sections = [...originalSections, 'examFields'];
  const empty = () => ({version: 1, complete: {}, visited: {}, answers: {}, saved: {}, drafts: {}, examFields: {}});
  const classroomRoot = new URL('../', document.currentScript.src);
  const classroomUrl = path => new URL(path.replace(/^\/+/, ''), classroomRoot).href;
  const courseUrl = code => classroomUrl('subjects/' + code.toLowerCase() + '/');
  const unitUrl = key => { const [code, num] = key.split('.'); return courseUrl(code) + 'lessons/' + num + '/'; };
  const keyFor = (code, n) => code + '.' + String(n).padStart(2, '0');
  const validUnit = key => {
    if (!/^[FCSQ]\d{2}\.\d{2}$/.test(key)) return false;
    const [code, n] = key.split('.');
    return !!courses[code] && +n >= 1 && +n <= courses[code].count;
  };
  function workshopDraft(key) {
    const match = /^studio-(?:memo-([FCSQ]\d{2})|([FCSQ]\d{2})-(\d+))$/.exec(key);
    if (!match) return false;
    if (match[1]) return Object.hasOwn(courses, match[1]);
    const course = courses[match[2]];
    return !!course && Number(match[3]) >= 1 && Number(match[3]) <= course.studioCount;
  }
  const supportedDraft = key => key === 'independent-proposal' || key === 'google-ipo-case' ||
    (key.startsWith('oral-') && validUnit(key.slice(5))) ||
    (key.startsWith('chalk-') && (window.MERIDIAN_BOARDS || []).includes(key.slice(6))) ||
    workshopDraft(key) ||
    (key.startsWith('note-') && validUnit(key.slice(5))) ||
    (key.startsWith('written-') && validUnit(key.slice(8))) ||
    (/^(?:problem-[FCSQ]\d{2}-[12]|(?:assessment|midterm)-[FCSQ]\d{2})$/.test(key) && Object.hasOwn(courses, key.match(/[FCSQ]\d{2}/)[0])) ||
    /^(?:region-[1-8]|seminar-[1-8]|research-[12])$/.test(key);
  const validTime = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= Date.now() + 86400000;
  function clean(raw) {
    if (!raw || raw.version !== 1 || !originalSections.every(k => raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k]))) throw new Error('Unrecognized classroom backup.');
    const out = empty();
    for (const key of ['complete', 'visited']) for (const [id, t] of Object.entries(raw[key])) {
      if (validUnit(id) && validTime(t)) out[key][id] = t;
    }
    for (const [id, obj] of Object.entries(raw.answers)) if (validUnit(id) && obj && validTime(obj.at) && [0, 1, 2].includes(obj.pick)) out.answers[id] = {at: obj.at, pick: obj.pick};
    for (const [id, obj] of Object.entries(raw.saved)) if (Object.hasOwn(courses, id) && obj && validTime(obj.at) && typeof obj.on === 'boolean') out.saved[id] = {at: obj.at, on: obj.on};
    for (const [id, obj] of Object.entries(raw.drafts)) if (supportedDraft(id) && obj && validTime(obj.at) && typeof obj.value === 'string') out.drafts[id] = {at: obj.at, value: obj.value.slice(0, 25000)};
    if (raw.examFields && typeof raw.examFields === 'object' && !Array.isArray(raw.examFields)) {
      for (const [id, obj] of Object.entries(raw.examFields)) {
        if (window.MeridianPapers.validField(id, obj, courses, validTime)) out.examFields[id] = {at: obj.at, value: obj.value};
      }
    }
    return out;
  }
  function merge(a, b) {
    const merged = empty();
    for (const section of sections) {
      Object.assign(merged[section], a[section]);
      for (const [id, item] of Object.entries(b[section])) {
        const time = value => typeof value === 'number' ? value : (value?.at || 0);
        if (!merged[section][id] || time(item) >= time(merged[section][id])) merged[section][id] = item;
      }
    }
    return merged;
  }
  let storageAvailable = true;
  function read() {
    try { const raw = localStorage.getItem(storeKey); return raw ? clean(JSON.parse(raw)) : empty(); }
    catch { return empty(); }
  }
  let state = read();
  let paperUI = null;
  function announce(message) {
    const t = $('#toast'); if (!t) return;
    t.textContent = message; clearTimeout(announce.timer);
    announce.timer = setTimeout(() => { t.textContent = ''; }, 3000);
  }
  function update(change) {
    state = merge(read(), state);
    change(state);
    try { localStorage.setItem(storeKey, JSON.stringify(state)); storageAvailable = true; }
    catch { if (storageAvailable) announce('Browser storage is unavailable. Use Download my backup on this page.'); storageAvailable = false; }
    const storageWarning=$('[data-storage-warning]');
    if(storageWarning)storageWarning.hidden=storageAvailable;
    return storageAvailable;
  }
  window.MeridianNotebook = {
    read(key) { return supportedDraft(key) ? state.drafts[key]?.value || '' : ''; },
    save(key, value) {
      if (!supportedDraft(key) || typeof value !== 'string') return false;
      return update(s => { s.drafts[key] = {value: value.slice(0,25000), at: Date.now()}; });
    },
    resolve: classroomUrl
  };
  function latestKey(code) {
    return Object.entries(state.visited).filter(([key]) => !code || key.startsWith(code + '.')).sort((a,b) => b[1] - a[1])[0]?.[0];
  }
  function progress(code) {
    return Object.keys(state.complete).filter(id => id.startsWith(code + '.')).length;
  }
  function resume(code) {
    const last = latestKey(code);
    const subject = code || (last ? last.split('.')[0] : 'F01');
    if (!last) return unitUrl(keyFor(subject, 1));
    if (!state.complete[last]) return unitUrl(last);
    const start = Number(last.split('.')[1]);
    for (let offset = 1; offset <= courses[subject].count; offset++) {
      const n = (start + offset - 1) % courses[subject].count + 1, id = keyFor(subject, n);
      if (!state.complete[id]) return unitUrl(id);
    }
    return courseUrl(subject) + 'practice/';
  }
  function node(tag, text, css) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (css) el.className = css;
    return el;
  }
  function myLearning() {
    const list = $('[data-mine="recent"]');
    if (!list) return;
    const recent = [...new Set(Object.entries(state.visited).sort((a,b) => b[1] - a[1]).map(([id]) => id.split('.')[0]))];
    const saved = Object.keys(state.saved).filter(k => state.saved[k].on).sort((a,b) => state.saved[b].at - state.saved[a].at);
    const correct = Object.entries(state.answers).filter(([key, item]) => {
      const [code, n] = key.split('.'); return courses[code].answers[Number(n) - 1] === item.pick;
    }).length;
    for (const [metric, value] of Object.entries({completed: Object.keys(state.complete).length, correct, saved: saved.length})) $('[data-metric="'+metric+'"]').textContent = value;
    function draw(parent, codes, action) {
      parent.replaceChildren();
      if (!codes.length) {
        const message = node('p', action === 'resume' ? 'Open a lesson to begin. Your most recent subjects will appear here.' : 'Save a subject in the catalog to keep it here.', 'empty-state');
        const a = node('a', 'Browse subjects'); a.href = classroomUrl('/subjects/'); parent.append(message,a); return;
      }
      for (const code of codes) {
        const div = node('div', undefined, 'study-item');
        const anchor = node('a', courses[code].title); anchor.href = action === 'resume' ? resume(code) : courseUrl(code);
        const desc = node('small', code + ' · ' + progress(code) + ' of ' + courses[code].count + ' lessons complete');
        div.append(anchor, desc); parent.append(div);
      }
    }
    draw(list, recent, 'resume'); draw($('[data-mine="saved"]'), saved, 'saved');
  }
  function paint() {
    const count = Object.keys(state.complete).length;
    $$('[data-all-count]').forEach(el => { el.textContent = count; });
    $$('[data-all-bar]').forEach(el => { el.style.width = count / Math.max(lessonCount, 1) * 100 + '%'; });
    $$('[data-completion]').forEach(el => el.classList.toggle('is-complete', !!state.complete[el.dataset.completion]));
    $$('[data-save]').forEach(el => {
      const code = el.dataset.save, saved = !!state.saved[code]?.on;
      el.setAttribute('aria-pressed', String(saved));
      el.setAttribute('aria-label', (saved ? 'Remove saved subject ' : 'Save subject ') + courses[code].title);
      const span = $('span',el); if (span) span.textContent = saved ? 'Subject saved' : 'Save subject';
      el.title = saved ? 'Remove from saved subjects' : 'Save subject';
    });
    $$('[data-course-resume]').forEach(el => {
      const code = el.dataset.courseResume;
      el.href = resume(code);
      $('span',el).textContent = progress(code) === courses[code].count ? 'Open subject practice' : latestKey(code) ? 'Resume subject' : 'Start subject';
    });
    const home = $('[data-home-resume]');
    if (home) { home.href = resume(); $('span',home).textContent = latestKey() ? 'Continue learning' : 'Start learning'; }
    $$('[data-complete]').forEach(el => {
      if (state.complete[el.dataset.complete]) $('span',el).textContent = 'Completed · continue';
    });
    myLearning();
    paperUI?.refresh();
  }
  const opened = document.body.dataset.unit;
  if (opened && validUnit(opened)) update(s => { s.visited[opened] = Date.now(); });
  $$('[data-save]').forEach(el => el.addEventListener('click', () => {
    const code = el.dataset.save;
    update(s => { s.saved[code] = {on: !s.saved[code]?.on, at: Date.now()}; });
    paint(); announce(state.saved[code].on ? 'Subject saved to My learning.' : 'Subject removed from your saved list.');
  }));
  $$('[data-complete]').forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.complete; update(s => { s.complete[id] = Date.now(); }); paint();
  }));
  for (const area of $$('textarea[data-draft],input[data-draft]')) {
    const key = area.dataset.draft;
    area.value = state.drafts[key]?.value || '';
    area.addEventListener('input', () => {
      const ok = update(s => { s.drafts[key] = {value: area.value, at: Date.now()}; });
      const status = $('[data-draft-status]', area.parentElement);
      if (status) status.textContent = ok ? 'Saved on this device.' : 'Available in this session. Export a backup to keep it.';
    });
  }
  for (const form of $$('form[data-quiz]')) {
    const id = form.dataset.quiz;
    const radios = $$('input[type=radio]',form), labels = $$('.option',form);
    const submit = $('button[type=submit]',form), retry = $('.retry',form), result = $('.quiz-feedback',form);
    function showAnswer(pick, focus) {
      const correct = pick === Number(form.dataset.correct);
      radios.forEach((r,i) => { r.checked = i === pick; r.disabled = true; });
      labels.forEach((label,i) => { label.classList.toggle('correct',correct && i===pick); label.classList.toggle('wrong',!correct && i===pick); });
      result.hidden = false; result.classList.toggle('incorrect', !correct);
      $('strong',result).textContent = correct ? 'Correct.' : 'Review the reasoning.';
      submit.hidden = true; retry.hidden = false;
      if (focus) { result.tabIndex = -1; result.focus({preventScroll:true}); }
    }
    const prior = state.answers[id];
    if (prior) showAnswer(prior.pick,false);
    form.addEventListener('submit', event => {
      event.preventDefault(); const chosen = radios.find(r => r.checked); if (!chosen) return;
      const pick = Number(chosen.value);
      update(s => { s.answers[id] = {pick, at:Date.now()}; });
      showAnswer(pick,true);
    });
    retry.addEventListener('click', () => {
      radios.forEach(r => { r.disabled = false; r.checked = false; });
      labels.forEach(label => label.classList.remove('correct','wrong'));
      result.hidden = true; retry.hidden = true; submit.hidden = false; radios[0].focus();
    });
  }
  paperUI = window.MeridianPapers.mount({courses, classroomUrl, getState: () => state, update, announce});
  paint();
  window.addEventListener('storage', event => { if (event.key === storeKey) { state=merge(state,read());paint(); } });
  function normalize(value) {
    return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('&',' and ').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function searchCatalog() {
    const input = $('#catalog-query'); if (!input) return;
    const params = new URLSearchParams(location.search), buttons = $$('[data-area]'), rows = $$('[data-catalog-item]');
    let selected = buttons.some(b => b.dataset.area === params.get('area')) ? params.get('area') : 'all';
    input.value = params.get('q') || '';
    function filter(updateLocation) {
      const terms=normalize(input.value).split(/\s+/).filter(Boolean);let count=0;
      for (const row of rows) {
        const query = normalize(row.dataset.query + (row.textContent.includes('Mergers and Acquisitions') ? ' m and a m&a' : ''));
        const match=(selected==='all'||row.dataset.group===selected) && terms.every(term=>query.includes(term));
        row.hidden=!match; if(match)count++;
      }
      $('#catalog-count').textContent = count + (count === 1 ? ' subject' : ' subjects'); $('#catalog-empty').hidden=count>0;
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.area===selected)));
      if(updateLocation){const u=new URL(location.href);if(selected==='all')u.searchParams.delete('area');else u.searchParams.set('area',selected);
        if(input.value)u.searchParams.set('q',input.value);else u.searchParams.delete('q');history.replaceState(null,'',u);}
    }
    input.addEventListener('input',()=>filter(true));buttons.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.area;filter(true);}));filter(false);
  }
  searchCatalog();
  const gloss=$('#gloss-query');
  if(gloss)gloss.addEventListener('input',()=>{
    const terms=normalize(gloss.value).split(/\s+/).filter(Boolean);let count=0;
    for(const g of $$('.gloss-group')){let local=0;for(const row of $$('.gloss-entry',g)){
      row.hidden=!terms.every(t=>normalize(row.dataset.term).includes(t)); if(!row.hidden){local++;count++;}}
      g.hidden=local===0;}
    $('#gloss-count').textContent=count?count+' '+(count===1?'term':'terms'):'No terms match. Try another word.';
    $$('.alphabet a').forEach(a=>{const g=document.getElementById(a.hash.slice(1));a.hidden=!!g?.hidden;});
  });
  const dialog=$('#search-dialog'), searchBox=$('#global-input'), results=$('#global-results'), searchStatus=$('#search-status');
  let indexPromise=null, entries=null;
  function drawSearch() {
    if(!entries)return;
    const query=normalize(searchBox.value), tokens=query.split(/\s+/).filter(Boolean);
    let matches;
    if(tokens.length){
      matches=entries.map(item=>{
        const name=item.foldedTitle,detail=item.foldedDetail;
        if(!tokens.every(token=>item.foldedAll.includes(token)))return null;
        const rank=(name===query?120:0)+(name.includes(query)?45:0)+(item.kind==='Subject'?10:item.kind==='Blackboard lecture'?8:item.kind==='Theory'?6:0);
        const tokenScore=tokens.reduce((n,t)=>n+(name.split(' ').includes(t)?9:name.includes(t)?6:detail.includes(t)?2:1),0);
        return {item,score:rank+tokenScore};
      }).filter(Boolean).sort((a,b)=>b.score-a.score).map(x=>x.item);
    }else{
      matches=['/subjects/f01/','/subjects/s01/','/subjects/s02/','/subjects/q01/','/practice/'].map(url=>entries.find(x=>x.url===url)).filter(Boolean);
    }
    results.replaceChildren();
    searchStatus.textContent=tokens.length?(matches.length?(matches.length>16?'First 16 of '+matches.length+' results':matches.length+' '+(matches.length===1?'result':'results')):'No matches. Try a subject, concept or course code.'):'Suggested places to start';
    for(const item of matches.slice(0,16)){
      const a=node('a');a.href=classroomUrl(item.url);a.append(node('b',item.title),node('small',item.kind+' · '+item.detail));results.append(a);
    }
  }
  function openSearch() {
    dialog.showModal();searchBox.focus();
    if(entries){drawSearch();return;}
    searchStatus.textContent='Loading the classroom index…';
    if(!indexPromise)indexPromise=fetch(classroomUrl('/assets/search.json')).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{entries=data.map(item=>({...item,foldedTitle:normalize(item.title),foldedDetail:normalize(item.detail),foldedAll:normalize([item.title,item.detail,item.terms].join(' '))}));drawSearch();}).catch(()=>{indexPromise=null;searchStatus.textContent='The search index could not load. Browse the subject catalog or reopen search to retry.';const a=node('a','Browse subject catalog');a.href=classroomUrl('/subjects/');results.replaceChildren(a);});
  }
  $('[data-open-search]').addEventListener('click',openSearch);$('[data-close-search]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',ev=>{if(ev.target===dialog){const r=dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)dialog.close();}});
  searchBox.addEventListener('input',drawSearch);
  dialog.addEventListener('keydown',ev=>{
    const links=$$('a',results),pos=links.indexOf(document.activeElement);
    if(ev.key==='ArrowDown'&&links.length){ev.preventDefault();links[Math.min(pos+1,links.length-1)].focus();}
    if(ev.key==='ArrowUp'&&pos>=0){ev.preventDefault();(pos===0?searchBox:links[pos-1]).focus();}
    if(ev.key==='Enter'&&document.activeElement===searchBox&&links[0]){ev.preventDefault();links[0].click();}
  });
  const toggle=$('.mobile-toggle'), side=$('#sidebar');
  function drawer(show){
    document.body.classList.toggle('nav-open',show);toggle.setAttribute('aria-expanded',String(show));
    if(show)$('.mobile-close').focus();else toggle.focus();
  }
  toggle.addEventListener('click',()=>drawer(true));$$('[data-close-nav]').forEach(el=>el.addEventListener('click',()=>drawer(false)));
  document.addEventListener('keydown',ev=>{
    const editing=ev.target?.matches?.('input,textarea,[contenteditable="true"]');
    if(!dialog.open&&((ev.key==='/'&&!editing)||((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='k'))){ev.preventDefault();openSearch();return;}
    if(ev.key==='Escape'&&document.body.classList.contains('nav-open')){drawer(false);return;}
    if(ev.key==='Tab'&&document.body.classList.contains('nav-open')){
      const links=$$('a,button',side),first=links[0],last=links[links.length-1];
      if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
    }
  });
  for(const box of $$('[data-model]')){
    const inputs=$$('[data-model-field]',box),outs=$$('[data-model-result]',box);
    function model(){
      const v={};
      for(const i of inputs){const key=i.dataset.modelField;v[key]=Number(i.value);
        $('[data-field-out="'+key+'"]',box).textContent=i.value+(i.dataset.unit?' '+i.dataset.unit:'');}
      let values;
      if(box.dataset.model==='merger'){const net=v.savings-v.cost;values=[net,net-(v.offer-v.target),v.offer-v.target].map(n=>(n<0?'−':'')+'€'+Math.abs(n).toFixed(1)+'m');}
      if(box.dataset.model==='lending'){const service=v.interest+v.principal,ratio=v.cash/service, cash=v.cash-service;values=[ratio.toFixed(2)+'×',(cash<0?'−':'')+'€'+Math.abs(cash).toFixed(0)+'k',ratio+1e-10>=v.buffer?'Meets minimum':'Below minimum'];}
      if(box.dataset.model==='option'){const r=v.rate/100,p=(1+r-0.8)/0.4,u=Math.max(120-v.strike,0),d=Math.max(80-v.strike,0);values=[u.toFixed(2)+' / '+d.toFixed(2),(100*p).toFixed(1)+'%',((p*u+(1-p)*d)/(1+r)).toFixed(2)];}
      values.forEach((value,i)=>{outs[i].textContent=value;});
    }
    inputs.forEach(i=>i.addEventListener('input',model));
    $('[data-model-reset]',box).addEventListener('click',()=>{inputs.forEach(i=>{i.value=i.defaultValue;});model();});model();
  }
  const importInput=$('[data-import]');
  $$('[data-export]').forEach(button=>button.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
    const anchor=node('a');anchor.download='Meridian-learning-'+new Date().toISOString().slice(0,10)+'.json';anchor.href=url;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }));
  if(importInput)importInput.addEventListener('change',async()=>{
    const status=$('.import-status'),f=importInput.files[0];if(!f)return;
    try{
      if(f.size>12*1024*1024)throw new Error('That file is too large for a classroom backup.');
      const incoming=clean(JSON.parse(await f.text()));
      const persisted=update(s=>{Object.assign(s,merge(s,incoming));});paint();
      status.textContent=persisted?'Backup merged with this browser’s progress and drafts.':'Backup merged for this session. Browser storage is unavailable.';
    }catch{status.textContent='This file could not be imported. Choose a valid Meridian progress backup.';}
    importInput.value='';
  });
})();
