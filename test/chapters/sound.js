const { browser, reporter, BASE } = require('../lib');

/* v = lambda x nu across three media, nu = 1/T, the 0.1 s / 17 m echo threshold, and the 20 Hz / 20 kHz edges of hearing. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
// Chapter 10 physics: the benches must agree with the book, not just look busy.
// v = λν across three media, ν = 1/T, the 0.1 s / 17 m echo threshold, and the
// 20 Hz / 20 kHz edges of human hearing.

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'sound-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1200);

  const num  = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  const txt  = id => page.textContent('#' + id);
  const set  = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));

  // ---- M7: ν = 1/T, and the readout's ν × λ really is ν × λ
  console.log('== M7  wavelength, frequency, time period');
  for (const [L, f] of [[10, 50], [20, 170], [45, 400], [60, 600]]) {
    await set('wavL', L); await set('wavF', f);
    await page.waitForTimeout(60);
    const lam = num(await txt('wavLV'));            // metres
    const T   = num(await txt('wavT'));
    const v   = num(await txt('wavV'));
    if (Math.abs(lam - L / 10) > 0.051) fail('λ readout ' + lam + ' for slider ' + L);
    if (Math.abs(T - 1 / f) > Math.max(1e-4, 1 / f * 0.01)) fail('T=' + T + ', expected 1/' + f + '=' + (1 / f).toFixed(4));
    if (Math.abs(v - lam * f) > Math.max(1, lam * f * 0.01)) fail('ν×λ=' + v + ', expected ' + (lam * f));
  }
  console.log('   ν = 1/T and ν × λ hold across the slider range');

  // ---- M9: same source into three media. ν fixed, v = λν must still hold.
  console.log('== M9  three media');
  const SPEED = { medAir: 340, medWater: 1500, medSteel: 5000 };
  for (const f of [100, 340, 1000]) {
    await set('medF', f);
    for (const btn of Object.keys(SPEED)) {
      await page.click('#' + btn);
      await page.waitForTimeout(60);
      const shownF = num(await txt('medFV'));
      const lam    = num(await txt('medL'));
      if (shownF !== f) fail(btn + ': frequency changed with the medium (' + shownF + ' vs ' + f + ')');
      const want = SPEED[btn] / f;
      if (Math.abs(lam - want) > Math.max(0.01, want * 0.02)) {
        fail(btn + ' at ' + f + ' Hz: λ=' + lam + ' m, expected v/ν = ' + want.toFixed(3));
      }
    }
  }
  console.log('   frequency is set by the source; λ = v/ν in air, water and steel');

  // ---- M13: two sounds separate only 0.1 s apart, so the wall must be ≥ 17 m
  console.log('== M13 echo');
  for (const [d, want] of [[3, 'one sound'], [16, 'one sound'], [17, 'an echo'], [90, 'an echo']]) {
    await set('ecD', d);
    await page.waitForTimeout(60);
    const heard = (await txt('ecHear')).trim();
    const T = num(await txt('ecTime'));
    if (heard !== want) fail(d + ' m: reads "' + heard + '", expected "' + want + '"');
    if (Math.abs(T - 2 * d / 340) > 0.006) fail(d + ' m: round trip ' + T + ' s, expected ' + (2 * d / 340).toFixed(3));
    if (num(await txt('ecTrip')) !== 2 * d) fail(d + ' m: round trip distance is not 2d');
  }
  // the threshold itself, not just points either side of it
  await set('ecD', 16); const below = (await txt('ecHear')).trim();
  await set('ecD', 17); const at    = (await txt('ecHear')).trim();
  if (below === at) fail('no transition between 16 m and 17 m — the 0.1 s rule is not enforced');
  console.log('   merges below 17 m, separates at 17 m (340 × 0.1 = 34 m there and back)');

  // ---- M11: the band edges are 20 Hz and 20 kHz
  console.log('== M11 audible range');
  const seen = {};
  for (let i = 0; i <= 100; i += 2) {
    await set('rgF', i);
    const raw = (await txt('rgFV')).replace(/\s/g, '');
    const f = num(raw) * (/kHz/i.test(raw) ? 1000 : 1);
    const band = (await txt('rgBand')).trim();
    const human = (await txt('rgHuman')).trim();
    seen[band] = 1;
    const want = f < 20 ? 'infrasonic' : f > 20000 ? 'ultrasonic' : 'audible';
    if (band !== want) fail(f + ' Hz labelled ' + band + ', expected ' + want);
    const hears = /hear/.test(human) && !/cannot|can't|no/i.test(human);
    if (hears !== (want === 'audible')) fail(f + ' Hz (' + band + '): humans "' + human + '"');
  }
  for (const b of ['infrasonic', 'audible', 'ultrasonic']) {
    if (!seen[b]) fail('the slider never reaches the ' + b + ' band');
  }
  console.log('   ' + Object.keys(seen).join(', ') + ' all reachable, edges at 20 Hz and 20 kHz');

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? '\nsound: ' + bad + ' FAILURE(S)' : '\nsound: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
