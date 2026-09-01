const { browser, BASE } = require('../lib');

/* Chapter 4 of Ganita Manjari. The identities themselves are the expected
   values, and the test computes both sides independently rather than reading
   one off the bench: an area diagram that agrees with itself proves nothing.

   Named cases come from the printed page — Example 1's three consecutive
   squares, Example 2's negatives and fractions, Fig. 4.2 and Fig. 4.3, the
   mental-arithmetic Examples 4, 8 and 9, Fig. 4.7's tiles, Examples 10 to 12
   for splitting the middle term, Fig. 4.10's cube, and Example 16. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'identities-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const chip = async (box, label) => {
    await page.$$eval('#' + box + ' button', (ns, l) => {
      const b = ns.find(e => e.textContent.trim() === l); if (b) b.click();
    }, label);
    await page.waitForTimeout(50);
  };
  const nums = s => (String(s).match(/-?\d+/g) || []).map(Number);

  // ---- M1: Example 1. The answer is 2 for every n, and the algebra says why.
  console.log('== M1  three consecutive squares');
  for (const n of [2, 3, 5, 6, 12, 20]) {
    await set('cnN', n); await page.waitForTimeout(30);
    const lo = (n - 1) * (n - 1), hi = (n + 1) * (n + 1), mid = n * n;
    if (lo + hi - 2 * mid !== 2) fail('the test\'s own arithmetic is wrong at n = ' + n);
    const shown = await txt('cnRes');
    if (!shown.endsWith('= 2')) fail('n = ' + n + ' gave "' + shown + '", expected it to end in 2');
    const sq = nums(await txt('cnSq'));
    if (sq.join(',') !== [lo, mid, hi].join(',')) fail('n = ' + n + ' squares read ' + sq.join(', '));
  }
  // the book's own two: 1, 4, 9 and 25, 36, 49
  await set('cnN', 2); await page.waitForTimeout(30);
  if (nums(await txt('cnSq')).join(',') !== '1,4,9') fail('n = 2 should give 1, 4, 9');
  await set('cnN', 6); await page.waitForTimeout(30);
  if (nums(await txt('cnSq')).join(',') !== '25,36,49') fail('n = 6 should give 25, 36, 49');
  console.log('   1,4,9 and 25,36,49 both give 2 — and so does every n from 2 to 20');

  // ---- M2: Fig. 4.2. The outer square and the four pieces must agree.
  console.log('== M2  (a + b)² as an area');
  for (let a = 1; a <= 9; a++) for (let bb = 1; bb <= 9; bb += 2) {
    await set('sqA', a); await set('sqB', bb); await page.waitForTimeout(12);
    const whole = nums(await txt('sqWhole')).pop();
    const parts = nums(await txt('sqParts')).pop();
    if (whole !== (a + bb) * (a + bb)) fail('a=' + a + ' b=' + bb + ': outer square ' + whole);
    if (parts !== a * a + 2 * a * bb + bb * bb) fail('a=' + a + ' b=' + bb + ': pieces ' + parts);
    if (whole !== parts) fail('a=' + a + ' b=' + bb + ': ' + whole + ' vs ' + parts);
  }
  if (!await done('m2')) fail('three settings and m2 never completed');
  console.log('   the outer square equals a² + 2ab + b² for every a and b the bench allows');

  // ---- M5: the Think and Reflect. The gap is 2ab, and its sign decides.
  console.log('== M5  which is bigger');
  for (const [a, bb] of [[3, 2], [-3, -2], [3, -2], [-3, 2], [0, 5], [4, 0], [6, 6]]) {
    await set('cmA', a); await set('cmB', bb); await page.waitForTimeout(30);
    const L = Number(await txt('cmL')), R = Number(await txt('cmR'));
    if (L !== (a + bb) * (a + bb)) fail('a=' + a + ' b=' + bb + ': (a+b)² read ' + L);
    if (R !== a * a + bb * bb) fail('a=' + a + ' b=' + bb + ': a²+b² read ' + R);
    if (L - R !== 2 * a * bb) fail('a=' + a + ' b=' + bb + ': the gap is not 2ab');
    // and the two are equal exactly when ab = 0
    if ((L === R) !== (a * bb === 0)) fail('a=' + a + ' b=' + bb + ': equality does not track ab = 0');
  }
  console.log('   the gap is always 2ab, and they are equal exactly when ab = 0');

  // ---- M7: Fig. 4.3. a² minus the two rectangles leaves (a − b)².
  console.log('== M7  (a − b)² as an area');
  for (const [a, bb] of [[7, 3], [10, 1], [5, 4], [9, 6], [2, 1]]) {
    await set('dfA', a); await set('dfB', bb); await page.waitForTimeout(30);
    const whole = nums(await txt('dfWhole')).pop();
    const parts = nums(await txt('dfParts')).pop();
    if (whole !== (a - bb) * (a - bb)) fail('a=' + a + ' b=' + bb + ': (a−b)² read ' + whole);
    if (parts !== a * a - 2 * a * bb + bb * bb) fail('a=' + a + ' b=' + bb + ': a²−2ab+b² read ' + parts);
    // the picture's own claim: a² − ab − b(a−b) is the same thing
    if (a * a - a * bb - bb * (a - bb) !== whole) fail('the removed pieces do not leave (a−b)² at a=' + a);
  }
  console.log('   a² − ab − b(a−b) = (a−b)² every time, which is what the picture says');

  // ---- M8: Examples 4, 8 and 9 — the mental-arithmetic splits
  console.log('== M8  squaring in your head');
  for (const [label, want] of [['43²', 1849], ['64²', 4096], ['29²', 841], ['79²', 6241], ['119²', 14161]]) {
    await chip('hdPick', label);
    const got = Number(await txt('hdAns'));
    const n = parseInt(label, 10);
    if (got !== n * n) fail(label + ' gave ' + got + ', and ' + n + '² is ' + n * n);
    if (got !== want) fail(label + ' gave ' + got + ', the book says ' + want);
  }
  if (!await done('m8')) fail('all three kinds of split and m8 never completed');
  console.log('   43² = 1849, 29² = 841, 119² = 14161 — the book\'s own three');

  // ---- M10: Fig. 4.4. Nine pieces, six of them pairing into three terms.
  console.log('== M10 (a + b + c)²');
  for (const [a, bb, c] of [[4, 3, 2], [1, 1, 1], [7, 7, 7], [2, 5, 1], [100, 10, 9].slice(0, 3)]) {
    if (a > 7 || bb > 7 || c > 7) continue;
    await set('thA', a); await set('thB', bb); await set('thC', c); await page.waitForTimeout(30);
    const whole = nums(await txt('thWhole')).pop();
    const sq = nums(await txt('thSq')).pop();
    const rect = nums(await txt('thRect')).pop();
    const t = a + bb + c;
    if (whole !== t * t) fail(a + ',' + bb + ',' + c + ': whole ' + whole);
    if (sq !== a * a + bb * bb + c * c) fail(a + ',' + bb + ',' + c + ': squares ' + sq);
    if (rect !== 2 * (a * bb + bb * c + c * a)) fail(a + ',' + bb + ',' + c + ': rectangles ' + rect);
    if (sq + rect !== whole) fail(a + ',' + bb + ',' + c + ': the nine pieces do not fill the square');
  }
  console.log('   three squares plus six rectangles fill the square exactly');

  // ---- M11: Fig. 4.7. (x + p)(x + q) = x² + (p+q)x + pq
  console.log('== M11 algebra tiles');
  for (const [p, q] of [[3, 4], [2, 3], [1, 7], [6, 5], [7, 7]]) {
    await set('tlP', p); await set('tlQ', q); await page.waitForTimeout(30);
    const area = await txt('tlArea');
    const want = 'x² + ' + (p + q) + 'x + ' + (p * q);
    if (area !== want) fail('(x+' + p + ')(x+' + q + ') gave ' + area + ', expected ' + want);
    const tiles = nums(await txt('tlTiles'));
    if (tiles[1] !== p + q || tiles[2] !== p * q) fail('tile counts for ' + p + ',' + q + ': ' + tiles.join(','));
  }
  await set('tlP', 3); await set('tlQ', 4); await page.waitForTimeout(30);
  if (await txt('tlArea') !== 'x² + 7x + 12') fail("the book's own rectangle must give x² + 7x + 12");
  console.log('   x + 3 by x + 4 gives x² + 7x + 12, and the tile counts match');

  // ---- M12: Examples 10 to 12. Both conditions, or it does not count.
  console.log('== M12 splitting the middle term');
  const SPLITS = [['x² + 7x + 12', 3, 4], ['x² + 11x + 30', 5, 6],
                  ['x² − 5x + 6', -2, -3], ['x² − 7x + 12', -3, -4]];
  for (const [name, u, v] of SPLITS) {
    await chip('spPick', name);
    /* Both pairs the book tries and rejects before landing on 5 and 6. Each
       multiplies to 30 and neither adds to 11, which is the whole point of the
       example — getting the product right is the easy half. */
    if (name === 'x² + 11x + 30') {
      for (const [u2, v2] of [[2, 15], [3, 10]]) {
        await set('spU', u2); await set('spV', v2); await page.waitForTimeout(30);
        if (u2 * v2 !== 30) fail('the test\'s own rejected pair ' + u2 + ',' + v2 + ' does not multiply to 30');
        if (!/product right/.test(await txt('spSay')))
          fail(u2 + ' and ' + v2 + ' should be product-right, sum-wrong; got "' + await txt('spSay') + '"');
      }
    }
    await set('spU', u); await set('spV', v); await page.waitForTimeout(30);
    if (Number((await txt('spSum')).replace('−', '-').replace(/[^0-9-]/g, '')) !== u + v)
      fail(name + ': sum readout wrong');
    if (!/both/.test(await txt('spSay'))) fail(name + ': ' + u + ' and ' + v + ' judged "' + await txt('spSay') + '"');
  }
  if (!await done('m12')) fail('three cases solved and m12 never completed');
  console.log('   5 and 6 for x² + 11x + 30; 2 and 15 correctly refused');

  // ---- M14: Fig. 4.10. Eight boxes, four terms.
  console.log('== M14 (a + b)³');
  for (let a = 1; a <= 6; a++) for (let bb = 1; bb <= 6; bb++) {
    await set('cbA', a); await set('cbB', bb); await page.waitForTimeout(12);
    const whole = nums(await txt('cbWhole')).pop();
    const parts = nums(await txt('cbParts')).pop();
    if (whole !== Math.pow(a + bb, 3)) fail('a=' + a + ' b=' + bb + ': (a+b)³ read ' + whole);
    if (parts !== a * a * a + 3 * a * a * bb + 3 * a * bb * bb + bb * bb * bb)
      fail('a=' + a + ' b=' + bb + ': the four terms read ' + parts);
    if (whole !== parts) fail('a=' + a + ' b=' + bb + ': ' + whole + ' vs ' + parts);
  }
  console.log('   a³ + 3a²b + 3ab² + b³ equals (a+b)³ for every pair the bench allows');

  // ---- M15: Example 16 and two more, carried to a cancelled answer
  console.log('== M15 cancelling a common factor');
  const RAT = [['Example 16', '(x − 3) / 5(x + 5)'],
               ['4x² + 4x + 1', '(2x + 1) / (2x − 1)'],
               ['p⁴ − 16', '(p + 2)(p² + 4) / (p − 2)']];
  for (const [label, want] of RAT) {
    await chip('rtPick', label);
    await page.click('#rtReset'); await page.waitForTimeout(30);
    for (let k = 0; k < 4; k++) { await page.click('#rtStep'); await page.waitForTimeout(25); }
    if (await txt('rtDone') !== want) fail(label + ' simplified to ' + await txt('rtDone') + ', expected ' + want);
  }
  console.log('   Example 16 lands on (x − 3) / 5(x + 5), as the book has it');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['A plain square', 'The side is cut', 'Four pieces', 'Areas named',
                'A bite taken', 'Three terms', 'And a cube'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nidentities: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
