const { browser, BASE } = require('../lib');

/* Chapter 5 of Ganita Manjari — the circle chapter, which is twelve theorems
   and almost no arithmetic. That makes it the easiest chapter to fake and the
   hardest to check: a bench can draw a convincing picture and still be lying
   about the angle it has written on it.

   So every expected value here is computed from the geometry independently —
   chord = 2√(r² − d²), the inscribed angle as half the central one, the
   circumcentre from the perpendicular bisectors — and the named cases come off
   the printed page: Exercise Set 5.5's r = 13 / d = 5, the 15-and-9 and the
   16-and-6 pairs, Q9's 2√13, the 70°-becomes-35° arc, and the cyclic
   quadrilaterals of Q6, Q7 and Q8. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'circles-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt = id => page.textContent('#' + id).then(s => s.trim());
  const set = async (id, v) => page.$eval('#' + id, (n, v) => {
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  /* readouts are written with a real minus sign and a degree mark */
  const num = s => Number(String(s).replace(/−/g, '-').replace(/[^0-9.\-]/g, ''));
  const near = (a, c, tol) => Math.abs(a - c) <= (tol === undefined ? 0.01 : tol);
  const D = n => n * Math.PI / 180;

  // ---- M1: the definition is about distance and nothing else
  console.log('== M1  the locus of one distance');
  const RAD = 5;
  for (const d of [0, 1, 4, 5, 6, 9, 10]) {
    await set('lcD', d);
    for (const t of [0, 90, 217, 359]) {
      await set('lcT', t); await page.waitForTimeout(12);
      const want = d === RAD ? 'on the circle' : d < RAD ? 'inside it' : 'outside it';
      const got = await txt('lcSay');
      if (got !== want) fail('d = ' + d + ' at ' + t + '° read "' + got + '", expected "' + want + '"');
    }
  }
  if (!await done('m1')) fail('inside, on and outside all visited and m1 never completed');
  console.log('   the verdict tracks distance alone — direction never changes it');

  // ---- M4: every centre on the perpendicular bisector, radius √(4² + k²)
  console.log('== M4  circles through two points');
  for (const k of [-8, -5, -3, 0, 3, 5, 8]) {
    await set('twK', k); await page.waitForTimeout(20);
    const want = Math.sqrt(16 + k * k);
    const got = num(await txt('twR'));
    if (!near(got, Math.round(want * 100) / 100)) fail('k = ' + k + ': radius read ' + got + ', expected ' + want.toFixed(2));
  }
  await set('twK', 0); await page.waitForTimeout(20);
  if (!near(num(await txt('twR')), 4)) fail('at k = 0 the radius must be 4, half of AB');
  await set('twK', 3); await page.waitForTimeout(20);
  if (!near(num(await txt('twR')), 5)) fail('k = 3 with half-chord 4 is the 3-4-5 triangle: radius 5');
  console.log('   radius = √(4² + k²); smallest at k = 0, where AB is the diameter');

  // ---- M5: three points, one circle — and the circumcentre computed here too
  console.log('== M5  the circumcircle');
  const A = [-5, -2], B = [5, -2];
  const circum = (a, p, c) => {
    const d = 2 * (a[0] * (p[1] - c[1]) + p[0] * (c[1] - a[1]) + c[0] * (a[1] - p[1]));
    if (Math.abs(d) < 1e-9) return null;
    const q = v => v[0] * v[0] + v[1] * v[1];
    return [(q(a) * (p[1] - c[1]) + q(p) * (c[1] - a[1]) + q(c) * (a[1] - p[1])) / d,
            (q(a) * (c[0] - p[0]) + q(p) * (a[0] - c[0]) + q(c) * (p[0] - a[0])) / d];
  };
  const CASES = [
    [0, 5, 'acute-angled', 'inside the triangle'],
    [-5, 5, 'right-angled', 'on the hypotenuse'],
    [5, 8, 'right-angled', 'on the hypotenuse'],
    [0, -1, 'obtuse-angled', 'outside the triangle'],
    [3, -1, 'obtuse-angled', 'outside the triangle']
  ];
  for (const [x, y, kind, where] of CASES) {
    await set('ccX', x); await set('ccY', y); await page.waitForTimeout(30);
    if (await txt('ccKind') !== kind) fail('C(' + x + ',' + y + ') called "' + await txt('ccKind') + '", expected ' + kind);
    if (await txt('ccWhere') !== where) fail('C(' + x + ',' + y + ') centre "' + await txt('ccWhere') + '", expected ' + where);
    const O = circum(A, B, [x, y]);
    const shown = (await txt('ccO')).replace(/−/g, '-').match(/-?[\d.]+/g).map(Number);
    if (!near(shown[0], Math.round(O[0] * 10) / 10, 0.06) || !near(shown[1], Math.round(O[1] * 10) / 10, 0.06))
      fail('C(' + x + ',' + y + '): centre read (' + shown + '), computed (' + O.map(v => v.toFixed(2)) + ')');
    /* the defining property, checked rather than assumed */
    const rr = [A, B, [x, y]].map(p => Math.hypot(p[0] - O[0], p[1] - O[1]));
    if (!near(rr[0], rr[1], 1e-6) || !near(rr[1], rr[2], 1e-6))
      fail('C(' + x + ',' + y + '): the centre is not equidistant from all three');
  }
  /* the case with no answer: C on the line AB */
  for (const x of [-3, 0, 4]) {
    await set('ccX', x); await set('ccY', -2); await page.waitForTimeout(30);
    if (await txt('ccKind') !== 'not a triangle') fail('C(' + x + ',−2) is collinear with A and B');
    if (await txt('ccO') !== 'there is none') fail('collinear points must have no circumcentre');
  }
  if (!await done('m5')) fail('acute, right and obtuse all visited and m5 never completed');
  console.log('   acute inside, right on the hypotenuse, obtuse outside — collinear, none at all');

  // ---- M7: Theorems 2 and 3. chord = 2R sin(θ/2), and position never matters.
  console.log('== M7  equal chords, equal angles');
  const R7 = 10, ch = a => 2 * R7 * Math.sin(D(a / 2));
  for (const [a, bb] of [[80, 80], [40, 40], [170, 170], [60, 120], [30, 150], [100, 45]]) {
    await set('eqA', a); await set('eqB', bb);
    for (const p of [200, 250, 300, 340]) {
      await set('eqP', p); await page.waitForTimeout(15);
      const la = num(await txt('eqLenA')), lb = num(await txt('eqLenB'));
      if (!near(la, Math.round(ch(a) * 100) / 100)) fail(a + '°: AB read ' + la + ', expected ' + ch(a).toFixed(2));
      if (!near(lb, Math.round(ch(bb) * 100) / 100)) fail(bb + '° at ' + p + '°: DE read ' + lb + ', expected ' + ch(bb).toFixed(2));
      const say = await txt('eqSay');
      const want = a === bb ? 'equal' : (ch(a) > ch(bb) ? 'AB is longer' : 'DE is longer');
      if (say !== want) fail(a + '° vs ' + bb + '° judged "' + say + '", expected "' + want + '"');
    }
  }
  /* the book's own: a 60° angle at the centre gives a chord equal to the radius */
  await set('eqA', 60); await set('eqB', 60); await page.waitForTimeout(30);
  if (!near(num(await txt('eqLenA')), R7)) fail('a 60° central angle must give a chord equal to the radius');
  if (!await done('m7')) fail('equal, unequal and turned round all visited and m7 never completed');
  console.log('   chord = 2R sin(θ/2); 60° gives a chord of exactly r, at every position');

  // ---- M8: Theorem 4. The halves stay equal and the angle stays 90°.
  console.log('== M8  centre to midpoint');
  for (const s of [20, 60, 90, 120, 175]) {
    await set('pmS', s);
    for (const p of [0, 90, 180, 270, 359]) {
      await set('pmP', p); await page.waitForTimeout(15);
      if (await txt('pmAng') !== '90°') fail('span ' + s + '° at ' + p + '°: angle at M read ' + await txt('pmAng'));
      const half = R7 * Math.sin(D(s / 2)), om = R7 * Math.cos(D(s / 2));
      if (!near(num(await txt('pmHalf')), Math.round(half * 100) / 100))
        fail('span ' + s + '°: half-chord read ' + await txt('pmHalf') + ', expected ' + half.toFixed(2));
      if (!near(num(await txt('pmDist')), Math.round(om * 100) / 100))
        fail('span ' + s + '°: OM read ' + await txt('pmDist') + ', expected ' + om.toFixed(2));
      /* the right triangle has to close, or the picture is wrong */
      if (!near(half * half + om * om, R7 * R7, 1e-6)) fail('the test\'s own triangle does not close at ' + s + '°');
    }
  }
  await set('pmS', 60); await set('pmP', 90); await page.waitForTimeout(30);
  if (!near(num(await txt('pmHalf')), 5)) fail('a 60° chord of radius 10 has halves of 5');
  if (!await done('m8')) fail('five placings and m8 never completed');
  console.log('   AM = MB and OM² + AM² = r², at every span and every position');

  // ---- M9: Exercise Set 5.5 and the end-of-chapter numbers
  console.log('== M9  chord length against distance');
  const BOOK = [[13, 5, 24], [15, 9, 24], [10, 6, 16], [13, 12, 10], [7, 6, 2 * Math.sqrt(13)]];
  for (const [r, d, want] of BOOK) {
    if (2 * Math.sqrt(r * r - d * d) - want > 1e-9) fail('the test\'s own value for r=' + r + ' d=' + d + ' is wrong');
    await set('cdR', r); await set('cdD', d); await page.waitForTimeout(25);
    const got = num(await txt('cdLen'));
    if (!near(got, Math.round(want * 1000) / 1000, 0.002)) fail('r=' + r + ' d=' + d + ': chord read ' + got + ', book says ' + want);
  }
  /* the three degenerate readings the theorems hang on */
  await set('cdR', 13); await set('cdD', 0); await page.waitForTimeout(25);
  if (!near(num(await txt('cdLen')), 26)) fail('at d = 0 the chord must be the diameter, 26');
  await set('cdD', 13); await page.waitForTimeout(25);
  if (await txt('cdLen') !== '0') fail('at d = r the chord has length 0, read ' + await txt('cdLen'));
  await set('cdD', 15); await page.waitForTimeout(25);
  if (await txt('cdLen') !== 'no chord') fail('at d > r there is no chord, read ' + await txt('cdLen'));
  /* Theorem 8: further out is always shorter */
  await set('cdR', 16); let prev = Infinity;
  for (let d = 0; d <= 16; d++) {
    await set('cdD', d); await page.waitForTimeout(10);
    const L = num(await txt('cdLen'));
    if (!(L < prev)) fail('pushing the chord from ' + (d - 1) + ' to ' + d + ' did not shorten it');
    prev = L;
  }
  if (!await done('m9')) fail('diameter, chord, point and miss all seen and m9 never completed');
  console.log('   24, 24, 16 and 2√13 as printed; 26 at the centre, 0 at the rim, none beyond');

  // ---- M11: the two arcs always come to 360°
  console.log('== M11 major arc, minor arc');
  for (const s of [10, 90, 179, 180, 181, 270, 350]) {
    await set('arS', s); await page.waitForTimeout(25);
    for (const flip of [false, true]) {
      if (flip) { await page.click('#arSwap'); await page.waitForTimeout(25); }
      const v = num(await txt('arAng'));
      const want = flip ? 360 - s : s;
      if (v !== want) fail('separation ' + s + (flip ? ' (other way)' : '') + ': arc read ' + v);
      const kind = await txt('arKind');
      const wantKind = want === 180 ? 'a semicircle' : want < 180 ? 'minor arc' : 'major arc';
      if (kind !== wantKind) fail('an arc of ' + want + '° called "' + kind + '"');
      if (v + num(await txt('arOther')) !== 360) fail('the two arcs at ' + s + '° do not add to 360°');
    }
    await page.click('#arSwap'); await page.waitForTimeout(25);   // back to following the s-arc
  }
  if (!await done('m11')) fail('minor, major and semicircle all seen and m11 never completed');
  console.log('   minor + major = 360°, and at 180° neither is either — both are semicircles');

  // ---- M12: Theorem 9. Half, and unmoved by where P sits.
  console.log('== M12 the centre sees double');
  for (const s of [20, 70, 100, 180, 240, 300]) {
    await set('dbS', s);
    const seenAtP = new Set();
    for (const t of [0, 20, 50, 80, 100]) {
      await set('dbP', t); await page.waitForTimeout(20);
      if (num(await txt('dbCen')) !== s) fail('arc ' + s + '°: centre angle read ' + await txt('dbCen'));
      seenAtP.add(await txt('dbPt'));
    }
    if (seenAtP.size !== 1) fail('arc ' + s + '°: the angle at P changed as P moved — ' + [...seenAtP].join(', '));
    if (num([...seenAtP][0]) !== s / 2) fail('arc ' + s + '°: P should see ' + (s / 2) + '°, read ' + [...seenAtP][0]);
  }
  /* the printed case: an arc of 70° at the centre is 35° on the circle */
  await set('dbS', 70); await set('dbP', 50); await page.waitForTimeout(30);
  if (await txt('dbPt') !== '35°') fail('a 70° arc must subtend 35° on the circle, read ' + await txt('dbPt'));
  if (!await done('m12')) fail('five positions for P and m12 never completed');
  console.log('   always exactly half, and the same half wherever P is put — 70° gives 35°');

  // ---- M13: the corollary, measured off the coordinates rather than asserted
  console.log('== M13 the angle in a semicircle');
  for (let p = 8; p <= 172; p += 4) {
    await set('smP', p); await page.waitForTimeout(8);
    if (await txt('smAng') !== '90°') fail('D at ' + p + '°: ∠ADB read ' + await txt('smAng'));
    if (await txt('smCen') !== '180°') fail('the diameter must subtend 180° at the centre');
  }
  if (!await done('m13')) fail('five positions for D and m13 never completed');
  console.log('   ∠ADB is 90° at all 42 positions tried, measured from the points themselves');

  // ---- M14: Theorem 10, and Q6/Q7's numbers
  console.log('== M14 opposite angles of a cyclic quadrilateral');
  for (const b14 of [20, 60, 110]) for (const c14 of [130, 180, 230]) for (const d14 of [250, 300, 340]) {
    await set('cyB', b14); await set('cyC', c14); await set('cyD', d14);
    await page.waitForTimeout(12);
    const ac = (await txt('cyAC')).replace(/−/g, '-').match(/[\d.]+/g).map(Number);
    const bd = (await txt('cyBD')).replace(/−/g, '-').match(/[\d.]+/g).map(Number);
    /* computed here from the arcs, not read back off the bench */
    const wantA = (d14 - b14) / 2, wantC = (360 - d14 + b14) / 2;
    const wantB = (360 - c14) / 2, wantD = c14 / 2;
    if (ac[0] !== Math.round(wantA) || ac[1] !== Math.round(wantC))
      fail(b14 + '/' + c14 + '/' + d14 + ': ∠A+∠C shown ' + ac.join('+') + ', expected ' + wantA + '+' + wantC);
    if (bd[0] !== Math.round(wantB) || bd[1] !== Math.round(wantD))
      fail(b14 + '/' + c14 + '/' + d14 + ': ∠B+∠D shown ' + bd.join('+') + ', expected ' + wantB + '+' + wantD);
    if (ac[0] + ac[1] !== 180 || bd[0] + bd[1] !== 180)
      fail(b14 + '/' + c14 + '/' + d14 + ': a pair did not add to 180°');
  }
  /* Q6: ∠A = 75° so ∠C = 105°.  Q7: ∠B = 110° so ∠D = 70°. */
  await set('cyB', 110); await set('cyC', 140); await set('cyD', 260); await page.waitForTimeout(30);
  if ((await txt('cyAC')) !== '75° + 105°') fail('∠A = 75° must give ∠C = 105°, shown ' + await txt('cyAC'));
  if ((await txt('cyBD')) !== '110° + 70°') fail('∠B = 110° must give ∠D = 70°, shown ' + await txt('cyBD'));
  if (!await done('m14')) fail('six shapes tried and m14 never completed');
  console.log('   both pairs pinned at 180°; 75° → 105° and 110° → 70°, as Q6 and Q7 have them');

  // ---- the graded tables must be answerable, and the answers must be the book's
  console.log('== M10 and M15  the tables');
  const tables = await page.evaluate(() => ({
    g10: [...document.querySelectorAll('#g10 select')].length,
    g15: [...document.querySelectorAll('#g15 select')].length,
    o10: [...document.querySelectorAll('#g10 select')].map(s => [...s.options].map(o => o.value)),
    o15: [...document.querySelectorAll('#g15 select')].map(s => [...s.options].map(o => o.value))
  }));
  if (tables.g10 !== 5) fail('the chord table should have 5 blanks, has ' + tables.g10);
  if (tables.g15 !== 6) fail('the angle table should have 6 blanks, has ' + tables.g15);
  const WANT10 = ['24', '5', '24', '10', '2√13'];
  const WANT15 = ['35°', '105°', '70°', '38', '86°', '80°'];
  WANT10.forEach((v, i) => { if (!tables.o10[i].includes(v)) fail('chord table blank ' + (i + 1) + ' cannot be answered ' + v); });
  WANT15.forEach((v, i) => { if (!tables.o15[i].includes(v)) fail('angle table blank ' + (i + 1) + ' cannot be answered ' + v); });
  for (const [tbl, btn, want, mid] of [['g10', 'g10check', WANT10, 'm10'], ['g15', 'g15check', WANT15, 'm15']]) {
    await page.$$eval('#' + tbl + ' select', (ns, w) => ns.forEach((n, i) => {
      n.value = w[i]; n.dispatchEvent(new Event('change', { bubbles: true }));
    }), want);
    await page.click('#' + btn); await page.waitForTimeout(120);
    if (!await done(mid)) fail(mid + ' did not complete on the book\'s own answers: ' + await txt(tbl.replace('g', 'g') + 's'));
  }
  console.log('   24, 5, 24, 10, 2√13 — and 35°, 105°, 70°, x = 38, 86°, 80°');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['Scattered points', 'All at one distance', 'Centre and radius', 'A chord',
                'The perpendicular', 'An arc, and its angle', 'Four on one circle'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\ncircles: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
