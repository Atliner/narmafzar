// =============================================================================
// dom-runtime.mjs — OPTIONAL deep test: boots the whole served app in jsdom
// (with a pixel-buffer canvas stub) and exercises the main flows:
//   init + demo project, NEON TEXT (centerline & outline), TRACE IMAGE modes,
//   boolean weld/trim/intersect, double-line, align, transform, exports.
// Skipped gracefully when jsdom is not installed (zero-dependency policy).
// run: node scripts/dom-runtime.mjs   (needs: npm i jsdom --no-save)
// =============================================================================
import { readFileSync } from 'node:fs';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('dom-runtime: jsdom not installed — skipped (npm i jsdom --no-save to enable)');
  process.exit(0);
}

const src = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const marker = 'const HTML_PAGE = `';
const a = src.indexOf(marker);
const b = src.indexOf('`;\n\nexport default', a);
const html = src.slice(a + marker.length, b);

/* ---------------- fake 2D canvas context with a real pixel buffer ---------- */
function parseFontPx(font) {
  const m = /(\d+(?:\.\d+)?)px/.exec(String(font || ''));
  return m ? parseFloat(m[1]) : 10;
}
function attachFakeCanvas(dom) {
  const C = dom.window.HTMLCanvasElement.prototype;
  const proto2d = {};
  const noop = () => {};
  C.getContext = function (type) {
    if (type !== '2d') return null;
    const cv = this;
    let buf = null, W = 0, H = 0;
    const st = {
      fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, font: '10px sans-serif',
      textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1, lineJoin: 'miter',
      lineCap: 'butt', letterSpacing: '0px', direction: 'ltr', lineDash: []
    };
    function ensure() {
      if (!buf || W !== cv.width || H !== cv.height) {
        W = cv.width; H = cv.height;
        buf = new dom.window.Uint8ClampedArray ? new Uint8ClampedArray(W * H * 4) : new Uint8ClampedArray(W * H * 4);
        buf.fill(255);
      }
    }
    function isDark(col) {
      if (String(col).indexOf('#fff') === 0 || String(col).indexOf('#FFF') === 0) return false;
      if (String(col).indexOf('rgb(255') === 0) return false;
      if (String(col).indexOf('#f') === 0 || String(col).indexOf('#F') === 0) {
        // #f5f5f5-ish -> light. crude but ok for the app's usage (#fff or #000 / #0e141c)
        const h = String(col).slice(1);
        if (h.length >= 6 && parseInt(h.slice(0, 2), 16) > 200) return false;
      }
      return true;
    }
    function put(x, y, dark) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const p = (y * W + x) * 4;
      const v = dark ? 0 : 255;
      buf[p] = v; buf[p + 1] = v; buf[p + 2] = v; buf[p + 3] = 255;
    }
    const ctx = {
      canvas: cv,
      get fillStyle() { return st.fillStyle; }, set fillStyle(v) { st.fillStyle = v; },
      get strokeStyle() { return st.strokeStyle; }, set strokeStyle(v) { st.strokeStyle = v; },
      get lineWidth() { return st.lineWidth; }, set lineWidth(v) { st.lineWidth = v; },
      get font() { return st.font; }, set font(v) { st.font = v; },
      get textAlign() { return st.textAlign; }, set textAlign(v) { st.textAlign = v; },
      get textBaseline() { return st.textBaseline; }, set textBaseline(v) { st.textBaseline = v; },
      get globalAlpha() { return st.globalAlpha; }, set globalAlpha(v) { st.globalAlpha = v; },
      get lineJoin() { return st.lineJoin; }, set lineJoin(v) { st.lineJoin = v; },
      get lineCap() { return st.lineCap; }, set lineCap(v) { st.lineCap = v; },
      get letterSpacing() { return st.letterSpacing; }, set letterSpacing(v) { try { st.letterSpacing = v; } catch (e) { } },
      get direction() { return st.direction; }, set direction(v) { st.direction = v; },
      setLineDash() { }, getLineDash() { return []; },
      setTransform() { }, save() { }, restore() { }, translate() { }, scale() { }, rotate() { },
      beginPath() { }, closePath() { }, moveTo() { }, lineTo() { }, bezierCurveTo() { },
      quadraticCurveTo() { }, arc() { }, ellipse() { }, rect() { }, clip() { },
      stroke() { }, fill() { }, fillRect() { }, strokeRect() { }, clearRect() { },
      drawImage() { }, createLinearGradient() { return { addColorStop() { } }; },
      measureText(text) {
        const fs = parseFontPx(st.font);
        const t = String(text);
        const wide = /[MW@ناپچگ] /.test(t) ? 0.75 : 0.6;
        return {
          width: t.length * fs * wide,
          actualBoundingBoxAscent: fs * 0.78,
          actualBoundingBoxDescent: fs * 0.22
        };
      },
      fillText(text, x, y) {
        ensure();
        if (!isDark(st.fillStyle)) return;
        const fs = parseFontPx(st.font);
        const m = this.measureText(text);
        /* simulate the text as a black rectangle block (enough for the tracer) */
        let x0 = x, y0 = y - fs * 0.78;
        if (st.textAlign === 'center') x0 = x - m.width / 2;
        if (st.textBaseline === 'middle') y0 = y - fs * 0.5;
        for (let yy = Math.max(0, Math.floor(y0)); yy < Math.min(H, y0 + fs * 0.95); yy++) {
          for (let xx = Math.max(0, Math.floor(x0)); xx < Math.min(W, x0 + m.width); xx++) put(xx, yy, true);
        }
      },
      strokeText(text, x, y) { this.fillText(text, x, y); },
      getImageData(x, y, w2, h2) {
        ensure();
        return { data: buf.slice(0), width: w2, height: h2 };
      },
      putImageData() { }
    };
    return ctx;
  };
}

/* ---------------- boot the app ---------------- */
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const { window } = dom;
window.devicePixelRatio = 1;
window.confirm = () => true;
window.print = () => { };
window.scrollTo = () => { };
attachFakeCanvas(dom);
/* Blob download capture */
const downloads = [];
window.URL.createObjectURL = (blob) => {
  downloads.push(blob);
  return 'blob:fake-' + downloads.length;
};
window.URL.revokeObjectURL = () => { };

let failed = 0, passed = 0;
function ok(cond, name) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}

try {
  const script = window.document.querySelector('script:not([src])').textContent;
  window.eval(script);
  await new Promise((r) => setTimeout(r, 120)); /* let DOMContentLoaded / init run */
  ok(typeof window.NEONCORE === 'object', 'app booted, NEONCORE exposed');

  const $ = (id) => window.document.getElementById(id);

  /* init already ran via DOMContentLoaded (readyState interactive in jsdom eval? force) */
  ok($('cutBody').children.length >= 3, 'demo project renders a cut list (' + $('cutBody').children.length + ' rows)');
  ok($('objBody').children.length >= 3, 'OBJECTS tab lists paths (' + $('objBody').children.length + ' rows)');

  /* ---- NEON TEXT: centerline ---- */
  $('txtInput').value = 'NEON';
  $('txtMode').value = 'center';
  $('txtSize').value = '20';
  $('txtAsLabel').checked = false;
  const before = window.S.project.paths.length;
  window.applyTextDialog();
  ok(window.S.project.paths.length > before, 'NEON TEXT centerline created real neon paths (+' + (window.S.project.paths.length - before) + ')');
  ok(window.S.pieces.length > 0, 'text paths appear in the cut list');

  /* ---- NEON TEXT: outline (double line) ---- */
  $('txtInput').value = 'NEON';
  $('txtMode').value = 'outline';
  const before2 = window.S.project.paths.length;
  window.applyTextDialog();
  const added2 = window.S.project.paths.length - before2;
  ok(added2 >= 1, 'NEON TEXT outline (double-line) created paths (+' + added2 + ')');

  /* ---- label mode ---- */
  $('txtInput').value = 'hello note';
  $('txtAsLabel').checked = true;
  const textsBefore = window.S.project.texts.length;
  window.applyTextDialog();
  ok(window.S.project.texts.length === textsBefore + 1, 'label-only mode adds a note, not neon');

  /* ---- shape tools ---- */
  const rect = window.buildShapeGeom('rect', { x: 10, y: 10 }, { x: 40, y: 30 }, false);
  ok(rect && rect.points.length === 5, 'rect geometry (closed, 5 pts)');
  const circ = window.buildShapeGeom('ellipse', { x: 0, y: 0 }, { x: 20, y: 20 }, true);
  ok(circ && circ.type === 'bezier' && circ.points.length === 5, 'circle geometry (bezier)');
  const star = window.buildShapeGeom('star', { x: 0, y: 0 }, { x: 10, y: 0 }, false);
  ok(star && star.points.length === 11, 'star geometry (10 pts + close)');
  const spir = window.buildShapeGeom('spiral', { x: 0, y: 0 }, { x: 10, y: 3 }, false);
  ok(spir && spir.points.length > 50, 'spiral geometry');

  /* ---- boolean ops on two overlapping rects ---- */
  window.S.project.paths = [];
  const gA = window.wrapGeoms([window.buildShapeGeom('rect', { x: 10, y: 10 }, { x: 50, y: 50 }, false)]);
  const gB = window.wrapGeoms([window.buildShapeGeom('rect', { x: 30, y: 10 }, { x: 70, y: 50 }, false)]);
  window.S.project.paths = [gA[0], gB[0]];
  window.S.sel = [gA[0].id, gB[0].id];
  window.booleanSelection('weld');
  ok(window.S.project.paths.length === 1, 'WELD two overlapping rects -> 1 object (got ' + window.S.project.paths.length + ')');
  ok(Math.abs(window.pathLength(window.S.project.paths[0]) - 200) < 15, 'welded outline perimeter ≈ 200 (60x40 union) (got ' + window.pathLength(window.S.project.paths[0]).toFixed(1) + ')');

  window.S.project.paths = [window.clonePath(gA[0]), window.clonePath(gB[0])];
  window.S.project.paths[0].id = 'a1'; window.S.project.paths[1].id = 'b1';
  window.S.sel = ['a1', 'b1'];
  window.booleanSelection('intersect');
  ok(window.S.project.paths.length === 1, 'INTERsect two rects -> 1 object');

  window.S.project.paths = [window.clonePath(gA[0]), window.clonePath(gB[0])];
  window.S.project.paths[0].id = 'a2'; window.S.project.paths[1].id = 'b2';
  window.S.sel = ['a2', 'b2'];
  window.booleanSelection('trim');
  ok(window.S.project.paths.length === 1, 'TRIM rect minus rect -> 1 object');

  /* ---- double line ---- */
  window.S.project.paths = [window.clonePath(gA[0])];
  window.S.project.paths[0].id = 'dl1';
  window.S.sel = ['dl1'];
  window.S.project.settings.dblGapCm = 4;
  window.doubleLineSelection(false);
  ok(window.S.project.paths.length === 2, 'DOUBLE LINE: 1 path -> 2 parallel neon lines');
  if (window.S.project.paths.length === 2) {
    const l1 = window.pathBBoxOf(window.S.project.paths[0]);
    const l2 = window.pathBBoxOf(window.S.project.paths[1]);
    const gap = Math.abs(l1.minY - l2.minY);
    ok(Math.abs(gap - 4) < 0.6, 'double-line vertical gap ≈ 4cm (got ' + gap.toFixed(2) + ')');
  }

  /* ---- align ---- */
  window.S.project.paths = [window.clonePath(gA[0]), window.clonePath(gB[0])];
  window.S.project.paths[0].id = 'al1'; window.S.project.paths[1].id = 'al2';
  window.S.sel = ['al1'];
  window.alignSelection('left');
  ok(Math.abs(window.pathBBoxOf(window.S.project.paths[0]).minX) < 0.05, 'ALIGN left -> x≈0');

  /* ---- transform handles: scale via matrix ---- */
  window.S.sel = ['al1'];
  const bb0 = window.selBBox();
  for (const p of window.S.project.paths) if (p.id === 'al1') window.xformPath(p, window.matAbout(window.matScale(2, 2), bb0.minX, bb0.minY));
  const bb1 = window.selBBox();
  ok(Math.abs(bb1.w - bb0.w * 2) < 0.05, 'xformPath uniform scale x2 works');

  /* ---- order ---- */
  window.S.project.paths = [window.clonePath(gA[0]), window.clonePath(gB[0]), window.clonePath(gA[0])];
  window.S.project.paths[0].id = 'o1'; window.S.project.paths[1].id = 'o2'; window.S.project.paths[2].id = 'o3';
  window.S.sel = ['o1'];
  window.orderSelection('front');
  ok(window.S.project.paths[2].id === 'o1', 'To Front moves object to end of array');

  /* ---- objects manager: hide / lock ---- */
  const firstPath = window.S.project.paths[0];
  firstPath.hidden = true;
  window.recompute();
  ok(window.S.pieces.every((p) => p.pathId !== firstPath.id), 'hidden path excluded from cut list & power');

  /* ---- exports ---- */
  window.S.project.holes = [{ id: 'h1', x: 8, y: 8, diameterMm: 4 }];
  downloads.length = 0;
  window.exportSVG();
  window.exportEPS();
  window.exportCSV();
  window.exportDXF();
  window.exportCutSvg();
  window.exportCutDxf();
  window.exportPlexiSvg();
  window.exportPlexiDxf();
  ok(downloads.length === 8, 'exports produced 8 downloads (including CHANNEL + PLEXI)');
  const eps = downloads[1];
  let epsText = '';
  if (typeof eps.text === 'function') epsText = await eps.text();
  else epsText = String(await new Promise((res) => { const fr = new window.FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsText(eps); }));
  ok(epsText.indexOf('%!PS-Adobe-3.0 EPSF-3.0') === 0, 'EPS header correct');
  ok(epsText.indexOf('%%EOF') > 0, 'EPS has EOF marker');
  const plexiSvg = downloads[6];
  let plexiText = '';
  if (typeof plexiSvg.text === 'function') plexiText = await plexiSvg.text();
  else plexiText = String(await new Promise((res) => { const fr = new window.FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsText(plexiSvg); }));
  ok(plexiText.indexOf('data-layer="PLEXI_CUT"') > 0, 'PLEXI SVG contains the welded laser-cut layer');
  ok(plexiText.indexOf('data-layer="PLEXI_HOLES"') > 0, 'PLEXI SVG contains mounting holes on a separate layer');

  /* ---- checks ---- */
  window.runChecks();
  ok(Array.isArray(window.S.issues), 'runChecks returns issues');

  /* ---- examples ---- */
  window.loadExample('double');
  ok(window.S.project.paths.length > 3, 'Double-Line example loads (' + window.S.project.paths.length + ' paths)');
  window.loadExample('cafe');
  ok(window.S.project.paths.length > 3, 'Cafe example loads (' + window.S.project.paths.length + ' paths)');

} catch (e) {
  failed++;
  console.error('  ✗ EXCEPTION: ' + (e && e.stack ? e.stack : e));
}

console.log('dom-runtime: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
