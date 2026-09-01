const { browser, BASE } = require('../lib');

/* Chapter 8 of Ganita Manjari — sequences and progressions, and the last
   chapter of Part 1.

   Every expected value here is generated from the definition rather than read
   off the page: the terms from their own rules, the Virahāṅka counts by
   enumerating the metres, Gauss's sum by actually adding the numbers up. A
   formula checked against itself proves nothing, so where the chapter gives a
   closed form the test computes the long way round and compares.

   Named cases come from the printed page: the four opening sequences, Examples
   1 to 5 and 10, Exercise Sets 8.1 to 8.3, and the end-of-chapter questions. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'sequences-chapter.html');
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
  /* readouts often carry two forms — "27 = 3^3" — so take the leading number */
  const lead = s => num(String(s).split('=')[0]);
  const nums = s => (String(s).replace(/−/g, '-').match(/-?\d+(\.\d+)?/g) || []).map(Number);

  // ---- M1: the four opening sequences, and their differences
  console.log('== M1  four sequences and their gaps');
  const SEQ = [
    ['Natural', k => k, 'tₙ = n'],
    ['Odd', k => 2 * k - 1, 'tₙ = 2n − 1'],
    ['Triangular', k => k * (k + 1) / 2, 'tₙ = n(n+1)/2'],
    ['Square', k => k * k, 'tₙ = n²']
  ];
  for (const [name, f, rule] of SEQ) {
    await chip('fsPick', name);
    await set('fsN', 7); await page.waitForTimeout(25);
    if (await txt('fsRule') !== rule) fail(name + ': rule shown ' + await txt('fsRule') + ', expected ' + rule);
    const terms = Array.from({ length: 7 }, (_, k) => f(k + 1));
    const want = terms.slice(1).map((v, k) => v - terms[k]);
    const got = nums(await txt('fsDiff'));
    if (got.slice(0, want.length).join(',') !== want.join(','))
      fail(name + ': differences ' + got.join(',') + ', expected ' + want.join(','));
  }
  /* the book's own observation: triangular gaps ARE the naturals, square gaps the odds */
  const triD = Array.from({ length: 6 }, (_, k) => (k + 2) * (k + 3) / 2 - (k + 1) * (k + 2) / 2);
  if (triD.join(',') !== '2,3,4,5,6,7') fail('the triangular gaps should be the natural numbers, got ' + triD.join(','));
  const sqD = Array.from({ length: 6 }, (_, k) => (k + 2) ** 2 - (k + 1) ** 2);
  if (sqD.join(',') !== '3,5,7,9,11,13') fail('the square gaps should be the odd numbers, got ' + sqD.join(','));
  if (!await done('m1')) fail('all four sequences seen and m1 never completed');
  console.log('   1,1,1… and 2,2,2… are constant; the others are the naturals and the odds');

  // ---- M2: the pictures. Both formulas checked against the actual sums.
  console.log('== M2  triangles and squares of dots');
  for (let n = 1; n <= 9; n++) {
    await set('tsN', n); await page.waitForTimeout(20);
    let rows = 0; for (let k = 1; k <= n; k++) rows += k;
    let shells = 0; for (let k = 1; k <= n; k++) shells += 2 * k - 1;
    if (rows !== n * (n + 1) / 2) fail('the test\'s own row sum is wrong at n = ' + n);
    if (shells !== n * n) fail('the test\'s own shell sum is wrong at n = ' + n);
    if (lead(await txt('tsTri')) !== rows) fail('n = ' + n + ': triangular shown ' + await txt('tsTri') + ', rows add to ' + rows);
    if (lead(await txt('tsSq')) !== shells) fail('n = ' + n + ': square shown ' + await txt('tsSq') + ', shells add to ' + shells);
  }
  if (!await done('m2')) fail('the dot arrays swept and m2 never completed');
  console.log('   1+…+n and 1+3+…+(2n−1) built up dot by dot, for every n to 9');

  // ---- M3: the explicit rule, forwards and backwards — Examples 1 and 2
  console.log('== M3  explicit rules');
  const RULES = [
    ['2n − 1', k => 2 * k - 1], ['5n − 2', k => 5 * k - 2], ['3n − 7', k => 3 * k - 7],
    ['2 − 5n', k => 2 - 5 * k], ['n² − 2n + 3', k => k * k - 2 * k + 3]
  ];
  for (const [name, f] of RULES) {
    await chip('exPick', name);
    for (const n of [1, 5, 20, 53, 60]) {
      await set('exN', n); await page.waitForTimeout(15);
      if (num(await txt('exVal')) !== f(n)) fail(name + ' at n = ' + n + ': shown ' + await txt('exVal') + ', expected ' + f(n));
    }
  }
  /* the book's own membership tests */
  const MEMBER = [
    ['5n − 2', 308, 62], ['5n − 2', 471, 0],          // Example 2: 62nd, and not a term
    ['3n − 7', 332, 113], ['3n − 7', 557, 188],       // the section-8.2 exercise
    ['2n − 1', 137, 69]                               // the odd-number example
  ];
  for (const [name, target, pos] of MEMBER) {
    const f = RULES.find(r => r[0] === name)[1];
    if (pos && f(pos) !== target) fail('the test\'s own claim that ' + name + ' hits ' + target + ' at ' + pos + ' is wrong');
    await chip('exPick', name);
    await set('exTarget', target); await page.waitForTimeout(30);
    const is = await txt('exIs');
    if (pos && is !== 'yes, a term') fail(name + ': ' + target + ' should be a term, bench says "' + is + '"');
    if (!pos && is !== 'not a term') fail(name + ': ' + target + ' should not be a term, bench says "' + is + '"');
    if (pos && num(await txt('exWhich')) !== pos) fail(name + ': ' + target + ' should be the ' + pos + 'th, shown ' + await txt('exWhich'));
  }
  if (!await done('m3')) fail('four rules tried and m3 never completed');
  console.log('   308 is the 62nd term of 5n − 2 and 471 is no term at all, as Example 2 has it');

  // ---- M4: recursive rules — Examples 3 and 4, and the Tribonacci exercise
  console.log('== M4  recursive rules');
  const REC = [
    ['tₙ₋₁ + 3', [1, 4, 7, 10, 13]],
    ['2uₙ₋₁ + 3', [1, 5, 13, 29, 61]],                      // Example 3
    ['sₙ₋₁(sₙ₋₁ − 1)', [3, 6, 30, 870]],                    // Example 4
    ['Vₙ₋₁ + Vₙ₋₂', [1, 2, 3, 5, 8, 13, 21, 34]],           // Virahanka
    ['Tₙ₋₁+Tₙ₋₂+Tₙ₋₃', [1, 2, 4, 7, 13, 24, 44, 81]]        // Exercise 8.1 Q6
  ];
  for (const [name, want] of REC) {
    await chip('rcPick', name);
    await set('rcN', Math.min(9, want.length)); await page.waitForTimeout(30);
    const shown = nums(await txt('rcTerms'));
    const k = Math.min(shown.length, want.length, 6);
    if (shown.slice(0, k).join(',') !== want.slice(0, k).join(','))
      fail(name + ': terms ' + shown.join(',') + ', expected ' + want.slice(0, k).join(','));
  }
  /* Exercise 8.1 Q6 in full: T4 to T8 */
  const T = [1, 2, 4];
  while (T.length < 8) T.push(T[T.length - 1] + T[T.length - 2] + T[T.length - 3]);
  if (T.join(',') !== '1,2,4,7,13,24,44,81') fail('the test\'s own Tribonacci run is wrong: ' + T.join(','));
  if (!await done('m4')) fail('four recursive rules tried and m4 never completed');
  console.log('   1,5,13,29 and 3,6,30,870 as Examples 3 and 4 have them; T₈ = 81');

  // ---- M5: Virahanka. The count is checked by enumeration, not by the formula.
  console.log('== M5  Virahāṅka\'s metres');
  const ways = n => n < 0 ? 0 : n === 0 ? 1 : ways(n - 1) + ways(n - 2);
  for (let n = 1; n <= 7; n++) {
    await set('vhN', n); await page.waitForTimeout(30);
    /* enumerate every ordered sum of 1s and 2s, independently of the page */
    const enumerate = k => k === 0 ? [[]] : k < 0 ? []
      : enumerate(k - 1).map(w => [1].concat(w)).concat(enumerate(k - 2).map(w => [2].concat(w)));
    const all = enumerate(n);
    if (all.length !== ways(n)) fail('the test\'s own enumeration disagrees with its own recursion at n = ' + n);
    all.forEach(w => { if (w.reduce((t, v) => t + v, 0) !== n) fail('an enumerated line at n = ' + n + ' does not total ' + n); });
    if (new Set(all.map(w => w.join(''))).size !== all.length) fail('the enumeration at n = ' + n + ' repeats a line');
    if (num(await txt('vhCount')) !== all.length)
      fail('n = ' + n + ': bench counts ' + await txt('vhCount') + ', enumeration finds ' + all.length);
  }
  if ([1, 2, 3, 4, 5, 6, 7].map(ways).join(',') !== '1,2,3,5,8,13,21')
    fail('the sequence should be 1,2,3,5,8,13,21, got ' + [1, 2, 3, 4, 5, 6, 7].map(ways).join(','));
  /* the ratio walks in on the golden ratio */
  const phi = (1 + Math.sqrt(5)) / 2;
  if (!near(ways(20) / ways(19), phi, 0.0001)) fail('the ratio should approach φ, got ' + (ways(20) / ways(19)));
  if (!await done('m5')) fail('four line lengths counted and m5 never completed');
  console.log('   1, 2, 3, 5, 8, 13, 21 by direct enumeration, and the ratio heads for φ');

  // ---- M7: an AP is a straight line
  console.log('== M7  the AP and its line');
  for (const a of [-10, -3, 0, 1, 7, 12]) for (const d of [-6, -1, 0, 4, 8]) {
    await set('apA', a); await set('apD', d); await page.waitForTimeout(12);
    if (num(await txt('apT10')) !== a + 9 * d) fail('a=' + a + ' d=' + d + ': 10th term ' + await txt('apT10') + ', expected ' + (a + 9 * d));
    /* the defining property, checked as a property and not as a formula */
    const terms = Array.from({ length: 8 }, (_, k) => a + k * d);
    const gaps = terms.slice(1).map((v, k) => v - terms[k]);
    if (new Set(gaps).size !== 1) fail('a=' + a + ' d=' + d + ': the test\'s own terms are not an AP');
    /* collinearity: every point must sit on the line through the first and last */
    const slope = (terms[7] - terms[0]) / 7;
    terms.forEach((v, k) => { if (!near(v, terms[0] + slope * k, 1e-9)) fail('a=' + a + ' d=' + d + ': point ' + k + ' is off the line'); });
  }
  await set('apA', 1); await set('apD', 4); await page.waitForTimeout(25);
  if (await txt('apRule') !== '4n − 3') fail('Fig. 8.3\'s squares are tₙ = 4n − 3, bench shows ' + await txt('apRule'));
  if (await txt('apRec') !== 't₁ = 1, tₙ = tₙ₋₁ + 4') fail('the recursive rule shown is ' + await txt('apRec'));
  if (!await done('m7')) fail('the AP swept and m7 never completed');
  console.log('   1, 5, 9, 13 gives 4n − 3, and every point lies on the line');

  // ---- M8: the taxi — Example 5
  console.log('== M8  the taxi fare');
  for (const [fee, rate, km] of [[200, 40, 10], [200, 40, 1], [0, 25, 8], [400, 80, 20], [100, 15, 5]]) {
    await set('txFee', fee); await set('txRate', rate); await set('txKm', km);
    await page.waitForTimeout(20);
    if (num(await txt('txA')) !== fee + rate) fail(fee + '/' + rate + ': first term ' + await txt('txA') + ', expected ' + (fee + rate));
    if (num(await txt('txFare')) !== fee + rate * km)
      fail(fee + '/' + rate + ' over ' + km + ' km: fare ' + await txt('txFare') + ', expected ' + (fee + rate * km));
  }
  await set('txFee', 200); await set('txRate', 40); await set('txKm', 10); await page.waitForTimeout(25);
  if (num(await txt('txFare')) !== 600) fail('Example 5: 10 km at ₹200 + ₹40/km is ₹600');
  if (!await done('m8')) fail('several journeys and m8 never completed');
  console.log('   240, 280, 320 … and ₹600 for ten kilometres, as Example 5 has it');

  // ---- M9: Gauss. The formula is checked against actually adding them up.
  console.log('== M9  Gauss\'s pairing');
  await page.click('#guFold'); await page.waitForTimeout(60);
  for (let n = 2; n <= 12; n++) {
    await set('guN', n); await page.waitForTimeout(15);
    let brute = 0; for (let k = 1; k <= n; k++) brute += k;
    if (brute !== n * (n + 1) / 2) fail('the test\'s own sum disagrees with the formula at n = ' + n);
    if (num(await txt('guSum')) !== brute) fail('n = ' + n + ': sum shown ' + await txt('guSum') + ', adding them gives ' + brute);
    if (num(await txt('guPairs')) !== n + 1) fail('n = ' + n + ': the column total should be ' + (n + 1));
  }
  /* the book's own worked case, 25 + 26 + … + 58 */
  let mid = 0; for (let k = 25; k <= 58; k++) mid += k;
  if (mid !== 58 * 59 / 2 - 24 * 25 / 2) fail('S₅₈ − S₂₄ should equal the direct sum');
  if (mid !== 1411) fail('25 + … + 58 is 1411, the test computed ' + mid);
  if (!await done('m9')) fail('the sum folded and swept, and m9 never completed');
  console.log('   n(n+1)/2 agrees with adding them up, and 25+…+58 = 1411');

  // ---- M10: multiples in a range — Exercise 8.2 Q5 and end-of-chapter Q3, Q4
  console.log('== M10 multiples in a range');
  const MULT = [
    [3, 10, 99, 30, 1665],      // Exercise 8.2 Q5: two-digit multiples of 3
    [7, 100, 999, 128, null],   // end-of-chapter Q3: three-digit multiples of 7
    [4, 10, 250, 60, null],     // end-of-chapter Q4
    [1, 1, 25, 25, 325]         // Exercise 8.2 Q7: the marbles
  ];
  for (const [d, lo, hi, count, sum] of MULT) {
    /* count and total them by brute force, then ask the page */
    let n = 0, tot = 0;
    for (let v = lo; v <= hi; v++) if (v % d === 0) { n++; tot += v; }
    if (n !== count) fail('the test\'s own count of multiples of ' + d + ' in [' + lo + ',' + hi + '] is ' + n + ', expected ' + count);
    if (sum !== null && tot !== sum) fail('the test\'s own sum is ' + tot + ', the book says ' + sum);
    await set('smDiv', d); await set('smLo', lo); await set('smHi', hi); await page.waitForTimeout(25);
    if (num(await txt('smCount')) !== n) fail('multiples of ' + d + ' in [' + lo + ',' + hi + ']: count ' + await txt('smCount') + ', expected ' + n);
    if (num(await txt('smSum')) !== tot) fail('multiples of ' + d + ' in [' + lo + ',' + hi + ']: sum ' + await txt('smSum') + ', expected ' + tot);
  }
  if (!await done('m10')) fail('four divisors tried and m10 never completed');
  console.log('   30 two-digit multiples of 3 adding to 1665; 128 and 60 for Q3 and Q4');

  // ---- M12: adding against multiplying
  console.log('== M12 AP against GP');
  for (const a of [1, 3, 10]) for (const d of [1, 5, 12]) for (const r of [5, 10, 20, 30]) {
    await set('cmA', a); await set('cmD', d); await set('cmR', r); await page.waitForTimeout(12);
    const rr = r / 10;
    if (num(await txt('cmAP')) !== a + 9 * d) fail('a=' + a + ' d=' + d + ': AP at 10 is ' + await txt('cmAP'));
    if (!near(num(await txt('cmGP')), Math.round(a * Math.pow(rr, 9) * 100) / 100, 0.02))
      fail('a=' + a + ' r=' + rr + ': GP at 10 is ' + await txt('cmGP') + ', expected ' + (a * Math.pow(rr, 9)).toFixed(2));
  }
  /* the claim of the mission: r > 1 always wins eventually, r = 1 never moves */
  await set('cmA', 3); await set('cmD', 12); await set('cmR', 11); await page.waitForTimeout(25);
  let beat = 0;
  for (let k = 2; k <= 400; k++) if (3 * Math.pow(1.1, k - 1) > 3 + (k - 1) * 12) { beat = k; break; }
  if (!beat) fail('a GP with r = 1.1 must overtake an AP with d = 12 eventually, and did not by n = 400');
  await set('cmR', 10); await page.waitForTimeout(25);
  if ((await txt('cmGap')).indexOf('never') < 0 && (await txt('cmGap')).indexOf('beyond') < 0)
    fail('at r = 1 the GP never overtakes; bench says ' + await txt('cmGap'));
  if (!await done('m12')) fail('ratios below, at and above 1 all seen, and m12 never completed');
  console.log('   r = 1.1 overtakes d = 12 at n = ' + beat + '; at r = 1 the GP never moves');

  // ---- M13: the bouncing ball — Example 10 and Exercise 8.3 Q5
  console.log('== M13 the bouncing ball');
  await set('bbH', 24); await set('bbR', 75);
  const PEAKS = [18, 13.5, 10.125, 7.59375, 5.6953125, 4.271484375, 3.203613281];
  for (let n = 1; n <= 7; n++) {
    await set('bbN', n); await page.waitForTimeout(20);
    if (!near(24 * Math.pow(0.75, n), PEAKS[n - 1], 1e-6)) fail('the test\'s own peak ' + n + ' is wrong');
    if (!near(num(await txt('bbHt')), Math.round(PEAKS[n - 1] * 1000) / 1000, 0.002))
      fail('bounce ' + n + ': peak ' + await txt('bbHt') + ', the book says ' + PEAKS[n - 1]);
  }
  /* the book's answer: the seventh is the first below a sixth of 24 */
  if (!(PEAKS[5] > 4 && PEAKS[6] < 4)) fail('the 6th peak should be above 4 ft and the 7th below it');
  if (num(await txt('bbBelow')) !== 7) fail('below a sixth after 7 bounces, bench says ' + await txt('bbBelow'));
  /* Exercise 8.3 Q5: 80 m at 60% */
  await set('bbH', 80); await set('bbR', 60); await set('bbN', 5); await page.waitForTimeout(30);
  if (!near(num(await txt('bbHt')), 6.221, 0.002)) fail('80 m at 60%, 5th bounce is 6.2208 m, bench says ' + await txt('bbHt'));
  let d6 = 80; for (let j = 1; j <= 5; j++) d6 += 2 * 80 * Math.pow(0.6, j);
  if (!near(d6, 301.3376, 0.001)) fail('the test\'s own total distance is ' + d6 + ', expected 301.3376');
  if (!near(num(await txt('bbDist')), 301.34, 0.02)) fail('distance to the 6th hit is 301.34 m, bench says ' + await txt('bbDist'));
  if (!await done('m13')) fail('several bounces and m13 never completed');
  console.log('   18, 13.5, 10.125 … below 4 ft at the 7th; 80 m at 60% travels 301.34 m');

  // ---- M14: Sierpiński — two GPs in opposite directions
  console.log('== M14 the Sierpiński triangle');
  for (let n = 0; n <= 6; n++) {
    await set('siN', n); await page.waitForTimeout(20);
    if (lead(await txt('siCount')) !== Math.pow(3, n)) fail('stage ' + n + ': count ' + await txt('siCount') + ', expected ' + Math.pow(3, n));
    if (!near(num(String(await txt('siArea')).split('=')[0]), Math.round(Math.pow(0.75, n) * 10000) / 10000, 0.0002))
      fail('stage ' + n + ': area ' + await txt('siArea') + ', expected ' + Math.pow(0.75, n).toFixed(4));
  }
  /* Table 1's own row: 1, 3, 9, 27, 81, 243 */
  if ([0, 1, 2, 3, 4, 5].map(n => Math.pow(3, n)).join(',') !== '1,3,9,27,81,243')
    fail('Table 1 gives 1, 3, 9, 27, 81, 243 black triangles');
  if (!await done('m14')) fail('four stages seen and m14 never completed');
  console.log('   3ⁿ triangles covering (¾)ⁿ — Table 1, both rows');

  // ---- the graded work
  console.log('== M6, M11 and M15  the graded work');
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
  await rowsAnswer('g6', ['An AP', 'Not an AP', 'An AP', 'Not an AP', 'An AP', 'Not an AP'], 'm6');

  const W11 = ['2', '3', '−1', '3/4', '2/3', '−1/2'];
  const W15 = ['178', '4', '−13', '9th', '2, 6, 18', '45'];
  /* every one of these worked here first, from the book's numbers */
  if (5 * (3 / 4) !== 15 / 4 || (15 / 4) * (3 / 4) !== 45 / 16) fail('Example 9\'s ratio is not 3/4');
  if (!near(4 * (2 / 3), 8 / 3, 1e-12) || !near((8 / 3) * (2 / 3), 16 / 9, 1e-12)) fail('the 4, 8/3, 16/9 ratio is not 2/3');
  if (38 + 5 * 7 !== 73) fail('an AP with d = 7 takes the 11th term 38 to 73 at the 16th');
  if (-32 + 30 * 7 !== 178) fail('that AP\'s 31st term is 178');
  if (4 + 2 * 6 !== 16) fail('a = 4 and d = 6 give a 3rd term of 16');
  if (2 * (-13) + 10 * 5 !== 24 || 2 * (-13) + 14 * 5 !== 44) fail('a = −13, d = 5 must satisfy both sums');
  if (2 * Math.pow(4, 8) !== 131072) fail('131072 is the 9th term of 2, 8, 32, …');
  if (2 + 6 + 18 !== 26 || 4 + 36 + 324 !== 364) fail('2, 6, 18 must sum to 26 with squares summing to 364');
  if (!(45 * 46 / 2 > 1000 && 44 * 45 / 2 <= 1000)) fail('45 is the smallest n with the sum above 1000');
  for (const [tbl, btn, want, mid] of [['g11', 'g11check', W11, 'm11'], ['g15', 'g15check', W15, 'm15']]) {
    const opts = await page.$$eval('#' + tbl + ' select', ns => ns.map(s => [...s.options].map(o => o.value)));
    if (opts.length !== want.length) fail(tbl + ' should have ' + want.length + ' blanks, has ' + opts.length);
    want.forEach((v, i) => { if (opts[i] && !opts[i].includes(v)) fail(tbl + ' blank ' + (i + 1) + ' cannot be answered ' + v); });
    await page.$$eval('#' + tbl + ' select', (ns, w) => ns.forEach((n, i) => {
      n.value = w[i]; n.dispatchEvent(new Event('change', { bubbles: true }));
    }), want);
    await page.click('#' + btn); await page.waitForTimeout(120);
    if (!await done(mid)) fail(mid + ' did not complete on the book\'s own answers: ' + await txt(tbl + 's'));
  }
  console.log('   ratios 2, 3, −1, 3/4, 2/3, −1/2 — and 178, 4, −13, 9th, 2·6·18, 45');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['Numbers with no order', 'Put them in a row', 'A rule for the nth',
                'Adding the same each time', 'Which is a straight line', 'Multiplying instead',
                'A pattern inside itself'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nsequences: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
