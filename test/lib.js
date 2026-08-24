/* Shared plumbing for the test suite: a static server, a browser, and the
   reporting helpers every harness uses. */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const WWW  = path.join(__dirname, '..', 'www');
const PORT = Number(process.env.SHELF_PORT || 5173);
const BASE = 'http://localhost:' + PORT + '/';

const TYPES = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'
};

/* A static server for www/, so `npm test` needs nothing running beforehand.
   Resolves to a close() function. */
function serve(){
  return new Promise((resolve, reject)=>{
    const srv = http.createServer((req,res)=>{
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(WWW, rel);
      // never serve outside www/
      if(!file.startsWith(WWW)){ res.writeHead(403); return res.end('no'); }
      fs.readFile(file, (err, buf)=>{
        if(err){ res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                             'Cache-Control': 'no-store' });
        res.end(buf);
      });
    });
    srv.on('error', reject);
    srv.listen(PORT, ()=> resolve(()=> new Promise(r=> srv.close(r))));
  });
}

function playwright(){
  try { return require('playwright'); }
  catch(e){
    console.error('\nThis suite needs Playwright:  npm install --save-dev playwright');
    console.error('Chromium is expected at /opt/pw-browsers/chromium, or set PW_CHROMIUM.\n');
    process.exit(2);
  }
}

async function browser(){
  const { chromium } = playwright();
  const exe = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  const opts = fs.existsSync(exe) ? { executablePath: exe } : {};
  return chromium.launch(opts);
}

/* A page at the phone viewport the app is designed for, with console errors
   and failed requests collected. www/fonts holds only OFL.txt — the woff2
   files are not in the repo — so font 404s are expected and ignored. */
const IGNORE = /woff2|favicon|manifest|service-worker/i;

async function open(b, file, { wait = 1100, missions = false } = {}){
  const ctx  = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('response', r => {
    if(r.status() >= 400 && !IGNORE.test(r.url())) errs.push(r.status() + ' ' + r.url());
  });
  page.on('console', m => {
    if(m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text());
  });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + file);
  await page.waitForTimeout(wait);
  if(missions){
    await page.$$eval('details.m', ns => ns.forEach(n => n.open = true));
    await page.waitForTimeout(1300);
  }
  page.errs = errs;
  page.close2 = () => ctx.close();
  return page;
}

/* Set a range input the way a drag does — every intermediate value. Three
   discrete jumps can skip a whole band and make a live bench look dead. */
async function sweep(page, id, steps = 40){
  return page.$eval('#' + id, (n, steps)=>{
    const lo = +n.min, hi = +n.max, st = Math.max(+n.step || 1, (hi - lo) / steps);
    for(let v = lo; v <= hi; v += st){
      n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true }));
    }
    n.value = String(hi); n.dispatchEvent(new Event('input', { bubbles: true }));
  }, steps);
}

async function set(page, id, v){
  return page.$eval('#' + id, (n, v)=>{
    n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
}

const txt = (page, id) => page.textContent('#' + id).then(s => (s || '').trim());
const num = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));

/* Every harness reports the same way, so run.js can total them up. */
function reporter(name){
  let bad = 0;
  return {
    fail(m){ console.log('  FAIL ' + m); bad++; },
    note(m){ console.log('   ' + m); },
    head(m){ console.log('== ' + m); },
    get failures(){ return bad; },
    done(){
      console.log(bad ? '\n' + name + ': ' + bad + ' FAILURE(S)' : '\n' + name + ': ok');
      return bad;
    }
  };
}

/* Standalone entrypoint for a single stage: start the server, run, exit with
   the failure count. Without this each stage crashed with an unhandled
   EADDRINUSE when the port was busy, instead of saying so. */
function main(run){
  serve().then(async close => {
    let n;
    try { n = await run(); }
    catch(e){ console.error('  THREW: ' + (e && e.stack || e)); n = 1; }
    await close();
    process.exit(n ? 1 : 0);
  }).catch(e => {
    if(e && e.code === 'EADDRINUSE'){
      console.error('Port ' + PORT + ' is busy. Set SHELF_PORT to pick another:');
      console.error('  SHELF_PORT=5200 node ' + (process.argv[1] || 'test/run.js'));
    } else console.error(e);
    process.exit(2);
  });
}

module.exports = { serve, browser, open, sweep, set, txt, num, reporter, main, BASE, PORT };
