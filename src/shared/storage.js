/* ============================================================
   STORAGE — one adapter, used by the shelf and every chapter.
   Picks the best backend available, in this order:
     1. Capacitor Preferences  (native app: survives WebView clears)
     2. localStorage           (browser / PWA)
     3. window.storage         (preview host)
     4. in-memory              (last resort, so nothing ever throws)
   Everything is async, so swapping backends changes nothing upstream.
   ============================================================ */
const Store = (function(){
  const MEM = {};
  let mode = null, PREF = null;

  async function init(){
    if(mode) return mode;
    try {
      const cap = window.Capacitor;
      const p = cap && cap.Plugins && cap.Plugins.Preferences;
      if(p){ await p.get({ key:'__probe' }); PREF = p; return (mode = 'preferences'); }
    } catch(e){}
    try {
      window.localStorage.setItem('__probe','1');
      window.localStorage.removeItem('__probe');
      return (mode = 'localstorage');
    } catch(e){}
    try { if(window.storage) return (mode = 'host'); } catch(e){}
    return (mode = 'memory');
  }

  async function get(k){
    const m = await init();
    try {
      if(m === 'preferences'){ const r = await PREF.get({ key:k }); return (r && r.value != null) ? JSON.parse(r.value) : null; }
      if(m === 'localstorage'){ const v = window.localStorage.getItem(k); return v == null ? null : JSON.parse(v); }
      if(m === 'host'){ const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
    } catch(e){}
    return MEM[k] !== undefined ? MEM[k] : null;
  }

  async function set(k, v){
    const m = await init();
    MEM[k] = v;
    const s = JSON.stringify(v);
    try {
      if(m === 'preferences'){ await PREF.set({ key:k, value:s }); return true; }
      if(m === 'localstorage'){ window.localStorage.setItem(k, s); return true; }
      if(m === 'host'){ await window.storage.set(k, s); return true; }
    } catch(e){}
    return false;
  }

  async function remove(k){
    const m = await init();
    delete MEM[k];
    try {
      if(m === 'preferences'){ await PREF.remove({ key:k }); return; }
      if(m === 'localstorage'){ window.localStorage.removeItem(k); return; }
      if(m === 'host' && window.storage.remove){ await window.storage.remove(k); return; }
    } catch(e){}
  }

  async function keys(){
    const m = await init();
    try {
      if(m === 'preferences'){ const r = await PREF.keys(); return (r && r.keys) || []; }
      if(m === 'localstorage'){ return Object.keys(window.localStorage); }
      if(m === 'host' && window.storage.keys){ return (await window.storage.keys()) || []; }
    } catch(e){}
    return Object.keys(MEM);
  }

  /* Which keys belong to this app — what export, import and reset act on.
     Chapter keys are chNN<Name>, so match any digits: a `ch0` prefix test
     would silently skip every chapter from 10 on, and Class 10 Science
     chapter 11 is Electricity. */
  const owns = k => /^nb\./.test(k) || /^ch\d/.test(k);

  return { get, set, remove, keys, owns, mode: () => mode || 'unknown' };
})();
