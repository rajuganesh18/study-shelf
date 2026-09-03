const { browser, BASE } = require('../lib');

/* Chapter 2 of Understanding Society: India and Beyond — Shaping of the
   Earth's Surface.

   The geography has to agree with the printed chapter, so the assertions here
   are of two kinds. The depth model in M1 is checked as arithmetic: every
   boundary in Fig. 2.1 is probed on both sides, because a layer table that is
   one kilometre out at 2900 km is a wrong answer, not a rounding error. The
   sequence benches are checked as sequences: each step must advance, each must
   say something different from the one before, and the last must name the
   landform the chapter names.

   Named cases come from the page: Fig. 2.1's layer thicknesses, the four
   meetings of plates, the Ring of Fire, the three courses of a river, the
   meander that becomes an oxbow lake, headland to stack, the glacier's U, the
   four dune types, and karst from cave to sinkhole. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'landforms-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
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
  const press = async (id, times) => {
    for (let i = 0; i < times; i++) { await page.click('#' + id); await page.waitForTimeout(70); }
  };

  // ---- M1: Fig. 2.1's layers, probed on both sides of every boundary
  console.log('== M1  the Earth\'s interior');
  const EDGES = [
    [0, 'Crust'], [30, 'Crust'], [50, 'Upper mantle'], [100, 'Upper mantle'],
    [150, 'Asthenosphere'], [300, 'Asthenosphere'], [1000, 'Mantle'], [2900, 'Mantle'],
    [3000, 'Outer core'], [5100, 'Outer core'], [5200, 'Inner core'], [6375, 'Inner core']
  ];
  for (const [d, want] of EDGES) {
    await set('intS', d);
    const got = await txt('intA');
    if (got !== want) fail(d + ' km reads "' + got + '", expected "' + want + '"');
  }
  await set('intS', 200);
  const asth = await txt('intC');
  if (!/molten/i.test(asth) || !/slide|move/i.test(asth)) {
    fail('the asthenosphere is not described as the partly molten layer the plates move over: "' + asth + '"');
  }
  await set('intS', 0);
  if (!/30/.test(await txt('intC')) || !/5/.test(await txt('intC'))) {
    fail('the crust note does not carry both thicknesses from Fig. 2.1');
  }
  if (!await done('m1')) fail('M1 did not complete after four layers were visited');
  console.log('   six layers, every boundary in Fig. 2.1 on the correct side');

  // ---- M3: four meetings of plates, four different outcomes
  console.log('== M3  the three kinds of plate boundary');
  const BND = {
    'Continents collide':    [/Convergent/, /[Ff]old mountains/, /Himalaya/],
    'Ocean meets continent': [/Convergent/, /[Vv]olcano/,        /Ring of Fire|Andes/],
    'Plates pull apart':     [/Divergent/,  /ridge/i,            /Mid-Atlantic/],
    'Plates slide past':     [/Transform/,  /earthquake/i,       /San Andreas/]
  };
  const bndChips = await chips('bndOpts');
  for (const k of Object.keys(BND)) {
    if (!bndChips.includes(k)) { fail('M3 has no "' + k + '" case'); continue; }
    await tap('bndOpts', k);
    const got = [await txt('bndA'), await txt('bndB'), await txt('bndC')];
    BND[k].forEach((re, i) => {
      if (!re.test(got[i])) fail(k + ' readout ' + (i + 1) + ' is "' + got[i] + '", expected to match ' + re);
    });
  }
  if (!await done('m3')) fail('M3 did not complete after all four cases were opened');
  console.log('   collide, subduct, split and slide — each with the chapter\'s own example');

  // ---- M5: the layers of the plate map
  console.log('== M5  plates against quakes and volcanoes');
  const layers = await chips('plLayers');
  ['Plate boundaries', 'Earthquakes', 'Volcanoes', 'Ring of Fire'].forEach(l => {
    if (!layers.includes(l)) fail('M5 is missing the "' + l + '" layer');
  });
  const notes = new Set();
  for (const l of layers) { await tap('plLayers', l); notes.add(await txt('plTxt')); }
  if (notes.size !== layers.length) fail('two layers of M5 share the same note');
  await tap('plLayers', 'Ring of Fire');
  await tap('plLayers', 'Ring of Fire');
  if (!/Pacific/.test(await txt('plTxt'))) fail('the Ring of Fire note does not mention the Pacific');
  if (!await done('m5')) fail('M5 did not complete after the layers were switched on');
  console.log('   four layers, each with its own reading of the same map');

  // ---- M7: every measure must actually reduce the loss, and rain must raise it
  console.log('== M7  holding the topsoil');
  const num = s => parseFloat(String(s).replace(/[^0-9.]/g, ''));
  await set('soilS', 40);
  const bare40 = num(await txt('soilA'));
  await set('soilS', 200);
  const bare200 = num(await txt('soilA'));
  if (!(bare200 > bare40)) fail('heavier rain did not increase the soil loss (' + bare40 + ' → ' + bare200 + ')');
  const fixes = await chips('soilFix');
  ['Contour trenches', 'Bunding', 'Terracing', 'Check dams'].forEach(f => {
    if (!fixes.includes(f)) fail('M7 is missing "' + f + '"');
  });
  let prev = bare200;
  for (const f of fixes) {
    await tap('soilFix', f);
    const now = num(await txt('soilA'));
    if (!(now < prev)) fail('switching on "' + f + '" did not reduce the soil loss (' + prev + ' → ' + now + ')');
    prev = now;
  }
  const soaked = parseFloat(await txt('soilB'));
  if (!(soaked > 22)) fail('with every measure on, only ' + soaked + '% of the rain soaks in');
  if (!/holds|survives/i.test(await txt('soilC'))) {
    fail('with every measure on the verdict still reads "' + (await txt('soilC')) + '"');
  }
  if (!await done('m7')) fail('M7 did not complete after three measures were tried');
  console.log('   rain raises the loss, and all four measures cut it — terracing most');

  // ---- M8: three courses, in the right order down the profile
  console.log('== M8  a river source to sea');
  const COURSE = [
    [0, 'Upper course', /V-shaped/], [20, 'Upper course', /V-shaped/],
    [40, 'Middle course', /[Mm]eander/], [60, 'Middle course', /oxbow/i],
    [80, 'Lower course', /[Dd]elta/], [100, 'Lower course', /levee/i]
  ];
  for (const [p, name, re] of COURSE) {
    await set('rivS', p);
    const got = await txt('rivA');
    if (got !== name) fail(p + '% downstream reads "' + got + '", expected "' + name + '"');
    if (!re.test(await txt('rivC'))) fail(p + '%: landforms read "' + (await txt('rivC')) + '", expected to match ' + re);
  }
  if (!await done('m8')) fail('M8 did not complete after all three courses were visited');
  console.log('   V-valleys upstream, meanders in the middle, delta at the mouth');

  // ---- M9: the meander must actually be cut off, and only at the end
  console.log('== M9  the oxbow lake');
  const ox = [];
  for (let i = 0; i < 6; i++) { ox.push(await txt('oxTxt')); await press('oxStep', 1); }
  if (new Set(ox).size !== ox.length) fail('two steps of M9 say the same thing');
  if (!/oxbow lake/i.test(ox[5])) fail('the last step of M9 does not name the oxbow lake: "' + ox[5] + '"');
  if (/oxbow lake/i.test(ox[0]) || /oxbow lake/i.test(ox[1])) fail('M9 names the oxbow lake before the neck is cut');
  if (!/neck/i.test(ox[3] + ox[4])) fail('M9 never mentions the neck being cut through');
  if (!await done('m9')) fail('M9 did not complete at the last step');
  await page.click('#oxReset'); await page.waitForTimeout(80);
  if ((await txt('oxTxt')) !== ox[0]) fail('reset did not return M9 to its first step');
  console.log('   six centuries, cut through the neck, sealed into a lake');

  // ---- M10: headland → cave → arch → stack → stump
  console.log('== M10 headland to stack');
  const SEQ = [/headland/i, /cave/i, /arch/i, /stack/i, /stump|platform/i];
  const co = [];
  for (let i = 0; i < 5; i++) { co.push(await txt('coTxt')); await press('coStep', 1); }
  SEQ.forEach((re, i) => { if (!re.test(co[i])) fail('M10 step ' + (i + 1) + ' is "' + co[i] + '", expected to match ' + re); });
  if (!await done('m10')) fail('M10 did not complete at the last stage');
  await page.click('#coReset'); await page.waitForTimeout(80);
  if ((await txt('coTxt')) !== co[0]) fail('reset did not return M10 to its first stage');
  console.log('   the sequence runs in the order Fig. 2.15 gives it');

  // ---- M11: a V becomes a U, and the moraines come last
  console.log('== M11 the glacier');
  const GL = [
    [0, /river valley/i, /V-shaped/],
    [1, /[Ii]ce fills/,  /cirque/i],
    [2, /grinds/i,       /U/],
    [3, /retreats/i,     /U-shaped/],
    [4, /left/i,         /moraine/i]
  ];
  for (const [v, nameRe, leftRe] of GL) {
    await set('glS', v);
    if (!nameRe.test(await txt('glSV'))) fail('glS=' + v + ' is named "' + (await txt('glSV')) + '"');
    if (!leftRe.test(await txt('glB'))) fail('glS=' + v + ' leaves "' + (await txt('glB')) + '", expected to match ' + leftRe);
  }
  await set('glS', 4);
  const mor = await txt('glB');
  ['[Ll]ateral', '[Mm]edial', '[Tt]erminal'].forEach(k => {
    if (!new RegExp(k).test(mor)) fail('the moraine readout omits ' + k.replace(/[\[\]]/g, '') + ': "' + mor + '"');
  });
  if (!await done('m11')) fail('M11 did not complete after every stage was visited');
  console.log('   V, ice, grinding, retreat, and all three moraines at the end');

  // ---- M12: the four dune types of the chapter, plus the one that is not a dune
  console.log('== M12 what the wind builds');
  const WIND = {
    'Barchan dune':      /downwind/i,
    'Longitudinal dune': /parallel/i,
    'Star dune':         /different directions/i,
    'Parabolic dune':    /upwind/i,
    'Yardang':           /not a dune/i
  };
  const wn = await chips('wnOpts');
  for (const k of Object.keys(WIND)) {
    if (!wn.includes(k)) { fail('M12 is missing "' + k + '"'); continue; }
    await tap('wnOpts', k);
    const n = await txt('wnTxt');
    if (!WIND[k].test(n)) fail(k + ' note is "' + n + '", expected to match ' + WIND[k]);
  }
  if (!await done('m12')) fail('M12 did not complete after four shapes were opened');
  console.log('   barchan, longitudinal, star, parabolic — and a yardang, which is rock');

  // ---- M13: karst, in the order it actually forms
  console.log('== M13 water working underground');
  const KA = [
    [0,   /dissolv/i,     /joint/i],
    [100, /hollow|cave/i, /cave/i],
    [220, /dripping|lime/i, /[Ss]talactite/],
    [340, /meet/i,        /[Pp]illar/],
    [480, /roof/i,        /[Ss]inkhole/]
  ];
  for (const [t, aRe, bRe] of KA) {
    await set('kaS', t);
    if (!aRe.test(await txt('kaA'))) fail(t + 'k years: "' + (await txt('kaA')) + '" does not match ' + aRe);
    if (!bRe.test(await txt('kaB'))) fail(t + 'k years: landform "' + (await txt('kaB')) + '" does not match ' + bRe);
  }
  if (!await done('m13')) fail('M13 did not complete after four ages were visited');
  console.log('   joints, cave, stalactites, pillar, sinkhole — in that order');

  // ---- the graded activities: keys against the printed chapter
  console.log('== answer keys against the printed chapter');

  // M4, boundary read off the evidence
  const M4 = [
    ['Himalaya', 'Convergent'], ['Mid-Atlantic', 'Divergent'], ['San Andreas', 'Transform'],
    ['sinking oceanic plate', 'Convergent'], ['magma rising', 'Divergent'], ['grind sideways', 'Transform']
  ];
  const rows4 = await page.$$('#g4 .qrow');
  if (rows4.length !== M4.length) fail('M4 has ' + rows4.length + ' rows, expected ' + M4.length);
  for (const row of rows4) {
    const label = await row.$eval('span.t', n => n.textContent.trim());
    const want = M4.find(w => label.includes(w[0]));
    if (!want) { fail('unexpected M4 row: ' + label); continue; }
    const btns = await row.$$('button');
    const names = await Promise.all(btns.map(x => x.evaluate(n => n.textContent.trim())));
    await btns[names.indexOf(want[1])].click();
    await page.waitForTimeout(45);
  }
  await page.waitForTimeout(350);
  if (!/6 of 6|All six/i.test(await txt('g4s'))) fail('M4 scored ' + (await txt('g4s')) + ' on the chapter\'s own answers');

  // M6, weathering in three kinds and erosion which is none
  const M6 = [
    ['freezes in a crack', 'Physical'], ['baking by day', 'Physical'],
    ['limestone', 'Chemical'], ['rust', 'Chemical'],
    ['tree root', 'Biological'], ['Lichen', 'Biological'],
    ['carries broken rock', 'Erosion'], ['lifts loose sand', 'Erosion'], ['scrapes rock off', 'Erosion']
  ];
  const rows6 = await page.$$('#g6 .qrow');
  if (rows6.length !== M6.length) fail('M6 has ' + rows6.length + ' rows, expected ' + M6.length);
  for (const row of rows6) {
    const label = await row.$eval('span.t', n => n.textContent.trim());
    const want = M6.find(w => label.includes(w[0]));
    if (!want) { fail('unexpected M6 row: ' + label); continue; }
    const btns = await row.$$('button');
    const names = await Promise.all(btns.map(x => x.evaluate(n => n.textContent.trim())));
    await btns[names.indexOf(want[1])].click();
    await page.waitForTimeout(45);
  }
  await page.waitForTimeout(350);
  if (!/9 of 9|All nine/i.test(await txt('g6s'))) fail('M6 scored ' + (await txt('g6s')) + ' on the chapter\'s own answers');
  console.log('   weathering breaks where it stands; only moving it is erosion');

  // M15, the four disasters
  const M15 = [
    ['steep slope until friction', 'Landslide'], ['Deforestation, mining', 'Landslide'],
    ['weak layer', 'Avalanche'], ['Skiers and trekkers', 'Avalanche'],
    ['moraine dam', 'GLOF'], ['ice dam', 'GLOF'],
    ['drought', 'Dust storm'], ['Overgrazing', 'Dust storm']
  ];
  const rows15 = await page.$$('#g15 .qrow');
  if (rows15.length !== M15.length) fail('M15 has ' + rows15.length + ' rows, expected ' + M15.length);
  for (const row of rows15) {
    const label = await row.$eval('span.t', n => n.textContent.trim());
    const want = M15.find(w => label.includes(w[0]));
    if (!want) { fail('unexpected M15 row: ' + label); continue; }
    const btns = await row.$$('button');
    const names = await Promise.all(btns.map(x => x.evaluate(n => n.textContent.trim())));
    await btns[names.indexOf(want[1])].click();
    await page.waitForTimeout(45);
  }
  await page.waitForTimeout(350);
  if (!/8 of 8|All eight/i.test(await txt('g15s'))) fail('M15 scored ' + (await txt('g15s')) + ' on the chapter\'s own answers');
  console.log('   each disaster matched to the landform and causes the chapter gives it');

  // M14, the landforms that wrote the history
  const HIST = {
    'The Ganga and Indus plains': /[Ff]ertile/,
    'The Himalaya':               /Khyber/,
    'The Thar desert':            /Silk Route/,
    'Coasts and harbours':        /trade/i,
    'Kallanai, the Grand Anicut': /irrigation/i
  };
  const left = await page.$$eval('#g14a button', ns => ns.map(n => n.textContent.trim()));
  const right = await page.$$eval('#g14b button', ns => ns.map(n => n.textContent.trim()));
  for (const k of Object.keys(HIST)) {
    if (!left.includes(k)) { fail('M14 is missing "' + k + '"'); continue; }
    if (!right.some(t => HIST[k].test(t))) fail('nothing in M14 matches "' + k + '"');
  }
  console.log('   plains, passes, trade routes, harbours and the Grand Anicut');

  /* ---- M16: the question set lives inside Q.boss's closure and cannot be
     read out, so what is checked is the invariant that would break first —
     every question must mark exactly one option right and give a reason. */
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
  console.log(bad ? '\nlandforms: ' + bad + ' FAILURE(S)' : '\nlandforms: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
