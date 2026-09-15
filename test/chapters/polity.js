const { browser, BASE } = require('../lib');

/* Chapter 5 of Understanding Society: India and Beyond — State and Society up
   to 1000 CE. (Slug 'polity', not 'state'; see test/chapters.js.)

   This chapter is mostly dates, terms and places, so most of what follows is
   checked exactly against the printed figure: Fig. 5.1's four political phases
   with their own boundaries, the dated events from the timeline that runs along
   the foot of every page, the four Vedas and the four parts inside each, the
   sixteen mahājanapadas, Kauṭilya's seven limbs.

   The two benches that carry a mechanism get checked as mechanisms. M4's whole
   point is the step where the binding stops being kinship and becomes
   territory, so that flip is asserted on both sides. M10's ballot pot is
   random by design, so what is checked is the invariant — a leaf leaves the
   pot, a committee fills, and no name is ever drawn twice. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'polity-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1400);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const count = s => parseInt(String(s).trim(), 10);
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

  // ---- M1: Fig. 5.1's phases, and the dated events along the foot of each page
  console.log('== M1  three thousand years');
  /* Probe each phase on both sides of its boundary. A strip whose bands are a
     century out still looks perfectly convincing on screen. */
  const PHASE = [
    [-2000, /Kin-based/], [-1001, /Kin-based/],
    [-1000, /Janapadas/], [-301,  /Janapadas/],
    [-300,  /Empires/],   [299,   /Empires/],
    [300,   /Regional/],  [1000,  /Regional/]
  ];
  for (const [y, re] of PHASE) {
    await set('timS', y);
    if (!re.test(await txt('timA'))) fail(y + ' is in phase "' + (await txt('timA')) + '", expected ' + re);
  }
  await set('timS', -2000);
  if ((await txt('timSV')) !== '2000 BCE') fail('the left end reads "' + (await txt('timSV')) + '"');
  await set('timS', 1000);
  if ((await txt('timSV')) !== '1000 CE') fail('the right end reads "' + (await txt('timSV')) + '"');
  // dated events, each read at a year the chapter's own timeline puts it in
  /* Single years, not round ones: the chapter dates a great deal to one year —
     321 BCE, 78 CE, 427 CE — and a slider that cannot stop on those years
     cannot show them at all. */
  const EVENTS = [
    [-1800, /Vedic period/,       'timC'],
    [-321,  /Mauryan empire/,     'timB'],
    [-250,  /A[sś]hoka/,          'timB'],
    [-250,  /Dhamma/,             'timC'],
    [-185,  /[SŚ]hunga/,          'timB'],
    [78,    /Saka Era/,           'timB'],
    [427,   /Nalanda/,            'timC'],
    [480,   /Vallabh/,            'timC'],
    [500,   /[ĀA]ryabha/,         'timC'],
    [543,   /Pulake[śs]hin/,      'timB'],
    [606,   /Har[sṣ]havardhana/,  'timB'],
    [640,   /Xuanzang/,           'timC'],
    [712,   /Arab conquest/,      'timB'],
    [985,   /R[āa]jar[āa]ja/,     'timB'],
    [985,   /Brihadeeshwara/,     'timC']
  ];
  for (const [y, re, id] of EVENTS) {
    await set('timS', y);
    if (!re.test(await txt(id))) fail(y + ' ' + id + ' reads "' + (await txt(id)) + '", expected ' + re);
  }
  if (!await done('m1')) fail('M1 did not complete after all four phases were visited');
  console.log('   four phases on the right side of every boundary, and the dated events land');

  // ---- M2: the four Vedas, each with what the chapter says about it
  console.log('== M2  the four Vedas');
  const VED = {
    'Ṛigveda':     [/earliest/i, /1,028/, /poetry/i],
    'Sāmaveda':    [/chant/i,    /Ṛigveda/, /svara/],
    'Yajurveda':   [/performance/i, /prose/, /yaj[ñn]a/],
    'Atharvaveda': [/everyday/i, /hymns/, /evil/i]
  };
  const vedas = await chips('vedOpts');
  if (vedas.length !== 4) fail('M2 offers ' + vedas.length + ' Vedas, expected 4');
  for (const name of Object.keys(VED)) {
    if (!vedas.includes(name)) { fail('M2 is missing "' + name + '"'); continue; }
    await tap('vedOpts', name);
    const got = [await txt('vedA'), await txt('vedB'), await txt('vedC')];
    VED[name].forEach((re, i) => {
      if (!re.test(got[i])) fail(name + ' field ' + i + ' reads "' + got[i] + '", expected ' + re);
    });
  }
  await tap('vedOpts', 'Ṛigveda');
  if (!/Sapta-Sindhu/.test(await txt('vedTxt'))) fail('the Ṛigveda note does not place it in Sapta-Sindhu');
  if (!/Bharata/.test(await txt('vedTxt'))) fail('the Ṛigveda note does not mention the name Bharata');
  if (!await done('m2')) fail('M2 did not complete after three Vedas were opened');
  console.log('   four Vedas, each with the description the chapter gives it');

  // ---- M4: the step where kinship stops and territory starts
  console.log('== M4  kula to mahājanapada');
  const UNITS = ['Kula', 'Grāma', 'Viśha', 'Jana', 'Janapada', 'Mahājanapada'];
  for (let v = 0; v < UNITS.length; v++) {
    await set('nesS', v);
    if ((await txt('nesSV')) !== UNITS[v]) {
      fail('nesS=' + v + ' is "' + (await txt('nesSV')) + '", expected "' + UNITS[v] + '"');
    }
    const want = v <= 3 ? 'Kinship' : 'Territory';
    if ((await txt('nesB')) !== want) {
      fail(UNITS[v] + ' is bound by "' + (await txt('nesB')) + '", expected ' + want);
    }
  }
  await set('nesS', 4);
  if (!/set its feet/.test(await txt('nesA'))) fail('janapada is glossed "' + (await txt('nesA')) + '"');
  if (!/1000 and 600 BCE/.test(await txt('nesC'))) fail('the janapada note misses the 1000–600 BCE transition');
  await set('nesS', 3);
  if (!/pa[ñn]chajana/i.test(await txt('nesC'))) fail('the jana note does not name the pañchajana');
  await set('nesS', 5);
  if (!/Magadha/.test(await txt('nesC'))) fail('the mahājanapada note does not name Magadha');
  if (!await done('m4')) fail('M4 did not complete after four units were visited');
  console.log('   kinship for the first four, territory for the last two');

  // ---- M6: Fig. 5.4, all sixteen plus the three crowned kings
  console.log('== M6  sixteen, and then three');
  const WANT = ['Kamboja', 'Gandhāra', 'Kuru', 'Matsya', 'Śhūrasena', 'Pañchāla', 'Vatsa', 'Kosala',
                'Malla', 'Kāśhī', 'Vṛijji', 'Magadha', 'Anga', 'Chedi', 'Avanti', 'Aśhmaka',
                'Cheras', 'Cholas', 'Pandyas'];
  const got = [];
  for (let v = 0; v <= 18; v++) { await set('mjpS', v); got.push(await txt('mjpSV')); }
  WANT.forEach(n => { if (!got.includes(n)) fail('M6 never shows "' + n + '"'); });
  if (got.length !== 19) fail('M6 has ' + got.length + ' entries, expected 19');
  // the emblems of the three crowned kings, which the chapter gives explicitly
  const EMBLEM = { 'Cheras': /bow/i, 'Cholas': /tiger/i, 'Pandyas': /fish/i };
  for (const [name, re] of Object.entries(EMBLEM)) {
    await set('mjpS', got.indexOf(name));
    if (!re.test(await txt('mjpB'))) fail(name + ' note does not give its emblem: "' + (await txt('mjpB')) + '"');
  }
  await set('mjpS', got.indexOf('Magadha'));
  if (!/Mauryan empire/.test(await txt('mjpB'))) fail('the Magadha note does not reach the Mauryan empire');
  await set('mjpS', got.indexOf('Vṛijji'));
  if (!/ga[ṇn]a|sa[ṁm]gha|republic/i.test(await txt('mjpB'))) {
    fail('the Vṛijji note does not say it was a republic: "' + (await txt('mjpB')) + '"');
  }
  await set('mjpS', got.indexOf('Aśhmaka'));
  if (!/Vindhya|Deccan/i.test(await txt('mjpA') + ' ' + await txt('mjpB'))) {
    fail('Aśhmaka is not placed south of the Vindhyas');
  }
  if (!await done('m6')) fail('M6 did not complete after four were visited');
  console.log('   all nineteen, with Magadha, Vṛijji and the three emblems as printed');

  // ---- M7: Kauṭilya's seven, and only seven
  console.log('== M7  the saptāṁga wheel');
  const SAPT = {
    'Swāmi': /king/i, 'Amātya': /minister|official/i, 'Janapada': /territory/i,
    'Durga': /fortif/i, 'Koṣha': /treasur/i, 'Daṇḍa': /defence|law and order/i, 'Mitra': /allies/i
  };
  const limbs = await chips('sapOpts');
  if (limbs.length !== 7) fail('the wheel has ' + limbs.length + ' limbs, expected 7');
  for (const [name, re] of Object.entries(SAPT)) {
    if (!limbs.includes(name)) { fail('M7 is missing "' + name + '"'); continue; }
    await tap('sapOpts', name);
    if (!re.test(await txt('sapA'))) fail(name + ' is glossed "' + (await txt('sapA')) + '", expected ' + re);
  }
  await tap('sapOpts', 'Amātya');
  if (!/mantri/i.test(await txt('sapTxt'))) fail('the amātya note does not name the mantri-pariṣhad');
  await tap('sapOpts', 'Koṣha');
  if (!/one-sixth/.test(await txt('sapTxt'))) fail('the koṣha note does not give the one-sixth land tax');
  if (!await done('m7')) fail('M7 did not complete after four limbs were opened');
  console.log('   seven limbs, each glossed as Kauṭilya glosses it');

  // ---- M10: the ballot pot. Random by design, so check the invariants.
  console.log('== M10 the ballot pot');
  if (count(await txt('potA')) !== 12) fail('the pot starts with ' + (await txt('potA')) + ' leaves, expected 12');
  if ((await txt('potB')) !== '0 of 5') fail('committees start at "' + (await txt('potB')) + '"');
  const drawn = [];
  for (let i = 1; i <= 5; i++) {
    const before = count(await txt('potA'));
    await page.click('#potDraw');
    await page.waitForTimeout(120);
    const after = count(await txt('potA'));
    if (after !== before - 1) fail('draw ' + i + ' took the pot from ' + before + ' to ' + after);
    if ((await txt('potB')) !== i + ' of 5') fail('after draw ' + i + ' committees read "' + (await txt('potB')) + '"');
    const note = await txt('potTxt');
    const m = note.match(/name (\d+)/i);
    if (i < 5) {
      if (!m) { fail('draw ' + i + ' names nobody: "' + note + '"'); continue; }
      /* A pot that can return the same leaf twice is not a ballot — it is a
         dice roll, and the whole point of Kudavolai is that it is neither. */
      if (drawn.includes(m[1])) fail('name ' + m[1] + ' was drawn twice');
      drawn.push(m[1]);
    }
  }
  if (!/seated|committees/i.test(await txt('potTxt'))) fail('the fifth draw does not report the assembly seated');
  if (!await done('m10')) fail('M10 did not complete after five draws');
  // and a sixth press starts a fresh pot rather than doing nothing
  await page.click('#potDraw');
  await page.waitForTimeout(120);
  if (count(await txt('potA')) !== 12) fail('pressing again did not refill the pot');
  console.log('   twelve leaves, five committees, and no name drawn twice');

  // ---- M11: the four varṇas, and the family that complicates them
  console.log('== M11 four varṇas, and one family');
  const VAR = {
    'Brāhmaṇa':  [/teach the Vedas/i, /land manager/i],
    'Kṣhatriya': [/[Ww]arfare/,       /Nandas|Mauryas/],
    'Vaiśhya':   [/[Aa]griculture/,   /silk weavers/i],
    'Śhūdra':    [/[Aa]ssist/,        /animal husbandry/i]
  };
  const varnas = await chips('varOpts');
  if (varnas.length !== 4) fail('M11 offers ' + varnas.length + ' varṇas, expected 4');
  for (const [name, res] of Object.entries(VAR)) {
    if (!varnas.includes(name)) { fail('M11 is missing "' + name + '"'); continue; }
    await tap('varOpts', name);
    const fields = [await txt('varA'), await txt('varB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  if (!await done('m11')) fail('M11 did not complete after all four were opened');
  console.log('   what each was expected to do, and what the record shows them doing');

  // ---- M13: the four āśhramas in Fig. 5.8's order
  console.log('== M13 one life, four stages');
  const ASH = [
    [0, 'Brahmacharya', /studentship/i, /gurukula/i],
    [1, 'Gṛihastha',    /householder/i, /house/i],
    [2, 'Vānaprastha',  /forest/i,      /household/i],
    [3, 'Saṁnyāsa',     /[Rr]enunciation/, /no fixed home/i]
  ];
  for (const [v, name, aRe, bRe] of ASH) {
    await set('ashS', v);
    if ((await txt('ashSV')) !== name) fail('ashS=' + v + ' is "' + (await txt('ashSV')) + '", expected "' + name + '"');
    if (!aRe.test(await txt('ashA'))) fail(name + ' reads "' + (await txt('ashA')) + '"');
    if (!bRe.test(await txt('ashB'))) fail(name + ' place reads "' + (await txt('ashB')) + '"');
  }
  await set('ashS', 3);
  if (!/parivr[āa]jaka|bhik[ṣs]hu|[śs]hrama[ṇn]a/i.test(await txt('ashC'))) {
    fail('the saṁnyāsa note names none of the words for a renouncer');
  }
  if (!await done('m13')) fail('M13 did not complete after three stages were visited');
  console.log('   four stages, in Fig. 5.8’s order, each in its own setting');

  // ---- M15: the routes, the ports and the guilds
  console.log('== M15 two roads and a bank');
  const TRA = {
    'Uttarāpatha':   [/northern route/i, /6th century BCE/],
    'Dakṣhiṇāpatha': [/southern route/i, /6th century BCE/],
    'The ports':     [/Muziris/,         /early centuries CE/i],
    'The guilds':    [/[Śs]hre[ṇn][īi]/, /6th century BCE/]
  };
  const routes = await chips('traOpts');
  if (routes.length !== 4) fail('M15 offers ' + routes.length + ' options, expected 4');
  for (const [name, res] of Object.entries(TRA)) {
    if (!routes.includes(name)) { fail('M15 is missing "' + name + '"'); continue; }
    await tap('traOpts', name);
    const fields = [await txt('traA'), await txt('traB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('traOpts', 'The guilds');
  const gnote = await txt('traTxt');
  ['eighteen', 'guild courts'].forEach(k => {
    if (!gnote.includes(k)) fail('the guilds note omits "' + k + '"');
  });
  if (!/bank/i.test(gnote)) fail('the guilds note does not say they acted as banks');
  // the four ports the chapter names, all in one field
  await tap('traOpts', 'The ports');
  const ports = await txt('traA');
  ['Muziris', 'Kāveripaṭṭinam', 'Arikameḍu', 'Masulipaṭnam'].forEach(p => {
    if (!ports.includes(p)) fail('the ports list omits ' + p + ': "' + ports + '"');
  });
  if (!await done('m15')) fail('M15 did not complete after three were opened');
  console.log('   two routes, four ports, and guilds that were also banks');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');
  await answerRows('g5', [
    ['smaller body', 'Sabhā'], ['judicial function', 'Sabhā'],
    ['larger assembly', 'Samiti'], ['broader population', 'Samiti'],
    ['popular gathering', 'Vidhata'], ['warfare', 'Vidhata']
  ]);
  if (!/6 of 6|All six/i.test(await txt('g5s'))) fail('M5 scored ' + (await txt('g5s')));

  await answerRows('g9', [
    ['bhukti', 'North'], ['viṣhaya', 'North'], ['adhiṣhṭhāna', 'North'], ['vithi', 'North'],
    ['manḍalam', 'South'], ['valanāḍu', 'South'], ['nāḍu', 'South'], ['kūṛram', 'South']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g9s'))) fail('M9 scored ' + (await txt('g9s')));
  console.log('   the three assemblies and the two vocabularies key correctly');

  // M3, the eight sources
  const SRC = {
    'Ṛigveda': /1,028 hymns/,
    'Arthaśhāstra': /carriage wheel/,
    'Śhānti Parva': /Mah[āa]bh[āa]rata/,
    'Junagadh rock inscription': /700 years/,
    'Uttaramerur inscription': /ballot pot/,
    'Sangam literature': /Cheras, Cholas and Pandyas/,
    'Nāśhik cave inscription': /weavers/,
    'Damodarpur copper plates': /district office/
  };
  const left = await page.$$eval('#g3a button', ns => ns.map(n => n.textContent.trim()));
  const right = await page.$$eval('#g3b button', ns => ns.map(n => n.textContent.trim()));
  for (const k of Object.keys(SRC)) {
    if (!left.includes(k)) { fail('M3 is missing the source "' + k + '"'); continue; }
    if (!right.some(t => SRC[k].test(t))) fail('nothing in M3 pairs "' + k + '" with what it tells us');
  }
  console.log('   eight sources, each with something only it can tell us');

  // M8 and M14, the two pick lists
  for (const t of ['Protect his subjects from external threats',
                   'Protect them from internal disorder',
                   'Judge cases of abduction, robbery, theft and adultery',
                   'Judge the strong and the weak impartially and fairly',
                   'Protect the country from calamities, and do good to the people',
                   'Be trained himself in governance and public administration']) {
    await tap('g8', t);
  }
  await page.click('#g8check');
  await page.waitForTimeout(250);
  if (!/9 of 9|Right\./i.test(await txt('g8s'))) fail('M8 scored ' + (await txt('g8s')));
  if (!await done('m8')) fail('M8 did not complete');

  const w14 = await chips('g14');
  for (const t of w14) {
    if (/barred from every kind|No woman is named/.test(t)) continue;
    await tap('g14', t);
  }
  await page.click('#g14check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right/i.test(await txt('g14s'))) fail('M14 scored ' + (await txt('g14s')));
  if (!await done('m14')) fail('M14 did not complete');
  console.log('   the king’s duties and the record on women both key correctly');

  // M12, the varṇa/jāti grid — two rows are true of both, which is the point
  const KEY12 = {
    'Fixed at four in number':                                      [1, 0],
    'No restriction at all on the number':                          [0, 1],
    'First referred to in the Puruṣhasūkta of the Ṛigveda':         [1, 0],
    'Grew from intermarriage, endogamy and territorial difference': [0, 1],
    'Kept growing as new groups and occupations appeared':          [0, 1],
    'Allowed considerable mobility, within it and across it':       [1, 1]
  };
  const g12rows = await page.$$eval('#g12 tr td.lbl', ns => ns.map(n => n.textContent.trim()));
  if (g12rows.length !== 6) fail('M12 has ' + g12rows.length + ' rows, expected 6');
  for (const l of g12rows) if (!(l in KEY12)) fail('unexpected M12 row: ' + l);
  for (const [label, want] of Object.entries(KEY12)) {
    for (let c = 0; c < want.length; c++) {
      for (let t = 0; t < (want[c] ? 1 : 2); t++) {
        const hit = await page.evaluate(([lbl, col]) => {
          const rows = [...document.querySelectorAll('#g12 tr')];
          const row = rows.find(r => r.querySelector('td.lbl') &&
                                     r.querySelector('td.lbl').textContent.trim() === lbl);
          if (!row) return false;
          const td = row.querySelector('td.c[data-c="' + col + '"]');
          if (!td) return false;
          td.click(); return true;
        }, [label, c]);
        if (!hit) { fail('M12 has no cell for "' + label + '" column ' + c); break; }
        await page.waitForTimeout(25);
      }
    }
  }
  await page.click('#g12check');
  await page.waitForTimeout(250);
  if (!/12 of 12|All twelve/i.test(await txt('g12s'))) fail('M12 scored ' + (await txt('g12s')));
  if (!await done('m12')) fail('M12 did not complete on a full correct table');
  console.log('   varṇa, jāti, and the two lines that are true of both');

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
  console.log(bad ? '\npolity: ' + bad + ' FAILURE(S)' : '\npolity: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
