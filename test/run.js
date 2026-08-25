/* The whole suite, one server, one exit code.

     npm test              everything
     npm test -- verify    just the named harnesses
     npm test -- --list    what there is

   Every harness returns its failure count, so a red run names which stage
   failed rather than dying at the first one. */
const path = require('path');
const { serve, PORT } = require('./lib');

const STAGES = [
  // static first: it needs no browser and catches the cheapest class of bug
  { name:'audit-ids',    browser:false, run:require('./audit-ids') },
  { name:'verify',       browser:true,  run:require('./verify') },
  { name:'reach',        browser:true,  run:require('./reach') },
  { name:'state',        browser:true,  run:require('./state') },
  { name:'quests',       browser:true,  run:require('./quests') },
  { name:'atom',         browser:true,  run:require('./chapters/atom') },
  { name:'bonding',      browser:true,  run:require('./chapters/bonding') },
  { name:'sound',        browser:true,  run:require('./chapters/sound') },
  { name:'reproduction', browser:true,  run:require('./chapters/reproduction') },
  { name:'diversity',    browser:true,  run:require('./chapters/diversity') },
  { name:'earth-system', browser:true,  run:require('./chapters/earth-system') },
  { name:'coordinates',  browser:true,  run:require('./chapters/coordinates') },
  { name:'linear',       browser:true,  run:require('./chapters/linear') }
];

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    STAGES.forEach(s => console.log('  ' + s.name));
    return process.exit(0);
  }
  const want = args.filter(a => !a.startsWith('-'));
  const stages = want.length ? STAGES.filter(s => want.includes(s.name)) : STAGES;
  if (!stages.length) {
    console.error('No such stage: ' + want.join(', ') + '   (try --list)');
    return process.exit(2);
  }

  // www/ must be built, or every browser stage fails confusingly
  const fs = require('fs');
  if (!fs.existsSync(path.join(__dirname, '..', 'www', 'index.html'))) {
    console.error('www/ is not built — run: npm run build');
    return process.exit(2);
  }

  let close = null;
  if (stages.some(s => s.browser)) {
    try { close = await serve(); }
    catch (e) {
      console.error('Could not start the test server on port ' + PORT + ': ' + e.message);
      console.error('Something else may be using it; set SHELF_PORT to pick another.');
      return process.exit(2);
    }
  }

  const failed = [];
  const t0 = Date.now();
  for (const s of stages) {
    console.log('\n── ' + s.name + ' ' + '─'.repeat(Math.max(0, 56 - s.name.length)));
    let n;
    try { n = await s.run(); }
    catch (e) { console.error('  THREW: ' + (e && e.stack || e)); n = 1; }
    if (n) failed.push(s.name + ' (' + n + ')');
  }
  if (close) await close();

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log('\n' + '─'.repeat(60));
  if (failed.length) console.log('FAILED after ' + secs + 's: ' + failed.join(', '));
  else console.log('All ' + stages.length + ' stages passed in ' + secs + 's.');
  process.exit(failed.length ? 1 : 0);
})();
