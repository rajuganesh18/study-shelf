const { browser, BASE } = require('../lib');

/* Chapter 6 of Understanding Society: India and Beyond — Democracy.

   Almost everything in this chapter is a date, an article number or a printed
   figure, so almost everything below is checked exactly against the book: the
   two dates of the Constitution, the drafting duration, the six Fundamental
   Rights and their article ranges, Fig. 6.4's four types with the bullets the
   figure gives each, the five-country table, the five DON'T MISS OUT numbers,
   and the two reservation articles with their state counts.

   The two benches that carry a mechanism are checked as mechanisms. M7 is the
   separation of powers, so it is answered in full, has to mark six out of six,
   and has to fit inside a 390px screen — it began as a three-column tick table
   whose third column was cut off the right-hand edge with every other test
   still green. M14 is a sequence, so what is asserted is that it advances one
   stage per press, arrives, and then starts over rather than dying at the
   end. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'democracy-chapter.html');
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

  // ---- M1: the sixteen landmarks, and the era each one sits in
  console.log('== M1  the long road');
  /* Every era boundary is probed on both sides. A strip whose bands are one
     landmark out still looks entirely convincing on screen. */
  const ERA = [
    [0, /Early India/], [3, /Early India/],
    [4, /Colonial rule/], [6, /Colonial rule/],
    [7, /Founding/], [10, /Founding/],
    [11, /The Republic/], [15, /The Republic/]
  ];
  for (const [i, re] of ERA) {
    await set('roadS', i);
    if (!re.test(await txt('roadB'))) fail('landmark ' + i + ' is in era "' + (await txt('roadB')) + '", expected ' + re);
  }
  // the dated landmarks, each at the index the chapter's own order puts it
  const LAND = [
    [0,  /Sabha, Samiti and Vidhata/, /Vedic/],
    [1,  /ga[ṇn]as and sa[ṁm]ghas/,   /Early times/],
    [2,  /10\.191\.3/,               /Vedic/],
    [3,  /Bauddha Sa[ṁm]gha/,         /Gautama Buddha/],
    [5,  /British colonise/,          /19th century/],
    [7,  /Constituent Assembly is formed/, /1946/],
    [8,  /independence/,              /1947/],
    [9,  /Constitution is adopted/,   /26 November 1949/],
    [10, /comes into force/,          /26 January 1950/],
    [11, /National Emergency/,        /June 1975/],
    [12, /Emergency is lifted/,       /1977/],
    [13, /RTI Act/,                   /2005/],
    [14, /Article 21A/,               /2009/],
    [15, /96\.8 crore/,               /2024/]
  ];
  for (const [i, cRe, aRe] of LAND) {
    await set('roadS', i);
    if (!aRe.test(await txt('roadA'))) fail('landmark ' + i + ' is dated "' + (await txt('roadA')) + '", expected ' + aRe);
    if (!cRe.test(await txt('roadC'))) fail('landmark ' + i + ' reads "' + (await txt('roadC')) + '", expected ' + cRe);
  }
  await set('roadS', 15);
  if ((await txt('roadSV')) !== '16 of 16') fail('the last landmark reads "' + (await txt('roadSV')) + '"');
  if (!await done('m1')) fail('M1 did not complete after all four eras were visited');
  console.log('   sixteen landmarks, four eras, and every printed date where the chapter puts it');

  // ---- M3: the Assembly, the committee, the debates and Article 368
  console.log('== M3  making the Constitution');
  const CAS = {
    'The Assembly':           [/1946/, /independence in 1947/],
    'The Drafting Committee': [/committee/i, /Ambedkar/],
    'The Debates':            [/Constituent Assembly Debates/, /global spread/],
    'Article 368':            [/amendments/, /flexible/]
  };
  const cas = await chips('casOpts');
  if (cas.length !== 4) fail('M3 offers ' + cas.length + ' cards, expected 4');
  for (const [name, res] of Object.entries(CAS)) {
    if (!cas.includes(name)) { fail('M3 is missing "' + name + '"'); continue; }
    await tap('casOpts', name);
    const fields = [await txt('casA'), await txt('casB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* The one figure in this chapter that is a duration rather than a date, and
     the two dates it runs between. */
  await tap('casOpts', 'The Assembly');
  const asm = await txt('casTxt');
  ['2 years, 11 months and 18 days', 'longest written Constitution',
   '26 November 1949', '26 January 1950'].forEach(k => {
    if (!asm.includes(k)) fail('the Assembly note omits "' + k + '"');
  });
  if (!await done('m3')) fail('M3 did not complete after three cards were opened');
  console.log('   1946 to 1950, the drafting duration, and the chairman of the committee');

  // ---- M4: the seven principles, in the chapter's own order
  console.log('== M4  seven pillars');
  const PRN = [
    [0, 'Popular Sovereignty',           /ultimate source of power/i, /18/],
    [1, 'Rule of Law',                   /[Ee]quality before the law/, /court of law/i],
    [2, 'Fundamental Rights',            /[Ss]ix rights/,             /Articles 32 and 226/],
    [3, 'Separation of Powers',          /[Ll]egislature, executive and judiciary/, /[Cc]hecks and balances/],
    [4, 'Accountability and Transparency', /accountable to citizens/i, /Right to Information Act, 2005/],
    [5, 'Multi-Party System',            /[Ss]everal parties/,        /Representation of the People Act, 1951/],
    [6, 'Rights of Vulnerable Groups',   /protect all communities/i,  /Article 46/]
  ];
  for (const [v, name, aRe, bRe] of PRN) {
    await set('prnS', v);
    if ((await txt('prnSV')) !== name) fail('prnS=' + v + ' is "' + (await txt('prnSV')) + '", expected "' + name + '"');
    if (!aRe.test(await txt('prnA'))) fail(name + ' reads "' + (await txt('prnA')) + '", expected ' + aRe);
    if (!bRe.test(await txt('prnB'))) fail(name + ' is secured by "' + (await txt('prnB')) + '", expected ' + bRe);
  }
  // the multi-party threshold, which the chapter states as a number
  await set('prnS', 5);
  if (!/50 per cent/.test(await txt('prnC'))) fail('the multi-party note does not give the 50 per cent threshold');
  // Article 46, quoted rather than paraphrased
  await set('prnS', 6);
  const a46 = await txt('prnC');
  ['Scheduled Castes', 'Scheduled Tribes', 'weaker sections'].forEach(k => {
    if (!a46.includes(k)) fail('the Article 46 quotation omits "' + k + '"');
  });
  if (!await done('m4')) fail('M4 did not complete after four pillars were visited');
  console.log('   seven principles, each with the provision the chapter attaches to it');

  // ---- M6: three organs, and the three checks between them
  console.log('== M6  three organs');
  const ORG = {
    'Legislature': [/[Mm]akes the laws/, /judiciary/i],
    'Executive':   [/[Ii]mplements the laws/, /courts/i],
    'Judiciary':   [/[Ii]nterprets the laws/, /Constitution/]
  };
  const orgs = await chips('orgOpts');
  if (orgs.length !== 4) fail('M6 offers ' + orgs.length + ' cards, expected 4 (three organs and the checks)');
  for (const [name, res] of Object.entries(ORG)) {
    if (!orgs.includes(name)) { fail('M6 is missing "' + name + '"'); continue; }
    await tap('orgOpts', name);
    const fields = [await txt('orgA'), await txt('orgB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('orgOpts', 'Judiciary');
  if (!/unconstitutional/.test(await txt('orgTxt'))) fail('the judiciary note does not reach declaring a law unconstitutional');
  if (!/Public Interest Litigation/.test(await txt('orgTxt'))) fail('the judiciary note does not name Public Interest Litigation');
  await tap('orgOpts', 'Checks and balances');
  const chk = await txt('orgTxt');
  ['amend', 'review'].forEach(k => {
    if (!new RegExp(k, 'i').test(chk)) fail('the checks note omits "' + k + '"');
  });
  if (!await done('m6')) fail('M6 did not complete after three cards were opened');
  console.log('   makes, implements, interprets — and the arrows between them');

  // ---- M9: Fig. 6.4, with the bullets the figure itself gives
  console.log('== M9  four kinds of democracy');
  const TYP = {
    'Representative': [/elect their representatives/i, /India/],
    'Direct':         [/directly participate/i,        /Switzerland/],
    'Parliamentary':  [/also part of the legislature/i, /India and Canada/],
    'Presidential':   [/independent of the legislature/i, /United States/]
  };
  const typs = await chips('typOpts');
  if (typs.length !== 4) fail('M9 offers ' + typs.length + ' types, expected 4');
  for (const [name, res] of Object.entries(TYP)) {
    if (!typs.includes(name)) { fail('M9 is missing "' + name + '"'); continue; }
    await tap('typOpts', name);
    const fields = [await txt('typA'), await txt('typB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('typOpts', 'Direct');
  if (!/difficult to follow in large countries/i.test(await txt('typTxt'))) {
    fail('the direct-democracy note drops the figure\'s own caveat about large countries');
  }
  await tap('typOpts', 'Parliamentary');
  if (!/accountable to the legislature/i.test(await txt('typTxt'))) {
    fail('the parliamentary note does not say the executive is accountable to the legislature');
  }
  if (!await done('m9')) fail('M9 did not complete after three types were opened');
  console.log('   representative and direct, parliamentary and presidential, as Fig. 6.4 splits them');

  // ---- M10: the five-country table, exactly as printed
  console.log('== M10 five countries');
  const CNY = {
    'India':                    [/Parliamentary/, /President \(Head of State\)/, /council of ministers/],
    'Canada':                   [/Parliamentary/, /Governor-General/,            /Prime Minister/],
    'United Kingdom':           [/Constitutional Monarchy/, /Monarch \(Head of State\)/, /unwritten constitution/i],
    'Switzerland':              [/Direct Democracy/, /Head of the Government/,   /Federal Council/],
    'United States of America': [/Presidential/,  /Head of the Government/,      /two major parties/]
  };
  const cnys = await chips('cnyOpts');
  if (cnys.length !== 5) fail('M10 offers ' + cnys.length + ' countries, expected 5');
  for (const [name, res] of Object.entries(CNY)) {
    if (!cnys.includes(name)) { fail('M10 is missing "' + name + '"'); continue; }
    await tap('cnyOpts', name);
    const fields = [await txt('cnyA'), await txt('cnyB'), await txt('cnyTxt')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* The one row in the table that says something no other row does: the UK has
     no written constitution, and India's key features list federalism. */
  await tap('cnyOpts', 'India');
  if (!/[Ff]ederalism/.test(await txt('cnyTxt'))) fail('India\'s key features drop federalism');
  if (!await done('m10')) fail('M10 did not complete after three countries were opened');
  console.log('   five arrangements, each with the head of state and the key features printed');

  // ---- M11: the five DON'T MISS OUT numbers
  console.log('== M11 the scale of it');
  const SCL = [
    [0, 'Registered voters', /96\.8 crore/, /140 crore/],
    [1, 'One MP',            /25 lakh/,     /representation/i],
    [2, 'Languages',         /22 scheduled languages/, /cannot read/],
    [3, 'Polling stations',  /[Oo]ver one million/,    /single voter/],
    [4, 'Political parties', /2,800/,       /diversity/i]
  ];
  for (const [v, name, aRe, bRe] of SCL) {
    await set('sclS', v);
    if ((await txt('sclSV')) !== name) fail('sclS=' + v + ' is "' + (await txt('sclSV')) + '", expected "' + name + '"');
    if (!aRe.test(await txt('sclA'))) fail(name + ' reads "' + (await txt('sclA')) + '", expected ' + aRe);
    if (!bRe.test(await txt('sclB'))) fail(name + ' note reads "' + (await txt('sclB')) + '", expected ' + bRe);
  }
  if (!await done('m11')) fail('M11 did not complete after three figures were visited');
  console.log('   96.8 crore, 25 lakh, 22 languages, a million booths and 2,800 parties');

  // ---- M13: three countries, and the two reservation articles
  console.log('== M13 women and the vote');
  const WOM = {
    'USA, 1920':      [/1920/, /decades of protests/],
    'Britain, 1928':  [/1928/, /struggle/],
    'India, 1950':    [/Universal Adult Franchise/, /without discrimination/],
    'Panchayats':     [/one-third/, /every Panchayat/],
    'Municipalities': [/one-third/, /every Municipality/]
  };
  const woms = await chips('womOpts');
  if (woms.length !== 5) fail('M13 offers ' + woms.length + ' cards, expected 5');
  for (const [name, res] of Object.entries(WOM)) {
    if (!woms.includes(name)) { fail('M13 is missing "' + name + '"'); continue; }
    await tap('womOpts', name);
    const fields = [await txt('womA'), await txt('womB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* The two counts are different, and getting them the same way round is the
     whole content of the two rows. */
  await tap('womOpts', 'Panchayats');
  if (!/21 States and 2 Union Territories/.test(await txt('womTxt'))) {
    fail('the Panchayats note reads "' + (await txt('womTxt')) + '"');
  }
  await tap('womOpts', 'Municipalities');
  const mun = await txt('womTxt');
  if (!/17 States and 1 Union Territory/.test(mun)) fail('the Municipalities note reads "' + mun + '"');
  if (!/2023/.test(mun)) fail('the Municipalities note drops the "as of 2023" the chapter attaches to that count');
  await tap('womOpts', 'India, 1950');
  if (!/prolonged legal battles|protest/i.test(await txt('womTxt'))) {
    fail('the India note does not make the contrast the chapter draws');
  }
  if (!await done('m13')) fail('M13 did not complete after three cards were opened');
  console.log('   1920, 1928, 1950 — and one-third in both articles, with two different counts');

  // ---- M14: the Emergency, one stage per press
  console.log('== M14 the Emergency');
  if ((await txt('emgB')) !== '0 of 6') fail('M14 starts at "' + (await txt('emgB')) + '"');
  const STAGES = [
    [/June 1975/,        /internal disturbance/],
    [/Rights suspended/, /press was censored/],
    [/Arrests/,          /arrested/],
    [/movements/,        /Jayaprakash Narayan/],
    [/1977/,             /general elections/],
    [/result/,           /[Dd]efeat of the ruling government/]
  ];
  for (let i = 0; i < STAGES.length; i++) {
    await page.click('#emgNext');
    await page.waitForTimeout(110);
    if ((await txt('emgB')) !== (i + 1) + ' of 6') {
      fail('press ' + (i + 1) + ' left the counter at "' + (await txt('emgB')) + '"');
    }
    const [nRe, wRe] = STAGES[i];
    if (!nRe.test(await txt('emgA'))) fail('stage ' + (i + 1) + ' is "' + (await txt('emgA')) + '", expected ' + nRe);
    if (!wRe.test(await txt('emgTxt'))) fail('stage ' + (i + 1) + ' reads "' + (await txt('emgTxt')) + '", expected ' + wRe);
  }
  if (!await done('m14')) fail('M14 did not complete after all six presses');
  // and a seventh press starts over rather than doing nothing
  await page.click('#emgNext');
  await page.waitForTimeout(110);
  if ((await txt('emgB')) !== '0 of 6') fail('pressing again did not start the sequence over');
  console.log('   six stages, each with what the chapter says happened, and then a fresh start');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');

  // M5, the six Fundamental Rights and their articles
  const RIGHTS = {
    'Right to Equality':                 'Articles 14–18',
    'Right to Freedom':                  'Articles 19–22',
    'Right Against Exploitation':        'Articles 23–24',
    'Right to Freedom of Religion':      'Articles 25–28',
    'Cultural and Educational Rights':   'Articles 29–30',
    'Right to Constitutional Remedies':  'Article 32',
    'Right to Education, added in 2009': 'Article 21A'
  };
  const r5a = await page.$$eval('#g5a button', ns => ns.map(n => n.textContent.trim()));
  const r5b = await page.$$eval('#g5b button', ns => ns.map(n => n.textContent.trim()));
  if (r5a.length !== 7) fail('M5 offers ' + r5a.length + ' rights, expected 7');
  for (const [name, art] of Object.entries(RIGHTS)) {
    if (!r5a.includes(name)) fail('M5 is missing the right "' + name + '"');
    if (!r5b.includes(art))  fail('M5 is missing the articles "' + art + '"');
  }
  console.log('   six Fundamental Rights, their article ranges, and Article 21A');

  // M7, the separation of powers — answered in full
  const KEY7 = {
    'Making laws':                      'Legislature',
    'Implementing laws':                'Executive',
    'Interpreting laws':                'Judiciary',
    'Amending the Constitution':        'Legislature',
    'Declaring a law unconstitutional': 'Judiciary',
    'Public Interest Litigation':       'Judiciary'
  };
  const rows7 = await page.$$eval('#g7 tr td.lbl', ns => ns.map(n => n.textContent.trim()));
  if (rows7.length !== 6) fail('M7 has ' + rows7.length + ' rows, expected 6');
  for (const l of rows7) if (!(l in KEY7)) fail('unexpected M7 row: ' + l);
  /* Every row has to offer all three organs, or the question is answerable
     without knowing anything. */
  const opts7 = await page.$$eval('#g7 select', ns =>
    ns.map(s => [...s.options].map(o => o.value).filter(Boolean)));
  if (opts7.length !== 6) fail('M7 has ' + opts7.length + ' dropdowns, expected 6');
  opts7.forEach((o, i) => {
    ['Legislature', 'Executive', 'Judiciary'].forEach(c => {
      if (!o.includes(c)) fail('M7 row ' + i + ' does not offer "' + c + '"');
    });
  });
  for (const [label, want] of Object.entries(KEY7)) {
    const hit = await page.evaluate(([lbl, val]) => {
      const rows = [...document.querySelectorAll('#g7 tr')];
      const row = rows.find(r => r.querySelector('td.lbl') &&
                                 r.querySelector('td.lbl').textContent.trim() === lbl);
      if (!row) return false;
      const sel = row.querySelector('select');
      if (!sel) return false;
      sel.value = val; return sel.value === val;
    }, [label, want]);
    if (!hit) fail('M7 could not answer "' + label + '" with "' + want + '"');
    await page.waitForTimeout(25);
  }
  await page.click('#g7check');
  await page.waitForTimeout(250);
  if (!/6 of 6|All six/i.test(await txt('g7s'))) fail('M7 scored ' + (await txt('g7s')));
  if (!await done('m7')) fail('M7 did not complete on a full correct table');
  /* And it has to fit the phone. This is the assertion that would have caught
     the three-column tick table this mission started as, whose third column —
     Judiciary — ran off the right-hand edge of a 390px screen, unreadable and
     untappable, with every test still green. */
  const right7 = await page.evaluate(() => document.getElementById('g7').getBoundingClientRect().right);
  if (right7 > 390) fail('M7 runs ' + Math.round(right7 - 390) + 'px off a 390px screen');
  console.log('   six rows, three organs, and nothing off the edge of the screen');

  // M8, the chapter's process/institution table
  const PROC = {
    'Legislative Process':       /Parliament, State legislatures/,
    'Electoral Process':         /Election Commission/,
    'Judicial Process':          /courts/i,
    'Participatory Processes':   /[Mm]edia and civil society/,
    'Accountability Mechanisms': /CAG, CIC, Lokpal and CVC/,
    'Decentralisation':          /[Rr]ural and urban local bodies/,
    'Federalism':                /division of powers/i
  };
  const p8a = await page.$$eval('#g8a button', ns => ns.map(n => n.textContent.trim()));
  const p8b = await page.$$eval('#g8b button', ns => ns.map(n => n.textContent.trim()));
  if (p8a.length !== 7) fail('M8 offers ' + p8a.length + ' processes, expected 7');
  for (const k of Object.keys(PROC)) {
    if (!p8a.includes(k)) { fail('M8 is missing the process "' + k + '"'); continue; }
    if (!p8b.some(t => PROC[k].test(t))) fail('nothing in M8 pairs "' + k + '" with a body that carries it');
  }
  console.log('   seven processes, seven sets of institutions');

  // M2 and M12, the two pick lists
  const w2 = await chips('g2');
  if (w2.length !== 10) fail('M2 offers ' + w2.length + ' statements, expected 10');
  for (const t of w2) {
    if (/ruled alone|only with British rule|widened people/.test(t)) continue;
    await tap('g2', t);
  }
  await page.click('#g2check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g2s'))) fail('M2 scored ' + (await txt('g2s')));
  if (!await done('m2')) fail('M2 did not complete');

  const w12 = await chips('g12');
  if (w12.length !== 10) fail('M12 offers ' + w12.length + ' statements, expected 10');
  for (const t of w12) {
    if (/every city and town|however few members/.test(t)) continue;
    await tap('g12', t);
  }
  await page.click('#g12check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g12s'))) fail('M12 scored ' + (await txt('g12s')));
  if (!await done('m12')) fail('M12 did not complete');
  console.log('   the early traditions and the two panchayats both key correctly');

  // M15, everyday behaviour sorted the way the chapter sorts it
  /* Both choices on one line. Q.rows wraps on the row text's flex basis rather
     than its content, so a pair of long labels puts the second choice on a line
     of its own, directly above the next row's text, where it reads as that
     row's option. Every test passed while it did exactly that. */
  const split = await page.$$eval('#g15 .qrow', rows => rows.filter(r => {
    const t = [...r.querySelectorAll('button')].map(b => b.offsetTop);
    return new Set(t).size > 1;
  }).length);
  if (split) fail(split + ' of M15\'s rows split their choices across two lines');

  await answerRows('g15', [
    ['Damaging public property',    'Weaker'],
    ['fake news',                   'Weaker'],
    ['Indifference',                'Weaker'],
    ['above the law',               'Weaker'],
    ['Reading the news',            'Stronger'],
    ['NSS, NCC',                    'Stronger'],
    ['RTI Act',                     'Stronger'],
    ['Gram Sabha',                  'Stronger']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g15s'))) fail('M15 scored ' + (await txt('g15s')));
  if (!await done('m15')) fail('M15 did not complete');
  console.log('   what strengthens a democracy, and what wears it away');

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
  console.log(bad ? '\ndemocracy: ' + bad + ' FAILURE(S)' : '\ndemocracy: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
