'use strict';
const C = (() => {
  const D=window.COURSE_DATA, levels=['A1','A2','B1','B2','C1','C2'];
  const labels={A1:'First steps',A2:'Everyday life',B1:'Independent French',B2:'Fluent interaction',C1:'Nuance and argument',C2:'Precision and style'};
  const descriptors={A1:'Introduce yourself, ask simple questions and understand short notices.',A2:'Handle appointments, travel, shopping and everyday messages.',B1:'Explain an experience, give reasons and negotiate a practical solution.',B2:'Defend a viewpoint and follow detailed discussion on familiar subjects.',C1:'Read implied meanings and change register across professional and cultural contexts.',C2:'Weigh competing interpretations and express fine distinctions for a specific audience.'};
  const skills={Listening:{fr:'Écouter',icon:'headphones',color:'#3f6858',wash:'#e4ece1'},Speaking:{fr:'Parler',icon:'mic',color:'#9b5334',wash:'#f2e4d7'},Reading:{fr:'Lire',icon:'book-open',color:'#44627a',wash:'#e3ebef'},Writing:{fr:'Écrire',icon:'pen-line',color:'#897031',wash:'#f0ead6'}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${(window.ICON_SHAPES||{})[n]||''}</svg>`;
  const button=(label,action,arg='',cls='btn',symbol='')=>`<button type="button" class="${cls}" data-act="${esc(action)}" data-arg="${esc(arg)}">${symbol?icon(symbol):''}${esc(label)}</button>`;
  const rg=(route,txt,cls='link',symbol='')=>`<a class="${cls}" href="#/${esc(route)}">${symbol?icon(symbol):''}${esc(txt)}</a>`;
  const ext=(url,label)=>/^https:\/\//.test(url||'')?`<a class="link" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(label)}</a>`:'';
  const head=(title,subtitle='',aside='')=>`<div class="headline"><div><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${aside}</div>`;
  const safeNorm=v=>String(v??'').normalize('NFC').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/[‐‑–—]/g,'-').trim().replace(/[«»“”"()?!.,;:…]/g,' ').replace(/\s*(['-])\s*/g,'$1').replace(/\s+/g,' ').trim();
  const score=(q,value)=>[q.answer,...q.accepts||[]].some(a=>safeNorm(a)===safeNorm(value));
  const dateKey=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const after=n=>{const d=new Date();d.setDate(d.getDate()+n);return dateKey(d)};
  const units=[...D.lessons,...D.checkpoints], unitBy=Object.fromEntries(units.map(l=>[l.id,l])), all=[], by={};
  const add=q=>{if(by[q.id])throw Error('Repeated item '+q.id);all.push(q);by[q.id]=q;};
  for(const unit of units){
    unit.checks.forEach((q,i)=>add({...q,id:unit.id+'-q'+i,level:unit.level,lesson:unit.id,title:unit.title,stimulus:q.skill==='Reading'?unit.reading:q.stimulus,audio:q.skill==='Listening'?unit.audio:q.audio,cap:unit.id.endsWith('checkpoint')}));
    for(const kind of ['writing','speaking']){const q=unit[kind];add({...q,id:unit.id+'-'+kind,level:unit.level,skill:kind[0].toUpperCase()+kind.slice(1),type:'self',lesson:unit.id,title:unit.title,cap:unit.id.endsWith('checkpoint')});}
    unit.words.forEach(([fr,en],i)=>add({id:unit.id+'-v'+i,level:unit.level,lesson:unit.id,title:unit.title,skill:'Vocabulary',type:'card',prompt:'Recall the English meaning of this expression.',stimulus:fr,answer:en,why:'Use the expression in a sentence of your own before the next review.'}));
  }
  for(const q of D.bank)add({...q,title:q.title||'Independent practice'});
  for(const q of D.missions)add({...q,skill:'Listening',type:'choice',bookTrack:true});
  const defaultState=()=>({version:1,goal:null,completed:{},history:{},drafts:{},studyNotes:{},lastLesson:null,activity:{},session:null,previousSummary:null,filters:{level:'A1',skill:'All',type:'All',length:8},speed:1});
  const key='carnet-francais-progress-v1';
  const cleanMap=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  function normalizeState(input){
    if(!input||input.version!==1)throw Error('Choose a Carnet progress backup.');
    const s=defaultState(); s.goal=levels.includes(input.goal)?input.goal:null;
    s.completed=Object.fromEntries(Object.entries(cleanMap(input.completed)).filter(([k,v])=>(unitBy[k]||D.foundations.some(x=>x.id===k))&&typeof v==='string'));
    s.drafts=Object.fromEntries(Object.entries(cleanMap(input.drafts)).filter(([k,v])=>by[k]&&typeof v==='string'));
    s.studyNotes=Object.fromEntries(Object.entries(cleanMap(input.studyNotes)).filter(([k,v])=>typeof v==='string'&&/^(?:[a-c][12]-\d{2}-\d+|topic-\d{1,3})$/.test(k)));
    s.history=Object.fromEntries(Object.entries(cleanMap(input.history)).filter(([k,v])=>by[k]&&v&&Number.isFinite(v.seen)&&typeof v.due==='string'));
    s.activity=Object.fromEntries(Object.entries(cleanMap(input.activity)).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(v)));
    s.lastLesson=unitBy[input.lastLesson]?input.lastLesson:null;
    s.filters={...s.filters,...cleanMap(input.filters)};s.speed=[.8,1,1.15].includes(+input.speed)?+input.speed:1;
    const run=input.session;
    if(run&&Array.isArray(run.ids)&&run.ids.length&&run.ids.every(i=>by[i])&&Number.isInteger(run.pos)&&run.pos>=0&&run.pos<run.ids.length&&Array.isArray(run.results))s.session=run;
    if(input.previousSummary&&Array.isArray(input.previousSummary.results))s.previousSummary=input.previousSummary;
    return s;
  }
  let state;try{const old=localStorage.getItem(key);state=old?normalizeState(JSON.parse(old)):defaultState()}catch{state=defaultState()}
  function announce(msg){document.getElementById('live').textContent=msg;}
  let timer;function toast(msg){let el=document.getElementById('toast');el.textContent=msg;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,4600);}
  let storageWarned=false;function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{if(!storageWarned){storageWarned=true;toast('Device storage is full or unavailable. Export your progress to keep a copy.');}}}
  const due=()=>Object.keys(state.history).filter(id=>state.history[id].due<=dateKey()&&(!by[id].bookTrack||BookFiles.has(by[id].book)));
  function record(id,ok){const old=state.history[id]||{seen:0,right:0,box:0};const box=ok?Math.min(6,(old.box||0)+1):0;state.history[id]={seen:old.seen+1,right:(old.right||0)+(ok?1:0),last:Date.now(),lastOK:ok,box,due:after([0,1,3,7,14,30,60][box])};state.activity[dateKey()]=(state.activity[dateKey()]||0)+1;}
  const next=()=>unitBy[state.lastLesson]&&!state.completed[state.lastLesson]&&!unitBy[state.lastLesson].id.endsWith('checkpoint')?unitBy[state.lastLesson]:D.lessons.find(l=>!state.completed[l.id])||D.lessons[0];
  const shuffled=xs=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const notice=msg=>`<div class="notice">${esc(msg)}</div>`;
  const words=text=>(String(text||'').trim().match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
  const shortDay=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  return {D,levels,labels,descriptors,skills,units,unitBy,all,by,state,icon,esc,button,rg,ext,head,score,dateKey,record,save,due,next,shuffled,notice,toast,announce,words,shortDay,normalizeState,cleanMap};
})();
