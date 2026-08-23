/* ============================================================
   boot — runs after chapter interactives have registered
   ============================================================ */
(async function(){
  const saved = await Store.get(CH.key);
  if(saved) S = Object.assign(S, saved);
  const t = today();

  /* Saves written before missions kept a record hold done:{m1:true}. Upgrade
     them in place. XP and coins are separate fields and are never touched, so
     nobody loses progress. at:0 means "finished, date unknown" — better than
     stamping today's date on work done weeks ago and having revision believe
     it — and right/wrong start empty rather than inventing a score that was
     never recorded. */
  Object.keys(S.done).forEach(k=>{
    if(S.done[k] === true) S.done[k] = { at:0, last:0, tries:1, right:0, wrong:0 };
  });

  /* the streak belongs to the app, not to one chapter: opening any
     chapter on a given day counts once, for every chapter.          */
  let g = await Store.get('nb.streak');
  if(!g || typeof g !== 'object') g = { day:null, streak:0 };
  const rolled = (g.day !== t);
  if(rolled){
    g.streak = (g.day === yday()) ? (g.streak || 0) + 1 : 1;
    g.day = t;
  }
  /* A rolling fortnight of the days a chapter was opened, so the shelf can
     draw the week as days rather than as one number. Additive: an existing
     save starts with an empty list and fills in from today. */
  if(!Array.isArray(g.days)) g.days = [];
  const newDay = g.days[g.days.length - 1] !== t;
  if(newDay) g.days = g.days.concat(t).slice(-14);
  if(rolled || newDay) await Store.set('nb.streak', g);
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
