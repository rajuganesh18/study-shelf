const { browser, BASE } = require('../lib');

/* Chapter 7 of Understanding Society: India and Beyond — Elections.

   Checked against the printed chapter: which offices are direct and which
   indirect and what system each uses, Fig. 7.4's three imaginary countries
   with their vote shares and outcomes, Fig. 7.3's quota formula worked
   through, the division of labour between RPA 1950 and RPA 1951, the ECI's
   four functions, the seven apps of Fig. 7.6 and who each is for, and all ten
   conditions of Fig. 7.12.

   Three benches carry a mechanism and are checked as mechanisms. M5's count
   has to obey the rules in Fig. 7.3 at every round — elect at the quota,
   eliminate the lowest, transfer, stop when the seats are full. M6's boundary
   has to actually move people between constituencies and reach the chapter's
   own 25-and-5 case. M15 has to advance one measure per press and start over
   at the end rather than dying. Every table also has to fit a 390px screen. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'elections-chapter.html');
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
  /* Q.rows wraps on the row text's flex basis rather than its content, so a
     pair of long choice labels puts the second one on a line of its own —
     directly above the next row's text, where it reads as that row's option.
     Chapter 6 shipped exactly that bug with every test green. */
  const oneLine = async boxId => {
    const split = await page.$$eval('#' + boxId + ' .qrow', rows => rows.filter(r => {
      const t = [...r.querySelectorAll('button')].map(n => n.offsetTop);
      return new Set(t).size > 1;
    }).length);
    if (split) fail(split + ' of ' + boxId + '\'s rows split their choices across two lines');
  };
  // and no table may run off the right-hand edge of the screen
  const fits = async id => {
    const right = await page.evaluate(i => document.getElementById(i).getBoundingClientRect().right, id);
    if (right > 390) fail(id + ' runs ' + Math.round(right - 390) + 'px off a 390px screen');
  };

  // ---- M1: which offices are direct, which indirect, and under what system
  console.log('== M1  direct and indirect');
  const OFF = [
    [0, 'Lok Sabha',       /directly/i,       /First-Past-The-Post/],
    [1, 'Vidhan Sabha',    /directly/i,       /First-Past-The-Post/],
    [2, 'Local bodies',    /directly/i,       /[Nn]ot stated/],
    [3, 'Rajya Sabha',     /[Rr]epresentatives/, /[Pp]roportional/],
    [4, 'President',       /[Rr]epresentatives/, /[Pp]roportional/],
    [5, 'Vice President',  /[Rr]epresentatives/, /[Pp]roportional/],
    [6, 'Vidhan Parishad', /[Rr]epresentatives/, /single transferable vote/]
  ];
  for (const [v, name, aRe, bRe] of OFF) {
    await set('offS', v);
    if ((await txt('offSV')) !== name) fail('offS=' + v + ' is "' + (await txt('offSV')) + '", expected "' + name + '"');
    if (!aRe.test(await txt('offA'))) fail(name + ' is chosen by "' + (await txt('offA')) + '", expected ' + aRe);
    if (!bRe.test(await txt('offB'))) fail(name + ' runs on "' + (await txt('offB')) + '", expected ' + bRe);
  }
  // the six bicameral states, all six of them
  await set('offS', 6);
  const bic = await txt('offC');
  ['Andhra Pradesh', 'Bihar', 'Karnataka', 'Maharashtra', 'Telangana', 'Uttar Pradesh'].forEach(st => {
    if (!bic.includes(st)) fail('the Vidhan Parishad note omits ' + st);
  });
  if (!await done('m1')) fail('M1 did not complete after four offices were visited');
  console.log('   seven offices, direct or indirect, each with the system the chapter gives it');

  // ---- M3: Fig. 7.4's three countries, with the figure's own numbers
  console.log('== M3  three systems');
  const SYS = {
    'FPTP':         ['Haritbhumi', /less than 50%/, /Party A forms the government/],
    'Majority':     ['Ratnadweep', /more than 50%/, /Party Y wins with 55%/],
    'Proportional': ['Swarnalok',  /vote for a party, not a person/, /M: 40/]
  };
  const sys = await chips('sysOpts');
  if (sys.length !== 3) fail('M3 offers ' + sys.length + ' systems, expected 3');
  for (const [name, [country, aRe, bRe]] of Object.entries(SYS)) {
    if (!sys.includes(name)) { fail('M3 is missing "' + name + '"'); continue; }
    await tap('sysOpts', name);
    if (!aRe.test(await txt('sysA'))) fail(name + ' voting reads "' + (await txt('sysA')) + '", expected ' + aRe);
    if (!bRe.test(await txt('sysB'))) fail(name + ' outcome reads "' + (await txt('sysB')) + '", expected ' + bRe);
    if (!new RegExp(country).test(await txt('sysTxt') + ' ' + (await txt('sysA')) + ' ' + (await txt('sysB')))
        && !(await page.textContent('#m3')).includes(country)) {
      fail(name + ' never names ' + country);
    }
  }
  /* The one result in the figure that looks like a misprint until you read it
     twice: the party leading round one is not the party that governs. */
  await tap('sysOpts', 'Majority');
  const maj = await txt('sysB');
  if (!/No one got 50% in Round 1/.test(maj)) fail('the majority outcome drops the first round: "' + maj + '"');
  if (!await done('m3')) fail('M3 did not complete after all three were opened');
  console.log('   Haritbhumi, Ratnadweep and Swarnalok, with Fig. 7.4’s own outcomes');

  // ---- M5: the count has to obey Fig. 7.3 at every round
  console.log('== M5  the single transferable vote');
  if ((await txt('stvA')) !== '0 of 5') fail('M5 starts at round "' + (await txt('stvA')) + '"');
  if ((await txt('stvB')) !== '0 of 3') fail('M5 starts with "' + (await txt('stvB')) + '" seats filled');
  /* Quota = (1200 / (3+1)) + 1 = 301. If the bench ever prints a different
     number, the arithmetic the whole mission teaches is wrong. */
  if (!/301/.test(await txt('stvTxt'))) fail('M5 does not state the quota of 301: "' + (await txt('stvTxt')) + '"');
  const ROUNDS = [
    [1, 1, /A has 420/,        /elected/i],
    [2, 1, /E has the fewest/, /eliminated/i],
    [3, 2, /B now has 340/,    /elected/i],
    [4, 2, /D is eliminated/,  /second preference/i],
    [5, 3, /C has 390/,        /elected/i]
  ];
  for (const [round, seats, aRe, bRe] of ROUNDS) {
    await page.click('#stvNext');
    await page.waitForTimeout(110);
    if ((await txt('stvA')) !== round + ' of 5') fail('press ' + round + ' left the round at "' + (await txt('stvA')) + '"');
    if ((await txt('stvB')) !== seats + ' of 3') fail('after round ' + round + ' seats read "' + (await txt('stvB')) + '"');
    const w = await txt('stvTxt');
    if (!aRe.test(w)) fail('round ' + round + ' reads "' + w + '", expected ' + aRe);
    if (!bRe.test(w)) fail('round ' + round + ' reads "' + w + '", expected ' + bRe);
  }
  if (!await done('m5')) fail('M5 did not complete once three seats were filled');
  // a sixth press starts the count over rather than doing nothing
  await page.click('#stvNext');
  await page.waitForTimeout(110);
  if ((await txt('stvA')) !== '0 of 5') fail('pressing again did not restart the count');
  console.log('   quota 301, two eliminations, three seats — in the order Fig. 7.3 sets out');

  // ---- M6: the boundary has to move people, and reach the chapter's own case
  console.log('== M6  delimitation');
  /* The chapter's example is one MP for five lakh and another for twenty-five.
     Sweeping the slider has to produce both that and a near-equal split, or
     the bench is a picture rather than a demonstration. */
  let even = false, total = new Set(), last = -1, backwards = 0;
  for (let v = 0; v <= 100; v += 2) {
    await set('delS', v);
    const a = num(await txt('delA')), b2 = num(await txt('delB'));
    total.add(a + b2);
    if (a < last) backwards++;
    last = a;
    if (Math.abs(a - b2) <= 2) even = true;
  }
  if (total.size !== 1 || !total.has(30)) {
    fail('the two constituencies do not always add to 30 lakh: ' + [...total].join(', '));
  }
  if (backwards) fail('moving the boundary right took people out of A ' + backwards + ' times');
  if (!even) fail('no boundary position produces a near-equal split');
  /* The chapter's own case, and the position the bench opens on: one MP for
     twenty-five lakh people, and another for five. */
  await set('delS', 76);
  if (num(await txt('delA')) !== 25 || num(await txt('delB')) !== 5) {
    fail('the default boundary gives ' + (await txt('delA')) + ' and ' + (await txt('delB')) +
         ', expected the chapter’s 25 lakh and 5 lakh');
  }
  if (!/25 lakh, another for 5 lakh/.test(await txt('delC'))) {
    fail('the 25-and-5 split is not spelled out: "' + (await txt('delC')) + '"');
  }
  if (!await done('m6')) fail('M6 did not complete after the boundary was swept');
  console.log('   thirty lakh, split every way, and the chapter’s own 25-and-5 among them');

  // ---- M9: the Commission's four jobs
  console.log('== M9  what the Commission does');
  const ECI = {
    'The roll':            [/electoral roll/i,      /enumerator/i],
    'The schedule':        [/schedule and date/i,   /five-year|dissolved/i],
    'Parties and symbols': [/[Rr]egisters political parties/, /registered parties can contest/i],
    'Free and fair':       [/free, fair and transparent/i, /[Ii]nclusive/]
  };
  const eci = await chips('eciOpts');
  if (eci.length !== 4) fail('M9 offers ' + eci.length + ' functions, expected 4');
  for (const [name, res] of Object.entries(ECI)) {
    if (!eci.includes(name)) { fail('M9 is missing "' + name + '"'); continue; }
    await tap('eciOpts', name);
    const fields = [await txt('eciA'), await txt('eciB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('eciOpts', 'The roll');
  if (!/Special Intensive Revision/.test(await txt('eciTxt'))) fail('the roll note does not name Special Intensive Revision');
  await tap('eciOpts', 'The schedule');
  const sch = await txt('eciTxt');
  ['weather', 'agricultural', 'examination', 'festival'].forEach(k => {
    if (!new RegExp(k, 'i').test(sch)) fail('the schedule note omits "' + k + '"');
  });
  await tap('eciOpts', 'Parties and symbols');
  if (!/quasi-judicial/.test(await txt('eciTxt'))) fail('the symbols note drops the quasi-judicial role');
  if (!await done('m9')) fail('M9 did not complete after three functions were opened');
  console.log('   rolls, schedule, symbols and fairness, each as the chapter describes it');

  // ---- M11: the seven apps of Fig. 7.6, and who each one is for
  console.log('== M11 seven apps');
  const APP = {
    'ETPBS':         ['Voters',            /postal ballot/i],
    'Voter Helpline':['Voters',            /[Rr]egistration/],
    'cVIGIL':        ['Voters',            /Model Code of Conduct/],
    'Saksham':       ['Voters',            /Persons with Disabilities/],
    'Suvidha':       ['Candidates',        /[Nn]omination/],
    'ERONET':        ['Election officials', /[Ff]orm processing|databases/],
    'Sugam':         ['Election officials', /[Vv]ehicles/]
  };
  const apps = await chips('appOpts');
  if (apps.length !== 7) fail('M11 offers ' + apps.length + ' apps, expected 7');
  for (const [name, [lane, bRe]] of Object.entries(APP)) {
    if (!apps.includes(name)) { fail('M11 is missing "' + name + '"'); continue; }
    await tap('appOpts', name);
    if ((await txt('appA')) !== lane) fail(name + ' is filed under "' + (await txt('appA')) + '", expected "' + lane + '"');
    if (!bRe.test(await txt('appB'))) fail(name + ' reads "' + (await txt('appB')) + '", expected ' + bRe);
  }
  await tap('appOpts', 'cVIGIL');
  if (!/flying squad/i.test(await txt('appTxt'))) fail('the cVIGIL note drops the flying squads');
  if (!await done('m11')) fail('M11 did not complete after four apps were opened');
  console.log('   four for voters, one for candidates, two for the officials');

  // ---- M12: all ten conditions of Fig. 7.12
  console.log('== M12 recognition thresholds');
  /* recB carries the short citation and recC the condition as Fig. 7.12 words
     it, so each row is checked against the field that actually holds it. */
  const REC = [
    [0, /State party/i,    /State .* 1/,    /6%.*Legislative Assembly.*two seats/],
    [1, /State party/i,    /State .* 2/,    /6%.*Lok Sabha.*at least one seat/],
    [2, /State party/i,    /State .* 3/,    /3% of the seats.*whichever is more/],
    [3, /State party/i,    /State .* 4/,    /one seat.*every 25 seats.*fraction/],
    [4, /State party/i,    /State .* 5/,    /8% of the valid votes/],
    [5, /National party/i, /National .* 1/, /6%.*four or more states.*four seats/],
    [6, /National party/i, /National .* 2/, /2% of the seats.*three states/],
    [7, /National party/i, /National .* 3/, /State Party in at least four states/],
    [8, /not recognised/i, /Unrecognised/,  /not secured enough/],
    [9, /not recognised/i, /Unrecognised/,  /never contested/]
  ];
  for (const [v, aRe, bRe, cRe] of REC) {
    await set('recS', v);
    const a = await txt('recA'), b2 = await txt('recB'), c = await txt('recC');
    if (!aRe.test(a)) fail('party ' + v + ' is recognised as "' + a + '", expected ' + aRe);
    if (!bRe.test(b2)) fail('party ' + v + ' cites "' + b2 + '", expected ' + bRe);
    if (!cRe.test(c)) fail('party ' + v + ' condition reads "' + c + '", expected ' + cRe);
  }
  /* Five state conditions, three national ones, two ways to stay a RUPP — the
     shape of Fig. 7.12, which is the thing worth remembering about it. */
  let st = 0, nat = 0, rupp = 0;
  for (let v = 0; v <= 9; v++) {
    await set('recS', v);
    const a = await txt('recA');
    if (/^State/i.test(a)) st++; else if (/^National/i.test(a)) nat++; else rupp++;
  }
  if (st !== 5) fail('M12 shows ' + st + ' state-party conditions, expected 5');
  if (nat !== 3) fail('M12 shows ' + nat + ' national-party conditions, expected 3');
  if (rupp !== 2) fail('M12 shows ' + rupp + ' RUPP cases, expected 2');
  if (!await done('m12')) fail('M12 did not complete after four parties were visited');
  console.log('   five state conditions, three national, and the two ways to stay unrecognised');

  // ---- M13: Fig. 7.11, including the branch that lost the election
  console.log('== M13 what a party is for');
  const PAR = {
    'Organise opinion':   [/organise public opinion/i, /grassroots/],
    'Contest elections':  [/manifesto/i,               /promises|public/],
    'The winning party':  [/[Ff]orms the government/,  /power/],
    'The opposition':     [/[Ee]nsures accountability/, /Losing/]
  };
  const par = await chips('parOpts');
  if (par.length !== 4) fail('M13 offers ' + par.length + ' cards, expected 4');
  for (const [name, res] of Object.entries(PAR)) {
    if (!par.includes(name)) { fail('M13 is missing "' + name + '"'); continue; }
    await tap('parOpts', name);
    const fields = [await txt('parA'), await txt('parB')];
    res.forEach((re, i) => {
      if (!re.test(fields[i])) fail(name + ' field ' + i + ' reads "' + fields[i] + '", expected ' + re);
    });
  }
  await tap('parOpts', 'The opposition');
  if (!/debates and committees|debates, committees/i.test(await txt('parA') + ' ' + (await txt('parTxt')))) {
    fail('the opposition card drops debates and committees');
  }
  if (!await done('m13')) fail('M13 did not complete after three cards were opened');
  console.log('   opinion, campaigns, government — and the opposition’s own two jobs');

  // ---- M15: one measure per press, and a road that starts over
  console.log('== M15 the road');
  if ((await txt('roadA')) !== '0 of 5') fail('M15 starts at "' + (await txt('roadA')) + '"');
  const MEAS = ['RPA 1950 and 1951', 'The Model Code of Conduct', 'EVMs', 'VVPAT'];
  for (let i = 0; i < 5; i++) {
    await page.click('#roadNext');
    await page.waitForTimeout(110);
    if ((await txt('roadA')) !== (i + 1) + ' of 5') fail('press ' + (i + 1) + ' left it at "' + (await txt('roadA')) + '"');
    if (i < MEAS.length && (await txt('roadB')) !== MEAS[i]) {
      fail('measure ' + (i + 1) + ' is "' + (await txt('roadB')) + '", expected "' + MEAS[i] + '"');
    }
  }
  if (!/awareness/i.test(await txt('roadB'))) fail('the fifth measure is "' + (await txt('roadB')) + '"');
  /* The chapter lists the measures against the challenges as a set, not one
     against one, and it does not claim the job is finished. The closing note
     has to say so rather than declaring the road fixed. */
  const closing = await txt('roadTxt');
  if (!/vigilance/i.test(closing)) fail('the closing note drops constant vigilance: "' + closing + '"');
  if (!await done('m15')) fail('M15 did not complete after all five measures');
  await page.click('#roadNext');
  await page.waitForTimeout(110);
  if ((await txt('roadA')) !== '0 of 5') fail('pressing again did not restart the road');
  console.log('   five measures, in order, and an honest closing claim');

  // ---- the graded activities, against the chapter's own answers
  console.log('== answer keys against the printed chapter');

  // M4, the three systems rule by rule
  const KEY4 = {
    'Each voter votes for one candidate in their constituency': 'FPTP',
    'The winner can have less than 50% of the votes':           'FPTP',
    'Used in India for the Lok Sabha and the Vidhan Sabha':     'FPTP',
    'A candidate must get more than 50% to win':                'Majority',
    'The top two compete again in a second round':              'Majority',
    'Voters vote for a party, not a person':                    'PR',
    'Seats are allotted in proportion to the votes':            'PR'
  };
  const rows4 = await page.$$eval('#g4 tr td.lbl', ns => ns.map(n => n.textContent.trim()));
  if (rows4.length !== 7) fail('M4 has ' + rows4.length + ' rows, expected 7');
  for (const l of rows4) if (!(l in KEY4)) fail('unexpected M4 row: ' + l);
  const opts4 = await page.$$eval('#g4 select', ns =>
    ns.map(s => [...s.options].map(o => o.value).filter(Boolean)));
  opts4.forEach((o, i) => {
    ['FPTP', 'Majority', 'PR'].forEach(c => {
      if (!o.includes(c)) fail('M4 row ' + i + ' does not offer "' + c + '"');
    });
  });
  for (const [label, want] of Object.entries(KEY4)) {
    const hit = await page.evaluate(([lbl, val]) => {
      const rows = [...document.querySelectorAll('#g4 tr')];
      const row = rows.find(r => r.querySelector('td.lbl') &&
                                 r.querySelector('td.lbl').textContent.trim() === lbl);
      if (!row) return false;
      const sel = row.querySelector('select');
      if (!sel) return false;
      sel.value = val; return sel.value === val;
    }, [label, want]);
    if (!hit) fail('M4 could not answer "' + label + '" with "' + want + '"');
    await page.waitForTimeout(25);
  }
  await page.click('#g4check');
  await page.waitForTimeout(250);
  if (!/7 of 7|All seven/i.test(await txt('g4s'))) fail('M4 scored ' + (await txt('g4s')));
  if (!await done('m4')) fail('M4 did not complete on a full correct table');
  await fits('g4');
  console.log('   seven rules sorted to three systems, and the table fits the screen');

  // M7 and M10, the two sorters
  await oneLine('g7');
  await answerRows('g7', [
    ['Allocation of seats',        '1950'],
    ['Delimitation',               '1950'],
    ['electoral rolls',            '1950'],
    ['right to vote at 18',        '1950'],
    ['Nomination of candidates',   '1951'],
    ['Election campaigns',         '1951'],
    ['Voting procedures',          '1951'],
    ['Post-election disputes',     '1951']
  ]);
  if (!/8 of 8|All eight/i.test(await txt('g7s'))) fail('M7 scored ' + (await txt('g7s')));
  if (!await done('m7')) fail('M7 did not complete');

  await oneLine('g10');
  await answerRows('g10', [
    ['just turned 18',        'Added'],
    ['lack of awareness',     'Added'],
    ['has died',              'Deleted'],
    ['changed residence',     'Deleted'],
    ['twice over',            'Deleted'],
    ['permanently untraceable', 'Deleted']
  ]);
  if (!/6 of 6|All six/i.test(await txt('g10s'))) fail('M10 scored ' + (await txt('g10s')));
  if (!await done('m10')) fail('M10 did not complete');
  console.log('   the two Acts, and a revision that works in both directions');

  // M2, M8 and M14, the three pick lists
  const w2 = await chips('g2');
  if (w2.length !== 10) fail('M2 offers ' + w2.length + ' statements, expected 10');
  for (const t of w2) {
    if (/may simply continue|One party contesting|whole of what democracy/.test(t)) continue;
    await tap('g2', t);
  }
  await page.click('#g2check');
  await page.waitForTimeout(250);
  if (!/10 of 10|Right\./i.test(await txt('g2s'))) fail('M2 scored ' + (await txt('g2s')));
  if (!await done('m2')) fail('M2 did not complete');

  const w8 = await chips('g8');
  if (w8.length !== 11) fail('M8 offers ' + w8.length + ' statements, expected 11');
  for (const t of w8) {
    if (/Publishing a manifesto|Suvidha app|cVIGIL app/.test(t)) continue;
    await tap('g8', t);
  }
  await page.click('#g8check');
  await page.waitForTimeout(250);
  if (!/11 of 11|Right\./i.test(await txt('g8s'))) fail('M8 scored ' + (await txt('g8s')));
  if (!await done('m8')) fail('M8 did not complete');

  const w14 = await chips('g14');
  if (w14.length !== 11) fail('M14 offers ' + w14.length + ' statements, expected 11');
  for (const t of w14) {
    if (/Election Commission decides|criminal offence/.test(t)) continue;
    await tap('g14', t);
  }
  await page.click('#g14check');
  await page.waitForTimeout(250);
  if (!/11 of 11|Right\./i.test(await txt('g14s'))) fail('M14 scored ' + (await txt('g14s')));
  if (!await done('m14')) fail('M14 did not complete');
  console.log('   why we vote, what counts as a corrupt practice, and both readings of defection');

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
  console.log(bad ? '\nelections: ' + bad + ' FAILURE(S)' : '\nelections: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
