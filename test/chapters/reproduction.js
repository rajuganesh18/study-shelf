const { browser, reporter, BASE } = require('../lib');

/* Meiosis holding the count at 46, 2^n gametes, the one muslin-bag treatment that fails, Table 11.3, and the days of Fig. 11.21. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
// Chapter 11: the benches must agree with the book. Meiosis holding the count
// at 46, 2^n gametes, the one muslin-bag treatment that fails, Table 11.3's
// pollen-to-seed ratios, and the day boundaries of Fig. 11.21.

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'reproduction-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const num  = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  const txt  = id => page.textContent('#' + id);
  const set  = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));

  // ---- M5: the whole point of meiosis is that the count does not move
  console.log('== M5  meiosis holds the chromosome count');
  for (const g of [1, 3, 5, 8]) {
    await set('meiG', g); await page.waitForTimeout(50);
    if (num(await txt('meiPar')) !== 46) fail('g=' + g + ': parent cell is not 46');
    if (num(await txt('meiGam')) !== 23) fail('g=' + g + ': gamete is not 23');
    if (num(await txt('meiZyg')) !== 46) fail('g=' + g + ': zygote is ' + (await txt('meiZyg')) + ', expected 46');
  }
  await page.click('#meiToggle');                    // now switch meiosis off
  for (const g of [1, 2, 3, 5]) {
    await set('meiG', g); await page.waitForTimeout(50);
    const want = 46 * Math.pow(2, g);
    const got = num(await txt('meiZyg'));
    // the readout switches to thousands above 99,999
    const ok = want > 99999 ? Math.abs(got - want / 1000) <= 1 : got === want;
    if (!ok) fail('meiosis off, g=' + g + ': ' + got + ', expected ' + want);
  }
  await page.click('#meiToggle');
  if (num(await txt('meiZyg')) !== 46) fail('toggling meiosis back on did not restore 46');
  console.log('   on: 46 at every generation; off: doubles as 92, 184, 368, …');

  // ---- M6: 2^n gametes, and the drawn one is a real combination
  console.log('== M6  2^n possible gametes');
  for (const n of [1, 2, 3, 10, 23]) {
    await set('beadN', n); await page.waitForTimeout(50);
    const want = Math.pow(2, n);
    const got = num((await txt('beadCombo')).replace(/,/g, ''));
    if (got !== want) fail(n + ' pairs: reads ' + got + ' gametes, expected ' + want);
    if (num(await txt('beadPairs')) !== n) fail(n + ' pairs: pair count readout is wrong');
  }
  await set('beadN', 3); await page.waitForTimeout(50);
  if (num((await txt('beadCombo')).replace(/,/g, '')) !== 8) fail('the book’s own case: 3 pairs must give 8');
  // twenty different draws must not all be the same combination
  const seen = new Set();
  for (let i = 0; i < 20; i++) { await page.click('#beadRoll'); seen.add((await txt('beadThis')).trim()); }
  if (seen.size < 2) fail('20 draws gave one combination every time — it is not random');
  console.log('   3 pairs → 8, 23 pairs → 8,388,608; ' + seen.size + ' distinct draws in 20');

  // ---- M9: exactly one treatment fails, and it is treatment 2
  console.log('== M9  the muslin bag experiment');
  const noFruit = [];
  for (const t of ['bag1', 'bag2', 'bag3', 'bag4', 'bag5']) {
    await page.click('#' + t); await page.waitForTimeout(60);
    const fruit = (await txt('bagFruit')).trim(), pollen = (await txt('bagPollen')).trim();
    if (fruit !== pollen) fail(t + ': fruit "' + fruit + '" but pollen "' + pollen + '" — they must agree');
    if (fruit === 'no') noFruit.push(t);
  }
  if (noFruit.length !== 1) fail(noFruit.length + ' treatments failed, expected exactly 1: ' + noFruit);
  else if (noFruit[0] !== 'bag2') fail('the failing treatment is ' + noFruit[0] + ', expected bag2');
  console.log('   only treatment 2 (bud, stamens removed, bagged) sets no fruit');

  // ---- M12: Table 11.3 as published, at both ends of each range
  console.log('== M12 pollen per seed');
  const cases = [
    ['ratWind',   0,   500000, 50,   10000],
    ['ratWind',   100, 1000000, 200,  5000],
    ['ratInsect', 0,   20000,  800,   25],
    ['ratInsect', 100, 40000,  1000,  40]
  ];
  for (const [btn, pos, wantP, wantS, wantR] of cases) {
    await page.click('#' + btn);
    await set('ratS', pos); await page.waitForTimeout(60);
    const p = num((await txt('ratPollen')).replace(/,/g, ''));
    const s = num((await txt('ratSeeds')).replace(/,/g, ''));
    const r = num((await txt('ratPer')).split(':')[0].replace(/,/g, ''));
    if (p !== wantP) fail(btn + '@' + pos + ': pollen ' + p + ', expected ' + wantP);
    if (s !== wantS) fail(btn + '@' + pos + ': seeds ' + s + ', expected ' + wantS);
    if (Math.abs(r - wantR) > 1) fail(btn + '@' + pos + ': ratio ' + r + ', expected ' + wantR);
    if (Math.abs(r - p / s) > 1) fail(btn + '@' + pos + ': the stated ratio is not pollen ÷ seeds');
  }
  // and the qualitative claim the chapter makes
  await page.click('#ratWind');  await set('ratS', 50); await page.waitForTimeout(50);
  const windR = num((await txt('ratPer')).split(':')[0].replace(/,/g, ''));
  await page.click('#ratInsect'); await set('ratS', 50); await page.waitForTimeout(50);
  const insR = num((await txt('ratPer')).split(':')[0].replace(/,/g, ''));
  if (!(windR > insR * 50)) fail('wind (' + windR + ') is not dramatically less efficient than insects (' + insR + ')');
  console.log('   wind ' + windR + ' : 1 against insects ' + insR + ' : 1, both from Table 11.3');

  // ---- M15: the day boundaries of Fig. 11.21
  console.log('== M15 the 28-day cycle');
  const want = d => d <= 5 ? 'Menstruation' : d <= 13 ? 'The lining rebuilds'
                  : d === 14 ? 'Ovulation' : 'The lining thickens';
  for (let d = 1; d <= 28; d++) {
    await set('cycD', d);
    const got = (await txt('cycPhase')).trim();
    if (got !== want(d)) fail('day ' + d + ': "' + got + '", expected "' + want(d) + '"');
  }
  // fertilisation must stop the cycle rather than let it run on to menstruation
  await page.click('#cycFert');
  for (const d of [15, 20, 28]) {
    await set('cycD', d); await page.waitForTimeout(50);
    if (!/pregnancy/i.test(await txt('cycPhase'))) fail('fertilised, day ' + d + ': cycle did not stop');
    if (!/kept/i.test(await txt('cycLining'))) fail('fertilised, day ' + d + ': lining is still being shed');
  }
  console.log('   1–5 menstruation, 6–13 rebuilding, 14 ovulation, 15–28 thickening; fertilisation stops it');

  // ---- the badge must paint at every stage without throwing
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
  console.log(bad ? '\nreproduction: ' + bad + ' FAILURE(S)' : '\nreproduction: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
