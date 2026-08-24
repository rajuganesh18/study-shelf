const { browser, reporter, BASE } = require('../lib');

/* E = I x A x t, Table 13.1 albedos, cos(latitude), the layer boundaries and the pressure belts of Fig. 13.9. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
// Chapter 13: the benches must agree with the book. E = I × A × t, Table 13.1's
// albedos, cos(latitude) for insolation, the layer boundaries and the direction
// the temperature moves in each, and the pressure belts of Fig. 13.9.

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'earth-system-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const num = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));

  // ---- M4: Example 13.1, and that it scales the way the formula says
  console.log('== M4  E = I × A × t');
  for (const [A, T] of [[1, 1], [2, 1], [1, 2], [5, 3], [20, 12]]) {
    await set('insA', A); await set('insT', T); await page.waitForTimeout(50);
    const want = 1000 * A * T * 3600;          // joules
    const shown = await txt('insE');
    const got = /10⁶/.test(shown) ? num(shown) * 1e6 : num(shown.replace(/,/g, ''));
    if (Math.abs(got - want) / want > 0.005) fail(A + ' m², ' + T + ' h: ' + shown + ', expected ' + want + ' J');
    if (num(await txt('insAV')) !== A) fail('area readout wrong at ' + A);
  }
  await set('insA', 1); await set('insT', 1); await page.waitForTimeout(50);
  if (!/3\.60 × 10⁶ J/.test(await txt('insE'))) fail("the book's own case must read 3.60 × 10⁶ J, got " + await txt('insE'));
  console.log('   1 m² for 1 h → 3.60 × 10⁶ J, and doubling A or t doubles E');

  // ---- M5: Table 13.1, plus the ordering the chapter's argument rests on
  console.log('== M5  albedo');
  const ALB = { albSnow: [0.80, 0.90], albIce: [0.50, 0.70], albRock: [0.25, 0.30] };
  const seen = {};
  for (const id of ['albSnow', 'albIce', 'albRock', 'albSoil', 'albOcean', 'albCity']) {
    await page.click('#' + id); await page.waitForTimeout(50);
    const a = num(await txt('albVal'));
    seen[id] = a;
    if (ALB[id] && (a < ALB[id][0] || a > ALB[id][1])) {
      fail(id + ': albedo ' + a + ' is outside Table 13.1’s ' + ALB[id].join('–'));
    }
    const verdict = await txt('albWarm');
    const want = a > 0.4 ? 'stays cool' : 'heats up';
    if (verdict !== want) fail(id + ' (albedo ' + a + '): reads "' + verdict + '", expected "' + want + '"');
  }
  if (!(seen.albSnow > seen.albIce && seen.albIce > seen.albRock && seen.albRock > seen.albSoil)) {
    fail('albedo ordering is wrong: snow > ice > rock > black soil must hold');
  }
  if (!(seen.albOcean < 0.2 && seen.albCity < 0.2)) fail('ocean and asphalt must be low-albedo');
  console.log('   snow ' + seen.albSnow + ' > ice ' + seen.albIce + ' > rock ' + seen.albRock +
              ' > soil ' + seen.albSoil + '; ocean ' + seen.albOcean);

  // ---- M6: insolation per square metre goes as cos(latitude)
  console.log('== M6  latitude');
  for (const L of [0, 30, 45, 60, 85]) {
    await set('latL', L); await page.waitForTimeout(50);
    const want = Math.round(Math.cos(L * Math.PI / 180) * 100);
    const got = num(await txt('latInt'));
    if (Math.abs(got - want) > 1) fail(L + '°: reads ' + got + '%, expected cos(' + L + '°) = ' + want + '%');
  }
  await set('latL', 0); const e0 = num(await txt('latInt'));
  await set('latL', 60); const e60 = num(await txt('latInt'));
  if (!(e0 === 100 && Math.abs(e60 - 50) <= 1)) fail('the equator must be 100% and 60° about 50%');
  await set('latL', 85);
  console.log('   equator 100%, 60° 50%, 85° ' + num(await txt('latInt')) + '% — it follows cos(latitude)');

  // ---- M7: the layer boundaries, and which way temperature goes in each
  console.log('== M7  the atmosphere');
  const LAYER = [[0, 'Troposphere'], [11, 'Troposphere'], [12, 'Stratosphere'],
                 [49, 'Stratosphere'], [50, 'Mesosphere'], [90, 'Thermosphere']];
  for (const [h, want] of LAYER) {
    await set('atmH', h); await page.waitForTimeout(40);
    const got = await txt('atmLayer');
    if (got !== want) fail(h + ' km: "' + got + '", expected "' + want + '"');
  }
  // the reversal is the whole point: falling below 12 km, rising above it
  const degC = async () => parseFloat((await txt('atmTemp')).split('°C')[0]);
  await set('atmH', 0);  const t0 = await degC();
  await set('atmH', 11); const t11 = await degC();
  await set('atmH', 20); const t20 = await degC();
  await set('atmH', 45); const t45 = await degC();
  if (!(t11 < t0)) fail('temperature must FALL through the troposphere (' + t0 + ' → ' + t11 + ')');
  if (!(t45 > t20)) fail('temperature must RISE through the stratosphere (' + t20 + ' → ' + t45 + ')');
  // and at roughly the lapse rate the book quotes
  const lapse = (t0 - t11) / 11;
  if (Math.abs(lapse - 6.5) > 1) fail('lapse rate ' + lapse.toFixed(1) + ' °C/km, expected about 6.5');
  console.log('   0–12 km falls at ' + lapse.toFixed(1) + ' °C/km; 12–50 km rises. The reversal is there.');

  // ---- M8: more greenhouse gas must mean less escaping and a warmer surface
  console.log('== M8  the greenhouse effect');
  let prevOut = 999, prevTemp = -999;
  for (const g of [0, 20, 35, 60, 100]) {
    await set('ghG', g); await page.waitForTimeout(40);
    const out = num(await txt('ghOut')), temp = num(await txt('ghTemp'));
    if (out > prevOut) fail('g=' + g + ': more gas but MORE heat escapes (' + prevOut + ' → ' + out + ')');
    if (temp < prevTemp) fail('g=' + g + ': more gas but a COLDER surface (' + prevTemp + ' → ' + temp + ')');
    prevOut = out; prevTemp = temp;
  }
  await set('ghG', 0); await page.waitForTimeout(40);
  if (num(await txt('ghOut')) !== 100) fail('with no greenhouse gas all the infrared must escape');
  if (num(await txt('ghTemp')) > -10) fail('with no greenhouse gas the surface must be far below freezing');
  await page.click('#ghVenus'); await page.waitForTimeout(60);
  if (!/Venus/i.test(await txt('ghTxt'))) fail('the Venus button did not reach the runaway case');
  console.log('   monotonic: more gas → less escapes → warmer surface; 0 gives −18 °C');

  // ---- M11: the belts of Fig. 13.9 alternate low, high, low, high
  console.log('== M11 pressure belts');
  const BELT = [[0, /low/i], [30, /high/i], [60, /low/i], [88, /high/i]];
  for (const [L, want] of BELT) {
    await set('plwL', L); await page.waitForTimeout(40);
    const belt = await txt('plwBelt'), press = await txt('plwPress');
    if (!want.test(belt) || !want.test(press)) {
      fail(L + '°: belt "' + belt + '" / "' + press + '" does not match ' + want);
    }
  }
  console.log('   0° low, 30° high, 60° low, 90° high — alternating, as the figure has it');

  // ---- the badge must paint at every stage
  console.log('== badge');
  const painted = await page.evaluate(() => {
    const out = [];
    for (const st of CH.stages) {
      S.xp = st.at;
      try { drawBadge(); } catch (e) { return 'THREW at ' + st.at + ': ' + e.message; }
      out.push(document.getElementById('colName').textContent);
    }
    return out;
  });
  if (typeof painted === 'string') fail(painted);
  else if (painted.length !== 7) fail('painted ' + painted.length + ' stages, expected 7');
  else console.log('   ' + painted.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? '\nearth-system: ' + bad + ' FAILURE(S)' : '\nearth-system: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
