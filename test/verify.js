/* The broad sweep. For every chapter: it loads clean, it awards nothing for
   being opened, every mission draws, real input still counts, and the back
   link returns to its own chapter list rather than the shelf root.

   Then the shelf itself: the params a chapter hands back are honoured, the
   round trip works, and junk params fall back instead of throwing. */
const CHAPTERS = require('./chapters');
const { browser, open, reporter, BASE } = require('./lib');

async function run(){
  const r = reporter('verify');
  const b = await browser();

  for (const c of CHAPTERS) {
    const file = CHAPTERS.file(c);
    const page = await open(b, file);
    r.head(file);
    if (page.errs.length) r.fail('console errors: ' + page.errs.slice(0, 3).join(' | '));

    // read what the chapter actually persisted, not what the UI implies
    const st = () => page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (/^ch\d/.test(k)) return JSON.parse(localStorage.getItem(k));
      }
      return null;
    });

    // (a) an untouched chapter must award nothing
    const s0 = await st();
    if (!s0) r.fail('nothing persisted — boot did not run');
    else {
      if (s0.xp !== 0) r.fail('opened with ' + s0.xp + ' XP, expected 0');
      if (s0.coins !== 0) r.fail('opened with ' + s0.coins + ' coins, expected 0');
      if (s0.exploreToday !== 0) r.fail('exploreToday=' + s0.exploreToday + ' on open');
      if (s0.perfectToday !== 0) r.fail('perfectToday=' + s0.perfectToday + ' on open');
      if (Object.keys(s0.questsPaid).length) r.fail('quests already paid: ' + JSON.stringify(s0.questsPaid));
      if (Object.keys(s0.done).length) r.fail('missions already done: ' + Object.keys(s0.done));
    }
    if (/show/.test(await page.$eval('#toast', n => n.className))) r.fail('toast visible on open');

    // (b) the back link returns to this chapter's own list
    const href = await page.getAttribute('.backbar', 'href');
    const want = 'index.html?cls=' + c.id.split('-')[0] + '&sub=' + c.id.split('-')[1];
    if (href !== want) r.fail('backbar href ' + href + ', expected ' + want);

    // every mission opens, draws, and leaves no empty component behind
    await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
    await page.waitForTimeout(1500);
    const empty = await page.$$eval('.match > div, .chips, .opts, [id$="s"] ~ *',
      ns => ns.filter(n => n.id && /^[gp]\d+[ab]?$/.test(n.id) && !n.children.length).map(n => n.id));
    if (empty.length) r.fail('component containers never populated: ' + empty.join(', '));
    const zero = await page.$$eval('details.m[open] canvas',
      ns => ns.filter(n => !n.width || !n.height).map(n => n.id));
    if (zero.length) r.fail('zero-sized canvases: ' + zero.join(', '));
    if (page.errs.length) r.fail('errors after opening every mission: ' + page.errs.slice(0, 3).join(' | '));

    // a real interaction must still count
    const sliders = await page.$$('details.m[open] input[type=range]');
    for (const s of sliders) {
      await s.evaluate(n => {
        for (const v of [n.min, n.max, String(Math.round((+n.min + +n.max) / 2))]) {
          n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }
    await page.waitForTimeout(900);
    const s1 = await st();
    if (s1 && s1.exploreToday === 0 && sliders.length) {
      r.fail('drove ' + sliders.length + ' sliders and exploreToday stayed 0 — gate too tight');
    } else if (s1) {
      r.note('open: 0 XP · ' + sliders.length + ' sliders → explore=' + s1.exploreToday + ' xp=' + s1.xp);
    }
    await page.close2();
  }

  // the shelf honours the params a chapter hands back
  const page = await open(b, 'index.html?cls=9&sub=science', { wait: 700 });
  r.head('index.html?cls=9&sub=science');
  if (page.errs.length) r.fail('console errors: ' + page.errs.join(' | '));
  const rows = await page.$$eval('.chaps .chap', n => n.length);
  const live = await page.$$eval('.chaps a.chap.live', n => n.length);
  const head = await page.textContent('.shead h2').catch(() => null);
  const tab  = (await page.textContent('.tab.on')).trim();
  if (head !== 'Science') r.fail('landed on "' + head + '", expected the Science chapter list');
  if (live !== CHAPTERS.length) r.fail(live + ' playable chapters, expected ' + CHAPTERS.length);
  if (tab !== 'Class 9') r.fail('active tab is ' + tab);
  r.note('heading=' + head + ' rows=' + rows + ' playable=' + live + ' tab=' + tab);

  await page.click('#backBtn');
  await page.waitForTimeout(300);
  const url = page.url(), subs = await page.$$eval('.subs .sub', n => n.length);
  if (/\?/.test(url)) r.fail('params left behind after stepping back: ' + url);
  if (subs !== 3) r.fail(subs + ' subject cards after stepping back');

  // a round trip: shelf -> subject -> chapter -> back to the same list
  await page.goto(BASE + 'index.html');
  await page.waitForTimeout(500);
  await page.click('.sub[data-sub="science"]');
  await page.waitForTimeout(300);
  await page.click('a.chap.live[href="forces-chapter.html"]');
  await page.waitForTimeout(1000);
  await page.click('.backbar');
  await page.waitForTimeout(800);
  const back = await page.textContent('.shead h2').catch(() => null);
  if (back !== 'Science') r.fail('round trip landed on "' + back + '", expected the Science list');
  r.note('round trip shelf → science → ch6 → back: ' + back);

  // junk params must not throw or strand the reader
  await page.goto(BASE + 'index.html?cls=99&sub=nope');
  await page.waitForTimeout(500);
  if ((await page.$$eval('.subs .sub', n => n.length)) !== 3) r.fail('junk params did not fall back');
  if (page.errs.length) r.fail('junk params threw: ' + page.errs.join(' | '));
  r.note('junk params fall back to the subject grid');

  await page.close2();
  await b.close();
  return r.failures;
}

module.exports = run;
if (require.main === module) require('./lib').main(run);
