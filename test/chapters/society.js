const { browser, BASE } = require('../lib');

/* Chapter 1 of Understanding Society: India and Beyond.

   A Social Science chapter has no equations to check, so the assertions here
   are of a different kind: every answer key must match what the printed
   chapter actually says, and every bench must move through the states its
   prose claims it does. The three sliders are checked at every stop, not just
   at the ends — a stage nobody can reach is the same bug as a wrong answer.

   Named cases come from the page: the morning of systems, the drought and its
   five consequences, the five geography tools, the figures on pages 7 and 8
   (Sāmaveda, Tirukkuṟaḷ, the terracotta figurine, the Viṣhṇu sculpture, the
   Brahmi and Kannada inscriptions, the Samudragupta and Jahangir coins), and
   the Panchayati Raj ladder. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'society-chapter.html');
  await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
  await page.waitForTimeout(1300);

  const txt  = id => page.textContent('#' + id).then(s => s.trim());
  const num  = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  const done = id => page.evaluate(i => !!(S.done && S.done[i]), id);
  const set  = async (id, v) => {
    await page.$eval('#' + id, (n, v) => {
      n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(v));
    await page.waitForTimeout(50);
  };
  const chips = box => page.$$eval('#' + box + ' button', ns => ns.map(n => n.textContent.trim()));
  const tap = async (box, label) => {
    await page.$$eval('#' + box + ' button', (ns, l) => {
      const e = ns.find(q => q.textContent.trim() === l); if (e) e.click();
    }, label);
    await page.waitForTimeout(60);
  };

  // ---- M1: five parts of a morning, four of them enough to finish
  console.log('== M1  a day already made of systems');
  const day = await chips('dayOpts');
  ['The house', 'The food', 'The road', 'The school', 'The electricity'].forEach(t => {
    if (!day.includes(t)) fail('M1 is missing "' + t + '" — the chapter lists all five');
  });
  await tap('dayOpts', 'The food');
  const foodNote = await txt('dayTxt');
  if (!/harvested/.test(foodNote) || !/transported/.test(foodNote)) {
    fail('M1 food note does not trace the chain the chapter gives: "' + foodNote + '"');
  }
  for (const t of ['The house', 'The road', 'The school']) await tap('dayOpts', t);
  if (!await done('m1')) fail('M1 did not complete after four of the five were tapped');
  console.log('   ' + day.length + ' parts of the morning, four completes the mission');

  // ---- M4: six stages, every one reachable and every one distinct
  console.log('== M4  from camp to city');
  const STAGES = ['Depending on nature', 'Growing crops', 'Domesticating animals',
                  'Building settlements', 'Villages become towns', 'Towns become cities'];
  const seenC = new Set();
  for (let s = 0; s <= 5; s++) {
    await set('growS', s);
    const name = await txt('growSV');
    if (name !== STAGES[s]) fail('growS=' + s + ' reads "' + name + '", expected "' + STAGES[s] + '"');
    const c = await txt('growC');
    if (!c || c === '—') fail('growS=' + s + ' has no "now has to be organised" line');
    seenC.add(c);
  }
  if (seenC.size !== 6) fail('the six stages share ' + seenC.size + ' distinct answers; each should differ');
  if (!await done('m4')) fail('M4 did not complete after all six stages were visited');
  // the last stage is the one that names institutions, which is the chapter's point
  await set('growS', 5);
  if (!/[Gg]overnance/.test(await txt('growC'))) fail('the city stage does not mention governance');
  console.log('   six stages, all distinct, ending at governance and law');

  // ---- M7: one drought, five consequences, all five required
  console.log('== M7  one drought, five kinds of damage');
  const DRO = { Environment: /crops?/i, Economy: /incomes?/i, Politics: /relief/i,
                Society: /migrat/i, Culture: /scarcity/i };
  const droChips = await chips('droOpts');
  for (const k of Object.keys(DRO)) {
    if (!droChips.includes(k)) { fail('M7 has no "' + k + '" consequence'); continue; }
    await tap('droOpts', k);
    const note = await txt('droTxt');
    if (!DRO[k].test(note)) fail(k + ' note does not match the chapter: "' + note + '"');
    if (!note.startsWith(k)) fail(k + ' note is not labelled with its own domain');
  }
  if (!await done('m7')) fail('M7 did not complete after all five consequences were opened');
  console.log('   crops, incomes, relief, migration and coping — all five present');

  // ---- M9: the five tools the chapter names for Geography
  console.log('== M9  one district, five tools');
  const tools = await chips('geoTools');
  ['Sketch map', 'Globe', 'Atlas', 'GIS layers', 'Infographic'].forEach(t => {
    if (!tools.includes(t)) fail('M9 is missing the "' + t + '" tool');
  });
  const notes = new Set();
  for (const t of tools) {
    await tap('geoTools', t);
    const n = await txt('geoTxt');
    if (!n || n.length < 20) fail(t + ' has no explanation');
    notes.add(n);
  }
  if (notes.size !== tools.length) fail('two tools share an explanation');
  await tap('geoTools', 'Globe');
  if (!/Africa|Southeast Asia/.test(await txt('geoTxt'))) {
    fail('the globe does not connect the coastline to contact beyond India');
  }
  if (!await done('m9')) fail('M9 did not complete after every tool was tried');
  console.log('   five tools, five different questions about the same district');

  // ---- M11: the ladder of governance, bottom to top
  console.log('== M11 how far down power goes');
  const LEVELS = ['Gram Sabha', 'Gram Panchayat', 'Panchayat Samiti',
                  'Zila Parishad', 'State government', 'Union government'];
  for (let s = 0; s <= 5; s++) {
    await set('panS', s);
    const name = await txt('panSV');
    if (name !== LEVELS[s]) fail('panS=' + s + ' reads "' + name + '", expected "' + LEVELS[s] + '"');
    if ((await txt('panB')) === '—') fail(LEVELS[s] + ' names no decision');
  }
  await set('panS', 0);
  if (!/adult voter/i.test(await txt('panA'))) fail('the Gram Sabha is not described as every adult voter');
  await set('panS', 5);
  if (!/Parliament/i.test(await txt('panA'))) fail('the Union level does not mention Parliament');
  if (!await done('m11')) fail('M11 did not complete after every level was visited');
  console.log('   six rungs from the Gram Sabha to the Union government');

  // ---- M12: the arithmetic behind the trade-off must actually hold
  console.log('== M12 keep it or sell it');
  const HARVEST = 12, PER_MONTH = 1, PRICE = 2400;
  for (const pct of [0, 25, 50, 75, 100]) {
    await set('ecoS', pct);
    const sold = HARVEST * pct / 100, kept = HARVEST - sold;
    const months = num(await txt('ecoA')), income = num(await txt('ecoB'));
    if (Math.abs(months - kept / PER_MONTH) > 0.06) {
      fail(pct + '%: ' + months + ' months of food, expected ' + (kept / PER_MONTH).toFixed(1));
    }
    if (Math.abs(income - sold * PRICE) > 1) {
      fail(pct + '%: income ₹' + income + ', expected ₹' + (sold * PRICE));
    }
  }
  // the trade-off has to be a real one: neither extreme may read as the good outcome
  await set('ecoS', 0);
  const allKept = await txt('ecoC');
  await set('ecoS', 100);
  const allSold = await txt('ecoC');
  await set('ecoS', 50);
  const middle = await txt('ecoC');
  if (allKept === middle) fail('selling nothing reads the same as a balanced choice');
  if (allSold === middle) fail('selling everything reads the same as a balanced choice');
  if (!/runs out/i.test(allSold)) fail('selling the whole harvest does not warn that the food runs out');
  if (!await done('m12')) fail('M12 did not complete after all three bands were visited');
  console.log('   12 quintals, one a month, ₹2,400 each — and both extremes cost something');

  // ---- the graded activities: the keys must match the printed chapter
  console.log('== answer keys against the printed chapter');

  // M10, the four kinds of source, straight off pages 7 and 8
  const SOURCES = [
    ['Sāmaveda', 'Literary'], ['Tirukkuṟaḷ', 'Literary'],
    ['terracotta figurine', 'Archaeological'], ['sculpture of Viṣhṇu', 'Archaeological'],
    ['Brahmi inscription', 'Epigraphic'], ['Kannada inscription', 'Epigraphic'],
    ['Samudragupta', 'Numismatic'], ['Jahangir', 'Numismatic']
  ];
  const rows = await page.$$('#g10 .qrow');
  if (rows.length !== SOURCES.length) fail('M10 has ' + rows.length + ' sources, expected ' + SOURCES.length);
  for (let i = 0; i < rows.length; i++) {
    const label = await rows[i].$eval('span.t', n => n.textContent.trim());
    const want = SOURCES.find(s => label.includes(s[0]));
    if (!want) { fail('unexpected source row: ' + label); continue; }
    const btns = await rows[i].$$('button');
    const names = await Promise.all(btns.map(x => x.evaluate(n => n.textContent.trim())));
    await btns[names.indexOf(want[1])].click();
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(400);
  if (!/8 of 8|All eight/i.test(await txt('g10s'))) {
    fail('M10 scored ' + (await txt('g10s')) + ' when every source was sorted as the chapter has it');
  }
  if (!await done('m10')) fail('M10 did not record after all eight rows were answered');
  console.log('   manuscripts literary, objects archaeological, stone epigraphic, coins numismatic');

  // M5, the knowledge traditions
  const TRAD = {
    'Pañchamahābhūtas': /five great elements/i,
    'Vasudhaiva kuṭumbakam': /one family/i,
    'Arthaśhāstra': /Kauṭilya/,
    'Itihāsa-purāṇa': /stories/i,
    'Rājadharma': /ruler/i
  };
  const left = await page.$$eval('#g5a button', ns => ns.map(n => n.textContent.trim()));
  const right = await page.$$eval('#g5b button', ns => ns.map(n => n.textContent.trim()));
  for (const k of Object.keys(TRAD)) {
    if (!left.includes(k)) { fail('M5 is missing "' + k + '"'); continue; }
    if (!right.some(t => TRAD[k].test(t))) fail('nothing in M5 explains "' + k + '"');
  }
  console.log('   five traditions, each with the meaning the chapter gives it');

  // M8, the disciplines and their questions
  const DISC = {
    'Geography': /[Ww]here/, 'History': /over time/i,
    'Political Science': /power/i, 'Economics': /resources/i
  };
  const dLeft = await page.$$eval('#g8a button', ns => ns.map(n => n.textContent.trim()));
  const dRight = await page.$$eval('#g8b button', ns => ns.map(n => n.textContent.trim()));
  for (const k of Object.keys(DISC)) {
    if (!dLeft.includes(k)) { fail('M8 is missing "' + k + '"'); continue; }
    if (!dRight.some(t => DISC[k].test(t))) fail('nothing in M8 asks a "' + k + '" question');
  }
  console.log('   the four core disciplines, each with its own question');

  /* ---- M14: ten questions, and each one has exactly one right answer.
     The question set lives inside Q.boss's closure, so it cannot be read out
     and marked here. What can be checked is the invariant that matters: for
     every question the reader is shown, answering it marks exactly one option
     correct and produces an explanation. A question with two right answers,
     or none, breaks that immediately. */
  console.log('== M14 chapter boss');
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
    if (!/show/.test(await page.$eval('#bossWhy', n => n.className))) {
      fail(tier + ' gave no explanation after the answer');
    }
    const why = (await txt('bossWhy')).length;
    if (why < 40) fail(tier + ' explanation is only ' + why + ' characters');
    await page.waitForTimeout(2700);
  }
  if (asked.size < 5) fail('the boss presented only ' + asked.size + ' distinct questions');
  console.log('   ' + asked.size + ' questions seen, each with exactly one right answer and a reason');

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? '\nsociety: ' + bad + ' FAILURE(S)' : '\nsociety: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
