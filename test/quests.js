const CHAPTERS = require('./chapters');
const { browser, reporter, BASE } = require('./lib');

/* The "try 3 interactive controls" quest means three distinct controls — not three events from one slider drag. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
const CH = CHAPTERS.map(c => c.slug);   // the one list, from chapters.js
  const b = await browser();

  console.log('== no dead controls: every slider must award at least once');
  for (const c of CH) {
    const page = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
    await page.goto(BASE + '' + c + '-chapter.html');
    await page.waitForTimeout(1100);
    await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
    await page.waitForTimeout(1200);
    const ids = await page.$$eval('details.m[open] input[type=range]', ns => ns.map(n => n.id));
    const dead = [];
    for (const id of ids) {
      const got = await page.evaluate(sid => {
        S.exploreToday = 0; S.exploreKeys = {}; S.questsPaid = {};
        const n = document.getElementById(sid), lo = +n.min, hi = +n.max;
        for (let i = 0; i <= 20; i++) {
          n.value = String(lo + (hi - lo) * i / 20);
          n.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return S.exploreToday;
      }, id);
      if (got === 0) dead.push(id);
      else if (got > 1) fail(c + ' ' + id + ' awarded ' + got + ' for one control');
    }
    if (dead.length) fail(c + ': controls awarding nothing -> ' + dead.join(', '));
    else console.log('   ' + c.padEnd(13) + ids.length + ' sliders, all award exactly 1');
    await page.context().close();
  }

  console.log('\n== three controls tick the quest; one control thirty times does not');
  for (const c of CH) {
    const page = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
    await page.goto(BASE + '' + c + '-chapter.html');
    await page.waitForTimeout(1100);
    await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
    await page.waitForTimeout(1200);
    const ids = await page.$$eval('details.m[open] input[type=range]', ns => ns.map(n => n.id));
    if (ids.length < 3) { console.log('   ' + c.padEnd(13) + 'only ' + ids.length + ' sliders, skipping'); await page.context().close(); continue; }

    // hammer ONE control
    const one = await page.evaluate(sid => {
      S.exploreToday = 0; S.exploreKeys = {}; S.questsPaid = {};
      const n = document.getElementById(sid), lo = +n.min, hi = +n.max;
      for (let i = 0; i < 30; i++) { n.value = String(lo + (hi-lo)*(i%21)/20); n.dispatchEvent(new Event('input',{bubbles:true})); }
      return { count: S.exploreToday, paid: !!S.questsPaid.q3 };
    }, ids[0]);
    if (one.paid) fail(c + ': one control used 30 times paid out q3');

    // now three different ones
    const three = await page.evaluate(sids => {
      S.exploreToday = 0; S.exploreKeys = {}; S.questsPaid = {};
      sids.forEach(sid => { const n = document.getElementById(sid);
        n.value = String(+n.max); n.dispatchEvent(new Event('input',{bubbles:true})); });
      return { count: S.exploreToday, paid: !!S.questsPaid.q3 };
    }, ids.slice(0, 3));
    if (!three.paid) fail(c + ': three different controls did NOT pay out q3 (count ' + three.count + ')');
    console.log('   ' + c.padEnd(13) + 'one x30 -> ' + one.count + ' (paid ' + one.paid + ')   three -> ' +
                three.count + ' (paid ' + three.paid + ')');
    await page.context().close();
  }

  await b.close();
  console.log(bad ? '\nquests: ' + bad + ' FAILURE(S)' : '\nquests: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('./lib').main(run);
