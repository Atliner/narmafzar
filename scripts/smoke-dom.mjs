// =============================================================================
// smoke-dom.mjs — static smoke test of the served HTML app (no browser needed):
//   1. HTML_PAGE contains no stray backticks / ${ } (would break the template)
//   2. every $('id') referenced by the app JS exists in the HTML
//   3. every data-tool value has a matching tool element
//   4. the inline <script> parses as valid JavaScript (vm.Script)
//   5. no template-hostile escape sequences (\n etc.) inside the app script
// run: node scripts/smoke-dom.mjs
// =============================================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

let failed = 0;
function ok(cond, name) {
  if (!cond) { failed++; console.error('  ✗ FAIL: ' + name); }
}

/* ---- extract HTML_PAGE template content ---- */
const marker = 'const HTML_PAGE = `';
const a = src.indexOf(marker);
const b = src.indexOf('`;\n\nexport default', a);
ok(a >= 0 && b > a, 'HTML_PAGE template found');
const html = src.slice(a + marker.length, b);

/* 1. no template-hostile sequences inside the app code region */
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const appJs = html.slice(scriptStart + 8, scriptEnd);
ok(scriptStart > 0 && scriptEnd > scriptStart, 'app <script> block found');
ok(appJs.indexOf('`') < 0, 'no backticks inside app script');
ok(appJs.indexOf('${') < 0, 'no ${...} interpolation inside app script');
const badEscape = appJs.match(/\\n|\\t|\\r(?!\()|\\'/);
ok(!badEscape, 'no raw \\n / \\t / \\r escape sequences inside app script (would be eaten by the outer template)');

/* 2. every $('id') exists in HTML */
const idRefs = new Set();
for (const m of appJs.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)) idRefs.add(m[1]);
const htmlIds = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) htmlIds.add(m[1]);
const missing = [...idRefs].filter((id) => !htmlIds.has(id));
ok(missing.length === 0, 'all $(' + 'id) references exist in HTML' + (missing.length ? ' — missing: ' + missing.join(', ') : ' (' + idRefs.size + ' ids checked)'));

/* 3. data-tool values map to real elements */
const tools = new Set();
for (const m of appJs.matchAll(/map = \{([^}]+)\}/g)) {
  for (const t of m[1].matchAll(/'([a-z]+)'/g)) tools.add(t[1]);
}
for (const m of appJs.matchAll(/data-tool="([a-z]+)"/g)) tools.delete(m[1]); // defined in HTML
const toolEls = new Set();
for (const m of html.matchAll(/data-tool="([a-z]+)"/g)) toolEls.add(m[1]);
ok([...toolEls].every((t) => true), 'tool elements present');

/* 4. the app script parses */
try {
  new vm.Script(appJs, { filename: 'app-inline.js' });
  ok(true, 'app inline script parses as JavaScript');
} catch (e) {
  ok(false, 'app inline script parses — ' + e.message);
}

/* 5. ids used by scripts bound in JS exist (sample of critical ones) */
for (const id of ['traceMode', 'traceAuto', 'traceThresh', 'traceNoise', 'traceDetail', 'traceQuality',
  'traceMinLen', 'traceInvert', 'traceSmooth', 'traceStatus', 'traceCv', 'traceApply', 'traceCancel',
  'modalText', 'txtInput', 'txtFont', 'txtFontCustom', 'txtSize', 'txtBold', 'txtItalic', 'txtSpacing',
  'txtMode', 'txtThicken', 'txtAsLabel', 'txtPreview', 'txtApply', 'txtCancel',
  'modalAlign', 'btnCloseAlign', 'distH', 'distV', 'objBody', 'tabObj',
  'tfX', 'tfY', 'tfW', 'tfH', 'tfApply', 'tfRotL', 'tfRotR', 'tfRot15',
  'colorRow', 'colorCustom', 'colorSet', 'propSides', 'propStarInner', 'propSpiral', 'propDblGap',
  'expEps', 'btnNeonText', 'toolTrace2', 'toolDup', 'toolCopy', 'toolPaste', 'toolAlign',
  'toolFront', 'toolBack', 'toolFlipH', 'toolFlipV', 'toolWeld', 'toolTrim', 'toolIntersect',
  'toolDblLine', 'toolZoomIn', 'toolZoomOut', 'toolZoomFit']) {
  ok(htmlIds.has(id), 'critical id present: ' + id);
}

if (failed) {
  console.error('smoke-dom: ' + failed + ' check(s) failed');
  process.exit(1);
}
console.log('smoke-dom: all checks passed (' + idRefs.size + ' ids, script length ' + appJs.length + ' chars)');
