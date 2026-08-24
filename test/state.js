const CHAPTERS = require('./chapters');
const { browser, reporter, BASE } = require('./lib');

/* The state model: an old save migrates without loss, outcomes are recorded, and a finished mission does not stall persistence. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
  const b = await browser();

  // 1. an old-format save must survive the upgrade with XP and coins intact
  let ctx = await b.newContext({ viewport:{width:390,height:844} });
  let page = await ctx.newPage();
  page.on('pageerror', e => fail('threw during migration: ' + e));
  await page.goto(BASE + 'energy-chapter.html');
  await page.evaluate(() => localStorage.setItem('ch07Energy', JSON.stringify({
    xp: 275, coins: 140, streak: 3, day: null,
    done: { m1:true, m2:true, m5:true }, questsPaid: { q1:true }
  })));
  await page.reload(); await page.waitForTimeout(1400);
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  console.log('== migration of an old-format save');
  if (m.xp !== 275)   fail('XP changed: 275 -> ' + m.xp);
  if (m.coins !== 140) fail('coins changed: 140 -> ' + m.coins);
  if (Object.keys(m.done).length !== 3) fail('lost missions: ' + JSON.stringify(m.done));
  ['m1','m2','m5'].forEach(k => {
    const r = m.done[k];
    if (typeof r !== 'object') fail(k + ' not upgraded, still ' + JSON.stringify(r));
    else if (r.at !== 0 || r.tries !== 1 || r.right !== 0 || r.wrong !== 0)
      fail(k + ' upgraded oddly: ' + JSON.stringify(r));
  });
  const shown = await page.textContent('#sXp');
  if (shown !== '275') fail('header shows ' + shown + ' XP, expected 275');
  console.log('   xp=' + m.xp + ' coins=' + m.coins + ' done=' + JSON.stringify(m.done.m1) + ' header=' + shown);
  // and it must be idempotent
  await page.reload(); await page.waitForTimeout(1200);
  const m2 = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  if (m2.xp !== 275 || Object.keys(m2.done).length !== 3) fail('second load changed things: xp=' + m2.xp);
  console.log('   reload again: xp=' + m2.xp + ' done=' + Object.keys(m2.done).length + ' (idempotent)');
  await ctx.close();

  // 2. real answers must land in the record, right and wrong both
  ctx = await b.newContext({ viewport:{width:390,height:844} });
  page = await ctx.newPage();
  page.on('pageerror', e => fail('threw while answering: ' + e));
  await page.goto(BASE + 'energy-chapter.html');
  await page.waitForTimeout(1200);
  await page.$eval('#m2', n => n.open = true);
  await page.waitForTimeout(400);
  // the sorter's own answer key, from the chapter source
  const KEY = [0, 1, 2, 1, 2, 0];
  const rows = await page.$$('#g2 .qrow');
  console.log('== answering the M2 sorter (' + rows.length + ' rows), row 3 wrong on purpose');
  for (let i = 0; i < rows.length; i++) {
    const btns = await rows[i].$$('button');
    await btns[i === 2 ? (KEY[i] + 1) % 3 : KEY[i]].click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  const r2 = st.done.m2, sum = await page.evaluate(() => JSON.parse(localStorage.getItem('nb.sum.9-science-7')));
  if (!r2) fail('m2 not recorded at all');
  else {
    if (r2.right + r2.wrong !== 6) fail('recorded ' + (r2.right+r2.wrong) + ' answers, expected 6');
    if (r2.right !== 5 || r2.wrong !== 1) fail('recorded ' + r2.right + '/' + r2.wrong + ', expected 5 right and 1 wrong');
    if (!r2.at) fail('no timestamp on the record');
    console.log('   done.m2 = ' + JSON.stringify(r2));
  }
  if (sum.accuracy == null) fail('no accuracy in the shelf rollup');
  else console.log('   nb.sum accuracy=' + sum.accuracy + '% right=' + sum.right + ' wrong=' + sum.wrong +
                   ' lastSeen=' + (sum.lastSeen ? 'set' : 'MISSING'));

  // 3. a finished mission must record a second attempt but never pay again.
  //    M8's Check button has no replay guard, so it is the honest way to test this.
  console.log('== finishing M8, then checking it a second time');
  await page.$eval('#m8', n => n.open = true);
  await page.waitForTimeout(400);
  const ANS = ['\u221230 J','184.9 J','20 J','1500 J','300 W','20 000 W'];
  const setAll = () => page.evaluate(a => {
    document.querySelectorAll('#g8 select').forEach((s, i) => { s.value = a[i]; });
  }, ANS);
  await setAll();
  await page.click('#g8check');
  await page.waitForTimeout(900);
  const a1 = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  if (!a1.done.m8) fail('M8 did not complete with all six correct: ' + await page.textContent('#g8s'));
  const xpAfterFirst = a1.xp;
  console.log('   first pass: xp=' + xpAfterFirst + ' done.m8=' + JSON.stringify(a1.done.m8));

  await page.click('#g8check');
  await page.waitForTimeout(900);
  const a2 = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  if (a2.xp !== xpAfterFirst) fail('XP changed on the second check: ' + xpAfterFirst + ' -> ' + a2.xp);
  if (a2.coins !== a1.coins)  fail('coins changed on the second check: ' + a1.coins + ' -> ' + a2.coins);
  if (a2.done.m8.tries !== 2) fail('second attempt not recorded, tries=' + a2.done.m8.tries);
  if (a2.done.m8.right !== 12) fail('expected 12 right over two passes, got ' + a2.done.m8.right);
  console.log('   second pass: xp held at ' + a2.xp + ', done.m8=' + JSON.stringify(a2.done.m8));

  // 4. the redraw loops must not starve the debounced save
  console.log('== a finished mission must not stall persistence');
  const probe = a2.xp;
  await page.$eval('#m2', n => n.open = true);
  await page.waitForTimeout(2500);
  const a3 = await page.evaluate(() => JSON.parse(localStorage.getItem('ch07Energy')));
  if (a3.xp !== probe) fail('state drifted while idling: ' + probe + ' -> ' + a3.xp);
  console.log('   state stable after 2.5s of open missions redrawing');

  // 5. streak history
  const streak = await page.evaluate(() => JSON.parse(localStorage.getItem('nb.streak')));
  console.log('== streak');
  if (!Array.isArray(streak.days)) fail('nb.streak.days is not an array: ' + JSON.stringify(streak));
  else if (streak.days.length !== 1) fail('expected 1 day recorded, got ' + JSON.stringify(streak.days));
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(streak.days[0])) fail('day is not a local ymd: ' + streak.days[0]);
  else console.log('   days=' + JSON.stringify(streak.days) + ' streak=' + streak.streak);

  await b.close();
  console.log(bad ? '\nstate: ' + bad + ' FAILURE(S)' : '\nstate: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('./lib').main(run);
