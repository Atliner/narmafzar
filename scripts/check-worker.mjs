// =============================================================================
// check-worker.mjs — extracts the CORE-PURE block from worker.js and runs
// geometry / raster / boolean algorithm tests in pure Node (no DOM needed).
// run: node scripts/check-worker.mjs
// =============================================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

const BEGIN = '/* =========================================================================\n   CORE-PURE-BEGIN';
const END = '   CORE-PURE-END\n   ========================================================================= */';

function extract(block) {
  const a = src.indexOf(block.begin);
  const b = src.indexOf(block.end);
  if (a < 0 || b < 0 || b < a) throw new Error('markers not found: ' + block.begin.slice(0, 40));
  return src.slice(a, b + block.end.length);
}

const core = extract({ begin: BEGIN, end: END });
const ctx = { console, Math, Set, JSON, Uint8Array, Uint8ClampedArray, Uint8ArrayFromFix: null };
vm.createContext(ctx);
vm.runInContext(core + '\nglobalThis.NC = NEONCORE;', ctx);
const NC = ctx.NC;
/* rasterToGeoms lives in the DOM section but is pure — lift it in */
{
  const ra = src.indexOf('function rasterToGeoms');
  const rb = src.indexOf('function', ra + 10);
  vm.runInContext(src.slice(ra, rb) + '\nglobalThis.rasterToGeoms = rasterToGeoms;', ctx);
}

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}
function near(a, b, eps, name) {
  ok(Math.abs(a - b) <= eps, name + '  (' + a + ' ≈ ' + b + ')');
}

/* ---------- basic geometry ---------- */
{
  const line = { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 30, y: 40 }] };
  near(NC.pathLength(line), 50, 1e-9, 'pathLength 3-4-5 line');
  const circle = {
    type: 'bezier',
    points: [{ x: 10, y: 0 }, { x: 0, y: 10 }, { x: -10, y: 0 }, { x: 0, y: -10 }, { x: 10, y: 0 }],
    ctrl: null
  };
  const k = 0.5522847498 * 10;
  circle.ctrl = [
    { c1: { x: 10, y: k }, c2: { x: k, y: 10 } },
    { c1: { x: -k, y: 10 }, c2: { x: -10, y: k } },
    { c1: { x: -10, y: -k }, c2: { x: -k, y: -10 } },
    { c1: { x: k, y: -10 }, c2: { x: 10, y: -k } }
  ];
  near(NC.pathLength(circle), 2 * Math.PI * 10, 0.02, 'bezier circle circumference');
  ok(NC.snapTarget(83.2, 2.5) === 85, 'snapTarget 83.2 -> 85');
  ok(NC.snapTarget(85, 2.5) === 85, 'snapTarget exact stays');
}

/* ---------- otsu threshold ---------- */
{
  // 10x10: left half dark (30), right half bright (220)
  const w = 10, h = 10, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = x < 5 ? 30 : 220, p = (y * w + x) * 4;
    rgba[p] = v; rgba[p + 1] = v; rgba[p + 2] = v; rgba[p + 3] = 255;
  }
  const t = NC.otsuThreshold(rgba, w, h);
  ok(t > 30 && t < 220, 'otsu separates dark/bright  (t=' + t + ')');
}

/* ---------- marching squares: filled square outline ---------- */
{
  const w = 20, h = 20, bin = new Uint8Array(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) bin[y * w + x] = 1;
  const loops = NC.traceContours(bin, w, h);
  ok(loops.length === 1, 'square -> exactly 1 contour loop (got ' + loops.length + ')');
  if (loops.length === 1) {
    // perimeter should be ~ 4 * 10 = 40 (at 0.5 pixel inset: 4*9 = 36)
    let per = 0;
    const pts = loops[0].pts;
    for (let i = 1; i < pts.length; i++) per += NC.dist(pts[i - 1], pts[i]);
    per += NC.dist(pts[pts.length - 1], pts[0]);
    ok(per > 30 && per < 42, 'square contour perimeter ~36-40 (got ' + per.toFixed(1) + ')');
    // area via shoelace should be ~ 9.5^2 ~ 90
    let A = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      A += a.x * b.y - b.x * a.y;
    }
    A = Math.abs(A) / 2;
    ok(A > 80 && A < 101, 'square contour area ~90 (got ' + A.toFixed(1) + ')');
  }
}

/* ---------- marching squares: square with hole -> 2 loops ---------- */
{
  const w = 20, h = 20, bin = new Uint8Array(w * h);
  for (let y = 3; y < 17; y++) for (let x = 3; x < 17; x++) bin[y * w + x] = 1;
  for (let y = 8; y < 12; y++) for (let x = 8; x < 12; x++) bin[y * w + x] = 0;
  const loops = NC.traceContours(bin, w, h);
  ok(loops.length === 2, 'square with hole -> 2 contour loops (outer + hole) (got ' + loops.length + ')');
}

/* ---------- marching squares: thin diagonal stroke stays connected ---------- */
{
  const w = 30, h = 30, bin = new Uint8Array(w * h);
  for (let i = 2; i < 26; i++) bin[i * w + i] = 1;
  const loops = NC.traceContours(bin, w, h);
  ok(loops.length === 1, 'diagonal 1px line -> single outline loop (got ' + loops.length + ')');
}

/* ---------- centerline: thick horizontal bar -> one centerline chain ---------- */
{
  const w = 40, h = 21, bin = new Uint8Array(w * h);
  for (let y = 8; y < 13; y++) for (let x = 2; x < 38; x++) bin[y * w + x] = 1;
  const skel = NC.zhangSuen(bin, w, h);
  let chains = NC.traceSkeleton(skel, w, h, 4);
  chains = NC.extendChainEnds(chains, bin, skel, w, h, 12);
  ok(chains.length === 1, 'thick bar -> 1 skeleton chain (got ' + chains.length + ')');
  if (chains.length === 1) {
    const L = chains[0].reduce((a, p, i) => i ? a + NC.dist(chains[0][i - 1], p) : 0, 0);
    near(L, 36, 4, 'skeleton chain length ≈ bar length (ends recovered)');
    const ys = chains[0].map(p => p.y);
    near(Math.max(...ys) - Math.min(...ys), 0, 1.5, 'skeleton is centered vertically');
  }
}

/* ---------- spur pruning ---------- */
{
  const w = 30, h = 15, bin = new Uint8Array(w * h);
  for (let x = 2; x < 26; x++) bin[7 * w + x] = 1;   // main line
  bin[10 * w + 12] = 1; bin[9 * w + 12] = 1; bin[8 * w + 12] = 1; // 3-px spur
  const skel = NC.pruneSpurs(bin, w, h, 4);
  ok(!skel[10 * w + 12], '3px spur removed by pruning');
  ok(skel[7 * w + 12], 'main line kept by pruning');
}

/* ---------- despeckle ---------- */
{
  const w = 20, h = 20, bin = new Uint8Array(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) bin[y * w + x] = 1;
  bin[2 * w + 2] = 1; bin[2 * w + 3] = 1; bin[3 * w + 2] = 1; // 3-px blob
  const out = NC.removeSmallComponents(bin, w, h, 8);
  ok(out[2 * w + 2] === 0, 'small blob removed');
  ok(out[10 * w + 10] === 1, 'big component kept');
}

/* ---------- offset polyline (double line) ---------- */
{
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  const left = NC.offsetPolyline(pts, 1, false);
  const right = NC.offsetPolyline(pts, -1, false);
  near(left[0].y, -1, 1e-9, 'offset left first point y=-1');
  near(right[0].y, 1, 1e-9, 'offset right first point y=+1');
  ok(left.length >= 3 && right.length >= 3, 'offsets have points');
}

/* ---------- boolean ops ---------- */
{
  const pxPerCm = 4;
  const A = [], B = [];
  for (let i = 0; i <= 4; i++) { // circle r=5 at (0,0) and (6,0)
    for (let k = 0; k <= 40; k++) {
      const a = k / 40 * Math.PI * 2;
      A.push({ x: Math.cos(a) * 5, y: Math.sin(a) * 5 });
      B.push({ x: 6 + Math.cos(a) * 5, y: Math.sin(a) * 5 });
    }
  }
  // weld of two overlapping circles -> one outline loop
  const weld = NC.booleanGeoms([A, B], 'weld', pxPerCm);
  ok(weld.length === 1, 'weld two overlapping circles -> 1 path (got ' + weld.length + ')');
  // intersect -> single lens shape
  const inter = NC.booleanGeoms([A, B], 'intersect', pxPerCm);
  ok(inter.length === 1, 'intersect two overlapping circles -> 1 path (got ' + inter.length + ')');
  // trim: A minus B -> crescent
  const trim = NC.booleanGeoms([A, B], 'trim', pxPerCm);
  ok(trim.length === 1, 'trim circle minus circle -> 1 path (got ' + trim.length + ')');
  if (inter.length === 1) {
    // lens bbox: x from 1 to 5, y from -4 to 4 (approx)
    const bb = inter[0].points.reduce((a, p) => ({
      minX: Math.min(a.minX, p.x), maxX: Math.max(a.maxX, p.x),
      minY: Math.min(a.minY, p.y), maxY: Math.max(a.maxY, p.y)
    }), { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 });
    near(bb.minX, 1, 0.5, 'lens left edge x≈1');
    near(bb.maxX, 5, 0.5, 'lens right edge x≈5');
    near(bb.maxY, 4, 0.5, 'lens top y≈4');
  }
}

/* ---------- AUTO trace mode: solid vs thin art ---------- */
{
  const rast = ctx.rasterToGeoms;
  // solid fat rectangle -> auto must pick outline (medial axis would be tiny)
  const w = 300, h = 150, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 20; y < 130; y++) for (let x = 40; x < 120; x++) {
    const p = (y * w + x) * 4; rgba[p] = 0; rgba[p + 1] = 0; rgba[p + 2] = 0; rgba[p + 3] = 255;
  }
  const solid = rast(rgba, w, h, { mode: 'auto', threshold: 'auto', eps: 1.2, smooth: true, minLenPx: 8, despeckle: 3 });
  ok(ctx.NC ? true : true, 'auto ran on solid rect');
  ok(rast.autoInfo && rast.autoInfo.mode === 'outline', 'AUTO: solid rect -> OUTLINE (stroke ~' + (rast.autoInfo ? rast.autoInfo.strokeWidthPx.toFixed(0) : '?') + 'px)');
  ok(solid.length === 1, 'auto outline of solid rect gives 1 closed loop');
  // thin line art -> auto must pick centerline
  const rgba2 = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let x = 10; x < 290; x++) for (let y = 70; y < 78; y++) {
    const p = (y * w + x) * 4; rgba2[p] = 0; rgba2[p + 1] = 0; rgba2[p + 2] = 0; rgba2[p + 3] = 255;
  }
  const thin = rast(rgba2, w, h, { mode: 'auto', threshold: 'auto', eps: 1.2, smooth: true, minLenPx: 5, despeckle: 3 });
  ok(rast.autoInfo && rast.autoInfo.mode === 'center', 'AUTO: thin bar -> CENTERLINE (stroke ~' + (rast.autoInfo ? rast.autoInfo.strokeWidthPx.toFixed(0) : '?') + 'px)');
  ok(thin.length === 1, 'auto centerline of thin bar gives 1 chain');
  const L = thin[0].points.reduce((a, p, i) => i ? a + Math.hypot(thin[0].points[i].x - thin[0].points[i - 1].x, thin[0].points[i].y - thin[0].points[i - 1].y) : 0, 0);
  near(L, 280, 12, 'auto centerline bar length recovered');
}

/* ---------- pieces / packing / power ---------- */
{
  const pr = NC.demoProject();
  const pieces = NC.buildPieces(pr);
  ok(pieces.length >= 3, 'demo project builds pieces');
  const pw = NC.computePower(pr, 1000);
  near(pw.totalW, 100, 1e-6, 'power: 10m * 10W/m = 100W');
  const pack = NC.packRolls([300, 200, 200], 500);
  ok(pack.count === 2, 'FFD packing 300+200+200 into 500 rolls -> 2 rolls');
  ok(NC.packRolls([300, 300, 300], 500).count === 3, 'FFD: 3x300 needs 3 rolls (no pair fits a 500 roll)');
}

/* ---------- loopsToGeoms: closed geometry sanity ---------- */
{
  const w = 20, h = 20, bin = new Uint8Array(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) bin[y * w + x] = 1;
  const loops = NC.traceContours(bin, w, h);
  const geoms = NC.loopsToGeoms(loops, { eps: 1.2, smooth: true, minLenPx: 6 });
  ok(geoms.length === 1, 'square -> 1 geometry');
  if (geoms.length === 1) {
    const g = geoms[0];
    ok(g.type === 'bezier', 'smoothed outline is bezier');
    const n = g.points.length - 1;
    near(NC.dist(g.points[0], g.points[n]), 0, 1e-9, 'closed geometry repeats first point');
    ok(g.ctrl.length === n, 'ctrl count matches segments');
  }
}

console.log('check-worker: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
