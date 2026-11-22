'use strict';
window.MeridianPapers = (() => {
  const fieldPattern = /^([FCSQ]\d{2})\.([a-z0-9]{6,16}-[a-f0-9]{8,16})\.(open|timer|done|[am]([1-4])-([1-9][0-9]?))$/;
  function validField(key, entry, courses, validTime) {
    const match = fieldPattern.exec(key);
    if (!match || !courses[match[1]] || !entry || !validTime(entry.at)) return false;
    const [, code, , field, q, p] = match;
    if (!q) return validTime(entry.value);
    const maximum = courses[code].paper?.[Number(q)-1]?.[Number(p)-1];
    if (!Number.isInteger(maximum)) return false;
    if (field.startsWith('a')) return typeof entry.value === 'string' && entry.value.length<=12000;
    return entry.value === null || (Number.isInteger(entry.value) && entry.value >= 0 && entry.value <= maximum);
  }
  function mount({courses, classroomUrl, getState, update, announce}) {
    const paper=document.querySelector('[data-exam]');
    const mine=document.querySelector('[data-exam-history]');
    if (!paper && !mine) return {refresh(){}};
    const code=paper?.dataset.exam;
    const fields=() => getState().examFields;
    const list=(subject) => Object.keys(fields())
      .filter(key=>key.endsWith('.open') && (!subject || key.startsWith(subject+'.')))
      .map(key=>key.slice(0,-5))
      .sort((a,b)=>fields()[b+'.open'].value-fields()[a+'.open'].value || b.localeCompare(a));
    const value=(run,field) => run ? fields()[run+'.'+field]?.value : undefined;
    const at=(run) => new Date(value(run,'open')).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
    const toExam=(subject,run) => classroomUrl('subjects/'+subject.toLowerCase()+'/exam/?attempt='+encodeURIComponent(run.split('.')[1]));
    function score(run,subject) {
      let given=0, possible=0, marked=0, parts=0;
      courses[subject].paper.forEach((q,qi)=>q.forEach((max,pi)=>{
        possible+=max; parts++;
        const mark=value(run,'m'+(qi+1)+'-'+(pi+1));
        if(Number.isInteger(mark)){given+=mark; marked++;}
      }));
      return {given,possible,marked,parts};
    }
    function scoreLabel(result) {
      if (!result.marked) return 'Ready to self-mark';
      if (result.marked<result.parts) return result.marked+' of '+result.parts+' parts marked · '+result.given+' marks recorded';
      return 'Self-marked '+result.given+' / '+result.possible+' ('+Math.round(100*result.given/result.possible)+'%)';
    }
    const summary=()=>{
      if(!mine) return;
      mine.replaceChildren();
      const history=list();
      if(!history.length){
        const p=document.createElement('p');p.textContent='Your mock papers and self-assessed results appear here after you start writing or turn on the timer.';
        const a=document.createElement('a');a.href=classroomUrl('exams/');a.textContent='Browse subject exams';mine.append(p,a);return;
      }
      for(const run of history){
        const subject=run.split('.')[0], div=document.createElement('div'), a=document.createElement('a'), detail=document.createElement('small');
        div.className='study-item';a.textContent=courses[subject].title;a.href=toExam(subject,run);
        const status=value(run,'done') ? scoreLabel(score(run,subject)) : 'In progress';
        detail.textContent=at(run)+' · '+status;div.append(a,detail);mine.append(div);
      }
    };
    if(!paper){summary();return {refresh:summary};}
    const $=sel=>paper.querySelector(sel);
    const $$=sel=>[...paper.querySelectorAll(sel)];
    const requested=new URLSearchParams(location.search).get('attempt');
    let active=list(code).find(k=>k.split('.')[1]===requested) || list(code)[0] || null;
    let expiring=null;
    function pick(id){
      active=id;
      const loc=new URL(location.href);loc.searchParams.set('attempt',id.split('.')[1]);history.replaceState(null,'',loc);
    }
    function newId(){
      const bytes=crypto.getRandomValues(new Uint8Array(5));
      return code+'.'+Date.now().toString(36)+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    }
    function saveField(field, content, alwaysNew=false) {
      const run=alwaysNew || !active ? newId() : active;
      const persisted=update(s=>{
        const at=Date.now(), base=run+'.';
        if(!s.examFields[base+'open'])s.examFields[base+'open']={at,value:at};
        const pastFinish = Boolean(s.examFields[base+'done']);
        if (pastFinish && (field === 'timer' || field === 'done' || field.startsWith('a'))) return;
        if (field === 'timer' && s.examFields[base+'timer']) return;
        if(field!=='open')s.examFields[base+field]={at,value:content};
      });
      if(run!==active || !new URLSearchParams(location.search).has('attempt'))pick(run);
      $('[data-paper-save]').textContent=persisted?'Saved on this device.':'This sitting is in memory. Use Download my backup on this page to keep it.';
    }
    const fmt=ms=>{
      const sec=Math.ceil(Math.max(ms,0)/1000);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
    };
    function time(){
      const box=$('[data-timer-display]'), start=value(active,'timer'), end=value(active,'done'), limit=Number(paper.dataset.minutes)*60000;
      if(!start){box.hidden=true;return;}
      box.hidden=false;
      if(end){box.textContent='Time used '+fmt(Math.max(0,end-start));return;}
      const left=start+limit-Date.now();
      box.textContent=left>0 ? fmt(left)+' remaining' : 'Time elapsed. Finish when you are ready.';
      if(left<=0 && expiring!==active){expiring=active;announce('The suggested exam time has elapsed. Your answers are still available.');}
    }
    function renderHistory(){
      const runs=list(code), select=$('#paper-history');
      $('.attempt-picker').hidden=runs.length<2;
      const same=select.options.length===runs.length && runs.every((run,i)=>select.options[i].value===run);
      if(!same){select.replaceChildren();runs.forEach((run,i)=>{
        const opt=document.createElement('option');opt.value=run;opt.textContent='Attempt '+(runs.length-i)+' · '+at(run);select.append(opt);});}
      if(active)select.value=active;
    }
    function render(){
      if(!active)active=list(code)[0]||null;
      const done=Boolean(value(active,'done'));
      const guide=$('#marking-guide'), start=$('[data-start-time]');
      const message=done ? 'Completed · self-assessment' : value(active,'timer')?'Timed attempt in progress':'Untimed practice';
      $('[data-paper-state]').textContent=message;
      $('.sitting-controls').hidden=false;
      $('.paper-local').hidden=false;
      $('[data-finish-box]').hidden=done;
      $('[data-new-sitting]').hidden=!done;
      start.hidden=done || Boolean(value(active,'timer'));
      guide.classList.add('enhanced');
      guide.hidden=!done;guide.open=done;
      if(done) $('[data-grade-total]').textContent=scoreLabel(score(active,code));
      for(const area of $$('[data-paper-answer]')){
        const work=value(active,'a'+area.dataset.paperAnswer)||'';
        if(area.value!==work)area.value=work;
        area.readOnly=done;
      }
      for(const block of $$('[data-own-work]')){
        const work=value(active,'a'+block.dataset.ownWork);
        block.hidden=!done; block.textContent=work?'Your answer · '+work:'No response recorded for this part.';
      }
      for(const input of $$('[data-paper-mark]')){
        input.closest('label').hidden=!done;
        const mark=value(active,'m'+input.dataset.paperMark);
        input.value=Number.isInteger(mark)?String(mark):'';
      }
      for(const box of $$('[data-case-result]')){
        const q=Number(box.dataset.caseResult), maximums=courses[code].paper[q-1];
        const marks=maximums.map((_,p)=>value(active,'m'+q+'-'+(p+1)));
        const total=marks.reduce((sum,item)=>sum+(Number.isInteger(item)?item:0),0);
        const maximum=maximums.reduce((sum,item)=>sum+item,0);
        box.textContent=marks.every(Number.isInteger)?'Your marks · '+total+' of '+maximum:'';
      }
      renderHistory();time();
    }
    for(const area of $$('[data-paper-answer]')){
      area.addEventListener('input',()=>{
        if(value(active,'done')){render();return;}
        saveField('a'+area.dataset.paperAnswer,area.value);
        renderHistory();
      });
    }
    for(const select of $$('[data-paper-mark]')){
      select.addEventListener('change',()=>{
        if(!value(active,'done'))return;
        const num=select.value===''?null:Number(select.value);
        saveField('m'+select.dataset.paperMark,num);render();
      });
    }
    $('[data-start-time]').addEventListener('click',()=>{if(!value(active,'timer')&&!value(active,'done'))saveField('timer',Date.now());render();});
    $('[data-finish-paper]').addEventListener('click',()=>{
      if(!value(active,'done'))saveField('done',Date.now());
      render();$('#guide-title').focus();$('#guide-title').scrollIntoView({block:'start'});
    });
    $('[data-new-sitting]').addEventListener('click',()=>{
      saveField('open',Date.now(),true);render();$('[data-start-time]').focus();
      announce('New attempt started. Your previous paper is saved.');
    });
    $('#paper-history').addEventListener('change',event=>{pick(event.target.value);render();});
    setInterval(time,1000);render();
    return {refresh:render};
  }
  return {validField, mount};
})();
