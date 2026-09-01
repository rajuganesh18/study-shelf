/* ============================================================
   The circle, for the chapters that draw on one.

   Two Maths chapters now put things on circles — chapter 5's twelve theorems
   and chapter 6's π — and both wanted the same four jobs: draw the outline,
   name the centre, put a labelled point on the rim, and mark an angle. This is
   one copy of them.

   Degrees run anticlockwise from the right, the way the book writes them, and
   pt() flips the screen's y so no bench has to think about it.

   Like plane.js this owns no chapter accents: every colour is passed in. It
   uses mono() and PLANE_BG, so it has to come after engine.js and plane.js.
   ============================================================ */
function circ(x, W, H, o){
  o = o || {};
  const cx = o.cx !== undefined ? o.cx : W/2;
  const cy = o.cy !== undefined ? o.cy : H*0.46;
  const R  = o.R  !== undefined ? o.R  : Math.min(W, H*1.2)*0.30;
  x.fillStyle = PLANE_BG; if(!o.keep) x.fillRect(0,0,W,H);
  x.strokeStyle = o.col || 'rgba(142,154,192,.75)';
  x.lineWidth = o.w || 1.6;
  x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
  const pt = d => [cx + R*Math.cos(d*Math.PI/180), cy - R*Math.sin(d*Math.PI/180)];
  return { cx, cy, R, pt };
}

/* The centre, drawn as the book draws it: a dot with its name beside it.
   Pass '' for the label to draw the dot alone. */
function centre(x, c, col, label){
  x.fillStyle = col;
  x.beginPath(); x.arc(c.cx, c.cy, 3.4, 0, 7); x.fill();
  if(label !== ''){
    mono(x, 9, 500); x.fillStyle = col;
    x.fillText(label || 'O', c.cx + 6, c.cy + 12);
  }
}

/* A labelled point on the rim, its label pushed outwards so it never sits on
   the circle it belongs to. */
function rim(x, c, deg, col, label){
  const [px, py] = c.pt(deg);
  x.fillStyle = col;
  x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
  if(label){
    const ux = Math.cos(deg*Math.PI/180), uy = -Math.sin(deg*Math.PI/180);
    mono(x, 9.5, 600); x.fillStyle = col;
    x.textAlign = ux > 0.25 ? 'left' : ux < -0.25 ? 'right' : 'center';
    x.textBaseline = uy > 0.25 ? 'top' : uy < -0.25 ? 'bottom' : 'middle';
    x.fillText(label, px + ux*9, py + uy*9);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  }
  return [px, py];
}

/* An angle arc at a vertex, with its size written on it. */
function angleArc(x, vx, vy, a1, a2, r, col, label){
  x.strokeStyle = col; x.lineWidth = 1.6;
  x.beginPath(); x.arc(vx, vy, r, -a2*Math.PI/180, -a1*Math.PI/180); x.stroke();
  if(label){
    const mid = (a1 + a2)/2;
    mono(x, 9, 600); x.fillStyle = col;
    x.textAlign='center'; x.textBaseline='middle';
    x.fillText(label, vx + (r+11)*Math.cos(mid*Math.PI/180), vy - (r+11)*Math.sin(mid*Math.PI/180));
    x.textAlign='left'; x.textBaseline='alphabetic';
  }
}

const deg = n => Math.round(n) + '°';
