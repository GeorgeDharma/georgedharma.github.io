'use strict';
window.Shelf=(()=>{
  const {D,esc,icon,button,rg,ext,head,toast}=C, S=D.sources;
  const books=Object.fromEntries(S.books.map(b=>[b.level,b]));
  const info=k=>k==='clemence'?S.clemenceArchive:books[k];
  const library=id=>'https://chatgpt.com/library?file_id='+encodeURIComponent(id)+'&account_id=personal';
  const file=(key,path,label,page=1)=>button(label,'material-file',JSON.stringify([key,path,label,page]),'act-link',/\.mp3$/i.test(path)?'headphones':'file-text');
  const trackControl=q=>BookFiles.has(q.book)?file(q.book,q.path,'Play textbook recording'):rg('materials/'+q.book,'Attach the '+q.book+' book to play this recording','link','paperclip');
  const doc=(key,v,p,name)=>v?file(key,v.path,name||v.title,p||1):'';
  const dossier=(b,d)=>doc(b.level,b.volumes.find(v=>v.key===d.volume),d.page,'Dossier '+d.number+' · '+d.title+' (p. '+d.printed+')');
  function lessonLine(row){
    const quizzes=row.quizzes||[];
    return `<div class="row-section"><div class="label">Day ${row.day} · ${esc(row.title)}</div><div class="controls">${rg('topic/'+row.day,'Study this topic here','link')}${file('clemence',row.lesson,'Lesson PDF')}${row.worksheet?file('clemence',row.worksheet,'Worksheet'):''}${ext(row.url,'Course page')}</div>${quizzes.length?`<details class="small-details"><summary>${quizzes.length} online quizzes</summary><div class="controls">${quizzes.map(q=>ext(q.url,q.title)).join('')}</div></details>`:''}</div>`;
  }
  function notes(u){
    const rows=S.clemence.filter(r=>u.days?.includes(r.day)),b=books[u.level];
    const ds=b?.dossiers.filter(d=>d.relatedDays.some(x=>u.days?.includes(x)))||[];
    if(!rows.length&&!ds.length)return '';
    return `<details class="panel section companions"><summary>Optional original materials</summary><p class="muted">Open related chapters and recordings from your own copies. Attach each ZIP once in My materials.</p>${rows.map(lessonLine).join('')}${ds.length?`<h3>${esc(b.title)}</h3><div class="unit-list">${ds.map(d=>dossier(b,d)).join('')}</div>`:''}</details>`;
  }
  const archiveCard=(key,title,tag,copy,symbol)=>`<article class="book-card"><span class="icon-patch">${icon(symbol)}</span><h3>${esc(title)}</h3><p>${esc(tag)} · ${esc(copy)}</p>${rg('materials/'+key,'Open collection','link')}</article>`;
  function overview(){return head('My materials','The courses and recordings you own. Open the Topic library for explanations and practice inside Carnet.')+
    `<div class="library-grid">${S.books.map(b=>archiveCard(b.level,b.title,b.level,b.counts.mp3+' recordings','book-open')).join('')}${archiveCard('clemence','Learn French With Clémence','A1–C2','180 lessons','notebook-pen')}</div>
    <div class="panel section"><h2>How to use your copies</h2><p>Open a collection and choose its original ZIP. The reader opens the PDFs and plays the recordings on this device. Attaching a textbook also unlocks guided listening questions in the practice bank.</p></div>
    <section class="panel section"><h2>Further French practice</h2><ul class="resource-list">${S.studyRefs.map(r=>`<li>${ext(r.url,r.name)}<div class="meta">${esc(r.note)}</div></li>`).join('')}</ul></section>`;
  }
  function controls(k){
    const a=info(k);
    return `<div class="controls">${button(BookFiles.has(k)?'Replace attached ZIP':'Attach my ZIP','attach-archive',k,'btn','paperclip')}${a.libraryId?ext(library(a.libraryId),'Get my original ZIP'):''}${BookFiles.has(k)?'<span class="tag">Attached on this device</span>':''}</div>`;
  }
  function filterPanel(k){return `<section class="panel section"><h2>${k==='clemence'?'Course directory':'Files and recordings'}</h2><div class="filters"><label class="field"><span>Find by title, track number or topic</span><input id="source-find" type="search" autocomplete="off" placeholder="Search this collection"></label>${k==='clemence'?`<label class="field"><span>Level</span><select id="source-level"><option>All</option>${C.levels.map(l=>`<option>${l}</option>`).join('')}</select></label>`:''}</div><p class="meta" id="file-count" aria-live="polite"></p><div id="file-results" data-key="${esc(k)}" class="file-results"></div></section>`;}
  function shelfPage(k){
    if(!info(k))return overview();
    const b=books[k];
    if(!b)return rg('materials','My materials','backlink')+head('Learn French With Clémence','180 course days from A1 to C2, with lesson PDFs, worksheets and supplementary practice.')+controls(k)+filterPanel(k);
    const samples=b.samples.map(a=>{const t=b.tracks.find(t=>t.number===a.track&&t.group===a.group),v=b.volumes.find(v=>v.key===a.volume);
      return `<div class="fileline"><div><b>${esc(a.activity)}</b><div class="meta">Dossier ${a.dossier} · p. ${a.printed} · Exercise ${esc(a.exercise)}</div></div><div class="controls">${doc(k,v,a.page,'Open page')}${t?file(k,t.path,'Track '+t.number):''}</div></div>`;}).join('');
    return rg('materials','My materials','backlink')+head(b.title,b.level+' · '+b.overview)+controls(k)+
      `<div class="section grid-two"><section class="panel"><h2>Dossier bookmarks</h2>${b.dossiers.map(d=>`<div class="fileline">${dossier(b,d)}</div>`).join('')}${b.note?`<p class="meta rulegap">${esc(b.note)}</p>`:''}</section>
      <section class="panel"><h2>Guided listening</h2><p>Practise with eight selected recordings from this book. Each question points to its audio and explains the answer.</p><div class="buttons">${button(BookFiles.has(k)?'Start guided listening':'Attach to unlock listening',BookFiles.has(k)?'book-practice':'attach-archive',k,'btn','headphones')}</div></section></div>
      ${samples?`<details class="panel section"><summary>Activities from the book</summary>${samples}</details>`:''}${filterPanel(k)}`;
  }
  const searchText=x=>String(x||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  function filter(){
    const root=document.getElementById('file-results');if(!root)return;
    const k=root.dataset.key,term=searchText(document.getElementById('source-find').value),lvl=document.getElementById('source-level')?.value||'All';
    const matches=(t,l)=>searchText(t).includes(term)&&(lvl==='All'||l===lvl||!l);
    let items=[];
    if(k==='clemence'){
      items=S.clemence.filter(r=>matches(r.level+' Day '+r.day+' '+r.title,r.level)).map(r=>`<div class="fileline"><div>${lessonLine(r)}</div><span class="tag">${esc(r.level)}</span></div>`);
      items.push(...S.supplementary.filter(r=>matches(r.group+' '+r.title,r.level)).map(r=>`<div class="fileline">${file(k,r.path,r.title)}<small>${esc(r.group)}</small></div>`));
      items.push(...S.onlinePractice.filter(r=>matches(r.group+' '+r.title,r.level)).map(r=>`<div class="fileline">${ext(r.url,r.title)}<small>${esc(r.group)} · ${esc(r.level||'Mixed')}</small></div>`));
    }else{const b=books[k];items=[...b.volumes,...b.tracks].filter(v=>matches(v.title+' '+v.path)).map(v=>`<div class="fileline">${file(k,v.path,v.title)}<span class="meta">${v.pages?v.pages+' pages':'MP3'}</span></div>`);}
    document.getElementById('file-count').textContent=items.length+' matching entries';root.innerHTML=items.join('')||'<p class="empty">No matching entries.</p>';
  }
  let modal=null,mediaUrl=null;
  function hideModal(){if(modal){const d=modal;modal=null;d.close();d.remove();}if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}}
  async function attach(k,resume){const b=info(k);if(!b)return;const picker=document.createElement('input');picker.type='file';picker.accept='.zip,application/zip';picker.onchange=async()=>{const f=picker.files[0];if(!f)return;try{
      toast('Checking '+b.archive+'…');const kept=await BookFiles.attach(k,f,k==='clemence'?S.clemence[0].lesson:b.volumes[0].path);
      window.CarnetApp.render(false);toast(kept?'Archive attached on this device.':'Archive attached for this visit. This browser could not save the ZIP.');if(resume)await resume();}
      catch(e){toast(e.message);}};picker.click();}
  async function openFile(arg){const [k,path,label,page]=JSON.parse(arg);
    if(!BookFiles.has(k)){toast('Choose the '+info(k).archive+' archive to open this file.');attach(k,()=>openFile(arg));return;}
    try{const blob=await BookFiles.member(k,path);hideModal();mediaUrl=URL.createObjectURL(blob);const isAudio=/\.mp3$/i.test(path),url=mediaUrl+(isAudio?'':'#page='+Math.max(1,+page||1));modal=document.createElement('dialog');modal.setAttribute('aria-labelledby','resource-title');
      modal.innerHTML=`<div class="dialog-head"><h2 id="resource-title">${esc(label)}</h2>${button('Close','close-modal','','btn-outline','x')}</div>${isAudio?`<audio controls autoplay src="${esc(url)}" aria-label="${esc(label)}"></audio>`:`<a class="link" href="${esc(url)}" target="_blank" rel="noopener">Open PDF in a new tab</a><iframe title="${esc(label)}" src="${esc(url)}"></iframe>`}`;
      document.body.appendChild(modal);modal.addEventListener('cancel',e=>{e.preventDefault();hideModal()});modal.showModal();}
    catch(e){toast(e.message);}}
  function events(act,arg){switch(act){case 'attach-archive':attach(arg);return true;case 'material-file':openFile(arg);return true;case 'close-modal':hideModal();return true;default:return false;}}
  return {trackControl,notes,shelfPage,filter,events,hideModal};
})();
