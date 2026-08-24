/* Every id the script reaches for must exist in the markup, and every Q.*
   call must be given the arity its component expects. Static, so it catches
   the branches a click-through never reaches.

   This is the check that found chapter 6's Q.match('g4','g4s',[…]) — two ids
   where three are required, which silently fed the score div in as the pairs
   array and killed the whole chapter script. The class check found the same
   chapter's matchA/matchB, which no stylesheet defined. */
const fs   = require('fs');
const path = require('path');
const CHAPTERS = require('./chapters');
const { reporter } = require('./lib');

/* How many element ids each component takes before its data argument. */
const IDS = { order: 2, match: 3, rows: 2, pick: 3, grid: 3, vgrid: 3, boss: 0 };

function auditFile(file, r){
  const src  = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  const markup = src.slice(0, src.indexOf('<script>'));
  const script = src.slice(src.indexOf('<script>'));

  const have = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  // ids the script creates for itself
  for (const m of script.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)) have.add(m[1]);

  let bad = 0;
  const miss = new Set();
  for (const m of script.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!have.has(m[1])) miss.add(m[1]);
  }
  for (const m of script.matchAll(/Q\.(\w+)\(([^[{]*)/g)) {
    const fn = m[1], args = [...m[2].matchAll(/'([^']*)'/g)].map(a => a[1]);
    args.forEach(a => { if (a && !have.has(a)) miss.add(a); });
    const want = IDS[fn];
    if (want !== undefined && args.length !== want) {
      r.fail(name + ': Q.' + fn + '(' + args.join(', ') + ', …) passes ' +
             args.length + ' ids, needs exactly ' + want);
      bad++;
    }
  }
  // classes used in markup that no stylesheet in the file defines
  const css = src.slice(0, src.indexOf('</style>'));
  const unstyled = new Set();
  for (const m of markup.matchAll(/\bclass="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (c && !new RegExp('\\.' + c + '\\b').test(css)) unstyled.add(c);
    }
  }
  if (miss.size) {
    r.fail(name + ': ids referenced but not in markup -> ' + [...miss].join(', '));
    bad += miss.size;
  }
  if (unstyled.size) r.note('NOTE ' + name + ': classes with no CSS rule -> ' + [...unstyled].join(', '));
  return bad;
}

function run(){
  const r = reporter('audit-ids');
  r.head('id references resolve, and Q.* calls have the right arity');
  const www = path.join(__dirname, '..', 'www');
  const files = CHAPTERS.map(c => path.join(www, CHAPTERS.file(c))).concat(path.join(www, 'index.html'));
  let clean = 0;
  files.forEach(f=>{
    if(!fs.existsSync(f)){ r.fail(path.basename(f) + ' is not built — run npm run build'); return; }
    if(auditFile(f, r) === 0) clean++;
  });
  r.note(clean + ' of ' + files.length + ' files clean');
  return r.failures;
}

module.exports = run;
if (require.main === module) process.exit(run() ? 1 : 0);
