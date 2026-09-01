const { browser, BASE } = require('../lib');

/* Chapter 2 of Ganita Manjari. Every expected value is worked from the printed
   page — Raju's 4x + 5y + 3, the garden's 200l + 160w + 50lw, the chess club's
   200 + 50m, the tile rule 2n − 1, Bela's 100 − 5n, the fare 15n − 5, and the
   data plan that resolves to y = 20x + 150 — never read off the running bench.

   The two self-marking tables are checked by recomputing each row from its own
   text rather than by trusting the answer key, so a wrong key fails here. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'linear-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const rupees = s => parseInt(String(s).replace(/[^0-9-]/g, ''), 10);

  // ---- M1: Example 1. 4x + 5y + 3, and the 3 that never moves.
  console.log('== M1  Raju\'s boxes, 4x + 5y + 3');
  for (const [x, y] of [[2, 3], [0, 0], [8, 8], [5, 1], [1, 7]]) {
    await set('shX', x); await set('shY', y); await page.waitForTimeout(35);
    const want = 4 * x + 5 * y + 3;
    const got = parseInt(await txt('shTotal'), 10);
    if (got !== want) fail(x + ' red, ' + y + ' blue: ' + got + ' items, expected ' + want);
  }
  await set('shX', 0); await set('shY', 0); await page.waitForTimeout(35);
  if (parseInt(await txt('shTotal'), 10) !== 3) fail('with no boxes at all the 3 free pens must remain');
  console.log('   totals follow 4x + 5y + 3; the constant survives x = y = 0');

  // ---- M2: Example 2. Two fence terms, and one that carries both letters.
  console.log('== M2  the garden, 200l + 160w + 50lw');
  for (const [l, w] of [[6, 4], [1, 1], [14, 14], [10, 3]]) {
    await set('gdL', l); await set('gdW', w); await page.waitForTimeout(35);
    if (rupees(await txt('gdWire')) !== 200 * l) fail('wire at l=' + l + ': ' + await txt('gdWire'));
    if (rupees(await txt('gdWood')) !== 160 * w) fail('wood at w=' + w + ': ' + await txt('gdWood'));
    if (rupees(await txt('gdSeed')) !== 50 * l * w) fail('seed at ' + l + '×' + w + ': ' + await txt('gdSeed'));
  }
  // the point of the mission: doubling both sides quadruples only the lw term
  await set('gdL', 4); await set('gdW', 3); await page.waitForTimeout(35);
  const seed1 = rupees(await txt('gdSeed'));
  await set('gdL', 8); await set('gdW', 6); await page.waitForTimeout(35);
  const seed2 = rupees(await txt('gdSeed'));
  if (seed2 !== seed1 * 4) fail('doubling both sides should quadruple the seed cost: ' + seed1 + ' → ' + seed2);
  console.log('   each term is right, and 50lw grows four-fold when both sides double');

  // ---- M3: degree names the family, and a zero coefficient is an absent term
  console.log('== M3  degree and family');
  const DEG = [
    [0, 0, 3, 7, '1', 'linear'],
    [0, 2, 0, 0, '2', 'quadratic'],
    [4, 0, 0, 1, '3', 'cubic'],
    [0, 0, 0, 5, '0', 'constant'],
    [0, 0, 0, 0, '0', 'constant'],
    [0, 0, -4, 0, '1', 'linear']
  ];
  for (const [c3, c2, c1, k, deg, name] of DEG) {
    await set('dgC', c3); await set('dgB', c2); await set('dgA', c1); await set('dgK', k);
    await page.waitForTimeout(35);
    if (await txt('dgDeg') !== deg) fail('[' + [c3, c2, c1, k] + '] degree ' + await txt('dgDeg') + ', expected ' + deg);
    if (await txt('dgName') !== name) fail('[' + [c3, c2, c1, k] + '] called ' + await txt('dgName') + ', expected ' + name);
  }
  // a leading coefficient of zero must not be printed at all
  await set('dgC', 0); await set('dgB', 0); await set('dgA', 1); await set('dgK', 0);
  await page.waitForTimeout(35);
  if (await txt('dgP') !== 'x') fail('coefficient 1 should print as "x", got ' + await txt('dgP'));
  await set('dgA', -1); await page.waitForTimeout(35);
  if (await txt('dgP') !== '− x') fail('coefficient −1 should print as "− x", got ' + await txt('dgP'));
  if (!await done('m3')) fail('reaching all four families did not complete m3');
  console.log('   constant, linear, quadratic, cubic — set by the highest surviving power');

  // ---- M6: Example 5. 200 + 50m, and the constant step of 50.
  console.log('== M6  the chess club, 200 + 50m');
  for (const m of [0, 1, 2, 3, 4, 5, 11, 16]) {
    await set('chM', m); await page.waitForTimeout(30);
    const want = 200 + 50 * m;
    if (rupees(await txt('chAmt')) !== want) fail(m + ' matches: ' + await txt('chAmt') + ', expected ₹' + want);
  }
  // the book's own table: 1→250, 2→300, 3→350, 4→400, 5→450
  const TABLE = { 1: 250, 2: 300, 3: 350, 4: 400, 5: 450 };
  for (const m of Object.keys(TABLE)) {
    await set('chM', m); await page.waitForTimeout(30);
    if (rupees(await txt('chAmt')) !== TABLE[m]) fail('book table row ' + m + ' should be ₹' + TABLE[m]);
  }
  await set('chM', 11); await page.waitForTimeout(30);
  if (rupees(await txt('chAmt')) !== 750) fail('₹750 must fall at 11 matches');
  console.log('   the book\'s table reproduced, and ₹750 lands at 11 matches');

  // ---- M7: Fig. 2.3, plus Exercise Set 2.2 Q1 and Q2
  console.log('== M7  the input–output machine');
  const pick = async name => page.$$eval('#macPick button', (ns, n) => {
    const b = ns.find(e => e.textContent.trim() === n); if (b) b.click();
  }, name);
  const MACH = [
    ['2x + 3', [[4, 11], [-6, -9], [0, 3]]],                       // Fig. 2.3
    ['5x − 3', [[0, -3], [-1, -8], [2, 7]]],                       // Q1
    ['7x² − 4x + 6', [[0, 6], [-3, 81], [4, 102]]],                // Q2, in x
    ['10x − x²', [[6, 24], [0, 0], [-2, -24]]]                     // Example 3
  ];
  for (const [name, cases] of MACH) {
    await pick(name); await page.waitForTimeout(50);
    for (const [v, want] of cases) {
      await set('macX', v); await page.waitForTimeout(30);
      const got = (await txt('macOut')).replace('−', '-');
      if (parseInt(got, 10) !== want) fail(name + ' at x=' + v + ': ' + got + ', expected ' + want);
    }
  }
  console.log('   2x+3, 5x−3, 7x²−4x+6 and 10x−x² all evaluate as the book has them');

  /* ---- the three self-marking tables.

     The key below is worked from the textbook, not read out of the page: if a
     table in the chapter carries a wrong answer, filling it in from here marks
     it red and this fails. Row and column order follow the markup. */
  console.log('== M5, M8, M10  the self-marking tables');
  const KEY = {
    g5: [                                   // Exercise Set 2.1, Q3 to Q5
      ['4', '6', '7'],                      // x⁴−3x³+6x²−2x+7, coefficient of x²
      ['4', '-3', '7'],                     // the same, coefficient of x³
      ['3', '0', '-11'],                    // 4z³+5z²−11 has no z term at all
      ['3', '-8', '-10']                    // 9x³+5x²−8x−10
    ],
    g8: [                                   // Example 6 and Exercise Set 2.2
      ['2x + 10 = 64', '27 and 37'],
      ['x + 4x = 300', '60 and 240 ft'],
      ['5x − 2x = 63', '42 and 105'],
      ['2(3x + 3) = 24', '3 and 9 cm']
    ],
    g10: [                                  // 2n − 1, forwards and backwards
      ['2×15 − 1', '29'],
      ['2×26 − 1', '51'],
      ['2n − 1 = 21', '11'],
      ['2n − 1 = 47', '24']
    ]
  };
  // and the arithmetic behind g10, so the key itself is not taken on trust
  [[15, 29], [26, 51]].forEach(([n, t]) => {
    if (2 * n - 1 !== t) fail('the test\'s own g10 key is wrong at stage ' + n);
  });
  [[21, 11], [47, 24]].forEach(([t, n]) => {
    if (2 * n - 1 !== t) fail('the test\'s own g10 key is wrong for ' + t + ' tiles');
  });

  for (const [tbl, mid] of [['g5', 'm5'], ['g8', 'm8'], ['g10', 'm10']]) {
    await page.$$eval('#' + tbl + ' select', (ns, key) => {
      ns.forEach(s => {
        s.value = key[+s.dataset.r][+s.dataset.c];
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, KEY[tbl]);
    await page.click('#' + tbl + 'check');
    await page.waitForTimeout(120);
    const score = await txt(tbl + 's');
    if (/correct\./.test(score)) fail(tbl + ' marked the textbook answers wrong: ' + score);
    if (!await done(mid)) fail(mid + ' did not complete on a full set of correct answers');
  }
  console.log('   every row of all three tables agrees with the printed answers');

  // ---- M9: the tile pattern, 2n − 1
  console.log('== M9  the tile pattern');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 15, 26]) {
    await set('tlN', n); await page.waitForTimeout(30);
    const want = 2 * n - 1;
    if (parseInt(await txt('tlCount'), 10) !== want) fail('stage ' + n + ': ' + await txt('tlCount') + ', expected ' + want);
  }
  // the sequence the book prints for stages 1 to 7
  const SEQ = [1, 3, 5, 7, 9, 11, 13];
  for (let n = 1; n <= 7; n++) {
    await set('tlN', n); await page.waitForTimeout(25);
    if (parseInt(await txt('tlCount'), 10) !== SEQ[n - 1]) fail('the book\'s table breaks at stage ' + n);
  }
  console.log('   1, 3, 5, 7, 9, 11, 13 — and 29 at stage 15, 51 at stage 26');

  // ---- M11: Examples 7 and 8
  console.log('== M11 pocket money down, fare up');
  const swap = async () => { await page.click('#twSwap'); await page.waitForTimeout(60); };
  // starts on Bela
  for (const [n, want] of [[1, 95], [2, 90], [3, 85], [4, 80], [12, 40], [20, 0]]) {
    await set('twN', n); await page.waitForTimeout(30);
    if (rupees(await txt('twVal')) !== want) fail('Bela day ' + n + ': ' + await txt('twVal') + ', expected ₹' + want);
  }
  await swap();
  // the auto fare: ₹25 flat for the first 2 km, then 15n − 5
  for (const [n, want] of [[1, 25], [2, 25], [3, 40], [4, 55], [5, 70], [6, 85], [9, 130], [10, 145]]) {
    await set('twN', n); await page.waitForTimeout(30);
    if (rupees(await txt('twVal')) !== want) fail('fare for ' + n + ' km: ' + await txt('twVal') + ', expected ₹' + want);
  }
  console.log('   100 − 5n gives ₹40 on day 12; 15n − 5 gives ₹145 at 10 km and ₹130 at 9 km');

  // ---- M13: Example 11 and the two that follow it
  console.log('== M13 two readings give a and b');
  const FIT = [
    [10, 350, 20, 550, '20', '150'],    // Example 11 — the data plan
    [10, 400, 14, 500, '25', '150'],    // Exercise 2.5 Q1 — the learning platform
    [10, 800, 15, 1100, '60', '200']    // Exercise 2.5 Q2 — the gym
  ];
  for (const [x1, y1, x2, y2, a, bb] of FIT) {
    await set('ftX1', x1); await set('ftY1', y1);
    await set('ftX2', x2); await set('ftY2', y2);
    await page.waitForTimeout(40);
    if (await txt('ftA') !== a) fail('(' + x1 + ',' + y1 + ') and (' + x2 + ',' + y2 + '): a = ' + await txt('ftA') + ', expected ' + a);
    if (await txt('ftB') !== bb) fail('(' + x1 + ',' + y1 + ') and (' + x2 + ',' + y2 + '): b = ' + await txt('ftB') + ', expected ' + bb);
  }
  console.log('   y = 20x + 150, y = 25x + 150 and y = 60x + 200');

  // ---- M14: what a does
  console.log('== M14 the slope');
  const SLOPE = [[30, 'steeper', 'uphill — growth'], [20, 'steeper', 'uphill — growth'],
                 [10, 'equally inclined', 'uphill — growth'], [5, 'gentler', 'uphill — growth'],
                 [0, 'flat', 'level'], [-10, 'equally inclined', 'downhill — decay'],
                 [-30, 'steeper', 'downhill — decay']];
  for (const [raw, cmp, dir] of SLOPE) {
    await set('slA', raw); await page.waitForTimeout(30);
    if (await txt('slCmp') !== cmp) fail('a = ' + raw / 10 + ': ' + await txt('slCmp') + ', expected ' + cmp);
    if (await txt('slDir') !== dir) fail('a = ' + raw / 10 + ': ' + await txt('slDir') + ', expected ' + dir);
  }
  console.log('   a > 1 steeper, a < 1 gentler, a < 0 downhill — and y = x equally inclined');

  // ---- M15: what b does
  console.log('== M15 the y-intercept');
  for (const bb of [5, 3, -2, 0]) {
    await set('inA', 20); await set('inB', bb); await page.waitForTimeout(30);
    const want = '(0, ' + (bb < 0 ? '−' + Math.abs(bb) : bb) + ')';
    if (await txt('inCut') !== want) fail('b = ' + bb + ' should cut at ' + want + ', got ' + await txt('inCut'));
    const par = await txt('inPar');
    if (bb === 0 ? par !== 'the same line' : par !== 'parallel')
      fail('a = 2, b = ' + bb + ': ' + par);
  }
  await set('inA', 30); await page.waitForTimeout(30);
  if (await txt('inPar') !== 'not parallel') fail('slope 3 against 2 must not be parallel');
  if (!await done('m15')) fail('three intercepts and one non-parallel slope did not complete m15');
  console.log('   (0, b) every time — and only equal slopes are parallel');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['Loose terms', 'One variable', 'Degree one', 'A constant step',
                'Points on a grid', 'They line up', 'Slope and cut'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nlinear: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
