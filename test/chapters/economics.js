const { browser, BASE } = require('../lib');

/* Chapter 8 of Understanding Society: India and Beyond — Building Blocks in
   Economics: The Problem of Choice.

   Checked against the printed chapter: the five combinations of Fig. 8.3's
   table and the opportunity cost of each step between them, the eight glossary
   definitions, Fig. 8.4's four kinds of work, Fig. 8.5 built in order, the
   sugarcane and millet lists, the four kinds of shoe, the two ends of the
   labour-capital spectrum, the three economic systems with their examples,
   Fig. 8.2's three uses of steel, India's path, and Fig. 8.8's two sides.

   The PPC is the one bench in this chapter carrying arithmetic, so it is
   checked as arithmetic: every printed pair, and every step cost derived from
   them. Get the table wrong by one row and the whole mission teaches a
   falsehood that looks perfectly convincing on screen.

   Every table is also asserted to fit a 390px screen, and every sorter to keep
   its choices on one line — the two defects chapters 6 and 7 shipped past a
   green suite. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'economics-chapter.html');
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

  // ---- M1: Fig. 8.3's table, and the arithmetic between its rows
  console.log('== M1  the Production Possibility Curve');
  /* The chapter prints five combinations. Every one of them is checked, and so
     is the wheat given up at each step, which is what the mission teaches. */
  const PPC = [
    [0, 'A', 0,   100, null],
    [1, 'B', 25,  90,  10],
    [2, 'C', 50,  70,  20],
    [3, 'D', 75,  40,  30],
    [4, 'E', 100, 0,   40]
  ];
  for (const [v, name, barley, wheat, cost] of PPC) {
    await set('ppcS', v);
    if ((await txt('ppcSV')) !== name) fail('ppcS=' + v + ' is "' + (await txt('ppcSV')) + '", expected "' + name + '"');
    if (num(await txt('ppcA')) !== barley) fail(name + ' barley reads "' + (await txt('ppcA')) + '", expected ' + barley);
    if (num(await txt('ppcB')) !== wheat) fail(name + ' wheat reads "' + (await txt('ppcB')) + '", expected ' + wheat);
    /* The readout names two quantities — the wheat given up and the barley
       gained — so the wheat is matched at the front of the string rather
       than by stripping every non-digit, which would run the two together. */
    const c = await txt('ppcC');
    if (cost === null) {
      if (/kg of wheat/.test(c)) fail('point A claims a step cost: "' + c + '"');
    } else {
      const m = c.match(/^(\d+) kg of wheat/);
      if (!m || +m[1] !== cost) fail(name + ' step cost reads "' + c + '", expected ' + cost + ' kg of wheat');
      if (!/25 kg of barley/.test(c)) fail(name + ' step does not say what the wheat bought: "' + c + '"');
    }
  }
  /* And the point of the whole mission: the cost rises. If it ever came out
     flat, the curve in Fig. 8.3 would be a straight line and the chapter's
     example would make no point at all. */
  const costs = [];
  for (let v = 1; v <= 4; v++) {
    await set('ppcS', v);
    costs.push(+(await txt('ppcC')).match(/^(\d+)/)[1]);
  }
  for (let i = 1; i < costs.length; i++) {
    if (costs[i] <= costs[i - 1]) {
      fail('step costs do not rise: ' + costs.join(', '));
      break;
    }
  }
  if (!await done('m1')) fail('M1 did not complete after four combinations were visited');
  console.log('   five combinations as printed, and a step cost that rises 10, 20, 30, 40');

  // ---- M3: the five opening questions
  console.log('== M3  five choices');
  const OPP = {
    'Pocket money':   [/child/i,      /opportunity cost/i],
    'The library':    [/library/i,    /fifteen|copies/i],
    'The farmer':     [/farmer/i,     /crop/i],
    'The enterprise': [/enterprise/i, /produced/i],
    'The government': [/government/i, /other would have delivered/i]
  };
  const opp = await chips('oppOpts');
  if (opp.length !== 5) fail('M3 offers ' + opp.length + ' choices, expected 5');
  for (const [name, res] of Object.entries(OPP)) {
    if (!opp.includes(name)) { fail('M3 is missing "' + name + '"'); continue; }
    await tap('oppOpts', name);
    const fields = [await txt('oppA'), await txt('oppB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  /* The chapter asks these five questions and answers none of them, so the
     bench must not answer them either. */
  await tap('oppOpts', 'Pocket money');
  if (!/[Ww]hichever/.test(await txt('oppB'))) {
    fail('the pocket-money card picks a side rather than naming the cost of either');
  }
  if (!await done('m3')) fail('M3 did not complete after four were opened');
  console.log('   a child, a school, a farmer, an enterprise and a government, all choosing');

  // ---- M5: Fig. 8.4's four kinds of work
  console.log('== M5  what an economist does');
  const ECO = {
    'Policy-making': [/taxation or welfare spending/, /Governments/],
    'Finance':       [/[Aa]dvising investors/,        /Investors/],
    'Research':      [/economic trends/,              /Everybody/],
    'Consulting':    [/plan growth|improve efficiency/, /Enterprises/]
  };
  const eco = await chips('ecoOpts');
  if (eco.length !== 4) fail('M5 offers ' + eco.length + ' kinds of work, expected 4');
  for (const [name, res] of Object.entries(ECO)) {
    if (!eco.includes(name)) { fail('M5 is missing "' + name + '"'); continue; }
    await tap('ecoOpts', name);
    const fields = [await txt('ecoA'), await txt('ecoB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('ecoOpts', 'Research');
  if (!/economic surveys|financial statements/i.test(await txt('ecoTxt'))) {
    fail('the research note names neither of the two sources the chapter gives');
  }
  if (!await done('m5')) fail('M5 did not complete after three were opened');
  console.log('   policy, finance, research and consulting, each for the client the figure names');

  // ---- M6: Fig. 8.5, built in the order the chapter builds it
  console.log('== M6  from a mismatch to three questions');
  if ((await txt('scaA')) !== '0 of 5') fail('M6 starts at "' + (await txt('scaA')) + '"');
  if (!/[Uu]nlimited|[Ll]imited/.test(await txt('scaTxt'))) fail('M6 does not open on the two facts');
  const STEPS = [
    ['Scarcity',            /mismatch/i],
    ['Choices',             /competing uses|forces choices/i],
    ['What to produce',     /[Ww]hich goods and services/],
    ['How to produce',      /methods, resources and technologies/i],
    ['For whom to produce', /who benefits/i]
  ];
  for (let i = 0; i < STEPS.length; i++) {
    await page.click('#scaNext');
    await page.waitForTimeout(110);
    if ((await txt('scaA')) !== (i + 1) + ' of 5') fail('press ' + (i + 1) + ' left it at "' + (await txt('scaA')) + '"');
    const [name, re] = STEPS[i];
    if ((await txt('scaB')) !== name) fail('step ' + (i + 1) + ' is "' + (await txt('scaB')) + '", expected "' + name + '"');
    if (!re.test(await txt('scaTxt'))) fail('step ' + (i + 1) + ' reads "' + (await txt('scaTxt')) + '", expected ' + re);
  }
  if (!await done('m6')) fail('M6 did not complete after all five steps');
  await page.click('#scaNext');
  await page.waitForTimeout(110);
  if ((await txt('scaA')) !== '0 of 5') fail('pressing again did not rebuild from the start');
  console.log('   two facts, scarcity, choices, and then the three questions in order');

  // ---- M8: the four kinds of shoe
  console.log('== M8  four kinds of shoe');
  const SHOE = {
    'School': [/[Ss]tudents/,          /[Ss]imple in design.*durable.*affordable/],
    'Office': [/working professionals/i, /[Cc]omfort.*formal appearance.*quality/],
    'Sports': [/[Aa]thletes/,          /[Gg]rip.*flexibility.*support/],
    'Casual': [/daily use|[Ee]verybody/, /[Cc]omfortable yet affordable/]
  };
  const sho = await chips('shoOpts');
  if (sho.length !== 4) fail('M8 offers ' + sho.length + ' kinds, expected 4');
  for (const [name, res] of Object.entries(SHOE)) {
    if (!sho.includes(name)) { fail('M8 is missing "' + name + '"'); continue; }
    await tap('shoOpts', name);
    const fields = [await txt('shoA'), await txt('shoB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  // the materials, which the chapter ties to particular buyers
  await tap('shoOpts', 'Office');
  if (!/[Ll]eather/.test(await txt('shoTxt'))) fail('the office-shoe note drops leather');
  await tap('shoOpts', 'Sports');
  if (!/rubber/i.test(await txt('shoTxt'))) fail('the sports-shoe note drops rubber soles');
  if (!await done('m8')) fail('M8 did not complete after three were opened');
  console.log('   four buyers, four specifications, and the materials that follow them');

  // ---- M9: the two ends the chapter names, and the sectors it attaches to each
  console.log('== M9  workers or machines');
  await set('mixS', 0);
  if (!/Labour-intensive/.test(await txt('mixA'))) fail('at 0% machines it reads "' + (await txt('mixA')) + '"');
  if (!/[Aa]griculture and handicrafts/.test(await txt('mixB'))) {
    fail('the labour end is not attached to agriculture and handicrafts');
  }
  await set('mixS', 100);
  if (!/Capital-intensive/.test(await txt('mixA'))) fail('at 100% machines it reads "' + (await txt('mixA')) + '"');
  if (!/[Ss]teel and automobile/.test(await txt('mixB'))) {
    fail('the capital end is not attached to steel and automobile manufacturing');
  }
  /* The chapter names two methods and nothing in between, so the middle of the
     slider must not invent a third named one. */
  await set('mixS', 50);
  const mid = await txt('mixA');
  if (/intensive/i.test(mid)) fail('the middle of the slider claims to be a named method: "' + mid + '"');
  if (!/chapter names the two ends/i.test(await txt('mixC'))) {
    fail('the middle does not say the chapter names only the two ends');
  }
  for (let v = 0; v <= 100; v += 10) await set('mixS', v);
  if (!await done('m9')) fail('M9 did not complete after the slider was swept');
  console.log('   both ends as the chapter names them, and an honest middle');

  // ---- M11: the three systems, with the examples the chapter lists
  console.log('== M11 planned, market, mixed');
  const SYS = {
    'Planned': [/central planning authority/i, /[Gg]overnment/,      /Soviet Union.*North Korea.*Cuba/],
    'Market':  [/demand and supply/i,          /private companies/i, /United States.*Japan.*Hong Kong/],
    'Mixed':   [/government together|and the government/i, /public sector/i, /India.*China.*Germany.*Sweden/]
  };
  const sys = await chips('sysOpts');
  if (sys.length !== 3) fail('M11 offers ' + sys.length + ' systems, expected 3');
  for (const [name, res] of Object.entries(SYS)) {
    if (!sys.includes(name)) { fail('M11 is missing "' + name + '"'); continue; }
    await tap('sysOpts', name);
    /* The third pattern is the list of example countries, which the bench puts
       on the canvas and in the long note rather than in its own readout — so it
       is matched against everything the card says. */
    const all = [await txt('sysA'), await txt('sysB'), await txt('sysTxt')];
    res.forEach((re, i) => {
      const hay = i < 2 ? all[i] : all.join(' ');
      if (!re.test(hay)) fail(name + ' field ' + i + ' reads "' + hay + '", expected ' + re);
    });
  }
  await tap('sysOpts', 'Market');
  if (!/referee/.test(await txt('sysTxt'))) fail('the market note drops the referee');
  await tap('sysOpts', 'Mixed');
  if (!/most economies|United States and Singapore/i.test(await txt('sysTxt'))) {
    fail('the mixed note does not make the chapter’s point that most economies are mixed');
  }
  if (!await done('m11')) fail('M11 did not complete after all three were opened');
  console.log('   who decides, who owns, and the countries the chapter lists for each');

  // ---- M13: Fig. 8.2's three uses, and what choosing one costs
  console.log('== M13 one tonne of steel');
  const USES = {
    'Medical':       'Medical equipment',
    'Refrigerators': 'Refrigerator manufacturing',
    'Aircraft':      'Aircraft manufacturing'
  };
  const ste = await chips('steOpts');
  if (ste.length !== 3) fail('M13 offers ' + ste.length + ' uses, expected 3');
  for (const [name, full] of Object.entries(USES)) {
    if (!ste.includes(name)) { fail('M13 is missing "' + name + '"'); continue; }
    await tap('steOpts', name);
    if ((await txt('steA')) !== full) fail(name + ' goes to "' + (await txt('steA')) + '", expected "' + full + '"');
    // the other two, and only the other two, must be what is given up
    const given = await txt('steB');
    if (given.includes(full)) fail(name + ' lists itself as given up: "' + given + '"');
    for (const other of Object.values(USES)) {
      if (other !== full && !given.includes(other)) fail(name + ' does not give up ' + other);
    }
  }
  if (!await done('m13')) fail('M13 did not complete after all three were opened');
  console.log('   three uses, and each one costing the other two');

  // ---- M14: India's path, one step per press
  console.log('== M14 India’s own path');
  if ((await txt('indA')) !== '0 of 5') fail('M14 starts at "' + (await txt('indA')) + '"');
  if (!/[Ss]tate-led/.test(await txt('indTxt'))) fail('M14 does not open on the state-led approach');
  const IND = [
    ['Control',            /licences and permits/],
    ['The public sector',  /banking, transport, heavy industries/],
    ['1991',               /serious economic difficulties/],
    ['The reforms',        /reduced excessive regulations/],
    ['Where it left us',   /more market-oriented/]
  ];
  for (let i = 0; i < IND.length; i++) {
    await page.click('#indNext');
    await page.waitForTimeout(110);
    if ((await txt('indA')) !== (i + 1) + ' of 5') fail('press ' + (i + 1) + ' left it at "' + (await txt('indA')) + '"');
    const [name, re] = IND[i];
    if ((await txt('indB')) !== name) fail('step ' + (i + 1) + ' is "' + (await txt('indB')) + '", expected "' + name + '"');
    if (!re.test(await txt('indTxt'))) fail('step ' + (i + 1) + ' reads "' + (await txt('indTxt')) + '", expected ' + re);
  }
  /* The chapter retains a role for government after 1991, so the last step must
     not claim India became a market economy. */
  if (!/retaining an important role for the government|mixed economy/i.test(await txt('indTxt'))) {
    fail('the last step overstates 1991: "' + (await txt('indTxt')) + '"');
  }
  if (!await done('m14')) fail('M14 did not complete after all five steps');
  await page.click('#indNext');
  await page.waitForTimeout(110);
  if ((await txt('indA')) !== '0 of 5') fail('pressing again did not return to the start');
  console.log('   state-led, 1991, the reforms, and a role kept for government');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');

  // M4, the eight glossary terms
  const TERMS = {
    'Market':                       /buying and selling/,
    'Resources':                    /[Ff]actors used to produce/,
    'Opportunity cost':             /value of what is given up/,
    'Production Possibility Curve': /all available resources/,
    'Economy':                      /distribution, trade and consumption/,
    'Economic entities':            /Producers, consumers/,
    'Public goods':                 /excludes nobody|Open to all/,
    'Data':                         /[Ff]acts and statistics/
  };
  const left4 = await page.$$eval('#g4a button', ns => ns.map(n => n.textContent.trim()));
  const right4 = await page.$$eval('#g4b button', ns => ns.map(n => n.textContent.trim()));
  if (left4.length !== 8) fail('M4 offers ' + left4.length + ' terms, expected 8');
  for (const [term, re] of Object.entries(TERMS)) {
    if (!left4.includes(term)) { fail('M4 is missing the term "' + term + '"'); continue; }
    if (!right4.some(t => re.test(t))) fail('nothing in M4 defines "' + term + '"');
  }
  console.log('   eight terms, each with the definition the chapter prints');

  // M7 and M12, the two value grids
  await answerVgrid('g7', {
    'Water-intensive':                   'Sugarcane',
    'Drought-resistant':                 'Millets',
    'Yields high profits':               'Sugarcane',
    'Supports industries such as sugar': 'Sugarcane',
    'Saves water':                       'Millets',
    'Improves soil health':              'Millets',
    'Promotes sustainable agriculture':  'Millets'
  }, ['Sugarcane', 'Millets']);
  await page.click('#g7check');
  await page.waitForTimeout(250);
  if (!/7 of 7|All seven/i.test(await txt('g7s'))) fail('M7 scored ' + (await txt('g7s')));
  if (!await done('m7')) fail('M7 did not complete on a full correct table');
  await fits('g7');

  await answerVgrid('g12', {
    'A central planning authority decides what is produced':    'Planned',
    'The government owns land, factories, banks and transport': 'Planned',
    'Strict permits and licences restrict competition':         'Planned',
    'Demand and supply decide, with little intervention':       'Market',
    'The government acts like a referee in a football match':   'Market',
    'Private ownership, with some government regulation':       'Mixed',
    'India after 1991, and China after 1978':                   'Mixed'
  }, ['Planned', 'Market', 'Mixed']);
  await page.click('#g12check');
  await page.waitForTimeout(250);
  if (!/7 of 7|All seven/i.test(await txt('g12s'))) fail('M12 scored ' + (await txt('g12s')));
  if (!await done('m12')) fail('M12 did not complete on a full correct table');
  await fits('g12');
  console.log('   two crops and three systems, both sorted correctly');

  // M15, Fig. 8.8's two sides as a tick grid
  const KEY15 = {
    'Welfare programmes':      [1, 0],
    'Fair competition rules':  [1, 0],
    'Consumer protection':     [1, 0],
    'Transparency':            [1, 0],
    'Public goods':            [1, 0],
    'Competition':             [0, 1],
    'Profit-making businesses': [0, 1],
    'Innovation':              [0, 1]
  };
  const cols15 = await page.$$eval('#g15 tr th', ns => ns.map(n => n.textContent.trim()));
  ['Government', 'Market'].forEach((c, i) => {
    if (cols15[i + 1] !== c) fail('M15 column ' + i + ' is "' + cols15[i + 1] + '", expected "' + c + '"');
  });
  const rows15 = await page.$$eval('#g15 tr td.lbl', ns => ns.map(n => n.textContent.trim()));
  if (rows15.length !== 8) fail('M15 has ' + rows15.length + ' rows, expected 8');
  for (const l of rows15) if (!(l in KEY15)) fail('unexpected M15 row: ' + l);
  for (const [label, want] of Object.entries(KEY15)) {
    for (let c = 0; c < want.length; c++) {
      for (let t = 0; t < (want[c] ? 1 : 2); t++) {
        const hit = await page.evaluate(([lbl, col]) => {
          const rs = [...document.querySelectorAll('#g15 tr')];
          const row = rs.find(r => r.querySelector('td.lbl') &&
                                   r.querySelector('td.lbl').textContent.trim() === lbl);
          if (!row) return false;
          const td = row.querySelector('td.c[data-c="' + col + '"]');
          if (!td) return false;
          td.click(); return true;
        }, [label, c]);
        if (!hit) { fail('M15 has no cell for "' + label + '" column ' + c); break; }
        await page.waitForTimeout(25);
      }
    }
  }
  await page.click('#g15check');
  await page.waitForTimeout(250);
  if (!/16 of 16|All sixteen/i.test(await txt('g15s'))) fail('M15 scored ' + (await txt('g15s')));
  if (!await done('m15')) fail('M15 did not complete on a full correct table');
  await fits('g15');
  console.log('   five on the government side, three on the market side');

  // M10, the eight conditions
  await oneLine('g10');
  await answerRows('g10', [
    ['Machines are expensive',          'Labour'],
    ['Machines have become affordable', 'Machines'],
    ['Advanced technology',             'Machines'],
    ['Only limited technology',         'Labour'],
    ['Customised or designer',          'Labour'],
    ['Mass-produced garments',          'Machines'],
    ['Labour is cheap',                 'Labour'],
    ['Labour is costly or scarce',      'Machines']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g10s'))) fail('M10 scored ' + (await txt('g10s')));
  if (!await done('m10')) fail('M10 did not complete');

  // M2, the pick list
  const w2 = await chips('g2');
  if (w2.length !== 10) fail('M2 offers ' + w2.length + ' statements, expected 10');
  for (const t of w2) {
    if (/unlimited, unlike human-made|no opportunity cost|but not for nations/.test(t)) continue;
    await tap('g2', t);
  }
  await page.click('#g2check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g2s'))) fail('M2 scored ' + (await txt('g2s')));
  if (!await done('m2')) fail('M2 did not complete');
  console.log('   what pushes a producer which way, and what scarcity actually means');

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
  console.log(bad ? '\neconomics: ' + bad + ' FAILURE(S)' : '\neconomics: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
