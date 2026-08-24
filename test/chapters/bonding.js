const { browser, reporter, BASE } = require('../lib');

/* Criss-cross valency: the formulae the chapter builds must reduce correctly and bracket polyatomic ions only when the count exceeds one. */
async function run(){
  let bad = 0; const fail = m => { console.log('  FAIL ' + m); bad++; };
  const b = await browser();
  const page = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
  page.on('pageerror', e => fail('threw: ' + e));
  await page.goto(BASE + 'bonding-chapter.html');
  await page.waitForTimeout(1400);

  // ---- every cation x anion pair must give a chemically valid formula ----
  console.log('== criss-cross: all cation x anion pairs');
  const all = await page.evaluate(() =>
    CATIONS.flatMap(c => ANIONS.map(a => {
      const r = crissCross(c, a);
      return { c:c.f, cch:c.ch, cpoly:!!c.poly, a:a.f, ach:a.ch, apoly:!!a.poly,
               nc:r.nc, na:r.na, text:r.text };
    })));
  console.log('   ' + all.length + ' pairs generated');
  const g = (x,y) => y ? g(y, x%y) : x;
  all.forEach(r => {
    // the charges must cancel exactly
    if (r.nc * r.cch !== r.na * r.ach)
      fail(r.text + ': charges do not cancel (' + r.nc + '×' + r.cch + ' vs ' + r.na + '×' + r.ach + ')');
    // and the ratio must be in lowest terms
    if (g(r.nc, r.na) !== 1)
      fail(r.text + ': ratio ' + r.nc + ':' + r.na + ' is not the simplest');
    // brackets exactly when a polyatomic ion is taken more than once
    const needC = r.cpoly && r.nc > 1, needA = r.apoly && r.na > 1;
    const hasC = r.text.indexOf('(' + r.c + ')') >= 0, hasA = r.text.indexOf('(' + r.a + ')') >= 0;
    if (needC !== hasC) fail(r.text + ': brackets around ' + r.c + ' should be ' + needC);
    if (needA !== hasA) fail(r.text + ': brackets around ' + r.a + ' should be ' + needA);
    // a subscript of 1 is never written
    if (/[₂₃₄₅₆]/.test(r.text) === false && (r.nc > 1 || r.na > 1))
      fail(r.text + ': subscript missing for ' + r.nc + ':' + r.na);
  });

  // ---- and the ones a chemist would recognise on sight ----
  const KNOWN = {
    'Na|Cl':'NaCl', 'Ca|Cl':'CaCl₂', 'Al|O':'Al₂O₃', 'Mg|O':'MgO',
    'Ca|CO₃':'CaCO₃', 'Mg|OH':'Mg(OH)₂', 'Al|OH':'Al(OH)₃',
    'Al|SO₄':'Al₂(SO₄)₃', 'NH₄|Cl':'NH₄Cl', 'NH₄|SO₄':'(NH₄)₂SO₄',
    'K|CO₃':'K₂CO₃', 'Zn|PO₄':'Zn₃(PO₄)₂', 'Fe|OH':'Fe(OH)₃',
    'Na|S':'Na₂S', 'K|NO₃':'KNO₃', 'Ca|PO₄':'Ca₃(PO₄)₂'
  };
  let checked = 0;
  for (const [key, want] of Object.entries(KNOWN)) {
    const [cf, af] = key.split('|');
    const r = all.find(x => x.c === cf && x.a === af);
    if (!r) { fail('no pair for ' + key); continue; }
    if (r.text !== want) fail(key + ' gives ' + r.text + ', expected ' + want);
    else checked++;
  }
  console.log('   ' + checked + ' of ' + Object.keys(KNOWN).length + ' textbook formulae correct');

  // ---- the mass bench must add up ----
  console.log('== molecular and formula unit masses');
  const WANT = { 'H₂O':18, 'CO₂':44, 'CH₄':16, 'HNO₃':63, 'Na₂O':62,
                 'KCl':74.5, 'Mg(OH)₂':58, 'Ca(NO₃)₂':164 };
  const got = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#massPick button').forEach((btn, i) => { out[i] = btn.textContent; });
    return out;
  });
  await page.$eval('#m15', n => n.open = true);
  await page.waitForTimeout(400);
  for (const i of Object.keys(got)) {
    await page.click('#massPick button:nth-child(' + (+i + 1) + ')');
    await page.waitForTimeout(80);
    const f = (await page.textContent('#massF')).trim();
    const t = parseFloat((await page.textContent('#massTot')).replace(' u',''));
    if (WANT[f] === undefined) fail('unexpected compound on the bench: ' + f);
    else if (Math.abs(WANT[f] - t) > 0.01) fail(f + ' totals ' + t + ' u, expected ' + WANT[f]);
  }
  console.log('   all ' + Object.keys(got).length + ' compounds total correctly');

  // ---- the fixed-proportion bench must respect 1:8 ----
  console.log('== fixed proportions');
  await page.$eval('#m4', n => n.open = true);
  await page.waitForTimeout(300);
  for (const [h, o, water, leftover] of [[1,8,9,'nothing'],[2,8,9,'hydrogen'],[1,80,9,'oxygen'],[10,80,90,'nothing']]) {
    await page.evaluate(([hh,oo]) => {
      const H = document.getElementById('propH'), O = document.getElementById('propO');
      H.value = String(hh); H.dispatchEvent(new Event('input',{bubbles:true}));
      O.value = String(oo); O.dispatchEvent(new Event('input',{bubbles:true}));
    }, [h, o]);
    await page.waitForTimeout(80);
    const w = parseFloat((await page.textContent('#propW')).replace(' g',''));
    const l = (await page.textContent('#propLeft')).trim();
    if (Math.abs(w - water) > 0.05) fail(h + ' g H + ' + o + ' g O gave ' + w + ' g water, expected ' + water);
    if (!l.includes(leftover)) fail(h + ' g H + ' + o + ' g O left "' + l + '", expected ' + leftover);
  }
  console.log('   1:8 respected, and the surplus is left unreacted');

  await b.close();
  console.log(bad ? '\nbonding: ' + bad + ' FAILURE(S)' : '\nbonding: ok');
  return bad;
}

module.exports = run;
if (require.main === module) require('../lib').main(run);
