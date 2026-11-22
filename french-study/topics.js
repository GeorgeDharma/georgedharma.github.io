'use strict';
const TopicLibrary = (() => {
  const {D,esc,head,rg,button,state}=C;
  const find = day=>D.topics.find(t=>t.day===Number(day));
  const normal = s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const row=t=>`<a class="unit-row topic-link" href="#/topic/${t.day}" data-topic-text="${esc(normal(t.title+' '+t.summary+' '+(t.search||'')+' '+t.examples.map(v=>v.fr+' '+v.en).join(' ')))}"><span class="tag">${esc(t.level)}</span><span class="utitle"><b>${esc(t.title)}</b><small>${esc(t.summary)}</small></span></a>`;
  function filter(input){
    const terms=normal(input.value).split(/\s+/).filter(Boolean);
    let n=0;document.querySelectorAll('[data-topic-text]').forEach(el=>{const show=terms.every(term=>el.dataset.topicText.includes(term));el.hidden=!show;if(show)n++;});
    const label=document.getElementById('topics-count');if(label)label.textContent=n+(n===1?' topic':' topics');
  }
  function page(raw){
    const level=C.levels.includes(raw)?raw:'All',topics=D.topics.filter(t=>level==='All'||t.level===level);
    return head('Topic library','Look up a single topic, hear its examples and work through a short exercise in the same place.')+
      `<div class="chips">${['All',...C.levels].map(l=>rg('topics/'+l,l==='All'?'All levels':l,'chip'+(level===l?' on':''))).join('')}</div>
      <label class="field topic-search"><span>Find a topic in English or French</span><input id="topic-search" type="search" placeholder="Try articles, numbers, pronouns, si…" autocomplete="off"></label>
      <div class="section-head"><h2>${level==='All'?'All topics':level+' topics'}</h2><span class="meta" id="topics-count" role="status">${topics.length} topics</span></div><div class="unit-list">${topics.map(row).join('')}</div>`;
  }
  function links(u){
    if(!u.days?.length)return '';
    const topics=u.days.map(find).filter(Boolean);
    return `<section class="panel topic-companion"><h2>Go deeper on this lesson</h2><p>Each topic opens an explanation, examples you can hear and a worked exercise.</p><div class="topic-chips">${topics.map(t=>rg('topic/'+t.day,t.title,'chip')).join('')}</div></section>`;
  }
  function topic(day){
    const t=find(day);if(!t)return page('All');
    const lessons=D.lessons.filter(v=>v.days.includes(t.day)),k='topic-'+t.day,pr=t.practice;
    return rg('topics/'+t.level,t.level+' topics','backlink')+`<p class="eyeline">${t.level} · Topic ${t.day}</p>`+head(t.title,t.summary)+
      `<div class="lesson-body"><section class="panel"><h2>Understand the pattern</h2><div class="prose-block">${t.explain.map(s=>`<p>${esc(s)}</p>`).join('')}</div>${Studio.comparisonTables(D.comparisons.filter(chart=>chart.topics.includes(t.day)))}</section>
      ${Studio.firstWords('topic',t.day)}<section class="panel"><h2>Hear it in context</h2>${t.examples.map(Studio.line).join('')}</section><section class="panel"><h2>Use it yourself</h2><p class="lead">${esc(pr.ask)}</p><details class="translation"><summary>Show a hint</summary><p>${esc(pr.hint)}</p></details><label class="formlabel" for="topic-answer">Your attempt</label><textarea class="short-draft" id="topic-answer" data-study-draft="${k}" rows="3">${esc(state.studyNotes[k]||'')}</textarea><details class="translation"><summary>Compare with the worked answer</summary><p class="model-answer">${esc(pr.answer)}</p><p>${esc(pr.why)}</p></details></section>
      <section class="panel"><h2>Study this in a lesson</h2><div class="topic-chips">${lessons.map(u=>rg('lesson/'+u.id+'/learn',u.title,'chip')).join('')}</div></section><div class="buttons section">${t.day>1?rg('topic/'+(t.day-1),'Previous topic','btn-outline'):''}${t.day<180?rg('topic/'+(t.day+1),'Next topic','btn'):rg('topics','All topics','btn')}</div></div>`;
  }
  return {page,topic,links,filter,find};
})();
