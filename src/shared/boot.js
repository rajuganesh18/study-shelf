/* ============================================================
   boot — runs after chapter interactives have registered
   ============================================================ */
(async function(){
  const saved = await Store.get(CH.key);
  if(saved) S = Object.assign(S, saved);
  const t = today();

  /* the streak belongs to the app, not to one chapter: opening any
     chapter on a given day counts once, for every chapter.          */
  let g = await Store.get('nb.streak');
  if(!g || typeof g !== 'object') g = { day:null, streak:0 };
  if(g.day !== t){
    g.streak = (g.day === yday()) ? (g.streak || 0) + 1 : 1;
    g.day = t;
    await Store.set('nb.streak', g);
  }
  S.streak = g.streak;

  if(S.day !== t){
    S.day = t; S.missionsToday = 0; S.perfectToday = 0; S.exploreToday = 0; S.questsPaid = {};
  }
  Object.keys(S.done).forEach(markDone);
  BOOTED = true;                       // from here on, taps count. see engine.js
  renderHQ(); save();
  requestAnimationFrame(()=>requestAnimationFrame(redrawAll));
})();

/* "All chapters" goes back to the list this chapter sits in, not to the shelf
   root. CH.id already carries the class and subject, as in 9-science-5, so the
   link needs no per-chapter editing. The plain index.html in the markup stays
   as the fallback if this never runs. */
(function(){
  const back = document.querySelector('.backbar');
  if(!back) return;
  const p = String(CH.id || '').split('-');
  if(p.length < 2 || !p[0] || !p[1]) return;
  back.href = 'index.html?cls=' + encodeURIComponent(p[0]) + '&sub=' + encodeURIComponent(p[1]);
})();


/* offline: the service worker precaches every page, icon and font */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').catch(function(){});
  });
}
