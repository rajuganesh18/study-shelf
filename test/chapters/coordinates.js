const { browser, reporter, BASE } = require('../lib');

/* Chapter 1 of Ganita Manjari. Every expected value below is taken from the
   printed page, never read off the running bench: the sides of triangle ADM in
   Fig. 1.7, the images in Fig. 1.9, the collinearity of Problems 6 and 7, the
   midpoint table of Problem 9 and the circle of Problem 12. A bench that
   disagrees with the book fails here even if it agrees with itself. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'coordinates-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  // the benches print a real minus, not a hyphen — so expectations must too
  const m = n => (n < 0 ? '−' : '') + Math.abs(n);
  const pt = (x, y) => '(' + m(x) + ', ' + m(y) + ')';

  // ---- M2: the nine named corners of Fig. 1.3, and that placing three pays out
  console.log('== M2  Reiaan\'s room, Fig. 1.3');
  const CORNERS = [
    [0, 0, 'O (0, 0)'], [12, 0, 'A (12, 0)'], [12, 10, 'B (12, 10)'],
    [0, 10, 'C (0, 10)'], [3, 0, 'W₁ wardrobe'], [7, 2, 'W₃ wardrobe'],
    [8, 0, 'D₁ door edge'], [1, 5, 'S₁ bed corner'], [0, 4, 'B₂ bath door']
  ];
  for (const [x, y, name] of CORNERS) {
    await set('rmX', x); await set('rmY', y); await page.waitForTimeout(40);
    if (await txt('rmAt') !== pt(x, y)) fail('pin readout wrong at ' + x + ',' + y);
    if (await txt('rmFound') !== name) fail('(' + x + ', ' + y + ') should be ' + name + ', got ' + await txt('rmFound'));
    await page.click('#rmPlace'); await page.waitForTimeout(40);
  }
  // a spot with nothing on it must not count
  await set('rmX', 5); await set('rmY', 6); await page.waitForTimeout(40);
  if (await txt('rmFound') !== 'open floor') fail('(5, 6) should be open floor');
  if (!await done('m2')) fail('placing the pin on nine named corners did not complete m2');
  console.log('   all nine corners named correctly; three placements complete the mission');

  // ---- M5: the sign rules of Section 1.3, including the axes belonging to no quadrant
  console.log('== M5  quadrants and signs');
  const REGION = [
    [3, 4, 'Quadrant I', '(+, +)'], [-5, 3, 'Quadrant II', '(−, +)'],
    [-5, -3, 'Quadrant III', '(−, −)'], [3, -5, 'Quadrant IV', '(+, −)'],
    [4, 0, 'on an axis', '(+, 0)'], [0, -4, 'on an axis', '(0, −)'],
    [0, 0, 'the origin', '(0, 0)']
  ];
  for (const [x, y, want, signs] of REGION) {
    await set('qdX', x); await set('qdY', y); await page.waitForTimeout(40);
    if (await txt('qdReg') !== want) fail('(' + x + ', ' + y + ') read as ' + await txt('qdReg') + ', expected ' + want);
    if (await txt('qdSign') !== signs) fail('(' + x + ', ' + y + ') signs ' + await txt('qdSign') + ', expected ' + signs);
  }
  console.log('   I, II, III, IV by sign; a zero puts the point on an axis, not in a quadrant');

  // ---- M7: (x, y) = (y, x) if and only if x = y  (Think and Reflect, page 7)
  console.log('== M7  (x, y) against (y, x)');
  for (const [x, y] of [[2, 5], [-3, 4], [6, 6], [-2, -2], [0, 7], [0, 0]]) {
    await set('swX', x); await set('swY', y); await page.waitForTimeout(40);
    const want = x === y ? 'yes' : 'no';
    if (await txt('swSame') !== want) fail('(' + x + ', ' + y + '): coincide said ' + await txt('swSame') + ', expected ' + want);
    if (await txt('swQ') !== pt(y, x)) fail('Q should be ' + pt(y, x) + ', got ' + await txt('swQ'));
  }
  console.log('   they coincide exactly when x = y, and never otherwise');

  // ---- M8: distance along a line is |x2 - x1|, whichever way you subtract
  console.log('== M8  |x₂ − x₁|');
  for (const [a, c] of [[2, 7], [7, 2], [-8, 8], [3, 3], [-2, -6]]) {
    await set('lnA', a); await set('lnB', c); await page.waitForTimeout(40);
    const shown = await txt('lnDist');
    if (shown !== String(Math.abs(c - a))) fail(a + ' to ' + c + ': distance ' + shown + ', expected ' + Math.abs(c - a));
  }
  console.log('   the two subtractions disagree on sign and agree on size');

  // ---- M9: triangle ADM of Fig. 1.7. The book gets 5, √29 and √40.
  console.log('== M9  triangle ADM');
  const SIDES = [
    [3, 4, 7, 1, '5',   '4',  '−3'],
    [7, 1, 9, 6, '√29', '2',  '5'],
    [9, 6, 3, 4, '√40', '−6', '−2']
  ];
  for (const [x1, y1, x2, y2, d, dx, dy] of SIDES) {
    await set('trX1', x1); await set('trY1', y1);
    await set('trX2', x2); await set('trY2', y2);
    await page.waitForTimeout(40);
    if (await txt('trD')  !== d)  fail('(' + x1 + ',' + y1 + ')→(' + x2 + ',' + y2 + '): ' + await txt('trD') + ', book says ' + d);
    if (await txt('trDx') !== dx) fail('x₂ − x₁ read ' + await txt('trDx') + ', expected ' + dx);
    if (await txt('trDy') !== dy) fail('y₂ − y₁ read ' + await txt('trDy') + ', expected ' + dy);
  }
  // the preset buttons must land on the same three sides
  for (const [id, d] of [['trAD', '5'], ['trDM', '√29'], ['trMA', '√40']]) {
    await page.click('#' + id); await page.waitForTimeout(40);
    if (await txt('trD') !== d) fail(id + ' gave ' + await txt('trD') + ', expected ' + d);
  }
  if (!await done('m9')) fail('reproducing all three sides of ADM did not complete m9');
  console.log('   AD = 5, DM = √29, MA = √40 — the book\'s own three answers');

  // ---- M11: Fig. 1.9. Reflection moves the triangle and preserves every side.
  console.log('== M11 reflection preserves the lengths');
  const before = await txt('rfSides');
  if (before !== '5, √29, √40') fail('unreflected sides read ' + before + ', expected 5, √29, √40');
  await page.click('#rfY'); await page.waitForTimeout(60);
  if (await txt('rfSides') !== '5, √29, √40') fail('y-axis reflection changed the sides: ' + await txt('rfSides'));
  if (!/A′\(−3,4\)/.test(await txt('rfPts'))) fail('A should reflect to (−3, 4), got ' + await txt('rfPts'));
  if (!/D′\(−7,1\)/.test(await txt('rfPts'))) fail('D should reflect to (−7, 1), got ' + await txt('rfPts'));
  await page.click('#rfX'); await page.waitForTimeout(60);
  if (await txt('rfSides') !== '5, √29, √40') fail('x-axis reflection changed the sides: ' + await txt('rfSides'));
  if (!/A′\(3,−4\)/.test(await txt('rfPts'))) fail('A should reflect to (3, −4), got ' + await txt('rfPts'));
  console.log('   A → (−3, 4) in the y-axis and (3, −4) in the x-axis; 5, √29, √40 throughout');

  // ---- M12: Problems 6 and 7. One set is collinear and one is very nearly so.
  console.log('== M12 collinearity');
  const SETS = [['M A G', 'collinear'], ['R B C', 'not collinear'],
                ['P Q R', 'collinear'], ['A B C', 'not collinear']];
  for (const [name, want] of SETS) {
    await page.$$eval('#clPick button', (ns, n) => {
      const b = ns.find(e => e.textContent.trim() === n); if (b) b.click();
    }, name);
    await page.waitForTimeout(50);
    await page.click('#clRun'); await page.waitForTimeout(60);
    if (await txt('clSay') !== want) fail(name + ' judged ' + await txt('clSay') + ', expected ' + want);
  }
  // R B C is the interesting one: 5 + √85 = 14.220, √202 = 14.213. Nearly, not.
  await page.$$eval('#clPick button', ns => {
    const b = ns.find(e => e.textContent.trim() === 'R B C'); if (b) b.click();
  });
  await page.click('#clRun'); await page.waitForTimeout(60);
  const sum = parseFloat(await txt('clSum')), long = parseFloat(await txt('clLong'));
  if (!(sum > long)) fail('R B C: the detour should cost more, got sum ' + sum + ' vs ' + long);
  if (sum - long > 0.02) fail('R B C should be a near miss, not an obvious one: ' + (sum - long));
  console.log('   M A G adds up exactly; R B C misses by 0.007 and is correctly refused');

  /* ---- M13: the midpoint is the average (Problem 9).
     The bench spans ±9, which is as wide as the drawing stays readable, so the
     rows of Problem 9 that fall outside it are checked in M14 below rather than
     forced on a slider that cannot reach them. */
  console.log('== M13 the midpoint is an average');
  const MIDS = [[-3, 0, 3, 0, '(0, 0)'], [2, 3, 4, 5, '(3, 4)'],
                [0, 0, 0, -9, '(0, −4.5)'], [-8, 7, 6, -3, '(−1, 2)'],
                [5, 5, 5, 5, '(5, 5)']];
  for (const [sx, sy, tx, ty, want] of MIDS) {
    await set('mdSX', sx); await set('mdSY', sy);
    await set('mdTX', tx); await set('mdTY', ty);
    await page.waitForTimeout(40);
    if (await txt('mdM') !== want) fail('S(' + sx + ',' + sy + ') T(' + tx + ',' + ty + ') → ' + await txt('mdM') + ', expected ' + want);
  }
  // and the rule itself, everywhere the bench can reach
  for (let sx = -9; sx <= 9; sx += 3) for (let tx = -9; tx <= 9; tx += 3) {
    await set('mdSX', sx); await set('mdSY', 0);
    await set('mdTX', tx); await set('mdTY', 0);
    await page.waitForTimeout(15);
    const m = (sx + tx) / 2;
    const want = '(' + (m < 0 ? '−' + Math.abs(m) : String(m)) + ', 0)';
    if (await txt('mdM') !== want) fail('midpoint of ' + sx + ' and ' + tx + ' read ' + await txt('mdM') + ', expected ' + want);
  }
  console.log('   the midpoint is the average of the ends across the whole range');

  /* ---- M14: the table of Problem 9, including the two rows the bench cannot
     reach. Every answer is recomputed from the coordinates printed in the row
     rather than trusted, then answered — so a wrong key in the source fails. */
  console.log('== M14 the midpoint table, Problem 9');
  const rows = await page.$$('#g14 .qrow');
  if (rows.length !== 4) fail('expected 4 table rows, found ' + rows.length);
  for (const row of rows) {
    const label = (await row.$eval('.t', n => n.textContent)).trim();
    const nums = label.match(/\(−?\d+,\s*−?\d+\)/g).map(s =>
      s.replace(/[()]/g, '').split(',').map(v => parseFloat(v.replace('−', '-'))));
    const [S1, M1, T1] = nums;
    const isMid = M1[0] === (S1[0] + T1[0]) / 2 && M1[1] === (S1[1] + T1[1]) / 2;
    const want = isMid ? 'Yes' : 'No';
    const btns = await row.$$('button.chip');
    for (const btn of btns) {
      if ((await btn.textContent()).trim() === want) { await btn.click(); break; }
    }
    await page.waitForTimeout(40);
    const cls = await Promise.all(btns.map(x => x.getAttribute('class')));
    const picked = cls.find(c => /right|wrong/.test(c));
    if (!/right/.test(picked || '')) fail(label + ': the true answer is ' + want + ', and the table marked it wrong');
  }
  if (!await done('m14')) fail('answering all four rows did not complete m14');
  console.log('   all four rows agree with the arithmetic, (0, 5) rejected for (0, −5)');

  // ---- M15: Problem 12. A, B and C are on circle K; D is inside, E is outside.
  console.log('== M15 circle K, radius √65');
  const CIRCLE = [[1, -8, 'on the circle', 65], [-4, 7, 'on the circle', 65],
                  [-7, -4, 'on the circle', 65], [-5, 6, 'inside', 61],
                  [0, 9, 'outside', 81], [0, 0, 'inside', 0]];
  for (const [x, y, want, sq] of CIRCLE) {
    await set('ciX', x); await set('ciY', y); await page.waitForTimeout(40);
    if (await txt('ciSay') !== want) fail('(' + x + ', ' + y + ') judged ' + await txt('ciSay') + ', expected ' + want);
    if (await txt('ciSq') !== String(sq)) fail('(' + x + ', ' + y + ') x² + y² read ' + await txt('ciSq') + ', expected ' + sq);
  }
  console.log('   A, B and C all give 65; D gives 61 inside and E gives 81 outside');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const wantStages = ['A blank sheet', 'One line', 'Two axes cross', 'Negatives added',
                      'Four quadrants', 'A point, located', 'Distance measured'];
  if (stages.join('|') !== wantStages.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\ncoordinates: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
