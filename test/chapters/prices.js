const { browser, BASE } = require('../lib');

/* Chapter 9 of Understanding Society: India and Beyond — The Price Puzzle:
   What Drives the Market.

   Checked against the printed chapter: Table 9.1's three rows and the market
   total at each price, Table 9.2's three sellers and their stacks, Table 9.3
   read as the straight line joining its printed points, the five determinants
   of demand and the four of supply, the nine related-goods pairs, the eight
   rise-or-fall rows, the eight market states, the 2020 mask market in four
   moves, the four Goa tariffs, the ceiling-and-floor arithmetic either side of
   ₹100, the park in five steps, and the eight glossary definitions.

   Five missions read the same three schedules, so the schedules are checked as
   arithmetic rather than as strings: a single wrong row would teach a falsehood
   in five places at once and look entirely convincing in every one of them.

   Both layout guards from chapters 6 and 7 are carried over: every table has to
   fit a 390px screen, and every sorter has to keep its choices on one line. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'prices-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const num  = s => parseInt(String(s).replace(/[^\d-]/g, ''), 10);
  const set  = async (id, v) => {
    await page.$eval('#' + id, (n, v) => {
      n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(v));
    await page.waitForTimeout(45);
  };
  const chips = box => page.$$eval('#' + box + ' button', ns => ns.map(n => n.textContent.trim()));
  const tap = async (box, label) => {
    await page.$$eval('#' + box + ' button', (ns, l) => {
      const e = ns.find(q => q.textContent.trim() === l); if (e) e.click();
    }, label);
    await page.waitForTimeout(60);
  };
  const answerRows = async (boxId, KEY) => {
    const rows = await page.$$('#' + boxId + ' .qrow');
    if (rows.length !== KEY.length) fail(boxId + ' has ' + rows.length + ' rows, expected ' + KEY.length);
    for (const row of rows) {
      const label = await row.$eval('span.t', n => n.textContent.trim());
      const want = KEY.find(w => label.includes(w[0]));
      if (!want) { fail('unexpected ' + boxId + ' row: ' + label); continue; }
      const btns = await row.$$('button');
      const names = await Promise.all(btns.map(x => x.evaluate(n => n.textContent.trim())));
      const i = names.indexOf(want[1]);
      if (i < 0) { fail(boxId + ': no "' + want[1] + '" option on "' + label + '"'); continue; }
      await btns[i].click();
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(350);
  };
  const oneLine = async boxId => {
    const split = await page.$$eval('#' + boxId + ' .qrow', rows => rows.filter(r => {
      const t = [...r.querySelectorAll('button')].map(n => n.offsetTop);
      return new Set(t).size > 1;
    }).length);
    if (split) fail(split + ' of ' + boxId + '\'s rows split their choices across two lines');
  };
  const fits = async id => {
    const right = await page.evaluate(i => document.getElementById(i).getBoundingClientRect().right, id);
    if (right > 390) fail(id + ' runs ' + Math.round(right - 390) + 'px off a 390px screen');
  };
  // answer a Q.vgrid from a {row label -> option} table
  const answerVgrid = async (id, KEY, opts) => {
    const rows = await page.$$eval('#' + id + ' tr td.lbl', ns => ns.map(n => n.textContent.trim()));
    if (rows.length !== Object.keys(KEY).length) {
      fail(id + ' has ' + rows.length + ' rows, expected ' + Object.keys(KEY).length);
    }
    for (const l of rows) if (!(l in KEY)) fail('unexpected ' + id + ' row: ' + l);
    const offered = await page.$$eval('#' + id + ' select', ns =>
      ns.map(s => [...s.options].map(o => o.value).filter(Boolean)));
    offered.forEach((o, i) => {
      opts.forEach(c => { if (!o.includes(c)) fail(id + ' row ' + i + ' does not offer "' + c + '"'); });
    });
    for (const [label, want] of Object.entries(KEY)) {
      const hit = await page.evaluate(([tid, lbl, val]) => {
        const rs = [...document.querySelectorAll('#' + tid + ' tr')];
        const row = rs.find(r => r.querySelector('td.lbl') &&
                                 r.querySelector('td.lbl').textContent.trim() === lbl);
        if (!row) return false;
        const sel = row.querySelector('select');
        if (!sel) return false;
        sel.value = val; return sel.value === val;
      }, [id, label, want]);
      if (!hit) fail(id + ' could not answer "' + label + '" with "' + want + '"');
      await page.waitForTimeout(25);
    }
  };

  // ---- M1: Table 9.1, three buyers and the market total
  console.log('== M1  individual demand, then market demand');
  /* The chapter prints Srivalli, Alex and Israt at three prices, and the market
     demand as their sum. All four numbers are checked at every price, and then
     the claim the mission is built to make — that the market curve is flatter —
     is checked as arithmetic rather than taken on trust. */
  const T91 = [
    [0, 150, 1, 2, 3, 6],
    [1, 100, 2, 4, 6, 12],
    [2, 50,  3, 6, 9, 18]
  ];
  for (const [v, price, q1, q2, q3, qd] of T91) {
    await set('demS', v);
    if (num(await txt('demSV')) !== price) fail('demS=' + v + ' reads "' + (await txt('demSV')) + '", expected ₹' + price);
    if (num(await txt('demA')) !== q1) fail('₹' + price + ': Srivalli reads "' + (await txt('demA')) + '", expected ' + q1 + ' kg');
    const bStr = await txt('demB');
    if (bStr !== q2 + ' + ' + q3 + ' kg') fail('₹' + price + ': Alex + Israt reads "' + bStr + '", expected "' + q2 + ' + ' + q3 + ' kg"');
    if (num(await txt('demC')) !== qd) fail('₹' + price + ': market demand reads "' + (await txt('demC')) + '", expected ' + qd + ' kg');
    if (q1 + q2 + q3 !== qd) fail('₹' + price + ': the printed row does not sum — ' + q1 + '+' + q2 + '+' + q3 + ' ≠ ' + qd);
  }
  /* ₹150 down to ₹50: Srivalli 1→3 kg, the market 6→18 kg. Two against twelve,
     which is exactly why the market line is the flatter of the two. */
  if ((T91[2][5] - T91[0][5]) !== 6 * (T91[2][2] - T91[0][2])) {
    fail('the market response is not six times Srivalli\'s, so the mission\'s point does not hold');
  }
  if (!await done('m1')) fail('M1 did not complete after all three prices were visited');
  console.log('   three prices, three buyers, and a market response six times the individual one');

  // ---- M3: the five determinants of demand
  console.log('== M3  what else moves demand');
  const DEM = {
    'Related goods': [/substitute or a complement/i, /[Cc]offee/],
    'Income':        [/income of the consumer/i,     /[Mm]ore income/],
    'Taste':         [/taste and preference/i,       /Srivalli/],
    'Season':        [/time of year/i,               /[Ss]weaters|festival/i],
    'Expectations':  [/expect the price to do next/i, /Diwali/]
  };
  const dtr = await chips('dtrOpts');
  if (dtr.length !== 5) fail('M3 offers ' + dtr.length + ' determinants, expected 5');
  for (const [name, res] of Object.entries(DEM)) {
    if (!dtr.includes(name)) { fail('M3 is missing "' + name + '"'); continue; }
    await tap('dtrOpts', name);
    const fields = [await txt('dtrA'), await txt('dtrB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* The chapter's own limit on the substitute rule: Srivalli will not swap
     mangoes for oranges even when oranges are cheaper. */
  await tap('dtrOpts', 'Taste');
  if (!/oranges/i.test(await txt('dtrTxt'))) fail('the taste note drops the oranges Srivalli will not swap for');
  await tap('dtrOpts', 'Expectations');
  if (!/postpone|delay/i.test(await txt('dtrTxt'))) fail('the expectations note does not say buyers postpone');
  if (!await done('m3')) fail('M3 did not complete after four were opened');
  console.log('   related goods, income, taste, season and expectations, each with its example');

  // ---- M5: Table 9.2, three sellers stacked
  console.log('== M5  three sellers');
  const T92 = [
    [0, 50,  1, 3, 2, 6],
    [1, 100, 2, 4, 6, 12],
    [2, 150, 3, 7, 8, 18]
  ];
  for (const [v, price, a, bq, c, qs] of T92) {
    await set('supS', v);
    if (num(await txt('supSV')) !== price) fail('supS=' + v + ' reads "' + (await txt('supSV')) + '", expected ₹' + price);
    if (num(await txt('supA')) !== a) fail('₹' + price + ': seller A reads "' + (await txt('supA')) + '", expected ' + a + ' kg');
    const bStr = await txt('supB');
    if (bStr !== bq + ' + ' + c + ' kg') fail('₹' + price + ': B and C read "' + bStr + '", expected "' + bq + ' + ' + c + ' kg"');
    if (num(await txt('supC')) !== qs) fail('₹' + price + ': market supply reads "' + (await txt('supC')) + '", expected ' + qs + ' kg');
    if (a + bq + c !== qs) fail('₹' + price + ': the printed row does not sum — ' + a + '+' + bq + '+' + c + ' ≠ ' + qs);
  }
  /* The Law of Supply, read straight off the table the bench draws. */
  for (let i = 1; i < T92.length; i++) {
    if (T92[i][5] <= T92[i - 1][5]) fail('market supply does not rise with price: ' + T92.map(r => r[5]).join(', '));
  }
  if (!await done('m5')) fail('M5 did not complete after all three prices were visited');
  console.log('   A, B and C summing to 6, 12 and 18 kg as the price climbs');

  // ---- M6: the four determinants of supply
  console.log('== M6  what else moves supply');
  const SUP = {
    'Related goods': [/profitability of the alternatives/i, /wheat.*chickpea/i],
    'Sellers':       [/how many sellers/i,                  /competition/i],
    'Technology':    [/technology costs to run/i,           /irrigation|cold storage/i],
    'Expectations':  [/expect demand to do next/i,          /[Pp]otato/]
  };
  const str = await chips('strOpts');
  if (str.length !== 4) fail('M6 offers ' + str.length + ' determinants, expected 4');
  for (const [name, res] of Object.entries(SUP)) {
    if (!str.includes(name)) { fail('M6 is missing "' + name + '"'); continue; }
    await tap('strOpts', name);
    const fields = [await txt('strA'), await txt('strB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* Fig. 9.6 ends with the farmer planting more chickpeas, not fewer. */
  await tap('strOpts', 'Related goods');
  if (!/more chickpeas/i.test(await txt('strTxt'))) fail('the Fig. 9.6 note does not end in more chickpeas');
  await tap('strOpts', 'Technology');
  if (!/reduces the cost|reduce the cost/i.test(await txt('strTxt'))) {
    fail('the technology note does not say better technology reduces the cost of production');
  }
  if (!await done('m6')) fail('M6 did not complete after three were opened');
  console.log('   alternatives, sellers, technology and expectations, each moving the whole curve');

  // ---- M8: Table 9.3, and the gap either side of ₹100
  console.log('== M8  the price that clears the market');
  /* The three printed rows, then two prices between them. The chapter says the
     curve is the line joining the printed points, so a price between two rows
     must read as that line and not as either endpoint. */
  const T93 = [
    [40,  38, 6,  /Excess demand|shortage/i],
    [100, 12, 12, /cleared|equilibrium/i],
    [150, 8,  43, /Excess supply|surplus/i]
  ];
  for (const [price, qd, qs, re] of T93) {
    await set('eqS', price);
    if (num(await txt('eqSV')) !== price) fail('eqS=' + price + ' reads "' + (await txt('eqSV')) + '"');
    if (num(await txt('eqA')) !== qd) fail('₹' + price + ': demanded reads "' + (await txt('eqA')) + '", expected ' + qd + ' kg');
    if (num(await txt('eqB')) !== qs) fail('₹' + price + ': supplied reads "' + (await txt('eqB')) + '", expected ' + qs + ' kg');
    if (!re.test(await txt('eqC'))) fail('₹' + price + ': the outcome reads "' + (await txt('eqC')) + '", expected ' + re);
  }
  /* ₹70 is halfway between the ₹40 and ₹100 rows: 38→12 gives 25, 6→12 gives 9,
     so a shortage of 16 kg. Straight-line interpolation, checked as arithmetic. */
  await set('eqS', 70);
  if (num(await txt('eqA')) !== 25) fail('₹70 demanded reads "' + (await txt('eqA')) + '", expected 25 kg');
  if (num(await txt('eqB')) !== 9) fail('₹70 supplied reads "' + (await txt('eqB')) + '", expected 9 kg');
  if (!/16 kg/.test(await txt('eqC'))) fail('₹70 does not name a 16 kg shortage: "' + (await txt('eqC')) + '"');
  /* And the two laws, as the slider walks the whole range: demanded may never
     rise with price, supplied may never fall with it. */
  let lastD = Infinity, lastS = -Infinity;
  for (let p = 40; p <= 150; p += 5) {
    await set('eqS', p);
    const d = num(await txt('eqA')), s = num(await txt('eqB'));
    if (d > lastD) { fail('quantity demanded rises with price at ₹' + p + ' — that is not a demand curve'); break; }
    if (s < lastS) { fail('quantity supplied falls with price at ₹' + p + ' — that is not a supply curve'); break; }
    lastD = d; lastS = s;
  }
  if (!await done('m8')) fail('M8 did not complete after the slider was swept');
  console.log('   38 and 6, 12 and 12, 8 and 43 — and one price between them, read off the line');

  // ---- M10: the mask market, four moves
  console.log('== M10 the mask market, 2020');
  if ((await txt('mskA')) !== '0 of 4') fail('M10 starts at "' + (await txt('mskA')) + '"');
  if (!/ordinary market/i.test(await txt('mskTxt'))) fail('M10 does not open before the pandemic');
  const MASK = [
    ['much higher',    /demand for face masks surged/i],
    ['much higher',    /could not catch up|factories take time/i],
    ['falling',        /suppliers adjusted/i],
    ['back to normal', /pre-pandemic/i]
  ];
  for (let i = 0; i < MASK.length; i++) {
    await page.click('#mskNext');
    await page.waitForTimeout(110);
    if ((await txt('mskA')) !== (i + 1) + ' of 4') fail('press ' + (i + 1) + ' left it at "' + (await txt('mskA')) + '"');
    const [price, re] = MASK[i];
    if ((await txt('mskB')) !== price) fail('move ' + (i + 1) + ' prices at "' + (await txt('mskB')) + '", expected "' + price + '"');
    if (!re.test(await txt('mskTxt'))) fail('move ' + (i + 1) + ' reads "' + (await txt('mskTxt')) + '", expected ' + re);
  }
  if (!await done('m10')) fail('M10 did not complete after all four moves');
  await page.click('#mskNext');
  await page.waitForTimeout(110);
  if ((await txt('mskA')) !== '0 of 4') fail('pressing again did not return to 2019');
  console.log('   demand jumps, supply lags, suppliers catch up, and the pandemic ends');

  // ---- M11: the four Goa tariffs
  console.log('== M11 a hundred rooms in Goa');
  const HOTEL = {
    'Off-season':       [1500,  /July/],
    'Tourist weekend':  [8000,  /December/],
    'New Year’s Eve':   [25000, /31 December/],
    'A cancellation':   [4800,  /cancels/]
  };
  const hot = await chips('hotOpts');
  if (hot.length !== 4) fail('M11 offers ' + hot.length + ' nights, expected 4');
  for (const [name, [tariff, re]] of Object.entries(HOTEL)) {
    if (!hot.includes(name)) { fail('M11 is missing "' + name + '"'); continue; }
    await tap('hotOpts', name);
    if (num(await txt('hotA')) !== tariff) fail(name + ' is ' + (await txt('hotA')) + ', expected ₹' + tariff);
    if (!re.test(await txt('hotB'))) fail(name + ' is dated "' + (await txt('hotB')) + '", expected ' + re);
  }
  /* The chapter gives 40 per cent, and gives no rate to take it off — so the
     bench must both do the arithmetic and say what it did it to. */
  await tap('hotOpts', 'A cancellation');
  if (Math.round(8000 * 0.6) !== 4800) fail('the cancellation rate is not 40 per cent off the tourist-season tariff');
  if (!/40 per cent/.test(await txt('hotTxt'))) fail('the cancellation note does not name the 40 per cent');
  if (!/illustration|chapter gives the 40 per cent/i.test(await txt('hotTxt'))) {
    fail('the cancellation note does not say the rate it is taken off is an illustration');
  }
  if (!await done('m11')) fail('M11 did not complete after three nights were opened');
  console.log('   ₹1,500, ₹8,000, ₹25,000 and a 40 per cent cut, all for the same room');

  // ---- M12: ceiling below, floor above, and nothing at the equilibrium
  console.log('== M12 ceiling and floor');
  await set('capS', 60);
  if (!/ceiling/i.test(await txt('capA'))) fail('₹60 is called "' + (await txt('capA')) + '", expected a ceiling');
  if (!/[Ss]hortage/.test(await txt('capB'))) fail('₹60 does not produce a shortage: "' + (await txt('capB')) + '"');
  await set('capS', 150);
  if (!/floor/i.test(await txt('capA'))) fail('₹150 is called "' + (await txt('capA')) + '", expected a floor');
  if (!/[Ss]urplus/.test(await txt('capB'))) fail('₹150 does not produce a surplus: "' + (await txt('capB')) + '"');
  /* The chapter's condition, worked from both ends: at the equilibrium price a
     control changes nothing at all. */
  await set('capS', 100);
  if (/ceiling|floor/i.test(await txt('capA'))) fail('₹100 still claims to bind: "' + (await txt('capA')) + '"');
  if (!/clears by itself|12 kg wanted, 12 kg offered/.test(await txt('capB'))) {
    fail('₹100 does not say the market clears by itself: "' + (await txt('capB')) + '"');
  }
  if (!/[Nn]o gap/.test(await txt('capC'))) fail('₹100 claims a gap: "' + (await txt('capC')) + '"');
  await set('capS', 150);
  if (!/only effective above the equilibrium|above the equilibrium price/i.test(await txt('capC'))) {
    fail('the gap note drops the chapter’s condition on price floors');
  }
  for (let p = 40; p <= 150; p += 5) await set('capS', p);
  if (!await done('m12')) fail('M12 did not complete after the slider was swept');
  console.log('   a binding ceiling below ₹100, a binding floor above it, and nothing at it');

  // ---- M13: the park, five steps
  console.log('== M13 the park that never got built');
  if ((await txt('parA')) !== '0 of 5') fail('M13 starts at "' + (await txt('parA')) + '"');
  if (!/needs a park/i.test(await txt('parTxt'))) fail('M13 does not open on a neighbourhood needing a park');
  const PARK = [
    ['₹40,000', /5,000/],
    ['₹30,000', /use it without paying/i],
    ['₹10,000', /not enough money is collected/i],
    ['₹10,000', /never|each family did the sensible thing/i],
    ['₹40,000', /government provision or funding/i]
  ];
  for (let i = 0; i < PARK.length; i++) {
    await page.click('#parNext');
    await page.waitForTimeout(110);
    if ((await txt('parA')) !== (i + 1) + ' of 5') fail('press ' + (i + 1) + ' left it at "' + (await txt('parA')) + '"');
    const [collected, re] = PARK[i];
    if ((await txt('parB')) !== collected) fail('step ' + (i + 1) + ' collected "' + (await txt('parB')) + '", expected "' + collected + '"');
    if (!re.test(await txt('parTxt'))) fail('step ' + (i + 1) + ' reads "' + (await txt('parTxt')) + '", expected ' + re);
  }
  /* Eight families at ₹5,000 each is ₹40,000, and free riding has to cost the
     park its funding — otherwise the mission has no story. */
  if (num(PARK[0][0]) !== 8 * 5000) fail('eight families at ₹5,000 do not come to ' + PARK[0][0]);
  if (num(PARK[2][0]) >= num(PARK[0][0])) fail('free riding did not reduce what was collected');
  if (!await done('m13')) fail('M13 did not complete after all five steps');
  await page.click('#parNext');
  await page.waitForTimeout(110);
  if ((await txt('parA')) !== '0 of 5') fail('pressing again did not start the story over');
  console.log('   ₹40,000 on paper, ₹10,000 collected, and a park only the government builds');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');

  // M2, the nine pairs of related goods
  await answerVgrid('g2', {
    'Movie ticket and popcorn':   'Complements',
    'Eraser and pencil':          'Complements',
    'Laptop and computer':        'Substitutes',
    'Air conditioner and cooler': 'Substitutes',
    'Notebook and pen':           'Complements',
    'Apple and banana':           'Substitutes',
    'Mobile and earphones':       'Complements',
    'Tea and coffee':             'Substitutes',
    'Car and petrol':             'Complements'
  }, ['Substitutes', 'Complements']);
  await page.click('#g2check');
  await page.waitForTimeout(250);
  if (!/9 of 9|All nine/i.test(await txt('g2s'))) fail('M2 scored ' + (await txt('g2s')));
  if (!await done('m2')) fail('M2 did not complete on a full correct table');
  await fits('g2');

  // M9, the eight market states — including Table 9.3's own three rows
  await answerVgrid('g9', {
    '₹40: 38 kg demanded, 6 kg supplied':  'Excess demand',
    '₹100: 12 kg demanded, 12 kg supplied': 'Equilibrium',
    '₹150: 8 kg demanded, 43 kg supplied':  'Excess supply',
    'Quantity supplied is less than demanded': 'Excess demand',
    'Quantity supplied is more than demanded': 'Excess supply',
    'The market is cleared':                   'Equilibrium',
    'A shortage':                              'Excess demand',
    'A surplus':                               'Excess supply'
  }, ['Excess demand', 'Equilibrium', 'Excess supply']);
  await page.click('#g9check');
  await page.waitForTimeout(250);
  if (!/8 of 8|All eight/i.test(await txt('g9s'))) fail('M9 scored ' + (await txt('g9s')));
  if (!await done('m9')) fail('M9 did not complete on a full correct table');
  await fits('g9');
  console.log('   nine related pairs, and eight markets named');

  // M7, the eight things that happen to supply
  await oneLine('g7');
  await answerRows('g7', [
    ['Improved technology',        'Rises'],
    ['Cold storage',               'Rises'],
    ['More sellers enter',         'Rises'],
    ['Fewer sellers',              'Falls'],
    ['expect a boom',              'Rises'],
    ['expect demand to fall',      'Falls'],
    ['hold potatoes back',         'Falls'],
    ['price of the good itself',   'Rises']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g7s'))) fail('M7 scored ' + (await txt('g7s')));
  if (!await done('m7')) fail('M7 did not complete');
  /* The last row is the one that is different in kind, and the mission's whole
     point is that it says so. */
  if (!/along the curve|Law of Supply/i.test(await txt('g7s'))) {
    fail('M7 does not distinguish a move along the curve from a shift of it');
  }

  // M4 and M14, the two pick lists
  const WRONG4 = [
    'Demand means wanting something, whether or not you can pay',
    'When the price rises, the quantity demanded rises with it',
    'Market demand is the average of the individual demands'
  ];
  const w4 = await chips('g4');
  if (w4.length !== 10) fail('M4 offers ' + w4.length + ' statements, expected 10');
  for (const t of WRONG4) if (!w4.includes(t)) fail('M4 is missing the distractor "' + t + '"');
  for (const t of w4) if (!WRONG4.includes(t)) await tap('g4', t);
  await page.click('#g4check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g4s'))) fail('M4 scored ' + (await txt('g4s')));
  if (!await done('m4')) fail('M4 did not complete');

  const WRONG14 = [
    'A price ceiling is the lowest price that may be charged',
    'Government intervention in a market has no drawbacks'
  ];
  const w14 = await chips('g14');
  if (w14.length !== 10) fail('M14 offers ' + w14.length + ' statements, expected 10');
  for (const t of WRONG14) if (!w14.includes(t)) fail('M14 is missing the distractor "' + t + '"');
  for (const t of w14) if (!WRONG14.includes(t)) await tap('g14', t);
  await page.click('#g14check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g14s'))) fail('M14 scored ' + (await txt('g14s')));
  if (!await done('m14')) fail('M14 did not complete');
  console.log('   what demand means, and both sides of intervening');

  /* M15, the eight definitions. The ceiling and the floor are deliberately the
     two that are easiest to swap, so the pairing is played out rather than
     merely listed. */
  const TERMS = {
    'Purchasing power':   /one unit of a currency can buy/,
    'Related goods':      /demand is interconnected/,
    'Market equilibrium': /demanded equals quantity supplied/,
    'Price ceiling':      /maximum a seller may charge/,
    'Price floor':        /lowest price that may be charged/,
    'Monopoly':           /single seller controlling/,
    'Hoarding':           /beyond what is needed now/,
    'Black marketing':    /banned or regulated goods/
  };
  const left = await page.$$eval('#g15a button', ns => ns.map(n => n.textContent.trim()));
  if (left.length !== 8) fail('M15 offers ' + left.length + ' terms, expected 8');
  for (const [term, re] of Object.entries(TERMS)) {
    if (!left.includes(term)) { fail('M15 is missing the term "' + term + '"'); continue; }
    const hit = await page.evaluate(([t, src]) => {
      const rx = new RegExp(src);
      const a = [...document.querySelectorAll('#g15a button')].find(n => n.textContent.trim() === t);
      const b = [...document.querySelectorAll('#g15b button')].find(n => rx.test(n.textContent));
      if (!a || !b) return false;
      a.click(); b.click();
      return a.classList.contains('right') && b.classList.contains('right');
    }, [term, re.source]);
    if (!hit) fail('M15 does not pair "' + term + '" with ' + re);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(250);
  if (!/8 of 8|All eight/i.test(await txt('g15s'))) fail('M15 scored ' + (await txt('g15s')));
  if (!await done('m15')) fail('M15 did not complete on eight correct pairs');
  console.log('   eight terms, each with the definition the chapter gives it');

  /* ---- M16: the question set is inside Q.boss's closure, so what is checked
     is the invariant that would break first — exactly one right answer each. */
  console.log('== M16 chapter boss');
  await page.click('#bossStart');
  await page.waitForTimeout(300);
  const asked = new Set();
  for (let q = 0; q < 10; q++) {
    const opts = await page.$$('#bossOpts button');
    if (!opts.length) break;
    const tier = await txt('bossTier');
    if (!/\d of 10$/.test(tier)) fail('question ' + (q + 1) + ' is labelled "' + tier + '"');
    asked.add(tier);
    if (opts.length < 3) fail(tier + ' offers only ' + opts.length + ' options');
    await opts[q % opts.length].click();
    await page.waitForTimeout(120);
    const right = await page.$$eval('#bossOpts button.right', ns => ns.length);
    if (right !== 1) fail(tier + ' marks ' + right + ' options right, expected exactly 1');
    if (!/show/.test(await page.$eval('#bossWhy', n => n.className))) fail(tier + ' gave no explanation');
    if ((await txt('bossWhy')).length < 40) fail(tier + ' explanation is too short to be one');
    await page.waitForTimeout(2700);
  }
  if (asked.size < 5) fail('the boss presented only ' + asked.size + ' distinct questions');
  console.log('   ' + asked.size + ' questions seen, each with exactly one right answer and a reason');

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? '\nprices: ' + bad + ' FAILURE(S)' : '\nprices: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
