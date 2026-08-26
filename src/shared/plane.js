/* ============================================================
   The coordinate plane, as a drawing surface
   ============================================================
   Maths chapters draw the same object again and again: a patch of the plane
   with the axes through it, points marked on it, a caption underneath. This
   file draws the paper and hands back the two functions that convert graph
   units to pixels — px(u) across, py(v) up — so a bench is written in the units
   its textbook prints rather than in pixels. That is also what lets a chapter
   test check a drawing against the book instead of against itself.

   Include it AFTER shared/engine.js: it uses fit(), arrow() and mono() from
   there. It owns no chapter accents — a chapter defines its own A1/A2 and
   passes colours in.
   ============================================================ */

/* The plane's own background. Labels sit on a plate of it so that a point near
   an axis is not drawn across that axis's tick numbers. */
const PLANE_BG = '#10162B';
const PLANE_DIM = '#8E9AC0';

/* Coordinates land on halves as often as on whole numbers — (4.5, 0) and
   (0, −4.5) are the book's own — so every readout goes through one formatter.
   neg() also spells the sign with a real minus rather than a hyphen, so an
   axis tick, a readout and the printed page all agree on what −5 looks like. */
const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n*1000)/1000);
const neg = n => (n < 0 ? '−' : '') + fmt(Math.abs(n));

/* ============================================================
   One helper, nine benches.

   Every bench in this chapter draws the same object: a patch of the plane with
   the axes through it. Rather than nine copies of the grid code, plane() draws
   the paper and hands back the two functions that convert graph units to
   pixels — px(u) across, py(v) up. Everything after that is drawn in the units
   the textbook uses, which is also the only way the chapter test can check a
   drawing against the book.
   ============================================================ */
function plane(x, W, H, o){
  o = o || {};
  const xlo = o.xlo!==undefined ? o.xlo : -9, xhi = o.xhi!==undefined ? o.xhi : 9;
  const ylo = o.ylo!==undefined ? o.ylo : -9, yhi = o.yhi!==undefined ? o.yhi : 9;
  const L = o.left!==undefined ? o.left : 16, Rp = 14, T = 12, B = 16;
  const sx = (W-L-Rp)/(xhi-xlo), sy = (H-T-B)/(yhi-ylo);
  const px = u => L + (u-xlo)*sx;
  const py = v => T + (yhi-v)*sy;
  const x0 = px(0), y0 = py(0);

  x.fillStyle = PLANE_BG; x.fillRect(0,0,W,H);

  /* unit grid */
  x.strokeStyle = 'rgba(142,154,192,.13)'; x.lineWidth = 0.5;
  for(let u=Math.ceil(xlo); u<=xhi; u++){
    x.beginPath(); x.moveTo(px(u), py(yhi)); x.lineTo(px(u), py(ylo)); x.stroke();
  }
  for(let v=Math.ceil(ylo); v<=yhi; v++){
    x.beginPath(); x.moveTo(px(xlo), py(v)); x.lineTo(px(xhi), py(v)); x.stroke();
  }

  /* the axes themselves, arrowed both ways when the range crosses zero */
  const showX = ylo <= 0 && yhi >= 0, showY = xlo <= 0 && xhi >= 0;
  if(showX){
    arrow(x, px(xlo), y0, px(xhi), y0, 'rgba(142,154,192,.72)', 6);
    if(xlo < 0) arrow(x, x0, y0, px(xlo), y0, 'rgba(142,154,192,.72)', 6);
  }
  if(showY){
    arrow(x, x0, py(ylo), x0, py(yhi), 'rgba(142,154,192,.72)', 6);
    if(ylo < 0) arrow(x, x0, y0, x0, py(ylo), 'rgba(142,154,192,.72)', 6);
  }

  /* numbers, thinned out so they never collide at 390px, and carrying the same
     typographic minus the readouts and the textbook use rather than a hyphen */
  mono(x, 8.5, 400); x.fillStyle = PLANE_DIM;
  const step = (xhi-xlo) > 14 ? 2 : 1;
  x.textAlign = 'center'; x.textBaseline = 'top';
  if(showX) for(let u=Math.ceil(xlo/step)*step; u<=xhi; u+=step){
    if(u === 0) continue;
    x.fillText(neg(u), px(u), y0+3);
  }
  x.textAlign = 'right'; x.textBaseline = 'middle';
  const stepY = (yhi-ylo) > 14 ? 2 : 1;
  if(showY) for(let v=Math.ceil(ylo/stepY)*stepY; v<=yhi; v+=stepY){
    if(v === 0) continue;
    x.fillText(neg(v), x0-4, py(v));
  }
  if(showX && showY){
    x.textAlign = 'right'; x.textBaseline = 'top';
    x.fillText('O', x0-3, y0+3);
  }
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  return { px, py, sx, sy, x0, y0, xlo, xhi, ylo, yhi };
}

/* A labelled dot, the shape every bench marks its points with.

   The label sits on a small plate of the background colour. Without it the
   coordinates of a point near an axis are drawn straight over that axis's own
   tick numbers, and "(−5, 3)" laid across a dashed guide line and a "−4" tick
   comes out as an unreadable smear — which is exactly what the first draft of
   the quadrant bench did. */
function dot(x, p, u, v, col, label, side){
  const cx = p.px(u), cy = p.py(v);
  x.fillStyle = col;
  x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill();
  if(label){
    mono(x, 9.5, 500);
    const w = x.measureText(label).width;
    /* 'u' sets the label above the dot rather than beside it, for the benches
       that draw a line along the axis through the point — beside it, the label
       lies on the very segment whose length it is reporting. */
    const up = side === 'u';
    const lx = up ? cx : cx + (side === 'l' ? -8 : 8);
    const ly = up ? cy - 13 : cy - 1;
    x.fillStyle = PLANE_BG;
    x.fillRect(up ? lx - w/2 - 2 : (side === 'l' ? lx - w - 2 : lx - 2), ly - 7, w + 4, 14);
    x.fillStyle = col;
    x.textAlign = up ? 'center' : side === 'l' ? 'right' : 'left';
    x.textBaseline = 'middle';
    x.fillText(label, lx, ly);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  }
}

/* A caption line under the drawing. Kept to one line: at 390px the panel is
   288px wide, which is 53 characters of 9px mono and not one more. */
function cap(x, W, H, s, col){
  mono(x, 9, 400); x.fillStyle = col || PLANE_DIM;
  x.textAlign = 'center'; x.textBaseline = 'bottom';
  x.fillText(s, W/2, H-2);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
}

/* Surd form, because the book leaves the answers as √29 and √40 rather than
   as decimals — and a reader checking against the page needs to see the same. */
function surd(n){
  const r = Math.sqrt(n);
  if(Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return '√' + n;
}

