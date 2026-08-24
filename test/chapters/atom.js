const { browser, reporter, BASE } = require('../lib');

/* Rutherford scattering: most pass straight through, sharp deflections are rare, back-scatters rarer still — and under Thomson nothing ever bounces. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
  const b = await browser();
  const page = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
  page.on('pageerror', e => fail('threw: ' + e));
  await page.goto(BASE + 'atom-chapter.html');
  await page.waitForTimeout(1400);

  // ---- the gold foil statistics must actually be Rutherford's ----
  console.log('== gold foil: 20 000 shots at each model');
  const tally = m => page.evaluate(model => {
    window.__gf.setModel(model);
    const c = { thru:0, defl:0, back:0 };
    for (let i = 0; i < 20000; i++) c[window.__gf.classify(window.__gf.shoot())]++;
    return c;
  }, m);

  const R = await tally('ruth');
  const pT = 100*R.thru/20000, pD = 100*R.defl/20000, pB = 100*R.back/20000;
  console.log('   Rutherford: through ' + pT.toFixed(2) + '%  deflected>10° ' +
              pD.toFixed(2) + '%  back>90° ' + pB.toFixed(3) + '%  (' + R.back + ' of 20000)');
  if (pT < 90)          fail('only ' + pT.toFixed(1) + '% went straight through — the atom should be mostly empty');
  if (pB > 1)           fail(pB.toFixed(2) + '% bounced back — far too common, this misteaches the result');
  if (R.back >= R.defl) fail('back-scatters (' + R.back + ') are not rarer than deflections (' + R.defl + ')');

  const T = await tally('thom');
  console.log('   Thomson:    through ' + (100*T.thru/20000).toFixed(2) + '%  deflected ' +
              T.defl + '  back ' + T.back);
  if (T.back !== 0) fail('Thomson’s model bounced ' + T.back + ' particles back; it must be exactly 0');
  if (T.defl !== 0) fail('Thomson’s model deflected ' + T.defl + ' past 10°; spread charge cannot do that');
  if (T.thru !== 20000) fail('Thomson: ' + T.thru + ' of 20000 passed, expected all');

  // Rutherford put back-scatter at roughly 1 in 20 000, so a 20 000-shot sample
  // is empty about a third of the time by chance. Assert the RATE over a sample
  // big enough to be stable, not the presence of a rare event in a small one.
  const BIG = 500000;   // measured truth is 1 in ~30,000, so expect ~17 here
  const big = await page.evaluate(n => {
    window.__gf.setModel('ruth');
    let back = 0;
    for (let i = 0; i < n; i++) if (window.__gf.classify(window.__gf.shoot()) === 'back') back++;
    return back;
  }, BIG);
  const perM = big / BIG * 1e6;
  console.log('   ' + BIG.toLocaleString() + ' shots: ' + big + ' back-scatters, ' +
              '1 in ' + Math.round(BIG / Math.max(big, 1)).toLocaleString());
  if (big === 0)   fail('no back-scatter in ' + BIG + ' shots — the discovery can never happen');
  if (perM < 10)   fail('back-scatter rate ' + perM.toFixed(1) + '/million is far rarer than Rutherford\'s ~50');
  if (perM > 200)  fail('back-scatter rate ' + perM.toFixed(0) + '/million is far too common');

  // ---- every shell configuration must match Table 8.4 ----
  console.log('== shell filling against Table 8.4');
  const BOOK = ['1','2','2,1','2,2','2,3','2,4','2,5','2,6','2,7','2,8',
                '2,8,1','2,8,2','2,8,3','2,8,4','2,8,5','2,8,6','2,8,7','2,8,8'];
  const got = await page.evaluate(() => {
    const out = [];
    for (let z = 1; z <= 18; z++) out.push(window.__shells(z));
    return out;
  });
  let mismatch = 0;
  got.forEach((g, i) => { if (g !== BOOK[i]) { fail('Z=' + (i+1) + ' gives ' + g + ', book says ' + BOOK[i]); mismatch++; } });
  if (!mismatch) console.log('   all 18 configurations match, H(1) through Ar(2,8,8)');

  // and the bench must display what configOf computes
  await page.$eval('#m11', n => n.open = true);
  await page.waitForTimeout(500);
  for (const z of [1, 10, 11, 17, 18]) {
    await page.evaluate(v => { const s = document.getElementById('buZ'); s.value = v;
      s.dispatchEvent(new Event('input', { bubbles: true })); }, z);
    await page.waitForTimeout(120);
    const shown = (await page.textContent("#buConfig")).replace(/\s+/g, "");
    if (shown !== BOOK[z-1]) fail('bench shows "' + shown + '" for Z=' + z + ', expected ' + BOOK[z-1]);
  }
  console.log('   the bench displays the same for Z = 1, 10, 11, 17, 18');

  // ---- the boss answer key must be internally consistent ----
  console.log('== boss');
  await page.$eval('#m16', n => n.open = true);
  await page.click('#bossStart');
  await page.waitForTimeout(400);
  const nOpts = await page.$$eval('#bossOpts button', n => n.length);
  if (nOpts !== 3) fail('boss question 1 rendered ' + nOpts + ' options');
  else console.log('   boss starts and renders ' + nOpts + ' options');

  // ---- M3 must actually be completable by a determined reader ----
  console.log('== gold foil: can a reader finish it?');
  await page.$eval('#m3', n => n.open = true);
  await page.waitForTimeout(400);
  await page.click('#gfModel');                       // compare Thomson
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) { await page.click('#gfMany'); await page.waitForTimeout(90); }
  await page.click('#gfModel');                       // back to Rutherford
  await page.waitForTimeout(200);
  let clicks = 0;
  while (clicks < 12) {
    await page.click('#gfMany'); clicks++;
    await page.waitForTimeout(90);
    const done = await page.$eval('#m3', n => n.classList.contains('done'));
    if (done) break;
  }
  const done3 = await page.$eval('#m3', n => n.classList.contains('done'));
  const fired3 = await page.textContent('#gfFired');
  const back3  = await page.textContent('#gfBack');
  if (!done3) fail('fired ' + fired3 + ' under both models and M3 never completed');
  else console.log('   completed after ' + clicks + ' volleys (' + fired3 + ' fired, ' + back3 + ' bounced back)');

  await b.close();
  console.log(bad ? '\natom: ' + bad + ' FAILURE(S)' : '\natom: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
