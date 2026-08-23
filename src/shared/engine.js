/* ============================================================
   SHARED ENGINE — identical across every chapter.
   Chapter files supply CH (config) above and interactives below.
   ============================================================ */

/* persistence: see storage.js, concatenated above. */

const TOTAL = CH.total;
let S = { xp:0, coins:0, streak:0, day:null, done:{}, missionsToday:0, perfectToday:0, exploreToday:0, questsPaid:{} };

/* Local calendar dates, not UTC. toISOString() would roll the streak over
   at 05:30 in India rather than at midnight, so a session after midnight
   counted towards the previous day and the streak stalled. */
const ymd = d => d.getFullYear() + '-' +
                 String(d.getMonth()+1).padStart(2,'0') + '-' +
                 String(d.getDate()).padStart(2,'0');
const today = () => ymd(new Date());
const yday  = () => ymd(new Date(Date.now()-864e5));

let saveT;
function save(){
  clearTimeout(saveT);
  saveT = setTimeout(()=>{
    Store.set(CH.key, S);
    // summary the library shell reads to roll progress up across chapters
    Store.set('nb.sum.' + CH.id, {
      xp: S.xp, coins: S.coins,
      done: Object.keys(S.done).length, total: TOTAL,
      updated: Date.now()
    });
    Store.set('nb.last', CH.id);
  }, 400);
}

/* ---------- toast ---------- */
const toastEl = document.getElementById('toast');
let toastT;
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(()=>toastEl.classList.remove('show'), 2200);
}

/* ---------- daily quests ---------- */
const QUESTS = [
  { id:'q1', text:'Finish 2 missions',            xp:40, hit:()=>S.missionsToday >= 2 },
  { id:'q2', text:'Get one activity fully right', xp:30, hit:()=>S.perfectToday  >= 1 },
  { id:'q3', text:'Try 3 interactive controls',   xp:20, hit:()=>S.exploreToday  >= 3 }
];

/* Nothing counts until boot has loaded the saved state. Chapter benches call
   their own sync()/upd() once at startup to paint themselves, and those calls
   go through the same code path a tap does — without this gate a chapter pays
   out the daily exploration quest the moment it is opened. boot.js flips it. */
let BOOTED = false;

function ev(kind){
  if(!BOOTED) return;
  if(kind === 'mission')  S.missionsToday++;
  if(kind === 'perfect')  S.perfectToday++;
  if(kind === 'explore')  S.exploreToday++;
  checkQuests(); save();
}

function checkQuests(){
  QUESTS.forEach(q=>{
    if(q.hit() && !S.questsPaid[q.id]){
      S.questsPaid[q.id] = true;
      S.xp += q.xp;
      toast('Quest complete · +' + q.xp + ' XP');
    }
  });
  renderHQ();
}

/* ---------- progress visual (chapter supplies stages + painter) ---------- */
function stageOf(xp){ let s = CH.stages[0]; CH.stages.forEach(t=>{ if(xp >= t.at) s = t; }); return s; }

function drawBadge(){
  const cv = document.getElementById('colony');
  if(!cv) return;
  const r = window.devicePixelRatio || 1, W = 96;
  cv.width = Math.round(96*r); cv.height = Math.round(96*r);
  cv.style.width = '96px'; cv.style.height = '96px';
  const x = cv.getContext('2d');
  if(!x) return;
  x.setTransform(r,0,0,r,0,0);
  const st = stageOf(S.xp);
  x.clearRect(0,0,W,W);
  CH.paint(x, W, st, S);
  document.getElementById('colName').textContent = st.name;
  document.getElementById('colDesc').textContent = st.d;
  const next = CH.stages[CH.stages.indexOf(st)+1];
  const pct = next ? Math.min(100, ((S.xp-st.at)/(next.at-st.at))*100) : 100;
  document.getElementById('colBar').style.width = pct + '%';
}

/* ---------- HQ ---------- */
function renderHQ(){
  document.getElementById('sXp').textContent = S.xp;
  document.getElementById('sCoin').textContent = S.coins;
  document.getElementById('sStreak').textContent = S.streak;
  document.getElementById('sDone').textContent = Object.keys(S.done).length + '/' + TOTAL;
  const list = document.getElementById('qList');
  list.innerHTML = '';
  QUESTS.forEach(q=>{
    const paid = !!S.questsPaid[q.id];
    const d = document.createElement('div');
    d.className = 'quest' + (paid ? ' done' : '');
    d.innerHTML = '<span class="tick">' + (paid ? '\u2713' : '') + '</span><span>' + q.text + '</span><b>+' + q.xp + ' XP</b>';
    list.appendChild(d);
  });
  drawBadge();
}

/* ---------- mission completion ---------- */
function complete(id){
  if(!BOOTED) return;                    // same reason as ev(): see BOOTED above
  const el = document.getElementById(id);
  if(!el || S.done[id]) return;
  S.done[id] = true;
  const xp = +el.dataset.xp, coin = +el.dataset.coin;
  S.xp += xp; S.coins += coin;
  el.classList.add('done');
  el.querySelector('.mstat').textContent = 'DONE';
  toast('Mission complete \u00b7 +' + xp + ' XP \u00b7 +' + coin + ' coins');
  ev('mission');
  save(); renderHQ();
}

function markDone(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add('done');
  el.querySelector('.mstat').textContent = 'DONE';
}

/* ---------- single-question block (data-q + .why) ---------- */
document.querySelectorAll('[data-q]').forEach(g=>{
  g.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn || !g.contains(btn)) return;
    if(g.dataset.answered) return;
    g.dataset.answered = '1';
    [...g.querySelectorAll('button')].forEach(b=>b.classList.remove('right','wrong'));
    const ok = !!btn.dataset.ok;
    btn.classList.add(ok ? 'right' : 'wrong');
    if(!ok){ const k = g.querySelector('[data-ok]'); if(k) k.classList.add('right'); }
    const why = g.parentElement.querySelector('.why');
    if(why) why.classList.add('show');
    if(ok) ev('perfect');
    if(g.dataset.m) complete(g.dataset.m);
  });
});

/* ---------- canvas helpers ---------- */
function fit(cv, h){
  const r = window.devicePixelRatio || 1, w = cv.clientWidth || 320;
  cv.width  = Math.round(w*r);
  cv.height = Math.round(h*r);
  cv.style.height = h + 'px';        // without this the element renders h*dpr tall
  const x = cv.getContext('2d');
  if(!x) return null;
  x.setTransform(r,0,0,r,0,0);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  return x;
}
const mono = (x,s,w) => x.font = (w||400) + ' ' + s + 'px "IBM Plex Mono",monospace';
const sans = (x,s,w) => x.font = (w||400) + ' ' + s + 'px "IBM Plex Sans",sans-serif';
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function arrow(x, x1,y1, x2,y2, col, head){
  head = head || 7;
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2;
  x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke();
  const a = Math.atan2(y2-y1, x2-x1);
  x.beginPath(); x.moveTo(x2,y2);
  x.lineTo(x2-head*Math.cos(a-0.4), y2-head*Math.sin(a-0.4));
  x.lineTo(x2-head*Math.cos(a+0.4), y2-head*Math.sin(a+0.4));
  x.closePath(); x.fill();
}

/* ============================================================
   REUSABLE GAME COMPONENTS
   ============================================================ */
const Q = {

  /* --- tap-in-order: sequences, timelines, levels of organisation --- */
  order(boxId, scoreId, items, mid, doneMsg){
    const box = document.getElementById(boxId), sc = document.getElementById(scoreId);
    if(!box) return;
    let at = 0;
    const n = items.length;
    shuffle(items).forEach(t=>{
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = t;
      b.onclick = ()=>{
        if(b.classList.contains('gone')) return;
        if(t === items[at]){
          b.classList.add('right','gone'); at++;
          sc.textContent = at + ' of ' + n + ' placed';
          if(at === n){ sc.textContent = doneMsg || 'Correct order.'; ev('perfect'); complete(mid); }
        } else {
          b.classList.add('wrong');
          setTimeout(()=>b.classList.remove('wrong'), 500);
          sc.textContent = 'Not yet \u2014 what comes after ' + (at ? items[at-1].toLowerCase() : 'nothing') + '?';
        }
      };
      box.appendChild(b);
    });
    sc.textContent = '0 of ' + n + ' placed';
  },

  /* --- two-column matching: term <-> function, part <-> job --- */
  match(aId, bId, scoreId, pairs, mid, doneMsg){
    const A = document.getElementById(aId), B = document.getElementById(bId), sc = document.getElementById(scoreId);
    if(!A || !B) return;
    let sel = null, n = 0;
    function mk(parent, label, key, side){
      const b = document.createElement('button');
      b.className = 'chip';
      b.style.cssText = 'width:100%;margin-bottom:7px;font-size:12.5px;text-align:left';
      b.textContent = label; b.dataset.key = key; b.dataset.side = side;
      parent.appendChild(b);
    }
    shuffle(pairs).forEach(p=>mk(A, p[0], p[0], 'a'));
    shuffle(pairs).forEach(p=>mk(B, p[1], p[0], 'b'));
    function click(e){
      const b = e.target.closest('button');
      if(!b || b.classList.contains('gone')) return;
      if(!sel || sel.dataset.side === b.dataset.side){
        if(sel) sel.classList.remove('on');
        sel = b; b.classList.add('on'); return;
      }
      if(sel.dataset.key === b.dataset.key){
        sel.classList.add('right','gone'); b.classList.add('right','gone'); sel = null; n++;
        sc.textContent = n + ' of ' + pairs.length + ' matched';
        if(n === pairs.length){ sc.textContent = doneMsg || 'All matched.'; ev('perfect'); complete(mid); }
      } else {
        const s = sel; b.classList.add('wrong'); s.classList.add('wrong');
        setTimeout(()=>{ b.classList.remove('wrong'); s.classList.remove('wrong','on'); }, 500);
        sel = null;
      }
    }
    A.addEventListener('click', click); B.addEventListener('click', click);
    sc.textContent = '0 of ' + pairs.length + ' matched';
  },

  /* --- choice rows: true/false misconception checks, and N-way sorters --- */
  rows(boxId, scoreId, rows, choices, mid, doneMsg){
    const box = document.getElementById(boxId), sc = document.getElementById(scoreId);
    if(!box) return;
    let n = 0, answered = 0;
    rows.forEach(s=>{
      const row = document.createElement('div');
      row.className = 'qrow';
      const txt = document.createElement('span'); txt.className = 't'; txt.textContent = s.t;
      row.appendChild(txt);
      const btns = choices.map((c,ci)=>{
        const b = document.createElement('button');
        b.className = 'chip'; b.textContent = c;
        b.onclick = ()=>{
          if(row.dataset.done) return;
          row.dataset.done = '1'; answered++;
          const ok = (ci === s.a);
          b.classList.add(ok ? 'right' : 'wrong');
          btns.forEach(o=>{ if(o !== b) o.classList.add('gone'); });
          if(!ok) btns[s.a].classList.add('right');
          if(ok) n++;
          sc.textContent = n + ' of ' + rows.length + ' correct';
          if(answered === rows.length){
            if(n === rows.length){ sc.textContent = doneMsg || 'All correct.'; ev('perfect'); }
            complete(mid);
          }
        };
        row.appendChild(b); return b;
      });
      box.appendChild(row);
    });
    sc.textContent = '0 of ' + rows.length + ' correct';
  },

  /* --- tick grid: self-marking comparison tables straight from the chapter --- */
  grid(tableId, checkId, scoreId, cfg){
    const tbl = document.getElementById(tableId), sc = document.getElementById(scoreId);
    if(!tbl) return;
    const cols = cfg.cols, ROWS = cfg.rows, marks = cfg.marks || ['\u2713','\u2717'];
    const nc = cols.length, cells = ROWS.length * nc;
    const state = ROWS.map(()=>new Array(nc).fill(-1));
    let html = '<tr><th style="text-align:left">' + cfg.head + '</th>';
    cols.forEach(c=>html += '<th>' + c + '</th>');
    html += '</tr>';
    ROWS.forEach((r,ri)=>{
      html += '<tr><td class="lbl">' + r.l + '</td>';
      for(let c=0;c<nc;c++) html += '<td class="c" style="width:' + Math.floor(60/nc) + '%" data-r="' + ri + '" data-c="' + c + '"></td>';
      html += '</tr>';
    });
    tbl.innerHTML = html;
    tbl.addEventListener('click', e=>{
      const td = e.target.closest('td.c'); if(!td) return;
      const r = +td.dataset.r, c = +td.dataset.c;
      state[r][c] = state[r][c] === -1 ? 1 : state[r][c] === 1 ? 0 : -1;
      td.className = 'c ' + (state[r][c] === 1 ? 'yes' : state[r][c] === 0 ? 'no' : '');
      td.textContent = state[r][c] === 1 ? marks[0] : state[r][c] === 0 ? marks[1] : '';
      td.style.width = Math.floor(60/nc) + '%';
    });
    document.getElementById(checkId).onclick = ()=>{
      let right = 0, filled = 0;
      ROWS.forEach((r,ri)=>{
        for(let c=0;c<nc;c++){
          const td = tbl.querySelector('[data-r="'+ri+'"][data-c="'+c+'"]');
          td.classList.remove('err');
          if(state[ri][c] === -1) continue;
          filled++;
          if(state[ri][c] === r.a[c]) right++; else td.classList.add('err');
        }
      });
      if(filled < cells){ sc.textContent = 'Fill all ' + cells + ' boxes first \u2014 ' + filled + ' done.'; return; }
      sc.textContent = right + ' of ' + cells + ' correct.';
      if(right === cells){
        sc.textContent = cfg.doneMsg || (cells + ' of ' + cells + '.');
        ev('perfect'); complete(cfg.mid);
      }
    };
    sc.textContent = '';
  },

  /* --- value grid: same self-marking table, cells hold values not ticks --- */
  vgrid(tableId, checkId, scoreId, cfg){
    const tbl = document.getElementById(tableId), sc = document.getElementById(scoreId);
    if(!tbl) return;
    const cols = cfg.cols, ROWS = cfg.rows, nc = cols.length;
    let cells = 0;
    let html = '<tr><th style="text-align:left">' + cfg.head + '</th>';
    cols.forEach(c=>html += '<th>' + c + '</th>');
    html += '</tr>';
    ROWS.forEach((r,ri)=>{
      html += '<tr><td class="lbl">' + r.l + '</td>';
      for(let c=0;c<nc;c++){
        const given = r.given && r.given[c] !== undefined && r.given[c] !== null;
        if(given){ html += '<td style="color:var(--dim)">' + r.given[c] + '</td>'; }
        else {
          cells++;
          html += '<td><select data-r="' + ri + '" data-c="' + c + '"><option value="">\u2014</option>' +
            cfg.options[c].map(o=>'<option value="' + o + '">' + o + '</option>').join('') + '</select></td>';
        }
      }
      html += '</tr>';
    });
    tbl.innerHTML = html;
    document.getElementById(checkId).onclick = ()=>{
      let right = 0, filled = 0;
      tbl.querySelectorAll('select').forEach(sel=>{
        const r = +sel.dataset.r, c = +sel.dataset.c;
        sel.style.borderColor = 'var(--rule)'; sel.style.color = 'var(--ink)';
        if(!sel.value) return;
        filled++;
        if(sel.value === String(ROWS[r].a[c])){ right++; sel.style.borderColor = 'var(--good)'; sel.style.color = 'var(--good)'; }
        else { sel.style.borderColor = 'var(--bad)'; sel.style.color = 'var(--bad)'; }
      });
      if(filled < cells){ sc.textContent = 'Fill all ' + cells + ' boxes first \u2014 ' + filled + ' done.'; return; }
      sc.textContent = right + ' of ' + cells + ' correct.';
      if(right === cells){
        sc.textContent = cfg.doneMsg || (cells + ' of ' + cells + '.');
        ev('perfect'); complete(cfg.mid);
      }
    };
    sc.textContent = '';
  },

  /* --- choose-all-that-apply --- */
  pick(boxId, checkId, scoreId, items, mid, doneMsg){
    const box = document.getElementById(boxId), sc = document.getElementById(scoreId);
    if(!box) return;
    const picked = new Set();
    items.forEach((it,i)=>{
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = it.t;
      b.onclick = ()=>{
        if(box.dataset.done) return;
        if(picked.has(i)){ picked.delete(i); b.classList.remove('on'); }
        else { picked.add(i); b.classList.add('on'); }
        sc.textContent = picked.size + ' selected';
      };
      box.appendChild(b); it._b = b;
    });
    document.getElementById(checkId).onclick = ()=>{
      if(box.dataset.done) return;
      box.dataset.done = '1';
      let right = 0;
      items.forEach((it,i)=>{
        const should = !!it.a, did = picked.has(i);
        it._b.classList.remove('on');
        if(should) it._b.classList.add(did ? 'right' : 'wrong');
        else if(did) it._b.classList.add('wrong');
        else it._b.classList.add('gone');
        if(should === did) right++;
      });
      const perfect = right === items.length;
      sc.textContent = perfect ? (doneMsg || 'All correct.') : (right + ' of ' + items.length + ' decided correctly.');
      if(perfect) ev('perfect');
      complete(mid);
    };
    sc.textContent = '0 selected';
  },

  /* --- boss battle: ten questions, health bars, difficulty ladder --- */
  boss(QS, mid, winMsg){
    let i = 0, bhp = 100, yhp = 100, live = false;
    const qEl = document.getElementById('bossQ'), oEl = document.getElementById('bossOpts'),
          wEl = document.getElementById('bossWhy'), tEl = document.getElementById('bossTier'),
          startB = document.getElementById('bossStart');
    if(!qEl) return;
    function bars(){
      document.getElementById('bossHp').style.width = bhp + '%';
      document.getElementById('youHp').style.width = yhp + '%';
      document.getElementById('bossHpTxt').textContent = 'Boss ' + bhp + '%';
      document.getElementById('youHpTxt').textContent = yhp + '%';
      document.getElementById('bossQn').textContent = 'Question ' + Math.min(i+1, QS.length) + ' of ' + QS.length;
    }
    function show(){
      if(!live) return;
      if(bhp <= 0){ finish(true);  return; }
      if(yhp <= 0){ finish(false); return; }
      if(i >= QS.length){ finish(bhp <= 0); return; }
      const q = QS[i];
      qEl.textContent = q.q;
      tEl.textContent = q.t;
      wEl.classList.remove('show'); oEl.innerHTML = '';
      q.o.forEach((o,k)=>{
        const b = document.createElement('button');
        b.className = 'opt'; b.textContent = o;
        b.onclick = ()=>{
          [...oEl.children].forEach(c=>c.disabled = true);
          const ok = k === q.a;
          b.classList.add(ok ? 'right' : 'wrong');
          if(!ok) oEl.children[q.a].classList.add('right');
          if(ok) bhp = Math.max(0, bhp - 12); else yhp = Math.max(0, yhp - 20);
          wEl.textContent = q.w; wEl.classList.add('show');
          bars(); i++;
          setTimeout(show, 2600);
        };
        oEl.appendChild(b);
      });
      bars();
    }
    function finish(won){
      live = false; oEl.innerHTML = ''; tEl.textContent = '';
      if(won){
        qEl.textContent = 'Boss defeated. You have finished the chapter.';
        wEl.textContent = winMsg; wEl.classList.add('show');
        complete(mid); ev('perfect');
        startB.style.display = 'none';
      } else {
        qEl.textContent = 'The boss won this round.';
        wEl.textContent = 'Go back through the missions you are least sure of, then try again.';
        wEl.classList.add('show');
        startB.textContent = 'Try again'; startB.style.display = '';
      }
    }
    startB.onclick = ()=>{
      i = 0; bhp = 100; yhp = 100; live = true;
      startB.style.display = 'none'; wEl.classList.remove('show');
      show();
    };
    bars();
  }
};

/* ============================================================
   redraw on open / resize / fonts
   ============================================================ */
const REG = {}, AUTO = {};
function reg(id, fn){ (REG[id] = REG[id] || []).push(fn); }
function auto(id, fn){ AUTO[id] = fn; }

function redrawAll(){
  Object.keys(REG).forEach(id=>{
    const d = document.getElementById(id);
    if(d && d.open) REG[id].forEach(f=>{ try { f(); } catch(e){ console.error(id, e); } });
  });
}

document.querySelectorAll('details.m').forEach(d=>{
  d.addEventListener('toggle', ()=>{
    if(!d.open) return;
    // double rAF, not setTimeout: clientWidth is 0 until the box has laid out
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      redrawAll();
      if(AUTO[d.id] && !d.dataset.auto){
        d.dataset.auto = '1';                 // auto-play once, no XP for the auto-run
        setTimeout(()=>{ try { AUTO[d.id](); } catch(e){ console.error(e); } }, 450);
      }
    }));
  });
});
let rzT;
window.addEventListener('resize', ()=>{ clearTimeout(rzT); rzT = setTimeout(redrawAll, 120); });
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>setTimeout(redrawAll, 50));

/* ---------- 30fps ticker for the live benches ---------- */
const TICK = [];
function tick(id, fn){ TICK.push([id, fn]); }
setInterval(()=>{
  TICK.forEach(([id,fn])=>{
    const d = document.getElementById(id);
    if(d && d.open){ try { fn(); } catch(e){} }
  });
}, 1000/30);
