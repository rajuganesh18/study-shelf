const { browser, BASE } = require('../lib');

/* Chapter 3 of Ganita Manjari. Every expected value is worked from the printed
   page: the Ishango bone's prime column, Brahmagupta's three rules for zero and
   five laws for signs, the spice trader's week, 3/4 and 9/4 on the line, the
   chain of averages between 1 and 2, the proof steps for √2, Examples 5 to 9
   for repeating decimals, and Exercise Set 3.5's terminating/repeating cases.

   Where the chapter computes something the test can compute independently — a
   decimal expansion, a lowest-terms fraction — the test does its own arithmetic
   rather than reading the bench's answer and agreeing with it. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'numbers-chapter.html');
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
  const money = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10) * (/−/.test(s) ? -1 : 1);

  // ---- M1: one-to-one correspondence. Pebbles left = cows still out.
  console.log('== M1  one pebble per cow');
  for (const [out, back] of [[7, 7], [7, 4], [12, 0], [1, 1], [9, 8]]) {
    await set('cwOut', out); await set('cwBack', back); await page.waitForTimeout(35);
    const want = out - back;
    if (parseInt(await txt('cwPeb'), 10) !== want) fail(out + ' out, ' + back + ' back: ' + await txt('cwPeb') + ' pebbles, expected ' + want);
    const say = await txt('cwSay');
    if ((want === 0) !== (say === 'all safe')) fail(out + '/' + back + ': the pot says "' + say + '"');
  }
  console.log('   pebbles left always equal cows still out, and an empty pot means a whole herd');

  // ---- M2: Fig. 3.1. The prime column is 11, 13, 17, 19 and nothing else.
  console.log('== M2  the Ishango bone');
  await chip('bnPick', 'Prime column');
  const groups = (await txt('bnGroups')).split(',').map(s => +s.trim());
  const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  if (groups.join(',') !== '11,13,17,19') fail('the prime column reads ' + groups.join(', '));
  if (!groups.every(isPrime)) fail('a number in the prime column is not prime: ' + groups.join(', '));
  // and nothing prime between 10 and 20 is missing
  for (let n = 10; n < 20; n++) if (isPrime(n) && !groups.includes(n)) fail(n + ' is prime and missing from the column');
  await chip('bnPick', 'Doubling column');
  if (!/doubling/.test(await txt('bnPat'))) fail('the doubling column is described as ' + await txt('bnPat'));
  console.log('   the prime column is exactly the primes between 10 and 20');

  // ---- M3: Brahmagupta's three rules for zero
  console.log('== M3  a + 0, a − 0, a × 0');
  for (const a of [7, -9, 0, 5]) {
    await set('zrA', a); await page.waitForTimeout(30);
    for (const [btn, want] of [['zrAdd', a], ['zrSub', a], ['zrMul', 0]]) {
      await page.click('#' + btn); await page.waitForTimeout(30);
      const got = (await txt('zrRes')).replace('−', '-');
      if (parseInt(got, 10) !== want) fail('a=' + a + ' via ' + btn + ': ' + got + ', expected ' + want);
    }
  }
  if (!await done('m3')) fail('all three rules seen and m3 never completed');
  console.log('   adding and subtracting zero change nothing; multiplying by it collapses everything');

  // ---- M5: Exercise Set 3.2 Q2 — the spice trader's week
  console.log('== M5  the spice trader');
  await page.click('#ldReset'); await page.waitForTimeout(40);
  const LEDGER = [0, -850, 350, -100];
  for (let k = 0; k < LEDGER.length; k++) {
    if (k) { await page.click('#ldStep'); await page.waitForTimeout(40); }
    const got = money(await txt('ldBal'));
    if (got !== LEDGER[k]) fail('after event ' + k + ': ' + await txt('ldBal') + ', expected ' + LEDGER[k]);
    const kind = await txt('ldKind');
    const wantKind = LEDGER[k] > 0 ? /fortune/ : LEDGER[k] < 0 ? /debt/ : /zero/;
    if (!wantKind.test(kind)) fail('at ' + LEDGER[k] + ' the sign reads "' + kind + '"');
  }
  console.log('   (−850) + 1200 + (−450) = −100, and the week ends in debt');

  // ---- M7: the Think and Reflect. Removing debts must enrich you.
  console.log('== M7  a debt times a debt');
  for (const [n, want] of [[4, 12], [-4, -12], [0, 0], [6, 18], [-2, -6]]) {
    await set('dbN', n); await page.waitForTimeout(30);
    if (money(await txt('dbNet')) !== want) fail('removing ' + n + ' debts of ₹3: ' + await txt('dbNet') + ', expected ₹' + want);
  }
  await set('dbN', 4); await page.waitForTimeout(30);
  if (money(await txt('dbNet')) !== 12) fail("the book's own case (−3) × (−4) must give +12");
  console.log('   (−3) × (−4) = +12 and (−3) × 4 = −12, both by removing or taking on debt');

  // ---- M9: Figs. 3.5 and 3.6 — placing p/q
  console.log('== M9  p/q on the number line');
  const PLACE = [
    [3, 4, '3/4', '0 and 1'],
    [9, 4, '9/4', '2 and 3'],
    [-7, 4, '−7/4', '−2 and −1'],
    [8, 5, '8/5', '1 and 2'],
    [5, 1, '5', 'exactly on 5']
  ];
  for (const [p, q, val, between] of PLACE) {
    await set('pqP', p); await set('pqQ', q); await page.waitForTimeout(35);
    if (await txt('pqVal') !== val) fail(p + '/' + q + ' reads ' + await txt('pqVal') + ', expected ' + val);
    if (await txt('pqBetween') !== between) fail(p + '/' + q + ' lies ' + await txt('pqBetween') + ', expected ' + between);
  }
  await set('pqP', 9); await set('pqQ', 4); await page.waitForTimeout(35);
  if (await txt('pqMixed') !== '2 and 1/4') fail('9/4 should be 2 and 1/4, got ' + await txt('pqMixed'));
  console.log('   3/4 between 0 and 1, 9/4 as 2 and 1/4, and −7/4 the same distance the other way');

  // ---- M10: equivalent fractions all name one point
  console.log('== M10 equivalent fractions');
  await chip('eqPick', '12/30');
  if (await txt('eqLow') !== '2/5') fail('12/30 should reduce to 2/5, got ' + await txt('eqLow'));
  await chip('eqPick', '−1/2');
  for (const [k, want] of [[1, '−1/2'], [3, '−3/6'], [6, '−6/12'], [9, '−9/18']]) {
    await set('eqK', k); await page.waitForTimeout(30);
    if (await txt('eqNow') !== want) fail('−1/2 times ' + k + ' reads ' + await txt('eqNow') + ', expected ' + want);
    if (await txt('eqLow') !== '−1/2') fail('the lowest form moved to ' + await txt('eqLow'));
  }
  console.log('   many names, one number — and the lowest form never budges');

  // ---- M11: the density chain of Section 3.4.2
  console.log('== M11 always one in between');
  await page.click('#dnReset'); await page.waitForTimeout(40);
  // 1 and 2 → 3/2 → 5/4 → 9/8 → 17/16 → 33/32
  const CHAIN = ['3/2', '5/4', '9/8', '17/16', '33/32'];
  for (const want of CHAIN) {
    if (await txt('dnMid') !== want) fail('the next average reads ' + await txt('dnMid') + ', expected ' + want);
    await page.click('#dnStep'); await page.waitForTimeout(40);
  }
  if (!await done('m11')) fail('five insertions and m11 never completed');
  console.log('   1 and 2 → 3/2 → 5/4 → 9/8 → 17/16 → 33/32, halving and never closing');

  // ---- M14: Examples 5 to 9, plus 0.999… = 1
  console.log('== M14 repeating decimal → p/q');
  const REPEAT = [['0.6…', '2/3'], ['0.45…', '5/11'], ['0.16…', '1/6'],
                  ['2.357…', '1061/450'], ['0.9…', '1']];
  for (const [label, want] of REPEAT) {
    await chip('rpPick', label);
    await page.click('#rpReset'); await page.waitForTimeout(30);
    for (let k = 0; k < 5; k++) { await page.click('#rpStep'); await page.waitForTimeout(25); }
    if (await txt('rpFrac') !== want) fail(label + ' gave ' + await txt('rpFrac') + ', expected ' + want);
  }
  console.log('   2/3, 5/11, 1/6, 1061/450 — and 0.999… lands exactly on 1');

  // ---- M15: Exercise Set 3.5 Q1 and Q11, and the prime-factor rule itself
  console.log('== M15 terminating or repeating');
  const factorise = n => { const o = []; for (let d = 2; d * d <= n; d++) while (n % d === 0) { o.push(d); n /= d; } if (n > 1) o.push(n); return o; };
  const gcd = (a, c) => { while (c) { [a, c] = [c, a % c]; } return a || 1; };
  for (const [p, q] of [[7, 20], [4, 15], [13, 250], [18, 125], [1, 7]]) {
    await chip('tmPick', p + '/' + q);
    const g = gcd(p, q), lq = q / g;
    const only25 = factorise(lq).every(f => f === 2 || f === 5);
    const want = only25 ? 'terminating' : 'repeating';
    const got = await txt('tmSay');
    if (!got.startsWith(want)) fail(p + '/' + q + ' judged "' + got + '", expected ' + want);
  }
  // 1/7's block is six digits and is the cyclic number 142857
  await chip('tmPick', '1/7');
  if (!/142857/.test(await txt('tmDec'))) fail('1/7 should show the block 142857, got ' + await txt('tmDec'));
  if (await txt('tmSay') !== 'repeating, block of 6') fail('1/7 block length: ' + await txt('tmSay'));
  // 142857 really is cyclic: every multiple 1..6 is a rotation of it
  const rotations = new Set();
  for (let i = 0; i < 6; i++) rotations.add(('142857'.slice(i) + '142857'.slice(0, i)));
  for (let k = 1; k <= 6; k++) {
    if (!rotations.has(String(142857 * k))) fail('142857 × ' + k + ' = ' + (142857 * k) + ', which is not a rotation');
  }
  // and the rule holds across the slider's whole range, checked independently
  for (let q = 2; q <= 40; q++) {
    await set('tmP', 1); await set('tmQ', q); await page.waitForTimeout(12);
    const lq = q / gcd(1, q);
    const only25 = factorise(lq).every(f => f === 2 || f === 5);
    const got = await txt('tmSay');
    const ok = only25 ? got.startsWith('terminating') : got.startsWith('repeating') || got === 'a whole number';
    if (!ok) fail('1/' + q + ' judged "' + got + '"');
  }
  console.log('   7/20 and 13/250 terminate, 4/15 repeats, and 142857 is cyclic for every multiple to 6');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['Notches', 'Natural numbers', 'Śūnya arrives', 'Integers',
                'Rationals', 'Irrationals', 'The real line'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nnumbers: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
