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
  renderHQ(); save();
  requestAnimationFrame(()=>requestAnimationFrame(redrawAll));
})();


/* offline: the service worker precaches every page, icon and font */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').catch(function(){});
  });
}
