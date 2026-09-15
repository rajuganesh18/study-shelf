const { browser, BASE } = require('../lib');

/* Chapter 4 of Understanding Society: India and Beyond — Early Humans and
   Beginning of Civilisation.

   Almost everything in this chapter is a date, a place or a toolkit, so almost
   everything here is checked exactly and against the printed figure: the four
   skulls of Fig. 4.6 with their own places, dates and tools; the six ages of
   Fig. 4.7 in the order Fig. 4.7 gives them; the Harappan timeline of Fig. 4.18;
   the four scripts and which of them can actually be read. The benches that
   carry a mechanism rather than a fact — the two bars of M1, the dispersals of
   M5, the balance of M12 — are checked as mechanisms, because a timeline where
   the marker does not actually move, or a balance that calls 12 level, teaches
   the wrong thing while looking perfectly fine.

   m12 is skipped by reach (see chapters.js) and is weighed properly here. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'civilisation-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
  const num  = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
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
  // answer a Q.rows grid from a table of [substring, choice-label]
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
  // tap a Q.order chip row into the given sequence
  const order = async (boxId, SEQ) => {
    for (const want of SEQ) {
      await page.$$eval('#' + boxId + ' button', (ns, w) => {
        const e = ns.find(q => q.textContent.trim().indexOf(w) === 0); if (e) e.click();
      }, want);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
  };

  // ---- M1: the slider must actually walk the chapter's own milestones
  console.log('== M1  three million years on one line');
  /* The cube-root stretch is the whole bench. Check it at the ends, where the
     answer is arithmetic, and at the one boundary the chapter cares about. */
  await set('hisS', 0);
  if ((await txt('hisSV')) !== '3.3 million years ago') {
    fail('the left end of the bar reads "' + (await txt('hisSV')) + '", expected 3.3 million years ago');
  }
  if ((await txt('hisA')) !== 'Before writing') fail('3.3 mya is in period "' + (await txt('hisA')) + '"');
  if (!/[Aa]pproximate/.test(await txt('hisB'))) fail('dating before writing reads "' + (await txt('hisB')) + '"');
  if (!/stone tools/i.test(await txt('hisC'))) fail('3.3 mya does not name the earliest stone tools');

  await set('hisS', 1000);
  if ((await txt('hisSV')) !== 'the present day') fail('the right end reads "' + (await txt('hisSV')) + '"');
  if ((await txt('hisA')) !== 'After writing') fail('the present is in period "' + (await txt('hisA')) + '"');
  if (!/relatively accurate/i.test(await txt('hisB'))) fail('dating after writing reads "' + (await txt('hisB')) + '"');

  /* Fig. 4.3 puts the line at 5000 years ago. The period must flip across it
     and nowhere else, so probe both sides rather than trusting the ends. */
  /* "3.3 million years ago" and "300,000 years ago" both survive num() — as 3.3
     and as 300000 — so the label gets its own reader before anything compares
     two of them. */
  const yearsOf = s => {
    if (/present/.test(s)) return 0;
    const n = num(s);
    return /million/.test(s) ? n * 1e6 : n;
  };
  const yearAt = async v => { await set('hisS', v); return yearsOf(await txt('hisSV')); };
  let beforeV = null, afterV = null;
  for (let v = 880; v <= 1000; v += 2) {
    await set('hisS', v);
    const p = await txt('hisA');
    if (p === 'Before writing') beforeV = v;
    if (p === 'After writing' && afterV === null) afterV = v;
  }
  if (afterV === null || beforeV === null || beforeV > afterV) {
    fail('the period never flips cleanly from Before writing to After writing');
  } else {
    await set('hisS', beforeV);
    const last = yearsOf(await txt('hisSV'));
    await set('hisS', afterV);
    const first = yearsOf(await txt('hisSV'));
    if (!(last >= 5000 && first <= 5000)) {
      fail('the before/after boundary is at ' + last + '–' + first + ' years ago, Fig. 4.3 puts it at 5000');
    }
  }
  // the milestones the chapter names, each at the moment it should appear
  const MILES = [
    [0,    /stone tools/i],
    [113,  /Quaternary/i],
    [190,  /Homo erectus walks out of Africa/i],
    [560,  /Homo sapiens evolves in Africa/i],
    [855,  /climate warms/i],
    [872,  /Mehrgarh/i],
    [1000, /Brahmi/i]
  ];
  for (const [v, re] of MILES) {
    await set('hisS', v);
    if (!re.test(await txt('hisC'))) fail('hisS=' + v + ' reads "' + (await txt('hisC')) + '", expected ' + re);
  }
  // and the axis must run one way only
  const walk = [];
  for (const v of [0, 250, 500, 750, 1000]) walk.push(await yearAt(v));
  for (let i = 1; i < walk.length; i++) {
    if (!(walk[i] < walk[i - 1])) fail('the timeline is not monotonic: ' + JSON.stringify(walk));
  }
  if (!await done('m1')) fail('M1 did not complete after four milestones were visited');
  console.log('   the stretch is monotonic, and the 5000-year line falls where Fig. 4.3 puts it');

  // ---- M2: the three scripts, and the one that cannot be read
  console.log('== M2  three scripts, one still unread');
  const scripts = await chips('scrOpts');
  ['Sindhu lipi', 'Cuneiform', 'Hieroglyphic', 'Brahmi'].forEach(s => {
    if (!scripts.includes(s)) fail('M2 is missing "' + s + '"');
  });
  await tap('scrOpts', 'Sindhu lipi');
  if (!/^Not yet/.test(await txt('scrC'))) fail('the Sindhu lipi reads "' + (await txt('scrC')) + '", it is undeciphered');
  if (!/2600 BCE/.test(await txt('scrB'))) fail('Sindhu lipi when reads "' + (await txt('scrB')) + '"');
  await tap('scrOpts', 'Cuneiform');
  if (!/^Yes/.test(await txt('scrC'))) fail('cuneiform reads "' + (await txt('scrC')) + '", it has been deciphered');
  if (!/3200 BCE/.test(await txt('scrB'))) fail('cuneiform when reads "' + (await txt('scrB')) + '", expected about 3200 BCE');
  if (!/wedge/i.test(await txt('scrTxt'))) fail('the cuneiform note does not explain the wedge');
  await tap('scrOpts', 'Hieroglyphic');
  if (!/1822/.test(await txt('scrC'))) fail('hieroglyphic deciphering reads "' + (await txt('scrC')) + '", expected 1822');
  if (!/Rosetta/.test(await txt('scrTxt')) || !/Champollion/.test(await txt('scrTxt'))) {
    fail('the hieroglyphic note names neither the Rosetta Stone nor Champollion');
  }
  await tap('scrOpts', 'Brahmi');
  if (!/400 BCE/.test(await txt('scrB'))) fail('Brahmi when reads "' + (await txt('scrB')) + '", expected about 400 BCE');
  if (!/A[sś]hoka/.test(await txt('scrTxt'))) fail('the Brahmi note does not credit Aśhoka with formalising it');
  if (!await done('m2')) fail('M2 did not complete after three scripts were opened');
  console.log('   four scripts, their dates, and only one of them unreadable');

  // ---- M4: Fig. 4.6, all four, exactly as the caption gives them
  console.log('== M4  four skulls');
  const SKULL = {
    'Homo habilis':          [/Olduvai/, /2.6 million/, /[Cc]hopper/],
    'Homo erectus':          [/Rift Valley/, /2 million years ago/, /[Hh]andaxe.*cleaver/],
    'Homo neanderthalensis': [/Europe and Southwest Asia/, /40,000/, /flake/],
    'Homo sapiens':          [/Africa/, /300,000/, /[Bb]lade/]
  };
  const skulls = await chips('skuOpts');
  if (skulls.length !== 4) fail('M4 offers ' + skulls.length + ' skulls, expected 4');
  for (const name of Object.keys(SKULL)) {
    if (!skulls.includes(name)) { fail('M4 is missing "' + name + '"'); continue; }
    await tap('skuOpts', name);
    const got = [await txt('skuA'), await txt('skuB'), await txt('skuC')];
    SKULL[name].forEach((re, i) => {
      if (!re.test(got[i])) fail(name + ' field ' + i + ' reads "' + got[i] + '", expected ' + re);
    });
  }
  if (!await done('m4')) fail('M4 did not complete after all four were opened');
  console.log('   place, date and toolkit for each of Fig. 4.6\'s four');

  // ---- M5: two exits from Africa, not one
  console.log('== M5  out of Africa, twice');
  const MIG = [
    [0, /2 million years ago/, /Homo erectus/],
    [1, /2 to 0.5 million/,    /Homo erectus/],
    [3, /125,000/,             /Homo sapiens/],
    [4, /50,000 to 12,000/,    /Homo sapiens/]
  ];
  for (const [v, whenRe, whoRe] of MIG) {
    await set('migS', v);
    if (!whenRe.test(await txt('migSV'))) fail('migS=' + v + ' reads "' + (await txt('migSV')) + '"');
    if (!whoRe.test(await txt('migA'))) fail('migS=' + v + ' names "' + (await txt('migA')) + '"');
  }
  /* The chapter is explicit that Homo sapiens evolved in Africa about 300,000
     years ago and only left about 125,000 years ago. A bench that has us
     leaving at the moment we appear collapses the two waves into one. */
  await set('migS', 2);
  if (!/[Ss]till in Africa/.test(await txt('migB'))) {
    fail('at 300,000 years ago Homo sapiens should still be in Africa, reads "' + (await txt('migB')) + '"');
  }
  await set('migS', 4);
  if (!/Australia/.test(await txt('migB')) || !/Americas/.test(await txt('migB'))) {
    fail('the last stage does not reach Australia and the Americas: "' + (await txt('migB')) + '"');
  }
  if (!await done('m5')) fail('M5 did not complete after three stages were visited');
  console.log('   erectus at 2 mya, sapiens at 125 kya, and Africa in between');

  // ---- M8: the tool sequence of the Palaeolithic sections
  console.log('== M8  the toolkit sharpens');
  const TOOLS = [
    [0, 'Chopper',              /Earliest Palaeolithic/, /[Cc]hopper/],
    [1, 'Handaxe and cleaver',  /Lower Palaeolithic/,    /cleaver/i],
    [2, 'Scraper, borer, point',/Middle Palaeolithic/,   /borer/i],
    [3, 'Blade and burin',      /Upper Palaeolithic/,    /microblade/i],
    [4, 'Hafted microliths',    /Mesolithic/,            /[Mm]icrolith/],
    [5, 'Polished stone',       /Neolithic/,             /[Pp]olished/]
  ];
  for (const [v, name, periodRe, toolRe] of TOOLS) {
    await set('tooS', v);
    if ((await txt('tooSV')) !== name) fail('tooS=' + v + ' is "' + (await txt('tooSV')) + '", expected "' + name + '"');
    if (!periodRe.test(await txt('tooA'))) fail(name + ' period reads "' + (await txt('tooA')) + '"');
    if (!toolRe.test(await txt('tooB'))) fail(name + ' tools read "' + (await txt('tooB')) + '"');
  }
  await set('tooS', 1);
  if (!/Attirampakkam/.test(await txt('tooC')) || !/Isampur/.test(await txt('tooC'))) {
    fail('the Lower Palaeolithic note names neither Attirampakkam nor Isampur');
  }
  await set('tooS', 4);
  if (!/fishing/i.test(await txt('tooC'))) fail('the Mesolithic note does not make fishing the mainstay');
  await set('tooS', 5);
  if (!/produce and process/i.test(await txt('tooC'))) {
    fail('the Neolithic note misses the chapter\'s own produce-and-process distinction');
  }
  if (!await done('m8')) fail('M8 did not complete after four stages were visited');
  console.log('   six stages, each with the period and the tools the chapter gives it');

  // ---- M10: the five stages of Fig. 4.14, in Fig. 4.14's order
  console.log('== M10 how a village happens');
  const STAGES = ['Cultivation', 'Pottery', 'Sedentism', 'Livestock', 'An agricultural landscape'];
  for (let v = 0; v < STAGES.length; v++) {
    await set('agrS', v);
    if ((await txt('agrSV')) !== STAGES[v]) {
      fail('agrS=' + v + ' is "' + (await txt('agrSV')) + '", expected "' + STAGES[v] + '"');
    }
    if (!(await txt('agrA')).startsWith((v + 1) + ' of 5')) {
      fail('agrS=' + v + ' is numbered "' + (await txt('agrA')) + '"');
    }
    if ((await txt('agrC')).length < 15) fail(STAGES[v] + ' names no evidence a digger would find');
  }
  await set('agrS', 3);
  if (!/sheep|goat|cattle/i.test(await txt('agrB'))) fail('livestock names no animal: "' + (await txt('agrB')) + '"');
  if (!await done('m10')) fail('M10 did not complete after four stages were visited');
  console.log('   five stages, numbered and evidenced');

  // ---- M12: the balance (reach cannot reach this one)
  console.log('== M12 the Harappan balance');
  const weights = (await chips('wtOpts')).map(Number);
  [1, 2, 4, 8, 16, 10, 20, 50, 100].forEach(w => {
    if (!weights.includes(w)) fail('the weight set is missing ' + w);
  });
  const pan = async () => Number(await txt('wtB'));
  const loadNow = async () => Number(await txt('wtA'));
  /* Balance three loads the way the chapter says the Harappans did: the binary
     series first, tens for the large denominations. Each sum is exact, and the
     bench must refuse anything that is not. */
  const KEY = { 13: [8, 4, 1], 27: [16, 8, 2, 1], 35: [20, 10, 4, 1], 64: [50, 10, 4], 116: [100, 16] };
  let balanced = 0;
  for (let round = 0; round < 3; round++) {
    const load = await loadNow();
    const parts = KEY[load];
    if (!parts) { fail('unexpected load ' + load); break; }
    if (parts.reduce((a, c) => a + c, 0) !== load) { fail('test key for ' + load + ' is wrong'); break; }
    // one weight short first — the beam must not call that level
    for (const w of parts.slice(0, -1)) await tap('wtOpts', String(w));
    if (await pan() === load) fail('load ' + load + ': the pan reads level one weight early');
    if (/^level/i.test(await txt('wtTxt')) ) fail('load ' + load + ' was called level before it was');
    await tap('wtOpts', String(parts[parts.length - 1]));
    if (await pan() !== load) fail('load ' + load + ': pan reads ' + (await pan()) + ' after the exact set');
    balanced++;
    if ((await txt('wtC')) !== balanced + ' of 3') {
      fail('after ' + balanced + ' loads the counter reads "' + (await txt('wtC')) + '"');
    }
    if (round < 2) { await page.click('#wtNew'); await page.waitForTimeout(120); }
  }
  if (!/binary|1, 2, 4, 8/.test(await txt('wtTxt'))) {
    fail('finishing the balance does not state the binary rule: "' + (await txt('wtTxt')) + '"');
  }
  if (!await done('m12')) fail('M12 did not complete after three loads were balanced');
  console.log('   three loads weighed exactly, and nothing called level early');

  // ---- M14: the four river civilisations
  console.log('== M14 four rivers, four answers');
  const CIV = {
    'Sindhu–Sarasvatī': [/Sindhu and the Sarasvat/, /undeciphered/i, /Dholavira/],
    'Mesopotamia':      [/Euphrates and the Tigris/, /[Cc]uneiform/, /2334 BCE/],
    'Egypt':            [/Nile/, /1822/, /kemet/],
    'China':            [/Huang He and the Yangtze/, /[Ll]ogographic/, /1600/]
  };
  const civs = await chips('civOpts');
  if (civs.length !== 4) fail('M14 offers ' + civs.length + ' civilisations, expected 4');
  for (const name of Object.keys(CIV)) {
    if (!civs.includes(name)) { fail('M14 is missing "' + name + '"'); continue; }
    await tap('civOpts', name);
    const [riv, scr, note] = [await txt('civA'), await txt('civB'), await txt('civTxt')];
    if (!CIV[name][0].test(riv)) fail(name + ' rivers read "' + riv + '"');
    if (!CIV[name][1].test(scr)) fail(name + ' script reads "' + scr + '"');
    if (!CIV[name][2].test(note)) fail(name + ' note misses ' + CIV[name][2] + ': "' + note + '"');
  }
  // the four city-states of Fig. 4.22 belong in one place, with their dates
  await tap('civOpts', 'Mesopotamia');
  const meso = await txt('civTxt');
  ['Sumerian', 'Akkadian', 'Assyrian', 'Babylonian', '2154 BCE', '1900 BCE', 'Hammurabi'].forEach(k => {
    if (!meso.includes(k)) fail('the Mesopotamia note omits ' + k);
  });
  const meluhha = await (async () => { await tap('civOpts', 'Sindhu–Sarasvatī'); return txt('civTxt'); })();
  if (!/Meluhha/.test(meluhha)) fail('the Sindhu–Sarasvatī note does not mention Meluhha');
  if (!await done('m14')) fail('M14 did not complete after all four were opened');
  console.log('   rivers, scripts and the Mesopotamian sequence, all as printed');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');
  await answerRows('g3', [
    ['More than 99 per cent', 'Before writing'],
    ['artefacts are the main source', 'Before writing'],
    ['hard to recover what people thought', 'Before writing'],
    ['only approximate', 'Before writing'],
    ['last 5000 years', 'After writing'],
    ['written documents survive', 'After writing'],
    ['Literature gives names', 'After writing'],
    ['relatively accurate', 'After writing']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g3s'))) fail('M3 scored ' + (await txt('g3s')));

  await answerRows('g6', [
    ['Chopper tools', 'habilis'],
    ['first hominin to walk out', 'erectus'],
    ['Handaxes and cleavers', 'erectus'],
    ['flake tools', 'neanderthalensis'],
    ['40,000 years ago', 'neanderthalensis'],
    ['Cave paintings', 'sapiens'],
    ['alive on earth today', 'sapiens']
  ]);
  if (!/7 of 7|All seven/i.test(await txt('g6s'))) fail('M6 scored ' + (await txt('g6s')));

  await answerRows('g15', [
    ['Wedge marks', 'Mesopotamia'],
    ['60-minute hour', 'Mesopotamia'],
    ['mummification', 'Egypt'],
    ['365 days', 'Egypt'],
    ['Symbols cut into bone', 'China'],
    ['Jade', 'China'],
    ['1, 2, 4, 8, 16', 'Sindhu'],
    ['gabarbands', 'Sindhu']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g15s'))) fail('M15 scored ' + (await txt('g15s')));
  console.log('   Fig. 4.3, the four ancestors and the four civilisations all key correctly');

  // M7, the six ages of Fig. 4.7
  await order('g7', ['Palaeolithic', 'Mesolithic', 'Neolithic', 'Chalcolithic', 'Bronze Age', 'Iron Age']);
  if (!await done('m7')) fail('M7 did not complete on Fig. 4.7\'s own order: ' + (await txt('g7s')));
  console.log('   the six ages run Palaeolithic to Iron Age');

  // M13, the Harappan timeline of Fig. 4.18
  await order('g13', ['Neolithic', 'Chalcolithic', 'Early Harappan', 'Mature Harappan', 'Late Harappan', 'The last sites']);
  if (!await done('m13')) fail('M13 did not complete on Fig. 4.18\'s own order: ' + (await txt('g13s')));
  const tl = await chips('g13');
  [['Neolithic', '7000 BCE'], ['Chalcolithic', '4500 BCE'], ['Early Harappan', '3300 BCE'],
   ['Mature Harappan', '2600 BCE'], ['Late Harappan', '1900 BCE']].forEach(([n, d]) => {
    if (!tl.some(t => t.indexOf(n) === 0 && t.includes(d))) fail(n + ' is not labelled ' + d + ' as Fig. 4.18 has it');
  });
  console.log('   the Harappan timeline, with the dates Fig. 4.18 prints');

  /* M9, the book's own three-column exercise. The last row carries two ticks,
     which is the point of it: the Mesolithic is still hunting and gathering, so
     a grid that only ever allowed one tick per row would teach the wrong
     table. */
  const KEY9 = {
    'Handaxes and cleavers':                [1, 0, 0],
    'Ground and polished stone tools':      [0, 0, 1],
    'Fishing as the mainstay':              [0, 1, 0],
    'Permanent village settlements':        [0, 0, 1],
    'A warmer climate, and far more people':[0, 1, 0],
    'Hunting and gathering':                [1, 1, 0]
  };
  const g9rows = await page.$$eval('#g9 tr td.lbl', ns => ns.map(n => n.textContent.trim()));
  if (g9rows.length !== 6) fail('M9 has ' + g9rows.length + ' rows, expected 6');
  for (const l of g9rows) if (!(l in KEY9)) fail('unexpected M9 row: ' + l);
  // a tick is one tap, a cross is two
  for (const [label, want] of Object.entries(KEY9)) {
    for (let c = 0; c < want.length; c++) {
      const taps = want[c] ? 1 : 2;
      for (let t = 0; t < taps; t++) {
        const hit = await page.evaluate(([lbl, col]) => {
          const rows = [...document.querySelectorAll('#g9 tr')];
          const ri = rows.findIndex(r => r.querySelector('td.lbl') &&
                                         r.querySelector('td.lbl').textContent.trim() === lbl);
          if (ri < 0) return false;
          const td = rows[ri].querySelector('td.c[data-c="' + col + '"]');
          if (!td) return false;
          td.click(); return true;
        }, [label, c]);
        if (!hit) { fail('M9 has no cell for "' + label + '" column ' + c); break; }
        await page.waitForTimeout(25);
      }
    }
  }
  await page.click('#g9check');
  await page.waitForTimeout(250);
  if (!/18 of 18|All eighteen/i.test(await txt('g9s'))) fail('M9 scored ' + (await txt('g9s')));
  if (!await done('m9')) fail('M9 did not complete on a full correct table');
  console.log('   the Palaeolithic/Mesolithic/Neolithic table fills in correctly');

  // M11, Mehrgarh — and the three things that are not Mehrgarh
  for (const t of ['Handmade sun-dried brick houses', 'Granaries', 'The dead buried in graves',
                   'Ornaments of lapis lazuli, carnelian and shell', 'Wheat and barley',
                   'Sheep, goats and the zebu humped bull', 'The first copper objects in the subcontinent']) {
    await tap('g11', t);
  }
  await page.click('#g11check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g11s'))) fail('M11 scored ' + (await txt('g11s')));
  if (!await done('m11')) fail('M11 did not complete');
  console.log('   Mehrgarh keeps its granaries and loses Lothal\'s dockyard');

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
  console.log(bad ? '\ncivilisation: ' + bad + ' FAILURE(S)' : '\ncivilisation: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
