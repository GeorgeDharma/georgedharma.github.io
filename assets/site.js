const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav-links');
function closeMenu(){ menu?.classList.remove('is-open'); menuButton?.setAttribute('aria-expanded','false'); }
menuButton?.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(open));});
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.classList.contains('is-open')){closeMenu();menuButton.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
window.matchMedia('(min-width:621px)').addEventListener('change',event=>{if(event.matches)closeMenu();});

// Native horizontal scrolling supports touch and trackpad gestures; controls
// and arrow keys provide the same navigation without automatic rotation.
document.querySelectorAll('.project-carousel').forEach(carousel=>{
  const track=carousel.querySelector('.carousel-track');
  const slides=[...carousel.querySelectorAll('.carousel-slide')];
  const dots=[...carousel.querySelectorAll('[data-slide]')];
  const previous=carousel.querySelector('[data-direction="-1"]');
  const next=carousel.querySelector('[data-direction="1"]');
  const count=carousel.querySelector('.carousel-count');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let active=0;
  carousel.querySelector('.carousel-controls').hidden=false;
  function update(){
    active=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));
    slides.forEach((slide,index)=>{slide.inert=index!==active;});
    dots.forEach((dot,index)=>dot.setAttribute('aria-pressed',String(index===active)));
    previous.disabled=active===0;
    next.disabled=active===slides.length-1;
    const label=`${active+1} / ${slides.length}`;
    if(count.textContent!==label)count.textContent=label;
  }
  function goTo(index){
    const target=Math.max(0,Math.min(slides.length-1,index));
    track.scrollTo({left:target*track.clientWidth,behavior:reducedMotion.matches?'auto':'smooth'});
  }
  previous.addEventListener('click',()=>goTo(active-1));
  next.addEventListener('click',()=>goTo(active+1));
  dots.forEach(dot=>dot.addEventListener('click',()=>goTo(Number(dot.dataset.slide))));
  track.addEventListener('scroll',update,{passive:true});
  carousel.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    const target={ArrowLeft:active-1,ArrowRight:active+1,Home:0,End:slides.length-1}[event.key];
    if(target!==undefined){event.preventDefault();goTo(target);}
  });
  new ResizeObserver(()=>{track.scrollTo({left:active*track.clientWidth,behavior:'auto'});update();}).observe(track);
  update();
});

// Group filters keep the full directory available without JavaScript.
const filterPanel = document.querySelector('.filter-panel');
if (filterPanel) {
  const filters = [...filterPanel.querySelectorAll('[data-group]')];
  const projects = [...document.querySelectorAll('#project-list > .project')];
  const status = document.querySelector('.project-count');
  const groups = new Set(filters.map(button => button.dataset.group));
  function applyGroup(group, updateUrl = false) {
    if (!groups.has(group)) group = 'all';
    let visible = 0;
    projects.forEach(project => {
      project.hidden = group !== 'all' && project.dataset.group !== group;
      if (!project.hidden) visible++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === group)));
    status.textContent = group === 'all' ? `Showing all ${projects.length} projects` : `Showing ${visible} of ${projects.length} projects`;
    if (updateUrl && window.location.protocol !== 'file:') {
      const url = new URL(window.location.href);
      if (group === 'all') url.searchParams.delete('group');
      else url.searchParams.set('group', group);
      url.hash = '';
      window.history.pushState({}, '', url);
    }
  }
  function restoreGroup() {
    const target = projects.find(project => `#${project.id}` === window.location.hash);
    const group = new URLSearchParams(window.location.search).get('group') || 'all';
    // A carousel deep link always reveals its target, including after Back.
    applyGroup(target ? 'all' : group);
  }
  filters.forEach(button => button.addEventListener('click', () => applyGroup(button.dataset.group, true)));
  window.addEventListener('popstate', restoreGroup);
  window.addEventListener('hashchange', restoreGroup);
  filterPanel.hidden = false;
  restoreGroup();
}
