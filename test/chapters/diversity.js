const { browser, reporter, BASE } = require('../lib');

/* The dichotomous key of Fig. 12.5, checked against a table read off the book rather than copied from the page. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
// The dichotomous key must actually classify. This table is read off Fig. 12.5
// and the kingdom descriptions in the chapter — NOT copied from the page — so
// if the bench disagrees with the book, this fails.

// euk, multi, wall, chitin  →  kingdom
const BOOK = {
  'Bacterium':     [0, 0, 1, 0, 'Monera'],
  'Cyanobacteria': [0, 0, 1, 0, 'Monera'],
  'Amoeba':        [1, 0, 0, 0, 'Protista'],
  'Paramecium':    [1, 0, 0, 0, 'Protista'],
  'Euglena':       [1, 0, 0, 0, 'Protista'],
  'Mushroom':      [1, 1, 1, 1, 'Fungi'],
  'Yeast':         [1, 0, 1, 1, 'Fungi'],
  'Aspergillus':   [1, 1, 1, 1, 'Fungi'],
  'Moss':          [1, 1, 1, 0, 'Plantae'],
  'Pine tree':     [1, 1, 1, 0, 'Plantae'],
  'Spirogyra':     [1, 1, 1, 0, 'Plantae'],
  'Earthworm':     [1, 1, 0, 0, 'Animalia'],
  'Frog':          [1, 1, 0, 0, 'Animalia'],
  'Sponge':        [1, 1, 0, 0, 'Animalia']
};

  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'diversity-chapter.html');
  await page.$eval('#m6', n => n.open = true);
  await page.waitForTimeout(900);

  const txt = id => page.textContent('#' + id).then(s => s.trim());

  console.log('== M6  answering truthfully must land in the right kingdom');
  const tested = new Set();
  for (let round = 0; round < 140 && tested.size < Object.keys(BOOK).length; round++) {
    const org = await txt('keyOrg');
    const row = BOOK[org];
    if (!row) { fail('the key handed out "' + org + '", which the book table does not list'); break; }

    // answer each question from the book's own values, in the key's fixed order
    let q = 0, guard = 0;
    while (await txt('keyResult') === '—' && guard++ < 6) {
      await page.click(row[q] ? '#keyYes' : '#keyNo');
      const asked = +(await txt('keyStep'));
      if (asked === q) break;               // the key did not advance
      q = asked;
    }
    const landed = await txt('keyResult');
    const want = row[4];
    if (landed !== want) fail(org + ': landed in ' + landed + ', expected ' + want);
    else if (!tested.has(org)) {
      tested.add(org);
      console.log('   ' + org.padEnd(14) + ' → ' + landed + '  (' + q + ' question' + (q > 1 ? 's' : '') + ')');
    }
    // a truthful run must be flawless: the note must never say "Not quite"
    const note = await txt('keyTxt');
    if (/Not quite/.test(note)) fail(org + ': a truthful answer was marked wrong');
    await page.click('#keyNew');
    await page.waitForTimeout(15);
  }
  if (tested.size !== Object.keys(BOOK).length) {
    fail('only ' + tested.size + ' of ' + Object.keys(BOOK).length + ' organisms were reached');
  }

  // the mission must be completable by playing it, not only in principle
  const done = await page.evaluate(() => !!(S.done && S.done.m6));
  if (!done) fail('classified ' + tested.size + ' organisms and m6 never completed');
  else console.log('   mission completes after three kingdoms are reached');

  /* A wrong answer must be corrected rather than silently accepted — and that
     has to hold however many questions the organism needs.

     Monera is placed by one question, so for Bacterium and Cyanobacteria a
     wrong first answer is also the LAST answer, and the bench used to skip
     straight to the kingdom with no correction: it tested "finished" before it
     tested "wrong". Drawing at random found that roughly one run in seven, so
     this drives both cases deliberately instead of hoping for them. */
  const wrongFirst = async () => {
    const org = await txt('keyOrg');
    await page.click(BOOK[org][0] ? '#keyNo' : '#keyYes');
    await page.waitForTimeout(20);
    return { org, note: await txt('keyTxt') };
  };
  const oneQuestion = new Set(['Bacterium', 'Cyanobacteria']);
  const covered = new Set();
  const before = bad;
  for (let i = 0; i < 200 && covered.size < 2; i++) {
    await page.click('#keyNew');
    await page.waitForTimeout(15);
    const here = await txt('keyOrg');
    const kind = oneQuestion.has(here) ? 'short' : 'long';
    if (covered.has(kind)) continue;
    const { org, note } = await wrongFirst();
    if (!/Not quite/.test(note)) {
      fail('a wrong first answer for ' + org + ' was not flagged: "' + note + '"');
    }
    covered.add(kind);
  }
  if (covered.size < 2) fail('never drew both a one-question and a multi-question organism');
  else if (bad === before) console.log('   a wrong answer is flagged and corrected, even when it is the last one needed');

  if (errs.length) fail('console errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? '\ndiversity: ' + bad + ' FAILURE(S)' : '\ndiversity: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
