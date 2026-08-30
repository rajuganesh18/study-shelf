const { browser, BASE } = require('../lib');

/* Chapter 7 of Ganita Manjari — probability.

   This is the first chapter whose benches are genuinely random, which changes
   how it has to be tested. Two rules follow:

   1. Every THEORETICAL value is asserted exactly, as a reduced fraction. Those
      are the answers the chapter is teaching and there is nothing uncertain
      about them.
   2. Every EXPERIMENTAL value is asserted only through invariants (the tallies
      must sum to the trials, a count can never exceed its opportunities) and
      through convergence bounds so wide that a failure means a broken bench and
      not a bad afternoon. The bound used below for 6000 die rolls is ±0.05 on a
      quantity whose standard deviation is 0.0048 — a ten-sigma window. A test
      that fails one run in fifty is worse than no test, because it teaches you
      to ignore it.

   Named cases come from the printed page: the six-card deck of Fig. 7.1, the
   table on pages 158–159, Examples 3, 4 and 5, Exercise Set 7.2's surveys, and
   the end-of-chapter questions 4, 9, 10, 12, 13 and 16. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'probability-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const chip = async (box, label) => {
    await page.$$eval('#' + box + ' button', (ns, l) => {
      const e = ns.find(q => q.textContent.trim() === l); if (e) e.click();
    }, label);
    await page.waitForTimeout(45);
  };
  const num = s => Number(String(s).replace(/−/g, '-').replace(/[^0-9.\-]/g, ''));
  const near = (a, c, tol) => Math.abs(a - c) <= (tol === undefined ? 0.0011 : tol);
  /* Readouts in this chapter often show both forms — "3/8 = 0.375" — so a
     plain digit-strip turns that into 380.375. Split on the '=' first. */
  const asFrac = s => String(s).split('=')[0].trim();
  const decOf = s => { const t = String(s).split('='); return num(t[t.length - 1]); };
  const reduce = (n, d) => {
    const g = (a, c) => c ? g(c, a % c) : a;
    if (n === 0) return '0';
    if (n === d) return '1';
    const k = g(n, d);
    return (n / k) + '/' + (d / k);
  };

  // ---- M1: the scale, and the book's own six-card deck
  console.log('== M1  the probability scale');
  const BANDS = ['impossible', 'less likely', 'an even chance', 'more likely', 'certain'];
  const WANT1 = [['0', 0], ['1/6', 1], ['1/3', 1], ['1/2', 2], ['2/3', 3], ['5/6', 3], ['1', 4]];
  for (let n = 0; n <= 6; n++) {
    await set('scN', n); await page.waitForTimeout(15);
    const [f, band] = WANT1[n];
    if (await txt('scP') !== f) fail(n + ' purple: P shown ' + await txt('scP') + ', expected ' + f);
    if (!near(num(await txt('scDec')), Math.round(n / 6 * 1000) / 1000)) fail(n + ' purple: decimal ' + await txt('scDec'));
    if (await txt('scWord') !== BANDS[band]) fail(n + ' purple: called "' + await txt('scWord') + '", expected ' + BANDS[band]);
  }
  if (!await done('m1')) fail('all five bands visited and m1 never completed');
  console.log('   0 impossible, 1/2 an even chance, 1 certain — and the four steps between');

  // ---- M3: the sample space, and the sizes that multiply
  console.log('== M3  sample spaces');
  const SS = [['One coin', 2, '2'], ['One die', 6, '6'], ['Two coins', 4, '2 × 2'],
              ['Die and coin', 12, '6 × 2'], ['Snack, drink', 6, '3 × 2'], ['−5 to 5', 11, '11']];
  for (const [name, n, how] of SS) {
    await chip('ssPick', name);
    if (num(await txt('ssN')) !== n) fail(name + ': n(S) read ' + await txt('ssN') + ', expected ' + n);
    if (await txt('ssHow') !== how) fail(name + ': built as "' + await txt('ssHow') + '", expected ' + how);
  }
  if (!await done('m3')) fail('five experiments seen and m3 never completed');
  console.log('   2, 6, 4, 12, 6 and 11 — and the two-part ones multiply');

  // ---- M4: favourable over possible, on the book's own examples
  console.log('== M4  favourable over possible');
  const TH = [
    ['One die', 'Rolling a 4', 1, 6, '1/6'],
    ['One die', 'Greater than 4', 2, 6, '1/3'],
    ['One die', 'An even number', 3, 6, '1/2'],
    ['One die', 'More than 6', 0, 6, '0'],
    ['PROBABILITY', 'The letter B', 2, 11, '2/11'],
    ['PROBABILITY', 'A vowel', 4, 11, '4/11'],
    ['PROBABILITY', 'The letter Z', 0, 11, '0'],
    ['3 red, 2 blue, 1 green', 'Red', 3, 6, '1/2'],
    ['3 red, 2 blue, 1 green', 'Not red', 3, 6, '1/2'],
    ['3 red, 2 blue, 1 green', 'Green', 1, 6, '1/6'],
    ['Three coins', 'Exactly two heads', 3, 8, '3/8'],
    ['Three coins', 'At least one head', 7, 8, '7/8'],
    ['Three coins', 'No heads at all', 1, 8, '1/8']
  ];
  for (const [exp, evt, fav, pos, f] of TH) {
    await chip('thExp', exp); await chip('thEvt', evt);
    if (num(await txt('thFav')) !== fav) fail(exp + ' / ' + evt + ': favourable ' + await txt('thFav') + ', expected ' + fav);
    if (num(await txt('thPos')) !== pos) fail(exp + ' / ' + evt + ': possible ' + await txt('thPos') + ', expected ' + pos);
    if (asFrac(await txt('thP')) !== f) fail(exp + ' / ' + evt + ': P shown ' + await txt('thP') + ', expected ' + f);
  }
  if (!await done('m4')) fail('six events tried and m4 never completed');
  console.log('   1/6 for a 4 and 2/11 for the letter B, as Examples 3 and 4 have them');

  // ---- M5: the Law of Large Numbers. Invariants exactly, convergence loosely.
  console.log('== M5  rolling the die');
  await page.click('#lnReset'); await page.waitForTimeout(60);
  if (num(await txt('lnTrials')) !== 0) fail('after a reset the roll count must be 0');
  await page.click('#lnRoll1'); await page.waitForTimeout(40);
  if (num(await txt('lnTrials')) !== 1) fail('one roll should read 1 trial, read ' + await txt('lnTrials'));
  await page.click('#lnRoll10'); await page.waitForTimeout(40);
  if (num(await txt('lnTrials')) !== 11) fail('1 + 10 rolls should read 11, read ' + await txt('lnTrials'));
  for (let k = 0; k < 60; k++) { await page.click('#lnRoll100'); }
  await page.waitForTimeout(200);
  const trials = num(await txt('lnTrials'));
  if (trials !== 6011) fail('sixty hundred-roll presses should give 6011 trials, gave ' + trials);
  for (let face = 1; face <= 6; face++) {
    await set('lnFace', face); await page.waitForTimeout(30);
    const p = num(await txt('lnExp'));
    const gap = num(await txt('lnGap'));
    if (!near(gap, Math.abs(p - 1 / 6), 0.0002)) fail('face ' + face + ': the stated gap does not match the stated P');
    /* a ten-sigma window: sd of p over 6011 rolls is 0.0048 */
    if (Math.abs(p - 1 / 6) > 0.05) fail('face ' + face + ' came up ' + p + ' of the time in 6011 rolls — the die is not fair');
  }
  if (!await done('m5')) fail('six thousand rolls and m5 never completed');
  console.log('   6011 rolls, and every face within 0.05 of 1/6');

  // ---- M6: the Gambler's Fallacy, which is the point of the whole mission
  console.log('== M6  the die has no memory');
  for (let k = 0; k < 12; k++) { await page.click('#gfPlay'); }
  await page.waitForTimeout(300);
  for (const k of [1, 2, 3]) {
    await set('gfK', k); await page.waitForTimeout(80);
    const runs = num(await txt('gfSeen')), after = num(await txt('gfAfter'));
    if (!(runs > 0)) fail('after 24000 rolls there should be runs of ' + k + ' sixes, found ' + runs);
    if (after > runs) fail('run length ' + k + ': more sixes followed than there were runs');
    if (!near(num(await txt('gfRate')), after / runs, 0.0002)) fail('run length ' + k + ': the stated rate does not match the counts');
    /* The claim of the mission. A run of 3 sixes turns up only ~110 times in
       24000 rolls, so a flat tolerance would be a coin-flip: the window has to
       be scaled to how much evidence there actually is. Five standard errors
       is about one false failure in three million. */
    const tol = 5 * Math.sqrt((1 / 6) * (5 / 6) / runs);
    if (Math.abs(after / runs - 1 / 6) > tol)
      fail('after a run of ' + k + ' sixes the next roll was a six ' + (after / runs).toFixed(4) +
           ' of the time over ' + runs + ' runs — outside 1/6 ± ' + tol.toFixed(4));
  }
  if (!await done('m6')) fail('twenty-four thousand rolls and m6 never completed');
  console.log('   after runs of 1, 2 and 3 sixes, the next roll is a six about 1/6 of the time');

  // ---- M8: Example 5 and Exercise Set 7.2's two surveys
  console.log('== M8  sample to population');
  const ST = [
    ['Fruit (50)', 'Mango', '2/5', 600, 1500], ['Fruit (50)', 'Apple', '3/10', 450, 1500],
    ['Fruit (50)', 'Banana', '1/5', 300, 1500], ['Fruit (50)', 'Grape', '1/10', 150, 1500],
    ['Sweets (30)', 'Green', '4/15', 160, 600], ['Sweets (30)', 'Yellow', '7/30', 140, 600],
    ['Clubs (40)', 'Arts', '11/40', 220, 800], ['Clubs (40)', 'Sports', '9/40', 180, 800]
  ];
  for (const [s, c, f, est, pop] of ST) {
    await chip('stSet', s); await chip('stCat', c);
    if (asFrac(await txt('stP')) !== f) fail(s + ' / ' + c + ': P shown ' + await txt('stP') + ', expected ' + f);
    const shown = (await txt('stEst')).split(' of ');
    if (Number(shown[0]) !== est || Number(shown[1]) !== pop)
      fail(s + ' / ' + c + ': estimate "' + await txt('stEst') + '", expected ' + est + ' of ' + pop);
  }
  if (!await done('m8')) fail('six categories seen and m8 never completed');
  console.log('   600 mangoes of 1500, 140 yellow sweets of 600, 180 for Sports of 800');

  // ---- M10: the spinner. Theory exactly; the spins only loosely.
  console.log('== M10 the spinner');
  const SP = [['An 8', '1/8'], ['An odd number', '1/2'], ['Greater than 2', '3/4'],
              ['Less than 9', '1'], ['A multiple of 3', '1/4']];
  for (const [name, f] of SP) {
    await chip('spEvt', name);
    if (asFrac(await txt('spP')) !== f) fail(name + ': P shown ' + await txt('spP') + ', expected ' + f);
    for (let k = 0; k < 10; k++) await page.click('#spSpin');
    await page.waitForTimeout(120);
    const spins = num(await txt('spN')), got = num(await txt('spExp'));
    if (spins !== 2000) fail(name + ': ten presses should give 2000 spins, gave ' + spins);
    const want = eval(f === '1' ? '1' : f);
    if (Math.abs(got - want) > 0.06) fail(name + ': ' + spins + ' spins gave ' + got + ', theory says ' + want);
    if (f === '1' && got !== 1) fail('a certain event must happen on every one of the 2000 spins, got ' + got);
  }
  if (!await done('m10')) fail('five events tried and m10 never completed');
  console.log('   1/8, 1/2, 3/4, 1 and 1/4 — and "less than 9" happened on all 2000 spins');

  // ---- M11: the tree. n(S) = 2^n and the path counts are binomial.
  console.log('== M11 the tree of tosses');
  const nCk = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r); };
  for (const n of [1, 2, 3, 4]) {
    await set('trN', n);
    for (let k = 0; k <= n; k++) {
      await set('trK', k); await page.waitForTimeout(20);
      const size = Math.pow(2, n), ways = nCk(n, k);
      if (!(await txt('trSize')).endsWith('= ' + size))
        fail(n + ' tosses: n(S) shown ' + await txt('trSize') + ', expected 2^' + n + ' = ' + size);
      if (asFrac(await txt('trP')) !== reduce(ways, size))
        fail(n + ' tosses, ' + k + ' heads: P ' + await txt('trP') + ', expected ' + reduce(ways, size));
      if (!near(decOf(await txt('trP')), Math.round(ways / size * 10000) / 10000, 0.0002))
        fail(n + ' tosses, ' + k + ' heads: the decimal does not match the fraction');
    }
  }
  /* the book's Think and Reflect: one head from two tosses is 1/2, not 1/4 */
  await set('trN', 2); await set('trK', 1); await page.waitForTimeout(30);
  if (asFrac(await txt('trP')) !== '1/2') fail('one head in two tosses must be 1/2, shown ' + await txt('trP'));
  if (await txt('trPath') !== '1/4') fail('a single path of two tosses must be 1/4, shown ' + await txt('trPath'));
  if (!await done('m11')) fail('all four tree depths seen and m11 never completed');
  console.log('   n(S) = 2ⁿ, each path 1/2ⁿ, and one head from two tosses is 1/2 not 1/4');

  // ---- M12: with and without replacement — end-of-chapter Q10
  console.log('== M12 put it back, or keep it out');
  const modeIs = async want => {
    for (let i = 0; i < 3; i++) {
      if ((await txt('wrMode')).indexOf(want) >= 0) return;
      await page.click('#wrMode'); await page.waitForTimeout(40);
    }
    fail('could not switch the bench to "' + want + '"');
  };
  await set('wrR', 4); await set('wrB', 5); await page.waitForTimeout(30);
  await modeIs('keeping it out');
  if (asFrac(await txt('wrRB')) !== '5/18') fail('4 red 5 blue, kept out: P(red then blue) shown ' + await txt('wrRB') + ', expected 5/18');
  if (asFrac(await txt('wrBB')) !== '5/18') fail('4 red 5 blue, kept out: P(two blues) shown ' + await txt('wrBB') + ', expected 5/18');
  await modeIs('putting it back');
  if (asFrac(await txt('wrRB')) !== '20/81') fail('4 red 5 blue, put back: P(red then blue) shown ' + await txt('wrRB') + ', expected 20/81');
  if (asFrac(await txt('wrBB')) !== '25/81') fail('4 red 5 blue, put back: P(two blues) shown ' + await txt('wrBB') + ', expected 25/81');
  /* the two must agree on the first draw and differ on the second, at every setting */
  for (const [r, bb] of [[1, 1], [2, 3], [6, 6], [3, 1], [1, 6]]) {
    await set('wrR', r); await set('wrB', bb); await page.waitForTimeout(20);
    await modeIs('keeping it out');
    const outRB = decOf(await txt('wrRB'));
    await modeIs('putting it back');
    const inRB = decOf(await txt('wrRB'));
    const tot = r + bb;
    if (!near(inRB, Math.round(r * bb / (tot * tot) * 10000) / 10000, 0.0002))
      fail(r + 'R ' + bb + 'B put back: P(RB) ' + inRB + ', expected ' + (r * bb / (tot * tot)).toFixed(4));
    if (!near(outRB, Math.round(r * bb / (tot * (tot - 1)) * 10000) / 10000, 0.0002))
      fail(r + 'R ' + bb + 'B kept out: P(RB) ' + outRB + ', expected ' + (r * bb / (tot * (tot - 1))).toFixed(4));
    if (!(outRB > inRB)) fail(r + 'R ' + bb + 'B: keeping the ball out must raise P(red then blue), not lower it');
  }
  if (!await done('m12')) fail('both modes at several settings and m12 never completed');
  console.log('   5/18 kept out and 20/81 put back, exactly as Q10 has it');

  // ---- M14: the dye on the rectangle — end-of-chapter Q16
  console.log('== M14 a dye dropped at random');
  await page.click('#dtClear'); await page.waitForTimeout(60);
  await set('dtD', 10); await page.waitForTimeout(40);
  const q16 = Math.PI / 24;
  if (!near(num(await txt('dtTheo')), Math.round(q16 * 10000) / 10000, 0.0002))
    fail('a 1 m circle on 3 m × 2 m is π/24 = ' + q16.toFixed(4) + ', shown ' + await txt('dtTheo'));
  for (const d of [4, 8, 14, 20]) {
    await set('dtD', d); await page.waitForTimeout(25);
    const want = Math.PI * Math.pow(d / 20, 2) / 6;
    if (!near(num(await txt('dtTheo')), Math.round(want * 10000) / 10000, 0.0002))
      fail('diameter ' + (d / 10) + ' m: by area ' + await txt('dtTheo') + ', expected ' + want.toFixed(4));
  }
  await page.click('#dtClear'); await set('dtD', 10); await page.waitForTimeout(40);
  for (let k = 0; k < 8; k++) await page.click('#dtThrow');
  await page.waitForTimeout(200);
  const drops = num(await txt('dtHits'));
  if (drops !== 4000) fail('eight presses of 500 should give 4000 drops, gave ' + drops);
  const frac14 = num(await txt('dtExp'));
  /* sd of the fraction over 4000 drops is 0.0053; this is a nine-sigma window */
  if (Math.abs(frac14 - q16) > 0.05) fail('4000 drops landed inside ' + frac14 + ' of the time, area says ' + q16.toFixed(4));
  if (!await done('m14')) fail('four thousand drops and m14 never completed');
  console.log('   π/24 = 0.1309 by area, and 4000 drops agreed');

  // ---- M15: bigger samples scatter less. Asserted as a trend, over many samples.
  console.log('== M15 how big should the sample be?');
  const spread = async n => {
    await set('saN', n); await page.waitForTimeout(40);
    for (let k = 0; k < 5; k++) await page.click('#saDraw');
    await page.waitForTimeout(150);
    return num((await txt('saErr')).replace('±', ''));
  };
  const small = await spread(10), mid = await spread(100);
  await spread(300);                       /* a fourth size, which the bench asks for */
  const big = await spread(500);
  if (!(small > mid && mid > big))
    fail('the typical error should shrink with sample size, got ' + small + ' → ' + mid + ' → ' + big);
  /* the theoretical standard error is √(p(1−p)/n); check each is in the right region */
  for (const [n, got] of [[10, small], [100, mid], [500, big]]) {
    const se = Math.sqrt(0.4 * 0.6 / n);
    if (got < se * 0.5 || got > se * 1.8)
      fail('at n = ' + n + ' the typical error was ' + got + ', and √(p(1−p)/n) is ' + se.toFixed(4));
  }
  if (!await done('m15')) fail('four sample sizes tried and m15 never completed');
  console.log('   error fell ' + small + ' → ' + mid + ' → ' + big + ' as n went 10 → 100 → 500');

  // ---- the graded tables answer to the book
  console.log('== M2, M7, M9 and M13  the graded work');
  const rowsAnswer = async (box, picks, mid) => {
    for (let i = 0; i < picks.length; i++) {
      await page.$$eval('#' + box + ' .qrow', (ns, arg) => {
        const row = ns[arg.i]; if (!row) return;
        const btn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === arg.want);
        if (btn) btn.click();
      }, { i, want: picks[i] });
      await page.waitForTimeout(40);
    }
    if (!await done(mid)) fail(mid + ' did not complete on the book\'s own answers: ' + await txt(box + 's'));
  };
  await rowsAnswer('g2', ['Impossible', 'Less likely', 'Even', 'More likely', 'Certain', 'Certain'], 'm2');
  await rowsAnswer('g7', ['Not equally likely', 'Equally likely', 'Equally likely', 'Not equally likely', 'Equally likely'], 'm7');
  if ((await txt('g2s')).indexOf('6 of 6') < 0 && (await txt('g2s')).indexOf('All six') < 0)
    fail('m2 scored ' + await txt('g2s'));
  if ((await txt('g7s')).indexOf('5 of 5') < 0 && (await txt('g7s')).indexOf('All five') < 0)
    fail('m7 scored ' + await txt('g7s'));

  const W9 = ['3/4', '1/2', '1/3', '1/2', '3/8', '1/4'];
  const W13 = ['5/18', '5/18', '2/9', '1/4', '16', '12'];
  /* worked here, from the book's numbers, before being asked of the page */
  if (!near(3 / 4, 1 - 1 / 4)) fail('at least one head from two coins is 1 − P(TT) = 3/4');
  if (!near(3 / 8, 3 / 8)) fail('exactly two heads from three coins is 3 of the 8 sequences');
  if (!near(4 / 9 * 5 / 8, 5 / 18, 1e-9)) fail('4/9 × 5/8 is not 5/18');
  if (!near(8 / 36, 2 / 9, 1e-9)) fail('sums of 7 (six ways) and 11 (two ways) out of 36 is not 2/9');
  if (4 * 4 !== 16 || 4 * 3 !== 12) fail('the two four-ball sample spaces are 16 and 12');
  for (const [tbl, btn, want, mid] of [['g9', 'g9check', W9, 'm9'], ['g13', 'g13check', W13, 'm13']]) {
    const opts = await page.$$eval('#' + tbl + ' select', ns => ns.map(s => [...s.options].map(o => o.value)));
    if (opts.length !== want.length) fail(tbl + ' should have ' + want.length + ' blanks, has ' + opts.length);
    want.forEach((v, i) => { if (opts[i] && !opts[i].includes(v)) fail(tbl + ' blank ' + (i + 1) + ' cannot be answered ' + v); });
    await page.$$eval('#' + tbl + ' select', (ns, w) => ns.forEach((n, i) => {
      n.value = w[i]; n.dispatchEvent(new Event('change', { bubbles: true }));
    }), want);
    await page.click('#' + btn); await page.waitForTimeout(120);
    if (!await done(mid)) fail(mid + ' did not complete on the book\'s own answers: ' + await txt(tbl + 's'));
  }
  console.log('   3/4, 1/2, 1/3, 1/2, 3/8, 1/4 — and 5/18, 5/18, 2/9, 1/4, 16, 12');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['Anything might happen', 'A scale from 0 to 1', 'All the outcomes',
                'Favourable over possible', 'Try it many times', 'Settling down',
                'Every path on a tree'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nprobability: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
