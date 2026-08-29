const { browser, BASE } = require('../lib');

/* Chapter 6 of Ganita Manjari — perimeter, π and area.

   The chapter has an unusual hazard: almost every number in it is irrational,
   so a bench can be wrong by a whisker and still look right. Every expected
   value here is therefore computed from the geometry rather than read off the
   page, and the named cases come from the printed text: Archimedes' 96-gon
   bracket, the 400 m track's own arithmetic, Exercise Set 6.1's lengths,
   Heron's three worked examples, and the end-of-chapter areas.

   Note the two different π. The benches measure with the real constant; the
   exercise tables use 22/7 because the exercise set says to. Where the book
   quotes a rounded answer the test checks the exact value rounds to it, rather
   than pretending the bench should be rounded too. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'perimeter-chapter.html');
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
    await page.waitForTimeout(50);
  };
  const num = s => Number(String(s).replace(/−/g, '-').replace(/[^0-9.\-]/g, ''));
  const near = (a, c, tol) => Math.abs(a - c) <= (tol === undefined ? 0.011 : tol);
  const PI = Math.PI;

  // ---- M1: the perimeter is the sum of the sides, for four different shapes
  console.log('== M1  the walk around the border');
  const SHAPES = [
    ['Square', 4], ['Rectangle', 5], ['Triangle', 3],
    ['L-shape', 5.8]
  ];
  for (const [name, k] of SHAPES) {
    await chip('pwPick', name);
    for (const s of [2, 5, 7, 10]) {
      await set('pwSide', s); await page.waitForTimeout(12);
      const got = num(await txt('pwPeri'));
      if (!near(got, Math.round(k * s * 100) / 100)) fail(name + ' side ' + s + ': perimeter ' + got + ', expected ' + (k * s));
    }
    /* the walk must reach exactly the perimeter, and half of it at 50% */
    await set('pwSide', 6); await set('pwWalk', 100); await page.waitForTimeout(20);
    if (!near(num(await txt('pwDist')), Math.round(k * 6 * 100) / 100)) fail(name + ': a full walk is not the perimeter');
    await set('pwWalk', 50); await page.waitForTimeout(20);
    if (!near(num(await txt('pwDist')), Math.round(k * 3 * 100) / 100, 0.02)) fail(name + ': half a walk is not half the perimeter');
  }
  if (!await done('m1')) fail('four shapes walked and m1 never completed');
  console.log('   4a, 5a, 3a and the L-shape\'s six sides, at every size');

  // ---- M2: perimeter ÷ side is a property of the shape, not the size
  console.log('== M2  the ratio that refuses to move');
  for (const [name, k] of [['Square', 4], ['Equilateral', 3], ['Long rectangle', 6]]) {
    await chip('rtPick', name);
    for (const s of [2, 5, 9]) {
      await set('rtS', s); await page.waitForTimeout(15);
      if (await txt('rtRatio') !== k + ' : 1') fail(name + ': ratio read ' + await txt('rtRatio') + ', expected ' + k + ' : 1');
      const big = (await txt('rtBig')).replace(/\s/g, '');
      if (big !== (k * s) + '÷' + s + '=' + k) fail(name + ' at side ' + s + ': shown "' + big + '"');
    }
  }
  if (!await done('m2')) fail('three shapes seen and m2 never completed');
  console.log('   4 : 1, 3 : 1 and 6 : 1, unchanged at every size');

  // ---- M3: one turn lays exactly one circumference, whatever the wheel
  console.log('== M3  rolling the wheel');
  for (const d of [2, 4, 7, 9]) {
    await set('rlD', d);
    await page.click('#rlRoll');
    await page.waitForTimeout(1300);            // let the roll finish
    const laid = num(await txt('rlC'));
    if (!near(laid, Math.round(PI * d * 1000) / 1000, 0.002)) fail('D = ' + d + ': track ' + laid + ', expected ' + (PI * d).toFixed(3));
    if (!near(num(await txt('rlRatio')), Math.round(PI * 1e5) / 1e5, 1e-5)) fail('D = ' + d + ': C ÷ D read ' + await txt('rlRatio'));
  }
  if (!await done('m3')) fail('three wheels rolled and m3 never completed');
  console.log('   C ÷ D is 3.14159 for every wheel, which is the whole point');

  // ---- M4: Archimedes. The exact polygons must sit inside his published bracket.
  console.log('== M4  squeezing π between polygons');
  const lo = n => n * Math.sin(PI / n), hi = n => n * Math.tan(PI / n);
  for (const n of [3, 6, 12, 24, 48, 96]) {
    await set('sqN', n); await page.waitForTimeout(20);
    const gl = num(await txt('sqLo')), gh = num(await txt('sqHi'));
    if (!near(gl, Math.round(lo(n) * 1e5) / 1e5, 1e-5)) fail(n + ' sides: lower bound ' + gl + ', expected ' + lo(n).toFixed(5));
    if (!near(gh, Math.round(hi(n) * 1e5) / 1e5, 1e-5)) fail(n + ' sides: upper bound ' + gh + ', expected ' + hi(n).toFixed(5));
    if (!(gl < PI && PI < gh)) fail(n + ' sides: the bracket ' + gl + '–' + gh + ' does not contain π');
  }
  /* the book's own two numbers */
  await set('sqN', 6); await page.waitForTimeout(20);
  if (!near(num(await txt('sqLo')), 3, 1e-5)) fail('a hexagon must give exactly 3, which is why π > 3');
  if (!near(num(await txt('sqHi')), Math.round(2 * Math.sqrt(3) * 1e5) / 1e5, 1e-5)) fail('the outer hexagon must give 2√3 ≈ 3.4641');
  await set('sqN', 96); await page.waitForTimeout(20);
  const [l96, h96] = [num(await txt('sqLo')), num(await txt('sqHi'))];
  if (!(l96 > 3 + 10 / 71)) fail('the 96-gon lower bound must beat Archimedes\' published 3 10/71');
  if (!(h96 < 3 + 1 / 7)) fail('the 96-gon upper bound must beat Archimedes\' published 3 1/7');
  if (!await done('m4')) fail('the whole range of polygons swept and m4 never completed');
  console.log('   3 < π < 3.4641 at six sides; at 96 it sits inside 3 10/71 … 3 1/7');

  // ---- M5: the historical values, and their errors
  console.log('== M5  the parade of approximations');
  const HIST = [
    ['Ancient 3', 3], ['Mesopotamia', 3.125], ['Brahmagupta', Math.sqrt(10)],
    ['Archimedes', 22 / 7], ['Ptolemy', 377 / 120], ['Āryabhaṭa', 3.1416],
    ['Zu Chongzhi', 355 / 113], ['Mādhava', 3.14159265358]
  ];
  for (const [name, v] of HIST) {
    await chip('apPick', name);
    const shown = await txt('apErr');
    const want = Math.abs(v - PI);
    const got = /e/.test(shown) ? Number(shown) : num(shown);
    if (!near(got, want, Math.max(1e-9, want * 0.06))) fail(name + ': error shown ' + shown + ', computed ' + want.toExponential(2));
  }
  /* the book's claim: Zu Chongzhi beat everything before it, and 22/7 beats √10 */
  const e = n => Math.abs(HIST.find(h => h[0] === n)[1] - PI);
  if (!(e('Zu Chongzhi') < e('Āryabhaṭa'))) fail('355/113 must be closer than 62832/20000');
  if (!(e('Archimedes') < e('Brahmagupta'))) fail('22/7 must be closer than √10, as the book says');
  if (!await done('m5')) fail('five values tapped and m5 never completed');
  console.log('   errors from 0.14 down to 1e-11, in the order the book tells them');

  // ---- M6: Mādhava's series brackets π, and closes on it
  console.log('== M6  the infinite series');
  const partial = k => { let s = 0; for (let j = 0; j < k; j++) s += (j % 2 ? -1 : 1) / (2 * j + 1); return 4 * s; };
  for (const n of [1, 2, 3, 10, 25, 60]) {
    await set('msN', n); await page.waitForTimeout(20);
    if (!near(num(await txt('msEst')), Math.round(partial(n) * 1e6) / 1e6, 1e-6))
      fail(n + ' terms: estimate ' + await txt('msEst') + ', expected ' + partial(n).toFixed(6));
  }
  /* the defining behaviour: odd partial sums above π, even ones below, always */
  for (let n = 1; n <= 40; n++) {
    const v = partial(n);
    if (n % 2 && !(v > PI)) fail('partial sum ' + n + ' should overshoot π');
    if (!(n % 2) && !(v < PI)) fail('partial sum ' + n + ' should undershoot π');
  }
  if (!(Math.abs(partial(60) - PI) < Math.abs(partial(6) - PI))) fail('the series must get closer, not further');
  if (!await done('m6')) fail('the series driven from 1 to 60 terms and m6 never completed');
  console.log('   1 term gives 4, 2 give 2.667, and every pair brackets π');

  // ---- M7: arc length, and the two special cases the book derives first
  console.log('== M7  the length of an arc');
  for (const r of [2, 7, 14]) {
    await set('acR', r);
    for (const t of [30, 45, 120, 270, 359]) {
      await set('acT', t); await page.waitForTimeout(12);
      const want = 2 * PI * r * t / 360;
      if (!near(num(await txt('acLen')), Math.round(want * 1000) / 1000, 0.002))
        fail('r=' + r + ' θ=' + t + ': arc ' + await txt('acLen') + ', expected ' + want.toFixed(3));
    }
  }
  await set('acR', 7);
  await page.click('#acFull');    await page.waitForTimeout(20);
  if (!near(num(await txt('acLen')), Math.round(2 * PI * 7 * 1000) / 1000, 0.002)) fail('the full circle must be 2πr');
  await page.click('#acHalf');    await page.waitForTimeout(20);
  if (!near(num(await txt('acLen')), Math.round(PI * 7 * 1000) / 1000, 0.002)) fail('the semicircle must be πr');
  await page.click('#acQuarter'); await page.waitForTimeout(20);
  if (!near(num(await txt('acLen')), Math.round(PI * 7 / 2 * 1000) / 1000, 0.002)) fail('the quarter must be πr/2');
  if (!await done('m7')) fail('full, half, quarter and other all seen and m7 never completed');
  console.log('   2πr, πr and πr/2 are one formula read at three settings');

  // ---- M8: the track. Lane 1 must come to 400 m, and the stagger must be constant.
  console.log('== M8  the 400 m track');
  const rad = n => 36.5 + 0.3 + 1.22 * (n - 1);
  const lap = n => 2 * 84.39 + 2 * PI * rad(n);
  if (!near(lap(1), 400, 0.01)) fail('the test\'s own track arithmetic does not give 400 m');
  let prev = null;
  for (let n = 1; n <= 8; n++) {
    await set('tkLane', n); await page.waitForTimeout(20);
    if (!near(num(await txt('tkR')), Math.round(rad(n) * 100) / 100)) fail('lane ' + n + ': radius ' + await txt('tkR'));
    if (!near(num(await txt('tkLap')), Math.round(lap(n) * 100) / 100)) fail('lane ' + n + ': lap ' + await txt('tkLap'));
    if (n > 1) {
      const st = num(await txt('tkStag'));
      if (!near(st, Math.round((lap(n) - lap(1)) * 100) / 100)) fail('lane ' + n + ': stagger ' + st);
      const step = st - (prev || 0);
      /* the book's Think and Reflect: is the stagger the same between every pair? */
      if (!near(step, 2 * PI * 1.22, 0.02)) fail('lane ' + (n - 1) + '→' + n + ' gains ' + step.toFixed(2) + ', expected 2π × 1.22 = 7.67');
      prev = st;
    }
  }
  await set('tkLane', 1); await page.waitForTimeout(20);
  if ((await txt('tkLap')) !== '400 m' && !near(num(await txt('tkLap')), 400, 0.01)) fail('lane 1 must read 400 m, got ' + await txt('tkLap'));
  if (!await done('m8')) fail('all eight lanes walked and m8 never completed');
  console.log('   lane 1 is 400.00 m, and every lane out adds 2π × 1.22 = 7.67 m');

  // ---- M10: leaning a parallelogram over changes the perimeter, never the area
  console.log('== M10 base times height');
  for (const bb of [3, 7, 10]) for (const h of [2, 5, 8]) {
    await set('pgB', bb); await set('pgH', h);
    const areas = new Set();
    for (const k of [0, 3, 7, 12]) {
      await set('pgSk', k); await page.waitForTimeout(12);
      areas.add(num(await txt('pgArea')));
      const side = Math.hypot(h, k);
      if (!near(num(await txt('pgSide')), Math.round(side * 1000) / 1000, 0.002))
        fail('b=' + bb + ' h=' + h + ' k=' + k + ': slant side ' + await txt('pgSide'));
      if (!near(num(await txt('pgPeri')), Math.round(2 * (bb + side) * 1000) / 1000, 0.002))
        fail('b=' + bb + ' h=' + h + ' k=' + k + ': perimeter ' + await txt('pgPeri'));
    }
    if (areas.size !== 1) fail('b=' + bb + ' h=' + h + ': the area moved when the shape leant over — ' + [...areas].join(', '));
    if (![...areas][0] || ![...areas].includes(bb * h)) fail('b=' + bb + ' h=' + h + ': area read ' + [...areas][0] + ', expected ' + bb * h);
  }
  if (!await done('m10')) fail('the shear swept and m10 never completed');
  console.log('   area stayed b × h through every lean, while the perimeter grew');

  // ---- M11: the median. Equal areas at every apex, congruent at only one.
  console.log('== M11 the median');
  for (const y of [2, 5, 9]) for (const x of [-9, -5, -1, 0, 4, 9]) {
    await set('mdX', x); await set('mdY', y); await page.waitForTimeout(12);
    const L = num(await txt('mdL')), R = num(await txt('mdR'));
    const want = 0.5 * 6 * y;         /* half of BD = 6, times the height */
    if (!near(L, want, 0.011) || !near(R, want, 0.011))
      fail('apex (' + x + ',' + y + '): halves ' + L + ' and ' + R + ', both should be ' + want);
    if (L !== R) fail('apex (' + x + ',' + y + '): the two halves differ');
    const say = await txt('mdSay');
    if ((x === 0) !== (say === 'mirror images')) fail('apex (' + x + ',' + y + '): shape verdict "' + say + '"');
  }
  if (!await done('m11')) fail('the apex swept and m11 never completed');
  console.log('   equal at all 18 apex positions, and only mirror images at x = 0');

  // ---- M12: Heron, cross-checked against half base times height
  console.log('== M12 Heron\'s formula');
  const heron = (a, bb, c) => { const s = (a + bb + c) / 2; return Math.sqrt(s * (s - a) * (s - bb) * (s - c)); };
  const BOOK = [
    [3, 4, 5, 6],                                  // Example 5
    [7, 24, 25, 84],                               // end-of-chapter Q6
    [6, 6, 6, Math.sqrt(3) / 4 * 36],              // Example 3, equilateral
    [5, 5, 6, 12],                                 // Example 4, isosceles: b√(a²−b²) = 3×4
    [13, 14, 15, 84],
    [3, 5, 7, 15 * Math.sqrt(3) / 4]               // obtuse: 7² > 3² + 5²
  ];
  for (const [a, bb, c, want] of BOOK) {
    if (!near(heron(a, bb, c), want, 0.001)) fail('the test\'s own Heron value for ' + [a, bb, c] + ' is wrong');
    await set('hrA', a); await set('hrB', bb); await set('hrC', c); await page.waitForTimeout(25);
    const got = num(await txt('hrArea'));
    if (!near(got, Math.round(want * 1000) / 1000, 0.002)) fail([a, bb, c] + ': Heron read ' + got + ', expected ' + want.toFixed(3));
    const chk = num(await txt('hrCheck'));
    if (!near(chk, got, 0.003)) fail([a, bb, c] + ': ½ base × height gave ' + chk + ' but Heron gave ' + got);
  }
  /* the formula polices itself: no triangle, no area */
  for (const [a, bb, c] of [[1, 2, 9], [1, 1, 15], [2, 3, 5]]) {
    await set('hrA', a); await set('hrB', bb); await set('hrC', c); await page.waitForTimeout(25);
    if (await txt('hrArea') !== 'no triangle') fail([a, bb, c] + ' cannot be a triangle, but the bench reported ' + await txt('hrArea'));
  }
  if (!await done('m12')) fail('acute, right, obtuse and impossible all seen and m12 never completed');
  console.log('   3-4-5 → 6, 7-24-25 → 84, equilateral → √3a²/4; 2+3=5 refused');

  // ---- M14: the wedges converge on πr², and the row's base on πr
  console.log('== M14 slicing the disc');
  const RAD = 6;
  const rowBase = n => n * RAD * Math.sin(PI / n), rowHt = n => RAD * Math.cos(PI / n);
  let lastGap = Infinity;
  for (const sp of [0, 25, 50, 75, 100]) { await set('slSpread', sp); await page.waitForTimeout(12); }
  for (const n of [4, 8, 16, 32, 64]) {
    await set('slN', n); await set('slSpread', 100); await page.waitForTimeout(20);
    if (!near(num(await txt('slBase')), Math.round(rowBase(n) * 1000) / 1000, 0.002)) fail(n + ' wedges: base ' + await txt('slBase'));
    if (!near(num(await txt('slHt')), Math.round(rowHt(n) * 1000) / 1000, 0.002)) fail(n + ' wedges: height ' + await txt('slHt'));
    const area = num(await txt('slArea'));
    if (!near(area, Math.round(rowBase(n) * rowHt(n) * 100) / 100, 0.011)) fail(n + ' wedges: area ' + area);
    const gap = Math.abs(rowBase(n) * rowHt(n) - PI * RAD * RAD);
    if (!(gap < lastGap)) fail('going from fewer to ' + n + ' wedges did not get closer to πr²');
    lastGap = gap;
  }
  if (!(lastGap < 0.2)) fail('at 64 wedges the area is still ' + lastGap.toFixed(3) + ' from πr²');
  if (!await done('m14')) fail('the wedges cut and laid out and m14 never completed');
  console.log('   base → πr, height → r, area → πr² = ' + (PI * 36).toFixed(2));

  // ---- M15: sector and segment, against the book's own two questions
  console.log('== M15 sectors and segments');
  for (const r of [4, 10, 15]) for (const t of [30, 60, 90, 180, 270]) {
    await set('sgR', r); await set('sgT', t); await page.waitForTimeout(12);
    const sec = PI * r * r * t / 360, tri = 0.5 * r * r * Math.sin(t * PI / 180);
    if (!near(num(await txt('sgSec')), Math.round(sec * 100) / 100)) fail('r=' + r + ' θ=' + t + ': sector ' + await txt('sgSec'));
    if (!near(num(await txt('sgSeg')), Math.round((sec - tri) * 100) / 100)) fail('r=' + r + ' θ=' + t + ': segment ' + await txt('sgSeg'));
  }
  /* Exercise Set 6.3 Q4 and Q5, which round to the book's printed answers */
  await set('sgR', 10); await set('sgT', 90); await page.waitForTimeout(20);
  if (!near(num(await txt('sgSec')), 78.54, 0.02)) fail('r=10, 90° should give 78.54 (78.5 with π = 3.14), got ' + await txt('sgSec'));
  await set('sgR', 15); await set('sgT', 60); await page.waitForTimeout(20);
  if (!near(num(await txt('sgSec')), 117.81, 0.02)) fail('r=15, 60° should give 117.81 (117.75 with π = 3.14), got ' + await txt('sgSec'));
  /* The starred Q7 in symbols: at 60° the segment is r²(π/6 − √3/4). Exactly
     that is 20.38; the book prints 20.44 because Q5 tells you to use π ≈ 3.14
     and √3 ≈ 1.73. Both are checked, and they are not the same number. */
  const q7 = 15 * 15 * (PI / 6 - Math.sqrt(3) / 4);
  if (!near(q7, 20.382, 0.001)) fail('the test\'s own reading of starred Q7 is wrong: ' + q7.toFixed(4));
  if (!near(num(await txt('sgSeg')), 20.38, 0.011)) fail('the exact 60° segment is 20.38, got ' + await txt('sgSeg'));
  const rounded = 3.14 * 225 / 6 - 0.5 * 225 * (1.73 / 2);
  if (!near(rounded, 20.44, 0.01)) fail('the book\'s rounded constants should give 20.44, they give ' + rounded.toFixed(3));
  if (!await done('m15')) fail('the sector swept and m15 never completed');
  console.log('   78.54 and 117.81; the 60° segment is r²(π/6 − √3/4) = 20.38, and 20.44 with the book\'s rounded constants');

  // ---- the graded tables answer to the book
  console.log('== M9 and M13  the tables');
  const tables = await page.evaluate(() => ({
    n9: document.querySelectorAll('#g9 select').length,
    n13: document.querySelectorAll('#g13 select').length,
    o9: [...document.querySelectorAll('#g9 select')].map(s => [...s.options].map(o => o.value)),
    o13: [...document.querySelectorAll('#g13 select')].map(s => [...s.options].map(o => o.value))
  }));
  if (tables.n9 !== 6) fail('the length table should have 6 blanks, has ' + tables.n9);
  if (tables.n13 !== 6) fail('the area table should have 6 blanks, has ' + tables.n13);
  /* every one of these is worked here, from the book's own numbers, with π = 22/7 */
  const P22 = 22 / 7;
  const W9 = ['7 cm', '44 cm', '3.67 cm', '13.2 cm', '46.33 cm', '176 cm'];
  if (!near(44 / (2 * P22), 7, 1e-9)) fail('perimeter 44 with π = 22/7 is not radius 7');
  if (!near(2 * P22 * 7, 44, 1e-9)) fail('radius 7 with π = 22/7 is not circumference 44');
  if (!near(2 * P22 * 3.5 * 60 / 360, 3.667, 0.001)) fail('the 60° arc of r = 3.5 is not 3.67');
  if (!near(2 * P22 * 6.3 * 120 / 360, 13.2, 0.001)) fail('the 120° arc of r = 6.3 is not 13.2');
  if (!near(2 * P22 * 14 * 75 / 360 + 28, 46.33, 0.005)) fail('the 75° sector of r = 14 has perimeter 46.33, arc plus two radii');
  if (!near(P22 * 56, 176, 1e-9)) fail('a 56 cm tyre does not cover 176 cm in one turn');
  const W13 = ['84 cm²', '50√2 cm²', '1500√3 m²', '13 cm', '36 cm', '72.62 cm²'];
  if (!near(heron(7, 24, 25), 84, 1e-9)) fail('7-24-25 is not 84');
  if (!near(heron(15, 15, 10), 50 * Math.SQRT2, 1e-6)) fail('the perimeter-40 isosceles is not 50√2');
  if (!near(heron(60, 100, 140), 1500 * Math.sqrt(3), 1e-6)) fail('the 3:5:7 plot is not 1500√3');
  if (!near(Math.hypot(5, 2 * 60 / 10), 13, 1e-9)) fail('base 10 and area 60 do not give equal sides of 13');
  if (!near(12 + 2 * 54 / 12 + Math.hypot(12, 2 * 54 / 12), 36, 1e-9)) fail('the 54 cm² right triangle has perimeter 36');
  if (!near(heron(10, 15, 20), 72.618, 0.001)) fail('the 2:3:4 triangle is not 72.62');
  for (const [tbl, btn, want, mid] of [['g9', 'g9check', W9, 'm9'], ['g13', 'g13check', W13, 'm13']]) {
    want.forEach((v, i) => {
      const opts = tbl === 'g9' ? tables.o9[i] : tables.o13[i];
      if (!opts.includes(v)) fail(tbl + ' blank ' + (i + 1) + ' cannot be answered ' + v);
    });
    await page.$$eval('#' + tbl + ' select', (ns, w) => ns.forEach((n, i) => {
      n.value = w[i]; n.dispatchEvent(new Event('change', { bubbles: true }));
    }), want);
    await page.click('#' + btn); await page.waitForTimeout(120);
    if (!await done(mid)) fail(mid + ' did not complete on the book\'s own answers: ' + await txt(tbl + 's'));
  }
  console.log('   7, 44, 3.67, 13.2, 46.33, 176 — and 84, 50√2, 1500√3, 13, 36, 72.62');

  // ---- the badge tells the chapter's own story, in order
  console.log('== badge');
  const stages = await page.evaluate(() => CH.stages.map(s => s.name));
  const want = ['A shape, unmeasured', 'Around the edge', 'Squeezing π', 'C = 2πr',
                'The space inside', 'Cut into wedges', 'πr²'];
  if (stages.join('|') !== want.join('|')) fail('badge stages: ' + stages.join(' → '));
  console.log('   ' + stages.join(' → '));

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close();
  console.log('\nperimeter: ' + (bad ? bad + ' failure(s)' : 'ok') + '\n');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
