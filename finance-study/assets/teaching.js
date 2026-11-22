'use strict';
(() => {
  function fold(text) {
    return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  const query = document.getElementById('theory-find');
  if (query) {
    const subject = document.getElementById('theory-course');
    const reset = document.getElementById('theory-clear');
    const status = document.getElementById('theory-result');
    const empty = document.getElementById('theory-empty');
    const location = new URL(window.location.href);
    const groups = Array.from(document.querySelectorAll('[data-theory-group]'), group => ({
      group, items: Array.from(group.querySelectorAll('[data-theory-item]'), el => {
        const terms = fold(el.dataset.terms);
        return {el, terms, compact: terms.replace(/ /g, '')};
      })
    }));
    const boards = Array.from(document.querySelectorAll('[data-board-item]'), el => ({
      el, terms:fold(el.dataset.terms), subjects:el.dataset.subjects.split(' ')
    }));
    const preset = (location.searchParams.get('subject') || '').toUpperCase();
    if (Array.from(subject.options).some(option => option.value === preset)) subject.value = preset;
    query.value = location.searchParams.get('q') || '';
    function show(updateUrl) {
      const words = fold(query.value).split(' ').filter(Boolean);
      let count = 0;
      for (const {group, items} of groups) {
        let visible = 0;
        for (const {el, terms, compact} of items) {
          const hit = (!subject.value || subject.value === el.dataset.course) &&
            words.every(word => terms.includes(word) || compact.includes(word));
          el.hidden = !hit;
          if (hit) visible++;
        }
        group.hidden = visible === 0;
        count += visible;
      }
      let boardCount=0;
      for (const {el,terms,subjects} of boards) {
        const compact=terms.replace(/ /g,'');
        const hit=(!subject.value || subjects.includes(subject.value)) &&
          words.every(word => terms.includes(word) || compact.includes(word));
        el.hidden=!hit; if(hit) boardCount++;
      }
      document.getElementById('blackboard').hidden=boardCount === 0;
      document.getElementById('all-models').hidden=count === 0;
      status.textContent = count + (count === 1 ? ' lesson topic' : ' lesson topics') + ' · ' +
        boardCount + (boardCount === 1 ? ' blackboard lecture' : ' blackboard lectures');
      empty.hidden = count + boardCount !== 0;
      reset.hidden = !subject.value && !query.value;
      if (updateUrl) {
        const url = new URL(window.location.href);
        for (const [key,value] of [['q',query.value],['subject',subject.value]]) {
          if (value) url.searchParams.set(key,value); else url.searchParams.delete(key);
        }
        try { history.replaceState(null,'',url); } catch { /* Local file previews still filter. */ }
      }
    }
    query.addEventListener('input', () => show(true));
    subject.addEventListener('change', () => show(true));
    reset.addEventListener('click', () => { query.value=''; subject.value=''; show(true); query.focus(); });
    show(false);
  }
  for (const form of document.querySelectorAll('[data-number-check]')) {
    const input = form.querySelector('input');
    const output = form.querySelector('[role=status]');
    const expected = Number(form.dataset.value), tol = Number(form.dataset.tolerance);
    input.addEventListener('input', () => { output.textContent = ''; delete output.dataset.mark; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const entered = input.value.trim().replace(/−/g,'-').replace(',','.');
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(entered) || !Number.isFinite(Number(entered))) {
        output.textContent = 'Enter one number in the units above. Leave out thousands separators, symbols and unit labels.';
        output.dataset.mark = 'retry'; input.focus(); return;
      }
      const roundingError = 4 * Number.EPSILON * Math.max(1,Math.abs(expected));
      const correct = Math.abs(Number(entered) - expected) <= tol + roundingError;
      output.dataset.mark = correct ? 'correct' : 'retry';
      output.textContent = correct ? 'Correct within the rounding allowance. Open the solution to compare your working.' :
        'Recheck the changed assumptions, sign and units. The full solution shows the intermediate steps.';
    });
  }
  for (const lab of document.querySelectorAll('[data-chalk-lab]')) {
    const states = JSON.parse(lab.querySelector('[data-lab-states]').textContent);
    const controls = lab.querySelector('[data-lab-controls]');
    const inputs = Array.from(controls.querySelectorAll('[data-knob]'));
    const metrics = Array.from(lab.querySelectorAll('[data-lab-metric]'));
    const body = lab.querySelector('[data-lab-table] tbody'), note = lab.querySelector('[data-lab-note]');
    function calculate() {
      const state = states[inputs.map(input => input.value).join(',')];
      if (!state) return;
      metrics.forEach((el,index) => { el.textContent = state.metrics[index]; });
      const rows = state.rows.map(values => {
        const row = document.createElement('tr');
        values.forEach((value,index) => {
          const cell = document.createElement(index === 0 ? 'th' : 'td');
          if (index === 0) cell.scope = 'row';
          cell.textContent = String(value); row.append(cell);
        });
        return row;
      });
      body.replaceChildren(...rows);
      note.textContent = state.note;
    }
    inputs.forEach(input => input.addEventListener('change',calculate));
    controls.querySelector('[data-lab-reset]').addEventListener('click',() => {
      inputs.forEach(input => { input.value = input.dataset.default; }); calculate();
    });
    controls.hidden = false;
    calculate();
  }
})();

(() => {
  const desk = document.querySelector('[data-interview-ui]');
  if (!desk) return;
  const deck = JSON.parse(document.getElementById('interview-deck').textContent);
  const book = window.MeridianNotebook, keys = Object.keys(deck);
  const setup = desk.querySelector('[data-start-interview]'), select = setup.querySelector('select');
  const card = desk.querySelector('.interview-card'), title = card.querySelector('h2');
  const outline = document.getElementById('interview-outline'), review = desk.querySelector('[data-interview-review]');
  const next = card.querySelector('[data-interview-next]'), prev = card.querySelector('[data-interview-prev]');
  const positionKey = 'meridian.finance.interview.v1';
  let subject = new URL(window.location.href).searchParams.get('subject') || '';
  if (!Array.from(select.options).some(opt => opt.value === subject)) subject = '';
  let sitting = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(positionKey));
    if (saved && saved.subject === subject && Array.isArray(saved.ids) && saved.ids.length === 5 &&
        new Set(saved.ids).size === 5 && saved.ids.every(k => Object.hasOwn(deck,k) && k.startsWith(subject)) &&
        Number.isInteger(saved.pos) && saved.pos >= 0 && saved.pos <= 5) sitting = saved;
  } catch { /* A session can be used without storage. */ }
  function drawSet(course) {
    const pool = keys.filter(k => k.startsWith(course));
    for (let i=pool.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]] = [pool[j],pool[i]];
    }
    return {subject:course,ids:pool.slice(0,5),pos:0};
  }
  function paint(moveFocus) {
    try { sessionStorage.setItem(positionKey,JSON.stringify(sitting)); } catch {}
    const end = sitting.pos >= sitting.ids.length;
    review.hidden = !end; card.hidden = end;
    if (end) {
      const list = review.querySelector('ol'); list.replaceChildren();
      sitting.ids.forEach((id,i) => {
        const li = document.createElement('li'), button = document.createElement('button'), a = document.createElement('a');
        button.type='button';button.className='quiet-button';button.textContent=deck[id].name;
        button.addEventListener('click',() => {sitting.pos=i;paint(true);});
        a.href=book.resolve(deck[id].url+'#derivation');a.textContent='Full lesson';li.append(button,' · ',a);list.append(li);
      });
      if (moveFocus) review.querySelector('h2').focus(); return;
    }
    const id=sitting.ids[sitting.pos], question=deck[id];
    card.querySelector('[data-interview-count]').textContent='Question '+(sitting.pos+1)+' of '+sitting.ids.length+' · '+id.split('.')[0];
    title.textContent=question.question;outline.value=book.read('oral-'+id);
    card.querySelector('[data-interview-status]').textContent = outline.value ? 'Your saved outline.' : 'Your outline is saved on this device as you type.';
    for (const part of ['follow','guide']) card.querySelector('[data-interview-'+part+']').open=false;
    for (const [field,value] of [['probe',question.followup],['name',question.name],['answer',question.answer],['reply',question.reply]]) {
      card.querySelector('[data-interview-'+field+']').textContent=value;
    }
    card.querySelector('[data-interview-link]').href=book.resolve(question.url+'#derivation');
    prev.disabled=sitting.pos===0;next.textContent=sitting.pos===sitting.ids.length-1?'Review this set':'Next question';
    if(moveFocus)title.focus();
  }
  select.value=subject;
  if(!sitting)sitting=drawSet(subject);
  setup.addEventListener('submit',event=>{
    event.preventDefault();subject=select.value;sitting=drawSet(subject);
    const uri=new URL(window.location.href);
    if(subject)uri.searchParams.set('subject',subject);else uri.searchParams.delete('subject');
    try{history.replaceState(null,'',uri);}catch{}
    paint(true);
  });
  outline.addEventListener('input',()=>{
    const ok=book.save('oral-'+sitting.ids[sitting.pos],outline.value);
    card.querySelector('[data-interview-status]').textContent=ok?'Saved on this device.':'Available in this session. Download a backup to keep this outline.';
  });
  prev.addEventListener('click',()=>{if(sitting.pos>0){sitting.pos--;paint(true);}});
  next.addEventListener('click',()=>{if(sitting.pos<sitting.ids.length){sitting.pos++;paint(true);}});
  desk.hidden=false;paint(false);
})();
