/* Can each bench actually be completed? Drive every control it has and check
   the mission records as done.

   This is the check no other harness makes, and it found five missions across
   two shipped chapters that could never be completed at all — forces m1, m9,
   m12, m15 and atom m2. Every one had the same shape: the bench tracked what
   the reader had visited, reached its threshold, updated its explanatory note,
   and never called complete(). They pass the id audit, throw no errors, award
   explore credit normally and look completely fine on screen. Only asking
   "does this actually pay out?" surfaces them. */
const CHAPTERS = require('./chapters');
const { browser, open, reporter } = require('./lib');

/* A bench is a mission with controls of its own. Its chip rows count: the
   exploration chapter's first mission completes when four chips are toggled,
   and a probe that only knows about .row buttons and sliders never touches
   them. Chips belonging to a shared Q.* component live in a #gN container and
   are excluded — those missions are driven by the component, not by a bench. */
async function benchesOf(page){
  return page.$$eval('details.m', ns => ns.map(n => {
    const isComponent = id => /^g\d+[ab]?$/.test(id || '');
    const skip = /^(g\d+[ab]?(check)?|boss(Start|Opts|Qn|Q|Why|Tier|Hp|HpTxt))$/;
    const ctrls = [...n.querySelectorAll('input[type=range], button.act')]
      .map(e => e.id || '')
      .filter(id => id && !skip.test(id));
    const chipBoxes = [...n.querySelectorAll('.chips')]
      .filter(box => box.id && !isComponent(box.id) && box.querySelector('button'))
      .map(box => box.id);
    /* Some missions carry a bench AND a graded activity, and the activity is
       what calls complete(): motion's third mission has a play button beside a
       Q.vgrid, and the cell chapter's membrane mission is a six-question quiz
       that only completes on a perfect score. Clicking blindly cannot pass
       either, so leave them to the coverage that can — the chapter tests and
       verify's component checks — rather than reporting a bug that is not one.
       Every graded activity in the app numbers its elements g1, g2, g3 …, which
       is the signal used here. */
    const ownedByComponent = [...n.querySelectorAll('[id]')].some(e => /^g\d/.test(e.id));
    return { id: n.id, chipBoxes, ownedByComponent,
             ctrls: ctrls.concat(chipBoxes.map(c => c + ' (chips)')) };
  })).then(list => list.filter(m => m.ctrls.length && !m.ownedByComponent));
}

async function run(){
  const r = reporter('reach');
  const b = await browser();

  /* A full sweep is minutes of animation waiting. When you are working on one
     chapter, SHELF_ONLY=coordinates probes just that one. */
  const only = (process.env.SHELF_ONLY || '').split(',').filter(Boolean);

  for (const c of CHAPTERS) {
    if (only.length && !only.includes(c.slug)) continue;
    const page = await open(b, CHAPTERS.file(c), { missions: true });
    const benches = await benchesOf(page);
    const skip = new Set(c.skipReach || []);
    let done = 0, tried = 0;

    for (const m of benches) {
      if (skip.has(m.id)) continue;
      tried++;

      /* Probe one mission at a time. Every mission is opened at load so that
         auto() plays each bench once, but leaving thirteen canvases animating
         at 30fps starves the one under test: energy's simple-machine sequence
         advances by a fixed step per frame, so a slow frame rate stretches a
         six-second animation past any patience the probe has, and a bench that
         a reader finishes easily is reported dead. A reader has one mission
         open; so does this. */
      await page.$$eval('details.m', (ns, id) => ns.forEach(n => { n.open = n.id === id; }), m.id);
      await page.waitForTimeout(200);

      const isDone = () => page.evaluate(id => !!(S.done && S.done[id]), m.id);
      /* Poll rather than waiting a fixed time: the cell chapter's division
         bench takes about three seconds of animation to finish, and a fixed
         wait short enough to keep the suite quick would call it dead. Polling
         is fast when the bench completes at once and patient when it does not. */
      const settle = async (ms) => {
        for (let waited = 0; waited < ms; waited += 250) {
          await page.waitForTimeout(250);
          if (await isDone()) return true;
        }
        return isDone();
      };

      /* Press everything except the resets, and let each press finish before
         the next. Two ways this went wrong: pressing "Reset" straight after
         "Go" cancels the animation whose completion sets the flag (Forces'
         friction bench), and pressing two run buttons 90ms apart means the
         second aborts the first, so neither is ever recorded (the cell
         chapter's mitosis-then-meiosis bench). */
      const UNDO = /reset|clear/i;
      const pressButtons = async () => {
        for (const btn of await page.$$('#' + m.id + ' button.act')) {
          const id = await btn.getAttribute('id');
          if (id && UNDO.test(id)) continue;
          await btn.click().catch(() => {});
          if (await settle(1600)) return true;
        }
        return false;
      };
      /* Pick, then run — in that order, for each choice. Forces' friction
         bench records a surface only when the coin has finished sliding on it,
         so clicking all four surface chips and then never pressing Go again
         records exactly one surface however many passes you make. */
      /* Address a chip by row and position, never by handle. Several benches
         rebuild their chip row from scratch on every pick — bonding's
         criss-cross empties both boxes and recreates the buttons — so a handle
         taken before the first click is detached from the document by the
         second, and every later click quietly does nothing. Re-querying at the
         moment of the click is the only thing that survives that. */
      const tap = async (box, i) => {
        const cs = await page.$$('#' + box + ' button');
        if (cs[i]) await cs[i].click().catch(() => {});
      };
      const click = async () => {
        const rows = [];
        for (const box of m.chipBoxes) {
          const n = (await page.$$('#' + box + ' button')).length;
          if (n) rows.push({ box, n });
        }
        if (!rows.length) return pressButtons();

        /* One row at a time is not enough when a bench is driven by the
           COMBINATION of two rows. Bonding's criss-cross wants three different
           shapes of formula, and which shape you get depends on the cation and
           the anion together — walking one row with the other left on its first
           entry reaches barely two. So walk the pairs when there are two rows,
           bounded, and stop as soon as the bench pays out. */
        const combos = [];
        if (rows.length >= 2) {
          for (let i = 0; i < rows[0].n; i++) {
            for (let j = 0; j < rows[1].n; j++) {
              combos.push([[rows[0].box, i], [rows[1].box, j]]);
            }
          }
        } else {
          for (let i = 0; i < rows[0].n; i++) combos.push([[rows[0].box, i]]);
        }
        for (const combo of combos.slice(0, 64)) {
          for (const [box, i] of combo) {
            await tap(box, i);
            await page.waitForTimeout(60);
          }
          if (await isDone()) return true;
          if (await pressButtons()) return true;
        }
        return false;
      };
      /* Sweep like a drag — every intermediate value, because three discrete
         jumps can skip a whole band and make a live bench look dead — and
         finish somewhere different on each pass. Energy's potential-energy
         bench wants three drops from three DIFFERENT heights, and a sweep that
         always parks at the maximum only ever supplies two. */
      const sweepAll = async (pass) => {
        const park = [1, 0, 0.5][pass % 3];
        for (const s of await page.$$('#' + m.id + ' input[type=range]')) {
          await s.evaluate((n, park) => {
            const lo = +n.min, hi = +n.max, st = Math.max(+n.step || 1, (hi - lo) / 40);
            for (let v = lo; v <= hi; v += st) {
              n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true }));
            }
            n.value = String(lo + (hi - lo) * park);
            n.dispatchEvent(new Event('input', { bubbles: true }));
          }, park);
          await page.waitForTimeout(140);
        }
      };

      /* Be persistent and be patient, or the probe reports bugs that are not
         there. Some benches need a control pressed many times before their
         threshold is reached (the atom's "cut it in half" wants 30 cuts), and
         some only complete when an animation lands a second or two after the
         click — a body falling, a rocket firing. One impatient pass calls both
         of those unreachable when a reader would finish them without noticing. */
      let ok = false;
      for (let pass = 0; pass < 3 && !ok; pass++) {
        await click();
        await sweepAll(pass);
        await click();
        ok = await settle(3500);
      }

      /* Repetition. Some thresholds are not reached by touching a control, but
         by working it: the gold foil wants 1500 α-particles through the
         Rutherford foil before it will admit the reader has seen enough, which
         is six volleys of the same button, and the atom's "cut it in half"
         wants thirty cuts. A pass that presses each control once calls both
         dead. Pressing the SAME button repeatedly is safe in a way that
         pressing the next one is not — it is what a reader does. */
      if (!ok) {
        for (const btn of await page.$$('#' + m.id + ' button.act')) {
          const id = await btn.getAttribute('id');
          if (id && UNDO.test(id)) continue;
          for (let i = 0; i < 8 && !ok; i++) {
            await btn.click().catch(() => {});
            ok = await settle(700);
          }
          if (ok) break;
        }
      }

      /* Last resort: press one button and just watch. Energy's simple-machine
         bench animates a five-step sequence lasting about six seconds, and the
         busy passes above keep pressing the next control partway through and
         restarting it. Pressing a single control and waiting is what a reader
         does, and it is the only way these benches ever finish. */
      if (!ok) {
        for (const btn of await page.$$('#' + m.id + ' button.act')) {
          const id = await btn.getAttribute('id');
          if (id && UNDO.test(id)) continue;
          await btn.click().catch(() => {});
          ok = await settle(9000);
          if (ok) break;
        }
      }

      if (ok) done++;
      else r.fail(c.slug + ' ' + m.id + ' can never be completed (' + m.ctrls.join(', ') + ')');
    }

    r.note(c.slug.padEnd(13) + done + '/' + tried + ' benches complete' +
           (skip.size ? '  (' + [...skip].join(',') + ' skipped: see chapters.js)' : ''));
    await page.close2();
  }

  await b.close();
  return r.failures;
}

module.exports = run;
if (require.main === module) require('./lib').main(run);
