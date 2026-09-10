const { browser, BASE } = require('../lib');

/* Chapter 3 of Understanding Society: India and Beyond — Atmosphere and Climate.

   Two kinds of assertion. The layer table (Fig. 3.3), the wind table (Table 3.1)
   and the ten climographs (Table 3.3) are DATA, so they are checked exactly and
   on both sides of every boundary: a station whose annual rainfall does not sum
   to the printed figure is a wrong answer, not a rounding difference. The
   mechanism benches are checked as mechanisms — the pressure letter, the wind
   direction and the rain must all flip together when the temperature crosses,
   because a bench where only two of the three flip teaches the wrong physics.

   m13 is skipped by reach (see chapters.js) and is driven properly here. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'atmosphere-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
  const num  = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  /* "0 of 10" and "10 of 10" both survive num() as nonsense, so counts of the
     form "n of m" get their own reader. */
  const count = s => parseInt(String(s).trim(), 10);
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

  // ---- M1: 78 + 21 + the one square that is left
  console.log('== M1  what the air is made of');
  const gases = await chips('airOpts');
  ['Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide', 'Everything else'].forEach(g => {
    if (!gases.includes(g)) fail('M1 is missing "' + g + '"');
  });
  const PCT = { 'Nitrogen': /78/, 'Oxygen': /21/, 'Argon': /0\.93/, 'Carbon dioxide': /0\.04/, 'Everything else': /0\.03/ };
  for (const g of gases) {
    await tap('airOpts', g);
    const n = await txt('airTxt');
    if (!PCT[g] || !PCT[g].test(n)) fail(g + ' note does not carry its share from Fig. 3.2: "' + n + '"');
  }
  if (!await done('m1')) fail('M1 did not complete after four gases were opened');
  console.log('   five gases, each with the percentage Fig. 3.2 gives it');

  // ---- M2: every boundary in Fig. 3.3, probed on both sides
  console.log('== M2  the five layers');
  const EDGES = [
    [0, 'Troposphere'], [12, 'Troposphere'], [15, 'Stratosphere'], [50, 'Stratosphere'],
    [55, 'Mesosphere'], [80, 'Mesosphere'], [85, 'Thermosphere'], [700, 'Thermosphere'],
    [705, 'Exosphere'], [1000, 'Exosphere']
  ];
  for (const [a, want] of EDGES) {
    await set('layS', a);
    const got = await txt('layA');
    if (got !== want) fail(a + ' km reads "' + got + '", expected "' + want + '"');
  }
  /* The chapter's own DON'T MISS OUT: temperature falls with altitude in the
     troposphere and the mesosphere, and only in those two. */
  for (const [a, falls] of [[5, true], [30, false], [60, true], [300, false]]) {
    await set('layS', a);
    const t = await txt('layB');
    if (/Falls/i.test(t) !== falls) fail(a + ' km: temperature reads "' + t + '"');
  }
  await set('layS', 30);
  if (!/ozone/i.test(await txt('layC')) || !/aeroplane/i.test(await txt('layC'))) {
    fail('the stratosphere note omits the ozone layer or the aeroplanes');
  }
  await set('layS', 60);
  if (!/meteor/i.test(await txt('layC'))) fail('the mesosphere note does not mention meteorites burning up');
  if (!await done('m2')) fail('M2 did not complete after four layers were visited');
  console.log('   every boundary on the correct side, and the temperature rule holds');

  // ---- M5: pressure, wind and sky must all flip together
  console.log('== M5  high pressure, low pressure');
  await set('presS', 42);
  const hot = [await txt('presA'), await txt('presB'), await txt('presC')];
  if (!/rising/i.test(hot[0])) fail('hot ground: air reads "' + hot[0] + '"');
  if (hot[1] !== 'Low') fail('hot ground gives "' + hot[1] + '" pressure, expected Low');
  if (!/[Cc]loudy|wet/.test(hot[2])) fail('hot ground sky reads "' + hot[2] + '"');
  await set('presS', 5);
  const cold = [await txt('presA'), await txt('presB'), await txt('presC')];
  if (!/sinking/i.test(cold[0])) fail('cold ground: air reads "' + cold[0] + '"');
  if (cold[1] !== 'High') fail('cold ground gives "' + cold[1] + '" pressure, expected High');
  if (!/[Cc]lear|sunny/.test(cold[2])) fail('cold ground sky reads "' + cold[2] + '"');
  await set('presS', 24);
  if ((await txt('presB')) === 'Low' || (await txt('presB')) === 'High') {
    fail('a middling temperature already commits to ' + (await txt('presB')) + ' pressure');
  }
  if (!await done('m5')) fail('M5 did not complete after all three bands were visited');
  console.log('   hot → rises → low → wet, cold → sinks → high → clear');

  // ---- M6: the two breezes, each blowing the right way
  console.log('== M6  sea breeze and land breeze');
  await tap('brzOpts', 'Daytime');
  if (!/land/i.test(await txt('brzA'))) fail('by day the warmer side reads "' + (await txt('brzA')) + '"');
  if (!/sea to land/i.test(await txt('brzB'))) fail('by day the wind reads "' + (await txt('brzB')) + '"');
  await tap('brzOpts', 'Night');
  if (!/sea/i.test(await txt('brzA'))) fail('at night the warmer side reads "' + (await txt('brzA')) + '"');
  if (!/land to sea/i.test(await txt('brzB'))) fail('at night the wind reads "' + (await txt('brzB')) + '"');
  if (!/weak/i.test(await txt('brzTxt'))) fail('the land breeze is not described as the weaker of the two');
  if (!await done('m6')) fail('M6 did not complete after both were opened');
  console.log('   sea breeze by day, land breeze by night, and the weaker one named');

  // ---- M7: Table 3.1, exactly as printed
  console.log('== M7  reading the wind');
  const WIND = [
    [0, 'Calm', '0–1 km/h', /smoke rises vertically/i],
    [1, 'Light breeze', '6–11 km/h', /[Ll]eaves rustle/],
    [2, 'Strong breeze', '39–49 km/h', /[Uu]mbrellas are difficult/],
    [3, 'Storm', '103–117 km/h', /widespread damage/i]
  ];
  for (const [v, name, speed, eff] of WIND) {
    await set('wndS', v);
    if ((await txt('wndSV')) !== name) fail('wndS=' + v + ' is named "' + (await txt('wndSV')) + '", expected "' + name + '"');
    if ((await txt('wndA')) !== speed) fail(name + ' shows "' + (await txt('wndA')) + '", expected "' + speed + '"');
    if (!eff.test(await txt('wndB'))) fail(name + ' effects read "' + (await txt('wndB')) + '"');
  }
  if (!await done('m7')) fail('M7 did not complete after three categories were visited');
  console.log('   four categories, speeds and effects verbatim from Table 3.1');

  // ---- M10: the wind must actually reverse between June and December
  console.log('== M10 the monsoon engine');
  const MON = [
    [0, 'January',  /[Ll]and to sea/, /[Dd]ry/],
    [3, 'April',    /./,              /reversal has not finished/],
    [5, 'June',     /[Ss]ea to land/, /[Hh]eavy/],
    [7, 'August',   /[Ss]ea to land/, /[Hh]eavy/],
    [10, 'November',/[Ll]and to sea/, /[Dd]ry/]
  ];
  for (const [m, name, windRe, rainRe] of MON) {
    await set('monS', m);
    if ((await txt('monSV')) !== name) fail('monS=' + m + ' is "' + (await txt('monSV')) + '", expected ' + name);
    if (!windRe.test(await txt('monB'))) fail(name + ': wind reads "' + (await txt('monB')) + '"');
    if (!rainRe.test(await txt('monC'))) fail(name + ': rain reads "' + (await txt('monC')) + '"');
  }
  await set('monS', 5);
  if (!/land/i.test(await txt('monA'))) fail('in June the warmer side should be the land, reads "' + (await txt('monA')) + '"');
  await set('monS', 0);
  if (!/ocean/i.test(await txt('monA'))) fail('in January the warmer side should be the ocean, reads "' + (await txt('monA')) + '"');
  if (!/Bay of Bengal/.test(await txt('monC'))) {
    fail('the winter rain note does not explain the south-east coast: "' + (await txt('monC')) + '"');
  }
  if (!await done('m10')) fail('M10 did not complete after all three phases were visited');
  console.log('   the wind reverses, and the Bay of Bengal exception is named');

  // ---- M11: the normal dates of Figs. 3.10 and 3.11
  console.log('== M11 advance and retreat');
  const DATES = [[0, '20 May'], [12, '1 Jun'], [40, '29 Jun'], [49, '8 Jul'], [120, '17 Sep'], [148, '15 Oct']];
  for (const [d, want] of DATES) {
    await set('advS', d);
    if ((await txt('advSV')) !== want) fail('day ' + d + ' reads "' + (await txt('advSV')) + '", expected "' + want + '"');
  }
  /* Coverage has to grow through the advance, hold, then shrink. A map where
     it only ever grows would look fine and teach half the figure. */
  const cover = {};
  for (const d of [0, 20, 49, 100, 130, 150]) { await set('advS', d); cover[d] = count(await txt('advB')); }
  if (!(cover[0] < cover[20] && cover[20] < cover[49])) {
    fail('coverage does not grow through the advance: ' + JSON.stringify(cover));
  }
  if (cover[49] !== 10 || cover[100] !== 10) fail('the country is not fully covered mid-season: ' + cover[49] + ', ' + cover[100]);
  if (!(cover[130] < cover[100])) fail('coverage does not shrink during the retreat');
  if (cover[150] !== 0) fail('the monsoon has not withdrawn by 20 October: ' + cover[150] + ' stations still wet');
  await set('advS', 20);
  if ((await txt('advA')) !== 'Advancing') fail('day 20 is phase "' + (await txt('advA')) + '"');
  await set('advS', 130);
  if ((await txt('advA')) !== 'Retreating') fail('day 130 is phase "' + (await txt('advA')) + '"');
  if (!await done('m11')) fail('M11 did not complete after three phases were visited');
  console.log('   advance, full cover, retreat — and the dates match the two figures');

  // ---- M13: the book's audit, all four sections (reach cannot reach this one)
  console.log('== M13 the carbon footprint audit');
  await page.click('#ftScore');
  await page.waitForTimeout(120);
  if (!/Answer all four/i.test(await txt('ftTxt'))) fail('scoring with nothing answered did not ask for all four');
  if (await done('m13')) fail('M13 completed without the audit being filled in');
  // the low-impact answer in every section: 1+1+1+1 = 4
  await tap('ftA', 'I walk or cycle');
  await tap('ftB', 'Always switch things off');
  await tap('ftC', 'One bucket, used carefully');
  await tap('ftD', 'Reuse, recycle, no single-use');
  await page.click('#ftScore');
  await page.waitForTimeout(200);
  if ((await txt('ftOut')) !== '4 / 13') fail('all-low answers scored "' + (await txt('ftOut')) + '", expected 4 / 13');
  if (!/light footprint/i.test(await txt('ftTxt'))) fail('a score of 4 does not read as light: "' + (await txt('ftTxt')) + '"');
  // and the heaviest: 4+3+3+3 = 13
  await tap('ftA', 'Flights more than twice a year');
  await tap('ftB', 'Often leave things on');
  await tap('ftC', 'Rarely think about it');
  await tap('ftD', 'Throw away, do not recycle');
  await page.click('#ftScore');
  await page.waitForTimeout(200);
  if ((await txt('ftOut')) !== '13 / 13') fail('all-high answers scored "' + (await txt('ftOut')) + '", expected 13 / 13');
  if (!/Transport/.test(await txt('ftBest'))) fail('the biggest single gain should be Transport, reads "' + (await txt('ftBest')) + '"');
  if (!await done('m13')) fail('M13 did not complete after a full audit was scored');
  console.log('   1/2/3/4 scoring exactly as the chapter sets it, 4 to 13');

  // ---- M15: Table 3.3 reproduced, and each total summing to the printed figure
  console.log('== M15 ten stations');
  const ANN = {
    'Bengaluru': 88.9, 'Mumbai': 183.4, 'Kolkata': 162.5, 'Delhi': 67.0, 'Jodhpur': 36.6,
    'Chennai': 128.6, 'Nagpur': 124.2, 'Shillong': 225.3, 'Thiruvananthapuram': 181.2, 'Leh': 8.5
  };
  const stations = await chips('staOpts');
  if (stations.length !== 10) fail('M15 offers ' + stations.length + ' stations, expected 10');
  for (const st of stations) {
    if (!(st in ANN)) { fail('unexpected station: ' + st); continue; }
    await tap('staOpts', st);
    const shown = num(await txt('staA'));
    if (Math.abs(shown - ANN[st]) > 0.05) fail(st + ' annual rainfall reads ' + shown + ', Table 3.3 says ' + ANN[st]);
  }
  // the four the chapter asks questions about
  await tap('staOpts', 'Chennai');
  if (!/November/.test(await txt('staB'))) fail('Chennai is wettest in "' + (await txt('staB')) + '", expected November');
  if (!/north-east|retreating/i.test(await txt('staTxt'))) fail('the Chennai note does not name the retreating monsoon');
  await tap('staOpts', 'Thiruvananthapuram');
  if (num(await txt('staC')) > 3) fail('Thiruvananthapuram range is ' + (await txt('staC')) + ', it should be the equable one');
  await tap('staOpts', 'Shillong');
  if (!/Kolkata/.test(await txt('staTxt'))) fail('the Shillong note does not answer the book\'s Shillong-versus-Kolkata question');
  await tap('staOpts', 'Leh');
  if (num(await txt('staA')) !== 8.5) fail('Leh annual rainfall is wrong');
  if (!await done('m15')) fail('M15 did not complete after four stations were opened');
  console.log('   ten climographs, every annual total matching the printed table');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');
  await answerRows('g3', [
    ['Rain, fog and hail', 'Troposphere'], ['Aeroplanes cruise', 'Stratosphere'],
    ['ozone layer', 'Stratosphere'], ['Meteorites', 'Mesosphere'],
    ['Radio waves', 'Thermosphere'], ['auroras', 'Thermosphere'],
    ['Helium and hydrogen', 'Exosphere']
  ]);
  if (!/7 of 7|All seven/i.test(await txt('g3s'))) fail('M3 scored ' + (await txt('g3s')));

  await answerRows('g4', [
    ['34 °C and humid', 'Weather'], ['warm and even all year', 'Climate'],
    ['thunderstorm is forecast', 'Weather'], ['tropical monsoon climate', 'Climate'],
    ['wind has picked up', 'Weather'], ['very little precipitation', 'Climate']
  ]);
  if (!/6 of 6|All six/i.test(await txt('g4s'))) fail('M4 scored ' + (await txt('g4s')));

  await answerRows('g12', [
    ['Burning fossil fuels', 'Cause'], ['Deforestation', 'Cause'],
    ['Glaciers melting', 'Effect'], ['floods and droughts', 'Effect'], ['biodiversity', 'Effect'],
    ['renewable energy', 'What we can do'], ['Protecting forests', 'What we can do']
  ]);
  if (!/7 of 7|All seven/i.test(await txt('g12s'))) fail('M12 scored ' + (await txt('g12s')));

  await answerRows('g14', [
    ['heavy monsoon rain', 'Natural'], ['Himachal Pradesh', 'Natural'], ['already running high', 'Natural'],
    ['embankments', 'Human-made'], ['too close to the rivers', 'Human-made'],
    ['Silt collected', 'Human-made'], ['warnings', 'Human-made']
  ]);
  if (!/7 of 7|All seven/i.test(await txt('g14s'))) fail('M14 scored ' + (await txt('g14s')));
  console.log('   layers, weather-vs-climate, climate change and Punjab all key correctly');

  // M9, the six ṛtus against Table 3.2
  const RTU = {
    'Vasanta': /March–April/, 'Grīṣhma': /May–June/, 'Varṣhā': /July–August/,
    'Śharad': /September–October/, 'Hemanta': /November–December/, 'Śhiśhira': /January–February/
  };
  const left = await page.$$eval('#g9a button', ns => ns.map(n => n.textContent.trim()));
  const right = await page.$$eval('#g9b button', ns => ns.map(n => n.textContent.trim()));
  for (const k of Object.keys(RTU)) {
    if (!left.includes(k)) { fail('M9 is missing "' + k + '"'); continue; }
    if (!right.some(t => RTU[k].test(t))) fail('nothing in M9 pairs "' + k + '" with its months');
  }
  console.log('   six ṛtus, each with the months Table 3.2 gives it');

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
  console.log(bad ? '\natmosphere: ' + bad + ' FAILURE(S)' : '\natmosphere: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
