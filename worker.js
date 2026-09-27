// =============================================================================
// NEON CAD — نرم‌افزار طراحی و آماده‌سازی تابلو نئون
// Single-file Cloudflare Worker — serves the complete client-side app.
// All geometry, cut-list, power and bin-packing processing runs in the browser.
// No build step, no external dependencies. See docs/DESIGN.md and README.md.
// Build marker: v2.0.0 (2026-09-27) — TRACE v2 (Otsu + despeckle + tip recovery
// + OUTLINE double-line mode), real NEON TEXT tool (fa/en, fonts, single/double
// line), CorelDRAW-style toolkit (shapes, transform handles, align/distribute,
// order, boolean weld/trim/intersect, double-line transform, colors, objects
// manager, zoom/fit, EPS export).
// =============================================================================

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NEON CAD — Neon Sign Designer</title>
<style>
:root{
  --bg:#0b0f14; --panel:#121820; --panel2:#18202b; --line:#243041; --line2:#2e3d52;
  --txt:#d9e2ee; --dim:#8fa3b8; --acc:#22d3ee; --acc2:#f472b6; --ok:#34d399;
  --err:#f87171; --warn:#fbbf24; --gold:#fbbf24;
}
*{box-sizing:border-box; margin:0; padding:0;}
html,body{height:100%;}
body{
  background:var(--bg); color:var(--txt);
  font-family:"Segoe UI", Tahoma, Arial, sans-serif; font-size:13px; overflow:hidden;
}
.app{display:flex; flex-direction:column; height:100vh;}
button{font-family:inherit;}
input,select,textarea{
  background:#0e141c; color:var(--txt); border:1px solid var(--line2);
  border-radius:6px; padding:5px 8px; font-size:12px; outline:none; width:100%;
}
input:focus,select:focus{border-color:var(--acc);}
input[type=checkbox]{width:auto;}
label{color:var(--dim); font-size:11px;}

/* ---------- TOP BAR ---------- */
.topbar{
  display:flex; align-items:center; gap:8px; padding:8px 12px;
  background:linear-gradient(180deg,#141c26,#10161e); border-bottom:1px solid var(--line);
  flex-wrap:wrap;
}
.brand{font-size:18px; font-weight:800; letter-spacing:1px; margin-right:6px;}
.brand span{color:var(--acc);}
.brand small{display:block; font-size:9px; color:var(--dim); letter-spacing:2px; font-weight:400;}
.btn{
  background:#1a2431; color:var(--txt); border:1px solid var(--line2); border-radius:7px;
  padding:7px 12px; font-size:12px; cursor:pointer; white-space:nowrap; transition:.15s;
}
.btn:hover{background:#22304180; border-color:var(--acc); color:#fff;}
.btn.primary{background:linear-gradient(135deg,#0e7490,#155e75); border-color:#0891b2;}
.btn.primary:hover{background:linear-gradient(135deg,#0891b2,#0e7490);}
.btn.accent{background:linear-gradient(135deg,#9d174d,#831843); border-color:#db2777;}
.btn.accent:hover{background:linear-gradient(135deg,#db2777,#9d174d);}
.btn.mode-auto{background:linear-gradient(135deg,#065f46,#064e3b); border-color:#10b981; color:#d1fae5;}
.btn.mode-manual{background:linear-gradient(135deg,#7c2d12,#7c2d12); border-color:#f97316; color:#ffedd5;}
.btn.sm{padding:5px 9px; font-size:11px;}
.sep{width:1px; height:26px; background:var(--line2); margin:0 2px;}
.proj-name{width:180px; font-weight:600;}
.export-group{display:flex; gap:4px;}

/* ---------- LAYOUT ---------- */
.main{display:flex; flex:1; min-height:0;}
.tools{
  width:92px; background:var(--panel); border-right:1px solid var(--line);
  padding:10px 8px; display:flex; flex-direction:column; gap:6px; overflow-y:auto;
}
.tool{
  display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 4px;
  background:#0f1722; border:1px solid var(--line); border-radius:9px; cursor:pointer;
  color:var(--dim); font-size:10px; letter-spacing:.4px;
}
.tool .ico{font-size:17px; line-height:1;}
.tool:hover{border-color:var(--acc); color:var(--txt);}
.tool.active{background:linear-gradient(160deg,#164e63,#0e3746); border-color:var(--acc); color:#e0f7ff;}
.tool-h{font-size:9px; color:#5b6c80; letter-spacing:2px; margin:6px 2px 2px;}

.canvas-wrap{flex:1; position:relative; min-width:0; background:#080c11;}
#cv{width:100%; height:100%; display:block; cursor:crosshair; touch-action:none;}
.hud{
  position:absolute; top:10px; left:10px; background:#0f1722dd; border:1px solid var(--line2);
  border-radius:8px; padding:6px 10px; font-size:11px; color:var(--dim); pointer-events:none;
}
.hud b{color:var(--acc); font-weight:600;}

/* ---------- PROPERTIES ---------- */
.props{
  width:296px; background:var(--panel); border-left:1px solid var(--line);
  overflow-y:auto; padding:12px;
}
.p-h{font-size:10px; letter-spacing:2px; color:#5b6c80; margin:12px 0 8px; border-bottom:1px solid var(--line); padding-bottom:5px;}
.p-h:first-child{margin-top:0;}
.p-grid{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.p-row{display:flex; flex-direction:column; gap:3px; margin-bottom:8px;}
.p-row .unit{position:relative;}
.p-row .unit input{padding-right:34px;}
.p-row .unit i{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  color:#5b6c80; font-style:normal; font-size:10px;
}
.p-actions{display:flex; gap:6px; margin:8px 0;}
.hint{font-size:10px; color:#5b6c80; line-height:1.5;}
.sel-\boxed{background:#0f1722; border:1px solid var(--line2); border-radius:8px; padding:10px;}
.kv{display:flex; justify-content:space-between; font-size:11px; padding:3px 0; border-bottom:1px dashed #1c2836;}
.kv:last-child{border-bottom:none;}
.kv b{color:var(--acc); font-weight:600;}

/* ---------- BOTTOM ---------- */
.bottom{
  height:238px; background:var(--panel); border-top:1px solid var(--line);
  display:flex; flex-direction:column;
}
.tabs{display:flex; gap:2px; padding:8px 12px 0;}
.tab{
  padding:7px 16px; font-size:11px; letter-spacing:1px; cursor:pointer;
  background:#0f1722; border:1px solid var(--line); border-bottom:none;
  border-radius:8px 8px 0 0; color:var(--dim);
}
.tab.active{background:#16202c; color:var(--acc); border-color:var(--line2);}
.tab-body{flex:1; overflow:auto; padding:10px 14px;}
table{width:100%; border-collapse:collapse; font-size:12px;}
thead th{
  position:sticky; top:0; background:#16202c; color:var(--dim); font-size:10px;
  letter-spacing:1px; text-transform:uppercase; padding:7px 10px; text-align:left;
  border-bottom:2px solid var(--line2);
}
tbody td{padding:7px 10px; border-bottom:1px solid #18222e;}
tbody tr:hover{background:#14202c;}
td.num{text-align:left; font-variant-numeric:tabular-nums;}
td.lbl b{color:var(--acc2); font-weight:600;}
tr.tot{background:#101a26; font-weight:700;}
tr.tot td{color:var(--gold); border-top:2px solid var(--line2);}
.mat-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;}
.mat-card{
  background:#0f1722; border:1px solid var(--line2); border-radius:10px; padding:12px 14px;
}
.mat-card h4{font-size:10px; letter-spacing:2px; color:#5b6c80; margin-bottom:8px;}
.mat-card .big{font-size:22px; font-weight:800; color:var(--acc);}
.mat-card .big.gold{color:var(--gold);}
.mat-card .big.pink{color:var(--acc2);}
.mat-card p{font-size:11px; color:var(--dim); margin-top:4px; line-height:1.6;}
.roll-row{display:flex; align-items:center; gap:10px; margin-bottom:8px;}
.roll-bar{flex:1; height:18px; background:#0f1722; border:1px solid var(--line2); border-radius:9px; overflow:hidden; display:flex;}
.roll-fill{height:100%;}
.roll-tag{width:64px; font-size:10px; color:var(--dim);}
.dot{display:inline-block; width:10px; height:10px; border-radius:50%; vertical-align:middle; border:1px solid #0008;}
#traceStatus.ok{color:var(--ok);} #traceStatus.err{color:var(--err);} #traceStatus.warn{color:var(--warn);}
.swatch{width:22px; height:22px; border-radius:6px; border:2px solid #0006; cursor:pointer; padding:0;}
.swatch.active{border-color:#fff; outline:2px solid var(--acc);}
.p-row select{width:100%;}

/* ---------- STATUS ---------- */
.status{
  height:28px; display:flex; align-items:center; gap:18px; padding:0 14px;
  background:#0e141c; border-top:1px solid var(--line); font-size:11px; color:var(--dim);
}
.status .ok{color:var(--ok);} .status .warn{color:var(--warn);} .status .err{color:var(--err);}

/* ---------- MODAL ---------- */
.modal{position:fixed; inset:0; background:#05080ccc; display:flex; align-items:center; justify-content:center; z-index:50;}
.modal.hidden{display:none;}
.modal-card{
  width:min(680px, 92vw); max-height:82vh; overflow:auto;
  background:var(--panel); border:1px solid var(--line2); border-radius:14px; padding:18px;
  box-shadow:0 30px 80px #000a;
}
.modal-card h2{font-size:16px; margin-bottom:4px;}
.modal-card .sub{color:var(--dim); font-size:11px; margin-bottom:14px;}
.issue{
  display:flex; gap:10px; padding:9px 12px; border-radius:8px; margin-bottom:6px;
  background:#0f1722; border:1px solid var(--line); align-items:flex-start;
}
.issue .badge{
  font-size:9px; letter-spacing:1px; padding:3px 8px; border-radius:20px; white-space:nowrap; margin-top:1px;
}
.badge.error{background:#7f1d1d; color:#fecaca;}
.badge.warn{background:#78350f; color:#fde68a;}
.badge.info{background:#1e3a5f; color:#bae6fd;}
.issue .msg{flex:1; font-size:12px; line-height:1.6;}
.issue .msg small{display:block; color:var(--dim); font-size:10px; margin-top:2px;}
.all-ok{text-align:center; padding:30px; color:var(--ok); font-size:15px;}
.modal-actions{display:flex; justify-content:flex-end; gap:8px; margin-top:14px;}

/* ---------- HELP (FA) ---------- */
.help-card{width:min(920px, 94vw);}
.help-wrap{display:flex; gap:14px; align-items:flex-start;}
.help-toc{
  width:188px; flex-shrink:0; display:flex; flex-direction:column; gap:4px;
  position:sticky; top:0;
}
.help-toc button{
  background:#0f1722; border:1px solid var(--line); color:var(--dim); border-radius:7px;
  padding:7px 10px; font-size:11px; cursor:pointer; text-align:right;
}
.help-toc button:hover{border-color:var(--acc); color:var(--txt);}
.help-body{
  flex:1; min-width:0; max-height:62vh; overflow-y:auto; padding:4px 14px 14px;
  direction:rtl; text-align:right; line-height:2;
}
.help-body h3{
  font-size:15px; color:var(--acc); margin:18px 0 6px; padding-bottom:6px;
  border-bottom:1px solid var(--line2);
}
.help-body h3:first-child{margin-top:0;}
.help-body h4{font-size:12.5px; color:var(--acc2); margin:12px 0 4px;}
.help-body p{font-size:12px; color:var(--txt); margin:4px 0;}
.help-body ul, .help-body ol{margin:4px 22px 8px 0; font-size:12px; color:var(--txt);}
.help-body li{margin:3px 0;}
.help-body b{color:#fff;}
.help-body .tip{
  background:#0e2a33; border:1px solid #155e6b; border-radius:8px;
  padding:8px 12px; margin:8px 0; font-size:11.5px; color:#a5f3fc;
}
.help-body .warn{
  background:#3b2a0e; border:1px solid #92600e; border-radius:8px;
  padding:8px 12px; margin:8px 0; font-size:11.5px; color:#fde68a;
}
.help-body table{width:100%; font-size:11px; margin:6px 0;}
.help-body thead th{background:#16202c; color:var(--dim); padding:6px 8px; text-align:right;}
.help-body td{padding:6px 8px; border-bottom:1px solid #18222e;}
.help-body kbd{
  background:#223042; border:1px solid var(--line2); border-bottom-width:2px;
  border-radius:5px; padding:1px 7px; font-size:10.5px; margin:0 2px; direction:ltr; display:inline-block;
}

/* ---------- PRINT (PDF) ---------- */
#printArea{display:none;}
@media print{
  body{overflow:visible; background:#fff;}
  .app,.modal{display:none !important;}
  #printArea{display:block !important; color:#111; background:#fff; padding:0;}
  .pr-h{border-bottom:3px solid #111; padding-bottom:10px; margin-bottom:14px;}
  .pr-h h1{font-size:22px; letter-spacing:1px;}
  .pr-h .pr-sub{font-size:11px; color:#444; margin-top:5px; line-height:1.8;}
  .pr-sec{margin:16px 0 8px; font-size:13px; border-bottom:1px solid #111; padding-bottom:4px;}
  .pr-h2{font-size:12px; font-weight:700; margin:12px 0 6px;}
  #printArea table{width:100%; border-collapse:collapse; font-size:12px;}
  #printArea th{border:1px solid #111; padding:6px 8px; background:#eee; text-transform:none;}
  #printArea td{border:1px solid #111; padding:5px 8px;}
  #printArea .pr-kv td{border:1px solid #111; padding:5px 8px; width:50%;}
  #printArea .pr-flex{display:flex; gap:18px;}
  #printArea .pr-flex>div{flex:1;}
  #printArea .pr-svg{border:1px solid #111; margin:8px 0;}
  #printArea .pr-svg svg{width:100%; height:auto;}
  #printArea .pr-sign{display:flex; gap:30px; margin-top:30px;}
  #printArea .pr-sign div{flex:1; border-top:1px solid #111; padding-top:6px; font-size:11px;}
  #printArea .pr-foot{margin-top:14px; font-size:9px; color:#666;}
}
</style>
</head>
<body>
<div class="app">

  <!-- ============ TOP BAR ============ -->
  <header class="topbar">
    <div class="brand">NEON<span>CAD</span><small>NEON SIGN FABRICATION</small></div>
    <input id="projName" class="proj-name" value="DEMO — Chain ABCD" title="Project name">
    <button id="btnMode" class="btn mode-auto">AUTO MODE</button>
    <div class="sep"></div>
    <button id="btnUndo" class="btn sm" title="Ctrl+Z">Undo</button>
    <button id="btnRedo" class="btn sm" title="Ctrl+Y">Redo</button>
    <div class="sep"></div>
    <button id="btnCheck" class="btn primary">CHECK DESIGN</button>
    <button id="btnPrint" class="btn accent">PRINT / PDF</button>
    <div class="sep"></div>
    <button id="btnNeonText" class="btn sm primary" title="Type text and turn it into real neon paths (Persian/English, single or double line)">NEON TEXT</button>
    <button id="btnTrace" class="btn sm" title="Upload any image and convert it to neon-ready vector paths">TRACE IMAGE</button>
    <select id="exampleSel" class="proj-name" style="width:170px" title="Load a professional example">
      <option value="">EXAMPLES…</option>
      <option value="cafe">Cafe Sign — circle + نئون</option>
      <option value="double">Double-Line Text — دو خطی</option>
      <option value="shapes">Shapes Gallery</option>
      <option value="chain">Chain ABCD (cut list demo)</option>
      <option value="empty">Empty board</option>
    </select>
    <div class="sep"></div>
    <div class="export-group">
      <button id="expSvg" class="btn sm" title="Export SVG (real scale)">SVG</button>
      <button id="expDxf" class="btn sm" title="Export DXF (R12, cm)">DXF</button>
      <button id="expEps" class="btn sm" title="Export EPS (vector — opens in CorelDRAW / Illustrator)">EPS</button>
      <button id="expPng" class="btn sm" title="Export PNG (3x)">PNG</button>
      <button id="expCsv" class="btn sm" title="Export cut list CSV">CSV</button>
      <button id="expJson" class="btn sm" title="Export project JSON">JSON</button>
    </div>
    <div class="export-group">
      <button id="expCutDxf" class="btn sm accent" title="CUT FILE for the cutting machine — double-line channel (DXF)">CUT DXF</button>
      <button id="expCutSvg" class="btn sm accent" title="CUT FILE for the cutting machine — double-line channel (SVG)">CUT SVG</button>
    </div>
    <div class="sep"></div>
    <button id="btnSave" class="btn sm" title="Save project in browser">SAVE</button>
    <button id="btnOpen" class="btn sm" title="Open saved project">OPEN</button>
    <button id="btnImport" class="btn sm" title="Import SVG / JSON file">IMPORT</button>
    <button id="btnNew" class="btn sm" title="New empty project">NEW</button>
    <button id="btnHelp" class="btn sm primary" title="راهنمای فارسی — F1">HELP / راهنما</button>
  </header>

  <div class="main">
    <!-- ============ TOOLS ============ -->
    <aside class="tools">
      <div class="tool-h">TOOLS</div>
      <div class="tool active" data-tool="select"><span class="ico">&#9658;</span>Select</div>
      <div class="tool" data-tool="pen"><span class="ico">&#9998;</span>Pen</div>
      <div class="tool" data-tool="line"><span class="ico">&#9585;</span>Line</div>
      <div class="tool" data-tool="bezier"><span class="ico">&#8767;</span>Bezier</div>
      <div class="tool-h">SHAPES</div>
      <div class="tool" data-tool="rect"><span class="ico">&#9645;</span>Rect</div>
      <div class="tool" data-tool="ellipse"><span class="ico">&#9711;</span>Ellipse</div>
      <div class="tool" data-tool="polygon"><span class="ico">&#11040;</span>Polygon</div>
      <div class="tool" data-tool="star"><span class="ico">&#9733;</span>Star</div>
      <div class="tool" data-tool="spiral"><span class="ico">&#9741;</span>Spiral</div>
      <div class="tool-h">TEXT / TRACE</div>
      <div class="tool" data-tool="text"><span class="ico">T</span>Text</div>
      <div class="tool" id="toolTrace2"><span class="ico">&#128444;</span>Trace Img</div>
      <div class="tool" data-tool="split"><span class="ico">&#9986;</span>Split</div>
      <div class="tool" data-tool="measure"><span class="ico">&#8646;</span>Measure</div>
      <div class="tool-h">EDIT</div>
      <div class="tool" id="toolSnap"><span class="ico">&#8862;</span>Snap Grid</div>
      <div class="tool" id="toolChannel"><span class="ico">&#8741;</span>Channel</div>
      <div class="tool" id="toolSnapLen"><span class="ico">&#8776;</span>Snap Lengths</div>
      <div class="tool" id="toolReverse"><span class="ico">&#8644;</span>Reverse</div>
      <div class="tool" id="toolDelete"><span class="ico">&#10006;</span>Delete</div>
      <div class="tool-h">ARRANGE</div>
      <div class="tool" id="toolDup"><span class="ico">&#8679;</span>Duplicate</div>
      <div class="tool" id="toolCopy"><span class="ico">&#9114;</span>Copy</div>
      <div class="tool" id="toolPaste"><span class="ico">&#9116;</span>Paste</div>
      <div class="tool" id="toolAlign"><span class="ico">&#9634;</span>Align…</div>
      <div class="tool" id="toolFront"><span class="ico">&#8599;</span>To Front</div>
      <div class="tool" id="toolBack"><span class="ico">&#8601;</span>To Back</div>
      <div class="tool" id="toolFlipH"><span class="ico">&#8646;</span>Flip H</div>
      <div class="tool" id="toolFlipV"><span class="ico">&#8597;</span>Flip V</div>
      <div class="tool-h">SHAPING</div>
      <div class="tool" id="toolWeld"><span class="ico">&#9711;</span>Weld</div>
      <div class="tool" id="toolTrim"><span class="ico">&#9986;</span>Trim</div>
      <div class="tool" id="toolIntersect"><span class="ico">&#9675;</span>Intersect</div>
      <div class="tool" id="toolDblLine"><span class="ico">&#8741;</span>Double Line</div>
      <div class="tool-h">VIEW</div>
      <div class="tool" id="toolZoomIn"><span class="ico">&#10133;</span>Zoom In</div>
      <div class="tool" id="toolZoomOut"><span class="ico">&#10134;</span>Zoom Out</div>
      <div class="tool" id="toolZoomFit"><span class="ico">&#9635;</span>Fit Page</div>
    </aside>

    <!-- ============ CANVAS ============ -->
    <section class="canvas-wrap">
      <canvas id="cv"></canvas>
      <div class="hud" id="hud"><b>CANVAS</b> &nbsp;|&nbsp; tool: <b>SELECT</b> &nbsp;|&nbsp; wheel = zoom &nbsp;|&nbsp; drag with space/middle = pan</div>
    </section>

    <!-- ============ PROPERTIES ============ -->
    <aside class="props">
      <div class="p-h">PROPERTIES</div>
      <div class="p-grid">
        <div class="p-row"><label>Width (board)</label>
          <div class="unit"><input id="propWidth" type="number" min="1" step="1" value="200"><i>cm</i></div></div>
        <div class="p-row"><label>Height (board)</label>
          <div class="unit"><input id="propHeight" type="number" min="1" step="1" value="100"><i>cm</i></div></div>
      </div>

      <div class="p-h">NEON PROFILE</div>
      <div class="p-row"><label>Saved profiles</label>
        <select id="profSel"><option value="">— select profile —</option></select>
      </div>
      <div class="p-row"><label>Profile name</label><input id="profName" value="Neon Flex 8mm"></div>
      <div class="p-grid">
        <div class="p-row"><label>Neon Width</label>
          <div class="unit"><input id="propNeonW" type="number" min="0.5" step="0.5" value="8"><i>mm</i></div></div>
        <div class="p-row"><label>Cutting Interval</label>
          <div class="unit"><input id="propInterval" type="number" min="0.1" step="0.1" value="2.5"><i>cm</i></div></div>
        <div class="p-row"><label>Minimum Bend Radius</label>
          <div class="unit"><input id="propBend" type="number" min="0" step="1" value="30"><i>mm</i></div></div>
        <div class="p-row"><label>Voltage</label>
          <div class="unit"><input id="propVolt" type="number" min="1" step="1" value="24"><i>V</i></div></div>
        <div class="p-row"><label>Power per meter</label>
          <div class="unit"><input id="propPower" type="number" min="0.1" step="0.1" value="10"><i>W/m</i></div></div>
        <div class="p-row"><label>Roll Length</label>
          <div class="unit"><input id="propRoll" type="number" min="10" step="10" value="500"><i>cm</i></div></div>
      </div>
      <div class="p-actions">
        <button id="btnSaveProf" class="btn sm">Save Profile</button>
        <button id="btnDelProf" class="btn sm">Delete Profile</button>
      </div>

      <div class="p-h">CUTTING / POWER SETTINGS</div>
      <div class="p-grid">
        <div class="p-row"><label>Max Piece Length</label>
          <div class="unit"><input id="propMaxPiece" type="number" min="10" step="10" value="500"><i>cm</i></div></div>
        <div class="p-row"><label>Min Path Spacing</label>
          <div class="unit"><input id="propSpacing" type="number" min="0" step="0.1" value="1.5"><i>cm</i></div></div>
        <div class="p-row"><label>PSU Safety Factor</label>
          <div class="unit"><input id="propSafety" type="number" min="40" max="100" step="5" value="80"><i>%</i></div></div>
        <div class="p-row"><label>PSU Capacity (0=auto)</label>
          <div class="unit"><input id="propPsu" type="number" min="0" step="10" value="0"><i>W</i></div></div>
        <div class="p-row"><label>Grid Snap</label>
          <div class="unit"><input id="propGrid" type="number" min="0.1" step="0.1" value="0.5"><i>cm</i></div></div>
        <div class="p-row"><label>Node Tolerance</label>
          <div class="unit"><input id="propNodeTol" type="number" min="0.05" step="0.05" value="0.5"><i>cm</i></div></div>
        <div class="p-row"><label>Cutting Channel Width</label>
          <div class="unit"><input id="propChannel" type="number" min="1" step="0.5" value="10"><i>mm</i></div></div>
      </div>
      <div class="p-row"><label><input id="chkCutCenter" type="checkbox"> Include centerline in cutter files</label></div>
      <div class="p-actions">
        <button id="btnAutoAll" class="btn sm primary">AUTO: Snap + Build Cut List</button>
      </div>
      <p class="hint">In AUTO MODE lengths are corrected geometrically so every START/END lands on a real cutting point of the neon (multiples of the cutting interval). Rounding is never used alone.</p>

      <div class="p-h">SHAPE / DOUBLE-LINE SETTINGS</div>
      <div class="p-grid">
        <div class="p-row"><label>Polygon / Star sides</label>
          <input id="propSides" type="number" min="3" max="60" step="1" value="5"></div>
        <div class="p-row"><label>Star inner radius</label>
          <div class="unit"><input id="propStarInner" type="number" min="10" max="95" step="5" value="45"><i>%</i></div></div>
        <div class="p-row"><label>Spiral turns</label>
          <input id="propSpiral" type="number" min="1" max="10" step="1" value="3"></div>
        <div class="p-row"><label>Double-line gap</label>
          <div class="unit"><input id="propDblGap" type="number" min="0.5" step="0.5" value="4"><i>cm</i></div></div>
      </div>
      <p class="hint">Double Line replaces every selected path with TWO parallel neon lines (gap above) — the classic double-tube sign look. Keep the centerline too from the dialog prompt.</p>

      <div class="p-h">SELECTED PATH</div>
      <div class="sel-box" id="selBox">
        <div class="hint" id="selNone">Nothing selected — use Select tool and click a path (or drag a rectangle around several).</div>
        <div id="selInfo" style="display:none">
          <div class="kv"><span>Name</span><b id="selName">—</b></div>
          <div class="kv"><span>Length (geometry)</span><b id="selLen">—</b></div>
          <div class="kv"><span>Length (snapped)</span><b id="selLen2">—</b></div>
          <div class="kv"><span>Pieces / cuts</span><b id="selPieces">—</b></div>
          <div class="kv"><span>Start / End</span><b id="selSE">—</b></div>
          <div class="p-actions">
            <button id="selReverse" class="btn sm">Reverse</button>
            <button id="selLockS" class="btn sm">Lock Start</button>
            <button id="selLockE" class="btn sm">Lock End</button>
          </div>
          <div class="p-actions">
            <button id="selSnap" class="btn sm primary">Snap Length</button>
            <button id="selDel" class="btn sm accent">Delete Path</button>
          </div>
          <div class="p-row"><label>Path name</label><input id="selNameIn"></div>
          <div class="p-row"><label>Note</label><input id="selNote"></div>
        </div>
      </div>

      <div class="p-h">TRANSFORM (SELECTION)</div>
      <div class="p-grid">
        <div class="p-row"><label>X (left)</label>
          <div class="unit"><input id="tfX" type="number" step="0.1"><i>cm</i></div></div>
        <div class="p-row"><label>Y (top)</label>
          <div class="unit"><input id="tfY" type="number" step="0.1"><i>cm</i></div></div>
        <div class="p-row"><label>Width</label>
          <div class="unit"><input id="tfW" type="number" step="0.1"><i>cm</i></div></div>
        <div class="p-row"><label>Height</label>
          <div class="unit"><input id="tfH" type="number" step="0.1"><i>cm</i></div></div>
      </div>
      <div class="p-actions">
        <button id="tfApply" class="btn sm primary">Apply</button>
        <button id="tfRotL" class="btn sm" title="Rotate -90&deg;">&#8634; 90&deg;</button>
        <button id="tfRotR" class="btn sm" title="Rotate +90&deg;">90&deg; &#8635;</button>
        <button id="tfRot15" class="btn sm" title="Rotate +15&deg;">+15&deg;</button>
      </div>
      <p class="hint">Or drag directly on the board: cyan corner handles = scale, side handles = stretch, the yellow circle above = rotate (Shift snaps 15&deg;).</p>

      <div class="p-h">NEON COLOR (SELECTION)</div>
      <div id="colorRow" style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:6px"></div>
      <div class="p-row"><label>Custom color</label>
        <div style="display:flex; gap:6px">
          <input id="colorCustom" type="color" value="#22d3ee" style="height:30px; padding:2px">
          <button id="colorSet" class="btn sm">Set</button>
        </div>
      </div>
    </aside>
  </div>

  <!-- ============ CUT LIST / MATERIALS ============ -->
  <section class="bottom">
    <div class="tabs">
      <div class="tab active" data-tab="cut">CUT LIST</div>
      <div class="tab" data-tab="mat">MATERIALS &amp; POWER</div>
      <div class="tab" data-tab="roll">ROLLS &amp; WASTE</div>
      <div class="tab" data-tab="obj">OBJECTS</div>
      <div style="flex:1"></div>
      <button id="btnPrint2" class="btn sm accent" style="margin:0 0 6px">PRINT / PDF this table</button>
    </div>
    <div class="tab-body" id="tabCut">
      <table>
        <thead><tr>
          <th>No. (شماره)</th><th>Length (طول)</th><th>Cuts 2.5cm (تعداد برش)</th>
          <th>Start (شروع)</th><th>End (پایان)</th><th>Path</th>
        </tr></thead>
        <tbody id="cutBody"></tbody>
      </table>
    </div>
    <div class="tab-body" id="tabMat" style="display:none">
      <div class="mat-grid" id="matGrid"></div>
    </div>
    <div class="tab-body" id="tabRoll" style="display:none">
      <div id="rollPanel"></div>
    </div>
    <div class="tab-body" id="tabObj" style="display:none">
      <table>
        <thead><tr>
          <th>#</th><th>Object (click to select)</th><th>Length</th><th>Snapped</th><th>Show / Lock / Delete</th>
        </tr></thead>
        <tbody id="objBody"></tbody>
      </table>
    </div>
  </section>

  <!-- ============ STATUS ============ -->
  <footer class="status">
    <span id="stCoords">x: — &nbsp; y: —</span>
    <span id="stZoom">zoom: 100%</span>
    <span id="stHint">Ready. Draw with Pen / Line / Bezier.</span>
    <span style="flex:1"></span>
    <span id="stTotal">Total: —</span>
    <span id="stIssues">CHECK: —</span>
  </footer>
</div>

<!-- ============ CHECK DESIGN MODAL ============ -->
<div class="modal hidden" id="modalCheck">
  <div class="modal-card">
    <h2>CHECK DESIGN</h2>
    <div class="sub" id="checkSub">Pre-export validation — geometry, cutting, power, connections.</div>
    <div id="checkList"></div>
    <div class="modal-actions">
      <button id="btnRecheck" class="btn">Re-check</button>
      <button id="btnPrint3" class="btn accent">PRINT / PDF</button>
      <button id="btnCloseCheck" class="btn primary">Close</button>
    </div>
  </div>
</div>

<!-- ============ OPEN PROJECT MODAL ============ -->
<div class="modal hidden" id="modalOpen">
  <div class="modal-card">
    <h2>Open Project</h2>
    <div class="sub">Projects saved in this browser (localStorage).</div>
    <div id="openList"></div>
    <div class="modal-actions">
      <button id="btnCloseOpen" class="btn">Close</button>
    </div>
  </div>
</div>

<!-- ============ TRACE IMAGE MODAL (v2) ============ -->
<div class="modal hidden" id="modalTrace">
  <div class="modal-card" style="width:min(860px,94vw)">
    <h2>TRACE IMAGE &rarr; NEON PATHS</h2>
    <div class="sub">Any image (PNG / JPG / WEBP / GIF / BMP) &rarr; vector neon paths, snapped to the cutting grid.
      <b>Centerline</b> = one tube on the stroke axis. <b>Outline / دو خطی</b> = the tube follows <b>both edges</b> of every stroke (double-line look).</div>
    <div style="display:flex; gap:14px; align-items:flex-start">
      <div style="flex:1; min-width:0">
        <canvas id="traceCv" style="width:100%; border:1px solid #2e3d52; border-radius:8px; background:#fff; max-height:400px"></canvas>
        <div id="traceStatus" class="hint" style="margin-top:6px">Loading…</div>
      </div>
      <div style="width:250px">
        <div class="p-row"><label>Trace mode / حالت</label>
          <select id="traceMode">
            <option value="auto" selected>Auto — خودکار (پیشنهادی)</option>
            <option value="center">Centerline — تک‌خط (روی خود خط)</option>
            <option value="outline">Outline — دو خطی (دور خطوط)</option>
          </select>
        </div>
        <div class="p-row"><label><input id="traceAuto" type="checkbox" checked> Auto threshold (Otsu — پیشنهادی)</label></div>
        <div class="p-row"><label>Threshold (manual)</label><input id="traceThresh" type="range" min="20" max="240" value="128"></div>
        <div class="p-row"><label>Noise removal / حذف نویز (px)</label><input id="traceNoise" type="range" min="0" max="10" value="3"></div>
        <div class="p-row"><label>Detail (0=fine, 40=coarse)</label><input id="traceDetail" type="range" min="2" max="40" value="12"></div>
        <div class="p-row"><label>Min stroke length</label>
          <div class="unit"><input id="traceMinLen" type="number" min="0.5" step="0.5" value="3"><i>cm</i></div></div>
        <div class="p-row"><label>Quality / کیفیت ترسیم</label>
          <select id="traceQuality">
            <option value="600">600 px — fast</option>
            <option value="900" selected>900 px — balanced</option>
            <option value="1200">1200 px — fine</option>
            <option value="1600">1600 px — ultra</option>
          </select>
        </div>
        <div class="p-row"><label><input id="traceInvert" type="checkbox"> Invert (light shape on dark)</label></div>
        <div class="p-row"><label><input id="traceSmooth" type="checkbox" checked> Smooth curves (bezier)</label></div>
        <p class="hint">The preview shows <b>exactly</b> what will be added. Red lines = neon paths. High-contrast images (logo, line art, text) work best; auto-threshold handles most photos automatically.</p>
      </div>
    </div>
    <div class="modal-actions">
      <button id="traceCancel" class="btn">Cancel</button>
      <button id="traceApply" class="btn primary">Add to design</button>
    </div>
  </div>
</div>

<!-- ============ NEON TEXT MODAL ============ -->
<div class="modal hidden" id="modalText">
  <div class="modal-card" style="width:min(760px,94vw)">
    <h2>TEXT &rarr; NEON (متن نئونی)</h2>
    <div class="sub">Type any text — Persian (فارسی) or English — pick a font, and it becomes <b>real neon paths</b> (in the cut list, exportable, editable). This is NOT a note.</div>
    <div style="display:flex; gap:14px; align-items:flex-start">
      <div style="flex:1; min-width:0">
        <div class="p-row"><label>Text / متن</label>
          <input id="txtInput" placeholder="نئون / NEON" style="font-size:15px; padding:9px">
        </div>
        <canvas id="txtPreview" width="380" height="150" style="width:100%; border:1px solid #2e3d52; border-radius:8px; margin-top:4px"></canvas>
      </div>
      <div style="width:240px">
        <div class="p-row"><label>Font / فونت</label>
          <select id="txtFont">
            <option value="Tahoma" selected>Tahoma (فارسی ✓)</option>
            <option value="Segoe UI">Segoe UI (فارسی ✓)</option>
            <option value="Arial">Arial (فارسی ✓)</option>
            <option value="Times New Roman">Times New Roman (فارسی ✓)</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
            <option value="Impact">Impact</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Courier New">Courier New</option>
            <option value="__custom__">Custom… (نام فونت نصب‌شده)</option>
          </select>
        </div>
        <div class="p-row"><label>Custom font name</label><input id="txtFontCustom" placeholder="e.g. Vazirmatn"></div>
        <div class="p-grid">
          <div class="p-row"><label>Size on board</label>
            <div class="unit"><input id="txtSize" type="number" min="1" step="1" value="20"><i>cm</i></div></div>
          <div class="p-row"><label>Letter spacing</label>
            <div class="unit"><input id="txtSpacing" type="number" min="-20" max="80" step="2" value="0"><i>%</i></div></div>
        </div>
        <div class="p-row" style="flex-direction:row; gap:12px; align-items:center">
          <label style="margin:0"><input id="txtBold" type="checkbox"> Bold</label>
          <label style="margin:0"><input id="txtItalic" type="checkbox"> Italic</label>
          <label style="margin:0"><input id="txtThicken" type="checkbox"> Thicken</label>
        </div>
        <div class="p-row"><label>Neon mode / حالت نئون</label>
          <select id="txtMode">
            <option value="center">Centerline — تک‌خط</option>
            <option value="outline">Outline — دو خطی (دور حروف)</option>
          </select>
        </div>
        <div class="p-row"><label><input id="txtAsLabel" type="checkbox"> Add as note/label only (not neon)</label></div>
        <p class="hint">Centerline: one tube runs along each letter stroke.<br>Outline: the tube runs along <b>both sides</b> of every stroke — the double-line neon look.</p>
      </div>
    </div>
    <div class="modal-actions">
      <button id="txtCancel" class="btn">Cancel</button>
      <button id="txtApply" class="btn primary">Create neon text</button>
    </div>
  </div>
</div>

<!-- ============ ALIGN & DISTRIBUTE MODAL ============ -->
<div class="modal hidden" id="modalAlign">
  <div class="modal-card" style="width:min(420px,92vw)">
    <h2>ALIGN &amp; DISTRIBUTE</h2>
    <div class="sub">Aligns the selected paths relative to the board (like CorelDRAW "Align to Page").</div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
      <button class="btn" data-align="left">Left</button>
      <button class="btn" data-align="chcenter">Center H</button>
      <button class="btn" data-align="right">Right</button>
      <button class="btn" data-align="top">Top</button>
      <button class="btn" data-align="vcenter">Middle V</button>
      <button class="btn" data-align="bottom">Bottom</button>
    </div>
    <div class="p-h" style="margin-top:14px">DISTRIBUTE (3+ paths)</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
      <button class="btn" id="distH">Equal horizontal gaps</button>
      <button class="btn" id="distV">Equal vertical gaps</button>
    </div>
    <div class="modal-actions">
      <button id="btnCloseAlign" class="btn primary">Close</button>
    </div>
  </div>
</div>

<!-- ============ HELP / راهنما ============ -->
<div class="modal hidden" id="modalHelp">
  <div class="modal-card help-card">
    <h2>راهنمای کامل NEON CAD</h2>
    <div class="sub">هر آنچه برای رفتن از «یک طرح» تا «فایل آمادهٔ برش» نیاز دارید — از ترسیم تا محاسبهٔ برق و ارسال به برش‌دهنده</div>
    <div class="help-wrap">
      <div class="help-toc">
        <button data-target="hs1">۱. گردش کار کلی</button>
        <button data-target="hs2">۲. نوار بالا</button>
        <button data-target="hs3">۳. ابزارها (TOOLS)</button>
        <button data-target="hs4">۴. بوم طراحی (CANVAS)</button>
        <button data-target="hs5">۵. ویژگی‌ها (PROPERTIES)</button>
        <button data-target="hs6">۶. جدول برش و مواد</button>
        <button data-target="hs7">۷. تبدیل عکس به نئون (v2)</button>
        <button data-target="hs7b">۷ب. متن نئونی و حالت دو خطی</button>
        <button data-target="hs7c">۷پ. ابزارهای CorelDRAW</button>
        <button data-target="hs8">۸. فایل برش‌دهنده</button>
        <button data-target="hs9">۹. بررسی نهایی (CHECK)</button>
        <button data-target="hs10">۱۰. پروفایل نئون</button>
        <button data-target="hs11">۱۱. ذخیره و میان‌برها</button>
        <button data-target="hs12">۱۲. نکات و عیب‌یابی</button>
      </div>
      <div class="help-body" id="helpBody">

        <section id="hs1">
          <h3>۱. گردش کار کلی — از طرح تا تابلوی واقعی</h3>
          <p>این نرم‌افزار طرح دیجیتال شما را به «مسیر واقعی نئون» تبدیل می‌کند، طول‌ها را از نظر هندسی اصلاح می‌کند تا با نقاط برش واقعی نئون هم‌خوان شوند، و در نهایت فایل آمادهٔ ساخت تحویل می‌دهد:</p>
          <p style="text-align:center; background:#0f1722; border-radius:8px; padding:10px; direction:ltr;">
            <b>Design &rarr; Neon Path &rarr; Geometry Fix (2.5cm) &rarr; Cut Points &rarr; Cut List &rarr; Power &rarr; CUT FILE</b>
          </p>
          <h4>مراحل پیشنهادی قدم‌به‌قدم</h4>
          <ol>
            <li>ابعاد تابلو را در <b>PROPERTIES</b> وارد کنید (مثلاً عرض 200 و ارتفاع 100 سانتی‌متر).</li>
            <li>طرح را بکشید (Pen / Line / Bezier) یا با <b>TRACE IMAGE</b> از روی عکس بسازید یا از منوی <b>EXAMPLES</b> یک نمونه حرفه‌ای شروع کنید.</li>
            <li>در حالت <b>AUTO MODE</b> نرم‌افزار خودکار شماره‌گذاری (NEON 01...) می‌کند و طول هر مسیر را <b>هندسیاً</b> اصلاح می‌کند تا مضرب 2.5 سانتی‌متر شود.</li>
            <li>جدول برش پایین صفحه را بررسی کنید (شماره، طول، تعداد برش، شروع، پایان).</li>
            <li>دکمهٔ <b>CHECK DESIGN</b> را بزنید و همهٔ هشدارها را برطرف کنید.</li>
            <li>برای ساخت تابلو، <b>CUT DXF</b> (فایل برش‌دهنده) و <b>PRINT / PDF</b> (برگهٔ ساخت) را دانلود کنید.</li>
            <li>متراژ و توان لازم را از تب <b>MATERIALS &amp; POWER</b> بردارید و منبع تغذیه مناسب بخرید.</li>
          </ol>
          <div class="tip">نکتهٔ طلایی: نرم‌افزار هیچ‌وقت طول را «فقط گرد نمی‌کند». اگر مسیری 83.2 سانت باشد، هندسهٔ آن را طوری تغییر می‌دهد که طول واقعی به 85 سانت (34 × 2.5) برسد و شکل تا حد امکان حفظ شود. به همین دلیل همهٔ نقاط START و END روی نقاط برش واقعی نئون می‌نشینند.</div>
        </section>

        <section id="hs2">
          <h3>۲. نوار بالا (Top Bar)</h3>
          <table>
            <thead><tr><th>کنترل</th><th>کاربرد</th></tr></thead>
            <tbody>
              <tr><td><b>نام پروژه</b></td><td>نام طرح برای ذخیره و خروجی‌ها. تایپ کنید و Enter بزنید.</td></tr>
              <tr><td><b>AUTO MODE / MANUAL MODE</b></td><td>در حالت خودکار، شماره‌گذاری، اصلاح طول‌ها و ساخت جدول برش بعد از هر تغییر انجام می‌شود. در حالت دستی، همه‌چیز تحت کنترل شماست (برای ویرایش دقیق).</td></tr>
              <tr><td><b>Undo / Redo</b></td><td>بازگردانی یا تکرار آخرین تغییرات (Ctrl+Z / Ctrl+Y).</td></tr>
              <tr><td><b>CHECK DESIGN</b></td><td>بررسی کامل طرح قبل از خروجی گرفتن — بخش ۹ را ببینید.</td></tr>
              <tr><td><b>PRINT / PDF</b></td><td>برگهٔ ساخت: جدول برش + محاسبهٔ برق + پرت رول + نقشهٔ طرح. در پنجرهٔ چاپ مرورگر گزینهٔ Save as PDF را بزنید.</td></tr>
              <tr><td><b>SVG / DXF / PNG / CSV / JSON</b></td><td>خروجی‌های معمول طرح (بخش ۸). CSV همان جدول برش است.</td></tr>
              <tr><td><b>CUT DXF / CUT SVG</b></td><td><b>مهم‌ترین خروجی برای ساخت:</b> فایل «طرح دوبل» برای برش‌دهنده (بخش ۸).</td></tr>
              <tr><td><b>TRACE IMAGE</b></td><td>تبدیل خودکار عکس به مسیر نئون — بخش ۷.</td></tr>
              <tr><td><b>EXAMPLES</b></td><td>بارگذاری نمونه‌های حرفه‌ای: تابلوی کافه (دایره + نوشتهٔ فارسی نئون)، گالری اشکال، یا دموی زنجیره‌ای جدول برش.</td></tr>
              <tr><td><b>SAVE / OPEN</b></td><td>ذخیره و باز کردن پروژه داخل همین مرورگر (بخش ۱۱).</td></tr>
              <tr><td><b>IMPORT</b></td><td>وارد کردن فایل SVG (طراحی برداری) یا JSON (پروژهٔ ذخیره‌شده).</td></tr>
              <tr><td><b>NEW</b></td><td>شروع پروژهٔ خالی روی همان تابلو.</td></tr>
              <tr><td><b>HELP</b></td><td>همین راهنما. کلید F1 هم آن را باز می‌کند.</td></tr>
            </tbody>
          </table>
        </section>

        <section id="hs3">
          <h3>۳. ابزارها (TOOLS — سمت چپ)</h3>
          <h4>ابزارهای ترسیم</h4>
          <ul>
            <li><b>Select (انتخاب)</b> — با کلیک روی هر مسیر آن را انتخاب کنید؛ با کشیدن جابه‌جایی می‌کند. رأس‌ها (نقطه‌های سفید) را بگیرید و بکشید تا شکل عوض شود. کشیدن روی جای خالی = <b>انتخاب کادری</b> (همهٔ مسیرهای داخل کادر انتخاب می‌شوند). Shift = افزودن به انتخاب.</li>
            <li><b>دستگیره‌های تبدیل (Transform)</b> — وقتی چیزی انتخاب است: دستگیره‌های <b>آبی گوشه‌ها</b> = بزرگ/کوچک‌کردن متناسب، دستگیره‌های <b>کنارها</b> = کشیدن یک‌بعدی، <b>دایرهٔ زرد بالای کادر</b> = چرخش (با Shift روی ۱۵ درجه قفل می‌شود). مثل CorelDRAW!</li>
            <li><b>Pen (قلم)</b> — کلیک‌کلیک کنید تا خط شکسته (پلی‌خط) بسازید. با <kbd>Enter</kbd> یا <b>دوکلیک</b> تمام می‌شود. با <kbd>Esc</kbd> لغو می‌شود.</li>
            <li><b>Line (خط)</b> — دو کلیک: نقطهٔ شروع و پایان یک خط صاف.</li>
            <li><b>Bezier (منحنی)</b> — مانند Pen کلیک کنید؛ هنگام پایان، مسیر به‌صورت خودکار به منحنی‌های نرم (Catmull-Rom) تبدیل می‌شود — برای اشکال ارگانیک و خم‌دار نئون ایده‌آل است.</li>
          </ul>
          <h4>اشکال هندسی (مثل CorelDRAW)</h4>
          <ul>
            <li><b>Rect (مستطیل)</b> — بکشید تا مستطیل بسازید؛ با <kbd>Shift</kbd> مربع.</li>
            <li><b>Ellipse (بیضی)</b> — بکشید؛ با <kbd>Shift</kbd> دایرهٔ کامل.</li>
            <li><b>Polygon (چندضلعی)</b> — از مرکز بکشید؛ تعداد ضلع‌ها در PROPERTIES → «Polygon / Star sides».</li>
            <li><b>Star (ستاره)</b> — از مرکز بکشید؛ نسبت شعاع داخلی در «Star inner radius».</li>
            <li><b>Spiral (مارپیچ)</b> — از مرکز بکشید؛ تعداد دورها در «Spiral turns».</li>
          </ul>
          <h4>متن و تصویر</h4>
          <ul>
            <li><b>Text (متن نئونی)</b> — کلیک کنید؛ پنجرهٔ TEXT باز می‌شود: متن فارسی/انگلیسی بنویسید، فونت و اندازه انتخاب کنید و <b>متن به مسیر واقعی نئون تبدیل می‌شود</b> (در جدول برش می‌آید و قابل خروجی گرفتن است). حالت <b>Centerline</b> = یک ریسه روی خود خطوط حروف؛ حالت <b>Outline — دو خطی</b> = ریسه از <b>دو طرف خطوط حروف</b> می‌گذرد (نمای دوخطی). اگر تیک «note/label only» را بزنید، متن فقط به‌صورت برچسب چاپی روی تابلو می‌نشیند (نئون نیست).</li>
            <li><b>Trace Img</b> — مثل دکمهٔ TRACE IMAGE بالای صفحه؛ آپلود عکس و تبدیل به نئون (بخش ۷).</li>
          </ul>
          <h4>چیدمان و ترتیب (ARRANGE)</h4>
          <ul>
            <li><b>Duplicate / Copy / Paste</b> — تکرار و کپی/چسباندن مسیرهای انتخابی (Ctrl+D / Ctrl+C / Ctrl+V).</li>
            <li><b>Align…</b> — تراز نسبت به تابلو: چپ/وسط/راست، بالا/وسط/پایین + توزیع یکنواخت فاصله‌ها (۳ مسیر یا بیشتر).</li>
            <li><b>To Front / To Back</b> — آوردن جلو/فرستادن عقب در ترتیب اشیا.</li>
            <li><b>Flip H / Flip V</b> — قرینهٔ افقی/عمودی.</li>
          </ul>
          <h4>شکل‌دهی (SHAPING)</h4>
          <ul>
            <li><b>Weld / Trim / Intersect</b> — عملیات بولین مثل CorelDRAW: <b>جوش</b> (ادغام چند شکل بسته در یک طرح)، <b>برش</b> (کم‌کردن شکل‌های بعدی از اولی)، <b>اشتراک</b> (فقط ناحیهٔ مشترک). روی اشکال بسته بهترین نتیجه را می‌دهد.</li>
            <li><b>Double Line (دو خطی)</b> — هر مسیر انتخاب‌شده را به <b>دو خط نئون موازی</b> تبدیل می‌کند (فاصله در PROPERTIES → «Double-line gap»). برای متن‌ها و طرح‌هایی که نئون باید دوخطی اجرا شود.</li>
          </ul>
          <h4>نمایش (VIEW)</h4>
          <ul>
            <li><b>Zoom In / Out / Fit Page</b> — بزرگ‌نمایی، کوچک‌نمایی و تناسب با صفحه (کلید <kbd>F</kbd>).</li>
          </ul>
          <h4>ابزارهای ویرایش</h4>
          <ul>
            <li><b>Snap Grid</b> — چسباندن نقاط به گرید (اندازهٔ گرید در PROPERTIES). فعال/غیرفعال.</li>
            <li><b>Channel</b> — نمایش «طرح دوبل»: دو خط موازی اطراف هر مسیر که نشان می‌دهد برش‌دهنده کجاها را می‌برد و ریسه نئون کجا می‌نشیند.</li>
            <li><b>Snap Lengths</b> — اصلاح هندسی طول همهٔ مسیرها تا مضرب گام برش شوند (در AUTO خودکار است؛ این دکمه برای MANUAL).</li>
            <li><b>Reverse</b> — تغییر جهت مسیر انتخاب‌شده (نقطهٔ شروع و پایان عوض می‌شود).</li>
            <li><b>Delete</b> — حذف مسیر انتخاب‌شده (کلید Delete هم همین کار را می‌کند).</li>
          </ul>
          <h4>ابزارهای اندازه‌گیری و تقسیم</h4>
          <ul>
            <li><b>Split (تقسیم)</b> — روی مسیر کلیک کنید تا دقیقاً در نزدیک‌ترین «نقطهٔ برش واقعی» (مضرب 2.5 سانت از ابتدای مسیر) به دو قطعه تقسیم شود. برای ساخت قطعات جداگانه ضروری است.</li>
            <li><b>Measure (اندازه)</b> — دو کلیک؛ فاصلهٔ دقیق برحسب سانتی‌متر نمایش داده می‌شود.</li>
          </ul>
          <div class="tip">نکته: در حالت Select می‌توانید با کشیدن «دستگیره‌های آبی» روی مسیرهای منحنی، شکل خم‌ها را دقیق‌تر کنید.</div>
        </section>

        <section id="hs4">
          <h3>۴. بوم طراحی (CANVAS — وسط صفحه)</h3>
          <ul>
            <li><b>زوم:</b> اسکرول موس (در جایی که نشانگر هست زوم می‌شود).</li>
            <li><b>جابه‌جایی نما:</b> نگه‌داشتن <kbd>Space</kbd> + کشیدن موس، یا کشیدن با دکمهٔ وسط موس.</li>
            <li><b>مختصات:</b> گوشهٔ پایین-چپ x و y را بر حسب سانتی‌متر نشان می‌دهد — همه‌چیز با مقیاس واقعی است.</li>
            <li><b>گرید:</b> خطوط ریز = 1 سانت، خطوط درشت = 10 سانت. کادر تابلو با ابعادی که در PROPERTIES داده‌اید رسم می‌شود.</li>
          </ul>
          <h4>رنگ‌ها و برچسب‌ها روی طرح</h4>
          <ul>
            <li><b>NEON 01, NEON 02, ...</b> — شمارهٔ هر مسیر نئون (وسط مسیر).</li>
            <li><b>START 01 / END 01</b> — نقطهٔ شروع (سبز) و پایان (قرمز) هر قطعهٔ قابل برش.</li>
            <li><b>A , B , C , ...</b> — حروف نقاط اتصال: جایی که دو مسیر به هم می‌رسند یا انتهای آزاد هستند. همین حروف در جدول برش در ستون «شروع/پایان» می‌آیند.</li>
            <li>خطوط سفید چین‌دار = انتخاب فعلی شما؛ خطوط سفید نازک اطراف مسیر (در حالت Channel) = خطوط برش.</li>
          </ul>
        </section>

        <section id="hs5">
          <h3>۵. ویژگی‌ها (PROPERTIES — سمت راست)</h3>
          <h4>ابعاد تابلو</h4>
          <table>
            <thead><tr><th>فیلد</th><th>معنی</th></tr></thead>
            <tbody>
              <tr><td>Width / Height</td><td>عرض و ارتفاع تابلو بر حسب سانتی‌متر. مقیاس واقعی طرح از همین‌جا می‌آید.</td></tr>
            </tbody>
          </table>
          <h4>پروفایل نئون (مشخصات ریسه)</h4>
          <table>
            <thead><tr><th>فیلد</th><th>معنی</th></tr></thead>
            <tbody>
              <tr><td>Saved profiles</td><td>پروفایل‌های ذخیره‌شده را انتخاب کنید تا همهٔ مشخصات زیر یک‌جا پر شود (بخش ۱۰).</td></tr>
              <tr><td>Neon Width</td><td>عرض ریسه نئون بر حسب میلی‌متر (مثلاً 8). در رسم ضخامت نور و عرض کانال برش مؤثر است.</td></tr>
              <tr><td>Cutting Interval</td><td><b>گام برش نئون</b> بر حسب سانتی‌متر (پیش‌فرض 2.5). ریسه نئون فقط در مضرب‌های این عدد بریده می‌شود؛ نرم‌افزار طول‌ها را هندسیاً روی همین گام می‌نشاند.</td></tr>
              <tr><td>Minimum Bend Radius</td><td>حداقل شعاع خم نئون (میلی‌متر). گوشه‌های تیز‌تر از این در CHECK DESIGN هشدار می‌گیرند.</td></tr>
              <tr><td>Voltage</td><td>ولتاژ ریسه (مثلاً 24V) — برای محاسبهٔ جریان.</td></tr>
              <tr><td>Power per meter</td><td>مصرف هر متر نئون بر حسب وات (مثلاً 10). کاملاً قابل تنظیم.</td></tr>
              <tr><td>Roll Length</td><td>طول هر رول نئون (سانتی‌متر، مثلاً 500). برای محاسبهٔ تعداد رول و پرت.</td></tr>
            </tbody>
          </table>
          <h4>تنظیمات برش و برق</h4>
          <table>
            <thead><tr><th>فیلد</th><th>معنی</th></tr></thead>
            <tbody>
              <tr><td>Max Piece Length</td><td>حداکثر طول مجاز هر تکه. مسیرهای بلندتر خودکار به چند تکه (با نقطهٔ اتصال) تقسیم می‌شوند.</td></tr>
              <tr><td>Min Path Spacing</td><td>حداقل فاصلهٔ مجاز بین دو مسیر نئون. نزدیک‌تر از این = خطا در CHECK DESIGN.</td></tr>
              <tr><td>PSU Safety Factor</td><td>ضریب اطمینان منبع تغذیه (درصد). پیش‌فرض 80 یعنی منبع فقط 80٪ توانش استفاده شود (20٪ هدروم).</td></tr>
              <tr><td>PSU Capacity</td><td>اگر منبع تغذیهٔ مشخصی دارید توانش را وارد کنید (وات) تا با توان کل مقایسه شود. 0 = پیشنهاد خودکار.</td></tr>
              <tr><td>Grid Snap</td><td>گام چسباندن نقاط هنگام ترسیم (سانتی‌متر، پیش‌فرض 0.5).</td></tr>
              <tr><td>Node Tolerance</td><td>تلورانس یکی‌شدن دو نقطهٔ انتهایی به‌عنوان «نقطهٔ اتصال» (سانتی‌متر).</td></tr>
              <tr><td>Cutting Channel Width</td><td>عرض <b>کانال برش</b> (میلی‌متر). طرح دوبل با همین عرض اطراف مسیر ساخته می‌شود؛ پیش‌فرض 10 = نئون 8mm + خلاصی 2mm.</td></tr>
              <tr><td>Include centerline</td><td>اگر تیک بخورید، مرکزخط مسیر هم به فایل برش‌دهنده اضافه می‌شود.</td></tr>
            </tbody>
          </table>
          <h4>پنل مسیر انتخاب‌شده</h4>
          <p>وقتی مسیری را انتخاب کنید: نام، طول هندسی، طول اصلاح‌شده، تعداد قطعات/برش‌ها و نقاط شروع/پایان آن نمایش داده می‌شود. دکمه‌ها:</p>
          <ul>
            <li><b>Reverse</b> — تغییر جهت مسیر.</li>
            <li><b>Lock Start / Lock End</b> — قفل نقطهٔ شروع/پایان. نقطهٔ قفل هنگام اصلاح طول جابه‌جا نمی‌شود (برای اتصال به مسیر بعدی).</li>
            <li><b>Snap Length</b> — اصلاح هندسی طول همین مسیر.</li>
            <li><b>Delete Path</b> — حذف مسیر.</li>
          </ul>
        </section>

        <section id="hs6">
          <h3>۶. جدول برش و مواد (پایین صفحه)</h3>
          <h4>تب CUT LIST — جدول برش</h4>
          <table>
            <thead><tr><th>ستون</th><th>معنی</th></tr></thead>
            <tbody>
              <tr><td>شماره (No.)</td><td>شمارهٔ قطعه — روی طرح با همان شماره START 01 / END 01 علامت خورده است.</td></tr>
              <tr><td>طول (Length)</td><td>طول واقعی قطعه بر حسب سانتی‌متر (همیشه مضرب گام برش).</td></tr>
              <tr><td>تعداد برش (Cuts)</td><td>تعداد واحدهای 2.5 سانتی‌متری داخل قطعه (طول ÷ 2.5).</td></tr>
              <tr><td>شروع (Start)</td><td>نقطهٔ شروع قطعه (حرف نقطهٔ اتصال، مثل A).</td></tr>
              <tr><td>پایان (End)</td><td>نقطهٔ پایان قطعه (مثل B).</td></tr>
            </tbody>
          </table>
          <p>دکمهٔ <b>PRINT / PDF this table</b> بالای همین جدول، برگهٔ ساخت را چاپ می‌کند (همین جدول + نقشه + برق + پرت).</p>
          <h4>تب MATERIALS &amp; POWER — مواد و برق</h4>
          <ul>
            <li><b>TOTAL NEON</b> — متراژ کل نئون بر حسب متر.</li>
            <li><b>POWER</b> — توان کل = متراژ × توان هر متر.</li>
            <li><b>POWER SUPPLY</b> — منبع تغذیهٔ پیشنهادی با احتساب ضریب اطمینان + جریان مصرفی (آمپر).</li>
            <li><b>ROLLS &amp; WASTE</b> — تعداد رول لازم و مقدار پرت.</li>
          </ul>
          <h4>تب ROLLS &amp; WASTE — رول و پرت</h4>
          <p>هر نوار = یک رول نئون. رنگ‌های داخل نوار = قطعات چیده‌شده روی آن رول، خاکستری = پرت. الگوریتم First-Fit-Decreasing قطعات را طوری کنار هم می‌گذارد که پرت حداقل شود. برای کم‌کردن پرت، طول قطعات را با ابزار Split یا تغییر طرح بهتر ترکیب کنید.</p>
        </section>

        <section id="hs7">
          <h3>۷. تبدیل عکس به نئون (TRACE IMAGE — نسخهٔ ۲)</h3>
          <p>هر عکسی (PNG، JPG، WEBP، GIF، BMP) — لوگو، خط‌نویس، متن، طرح — را به مسیر نئون تبدیل کنید. موتور جدید به‌جای آستانهٔ ثابت، <b>آستانهٔ خودکار Otsu</b> دارد، نویز و لکه‌های ریز را حذف می‌کند، انتهای خطوط را که در اسکلت‌سازی عقب می‌مانند <b>برمی‌گرداند</b> و شاخه‌های اضافی را می‌زند:</p>
          <ol>
            <li>دکمهٔ <b>TRACE IMAGE</b> را بزنید و عکس را انتخاب کنید.</li>
            <li><b>حالت ترسیم</b> را انتخاب کنید — حالت <b>Auto</b> (پیش‌فرض) خودش تشخیص می‌دهد: اگر عکس «توپُر» باشد (لوگوی پُر، فونت فت، شکل یکپارچه) خودکار <b>Outline — دو خطی</b> را انتخاب می‌کند و اگر خط‌نویس نازک باشد <b>Centerline</b> را (جدول زیر).</li>
            <li>پیش‌نمایش قرمز <b>دقیقاً همان چیزی است</b> که روی تابلو اضافه می‌شود (WYSIWYG).</li>
            <li>اسلایدرها را تنظیم و <b>Add to design</b> را بزنید.</li>
          </ol>
          <table>
            <thead><tr><th>کنترل</th><th>کاربرد</th></tr></thead>
            <tbody>
              <tr><td><b>Trace mode</b></td><td><b>Auto (پیشنهادی):</b> نرم‌افزار ضخامت مؤثر خطوط را می‌سنجد و حالت درست را انتخاب می‌کند. <b>Centerline — تک‌خط:</b> یک ریسه نئون دقیقاً روی محور خطوط عکس (برای خط‌نویس و اسکریپت). <b>Outline — دو خطی:</b> ریسه از <b>دو لبهٔ هر خط</b> می‌گذرد؛ برای شکل‌های توپُر، متن‌های فت و نمای دولاین.</td></tr>
              <tr><td><b>Auto threshold</b></td><td>آستانهٔ سیاه/سفید خودکار (الگوریتم Otsu) — برای اکثر عکس‌ها روشن بمانید. اگر شکل ناقص/اضافی بود، تیک را بردارید و Threshold دستی را بچرخانید.</td></tr>
              <tr><td><b>Noise removal</b></td><td>حذف لکه‌ها و نقطه‌های نویز (مخصوص عکس‌های JPG و عکس‌های موبایل). 2 تا 5 مقدار خوبی است.</td></tr>
              <tr><td><b>Detail</b></td><td>ریزبینی. کمتر = خطوط نرم‌تر و تمیزتر. بیشتر = جزئیات بیشتر (و شلوغ‌تر).</td></tr>
              <tr><td><b>Quality</b></td><td>رزولوشن ترسیم: 600 (سریع) تا 1600 (خیلی ریز). برای لوگوهای ریز 1200+ بگذارید.</td></tr>
              <tr><td><b>Min stroke</b></td><td>حذف خط‌های خیلی کوتاه (نویز) بر حسب سانتی‌مترِ روی تابلو.</td></tr>
              <tr><td><b>Invert</b></td><td>وقتی شکل روشن روی پس‌زمینهٔ تیره است تیک بزنید.</td></tr>
            </tbody>
          </table>
          <div class="tip">اگر قبلاً «تشخیص نمی‌داد»: مشکل اصلی این بود که اسکلت‌سازی برای شکل‌های <b>توپُر</b> فقط یک خط کوچک وسط شکل می‌دهد (برای دایرهٔ توپُر فقط یک نقطه!) — حالا حالت <b>Auto</b> چنین عکس‌هایی را می‌شناسد و خودکار به Outline می‌برد. به‌علاوه: آستانهٔ خودکار Otsu + فیلتر میانه برای نویز عکس + برگرداندن نوک خطوط + اتصال ترک‌های ریز. اگر باز هم خطی جا افتاد، Quality را بالا ببرید و Noise removal را کم کنید.</div>
        </section>

        <section id="hs7b">
          <h3>۷ب. متن نئونی و حالت دو خطی (TEXT → NEON)</h3>
          <p>ابزار <b>Text</b> دیگر فقط «نوت» نمی‌گذارد — متن شما <b>مسیر واقعی نئون</b> می‌شود: در جدول برش می‌آید، طولش روی گام 2.5cm اصلاح می‌شود، در همهٔ خروجی‌ها می‌رود و مثل بقیهٔ مسیرها قابل ویرایش است.</p>
          <ol>
            <li>ابزار <b>Text</b> (کلید <kbd>T</kbd>) را بزنید و روی تابلو کلیک کنید (جایی که متن باید وسطش بنشیند).</li>
            <li>متن را بنویسید — <b>فارسی و انگلیسی</b> هر دو پشتیبانی می‌شوند (شکل‌دهی حروف فارسی توسط خود مرورگر انجام می‌شود).</li>
            <li>فونت، اندازه (سانتی‌متر روی تابلو)، Bold/Italic، فاصله-between حروف را انتخاب کنید.</li>
            <li>حالت نئون را انتخاب کنید:
              <ul>
                <li><b>Centerline — تک‌خط:</b> یک ریسه روی محور هر خطِ حروف (نمای کلاسیک اسکریپت).</li>
                <li><b>Outline — دو خطی:</b> ریسه از <b>دو طرف هر خطِ حروف</b> می‌گذرد — همان نمای دولاینی/دوخطی که در تابلوهای نئون حرفه‌ای می‌بینید.</li>
              </ul>
            </li>
            <li><b>Create neon text</b> را بزنید.</li>
          </ol>
          <div class="tip">برای متن‌های خیلی نازک (فونت‌های Light) تیک <b>Thicken</b> را بزنید تا خطوط حروف کمی قطورتر رسم و پایدارتر ترسیم شوند. اگر متن از عرض تابلو بیرون بزند خودکار کوچک می‌شود.</div>
          <h4>دو خطی‌کردن هر طرح (نه فقط متن)</h4>
          <p>هر مسیر دلخواه (دست‌کشیده، تریس‌شده، شکل) را انتخاب کنید و <b>Double Line</b> را بزنید: مسیر به دو خط نئون موازی تبدیل می‌شود. فاصلهٔ دو خط در PROPERTIES → «Double-line gap» تنظیم می‌شود. اگر بخواهید خط وسط هم بماند، در پیام دکمه Cancel را بزنید (۳ مسیر می‌سازد).</p>
          <div class="warn">حالت Outline/دو خطی و ابزار Double Line هر دو «ریسهٔ دوخطی واقعی» می‌سازند؛ ولی <b>CHANNEL</b> (دو خط چین‌دار دور مسیر) فقط «خطوط برش کانال» برای برش‌دهنده است — با ریسه اشتباه نشود!</div>
        </section>

        <section id="hs7c">
          <h3>۷پ. ابزارهای مشابه CorelDRAW</h3>
          <p>این نسخه، ابزارهای اصلی CorelDRAW که برای طراحی تابلو نئون لازم است را دارد:</p>
          <table>
            <thead><tr><th>قابلیت</th><th>توضیح</th></tr></thead>
            <tbody>
              <tr><td>اشکال هندسی</td><td>مستطیل/مربع، بیضی/دایره، چندضلعی N-ضلعی، ستاره، مارپیچ — با Shift برای حالت منظم.</td></tr>
              <tr><td>Freehand / Bezier</td><td>قلم، خط، منحنی بزیه با ادیت رأس‌ها و دستگیره‌های کنترل.</td></tr>
              <tr><td>Transform</td><td>جابه‌جایی، مقیاس (گوشه‌ها)، کشش (کنارها)، چرخش با ماوس؛ یا عددی در PROPERTIES → TRANSFORM (X/Y/W/H) + چرخش ۹۰± و ۱۵ درجه.</td></tr>
              <tr><td>Flip / Mirror</td><td>قرینهٔ افقی و عمودی.</td></tr>
              <tr><td>Order</td><td>To Front / To Back — ترتیب اشیا.</td></tr>
              <tr><td>Align &amp; Distribute</td><td>تراز به تابلو (۶ حالت) + توزیع یکنواخت فاصله‌ها.</td></tr>
              <tr><td>Boolean (Shaping)</td><td>Weld (جوش/ادغام)، Trim (برش)، Intersect (اشتراک) — مثل Shaping در CorelDRAW.</td></tr>
              <tr><td>Duplicate / Copy / Paste</td><td>Ctrl+D / Ctrl+C / Ctrl+V و Select All با Ctrl+A.</td></tr>
              <tr><td>Artistic Text</td><td>متن با فونت دلخواه → تبدیل به مسیر برداری نئون (بخش ۷ب).</td></tr>
              <tr><td>Outline / Contour</td><td>Double Line = آفست موازی دوطرفه؛ CHANNEL = کانال برش دوخطی.</td></tr>
              <tr><td>Object Manager</td><td>تب OBJECTS: فهرست همهٔ اشیا + نمایش/مخفی (👁) + قفل (🔒) + حذف. مسیر مخفی از جدول برش و خروجی‌ها حذف می‌شود (برای طرح مرجع).</td></tr>
              <tr><td>Color</td><td>رنگ نئون هر مسیر (پالت + رنگ دلخواه) — روی بوم، SVG، PNG و EPS اعمال می‌شود.</td></tr>
              <tr><td>Zoom / Fit</td><td>بزرگ/کوچک/تناسب با صفحه + کلیدهای + / − / F.</td></tr>
              <tr><td>خروجی‌ها</td><td>SVG / DXF / <b>EPS (مخصوص CorelDRAW/Illustrator)</b> / PNG / CSV / JSON + CUT DXF/SVG.</td></tr>
            </tbody>
          </table>
          <div class="warn">این برنامه یک <b>CAD ساخت نئون</b> است، نه جایگزین کامل CorelDRAW: ویرایش بیت‌مپ، چندصفحه‌ای، مدیریت رنگ چاپ CMYK و افکت‌های پیچیدهٔ وکتور در آن نیست — ولی برای «طراحی تابلو نئون تا فایل برش» همه‌چیز لازم را دارد.</div>
        </section>

        <section id="hs8">
          <h3>۸. فایل برش‌دهنده (CUT DXF / CUT SVG) و خروجی‌ها</h3>
          <h4>طرح دوبل — فایلی که به برش‌دهنده می‌دهید</h4>
          <p>ریسهٔ نئون داخل یک «کانال» (شیار) می‌نشیند. برای ساخت این کانال، ماشین باید <b>دو خط موازی</b> اطراف مسیر را ببرد. دکمه‌های <b>CUT DXF</b> و <b>CUT SVG</b> دقیقاً همین طرح دوبل را تولید می‌کنند:</p>
          <ul>
            <li>فاصلهٔ دو خط = عرض کانال (Cutting Channel Width، پیش‌فرض 10 میلی‌متر). ریسه دقیقاً وسط این دو خط قرار می‌گیرد.</li>
            <li>لایه‌های فایل: <b>CUT1</b> و <b>CUT2</b> (و در صورت تیک‌زدن Include centerline، لایهٔ <b>CENTER</b>).</li>
            <li>واحدها سانتی‌متر و مقیاس 1:1 — مستقیماً در نرم‌افزار برش‌دهنده (CNC / روتر / لیزر / برش ورق) باز می‌شود.</li>
            <li>با ابزار <b>Channel</b> قبل از خروجی، خطوط برش را روی طرح ببینید.</li>
          </ul>
          <h4>بقیهٔ خروجی‌ها</h4>
          <table>
            <thead><tr><th>دکمه</th><th>محتوا</th></tr></thead>
            <tbody>
              <tr><td>SVG</td><td>نقشهٔ کامل طرح با شماره‌ها و برچسب‌ها (مقیاس واقعی — مناسب ایلاستریتور/اینک‌اسکیپ).</td></tr>
              <tr><td>DXF</td><td>نقشهٔ کامل طرح (R12) برای CAD.</td></tr>
              <tr><td>PNG</td><td>عکس با وضوح بالا از طرح.</td></tr>
              <tr><td>CSV</td><td>جدول برش برای اکسل (شماره، طول، تعداد برش، شروع، پایان + جمع کل + برق).</td></tr>
              <tr><td>JSON</td><td>کل پروژه — برای باز کردن دوباره یا ارسال به همکار.</td></tr>
              <tr><td>PRINT / PDF</td><td>برگهٔ ساخت کامل: جدول برش + متریال + محاسبهٔ برق + پرت رول + نقشه + خط امضا.</td></tr>
            </tbody>
          </table>
          <h4>پیشنهاد گردش ساخت واقعی</h4>
          <ol>
            <li>طراحی و CHECK DESIGN</li>
            <li>دانلود <b>CUT DXF</b> ← ارسال به برش‌دهنده برای بریدن کانال/شیار روی صفحه.</li>
            <li>دانلود <b>PRINT / PDF</b> ← برگهٔ ساخت برای تیم برش و مونتاژ.</li>
            <li>طبق جدول برش، ریسه‌ها را ببرید (شروع/پایان هر قطعه روی نقاط برش واقعی 2.5cm است).</li>
            <li>ریسه را داخل کانال بگذارید، سیم‌کشی نقطه‌های شروع/پایان (A، B، C...) و نصب منبع تغذیهٔ پیشنهادی.</li>
          </ol>
        </section>

        <section id="hs9">
          <h3>۹. بررسی نهایی (CHECK DESIGN)</h3>
          <p>قبل از هر خروجی این دکمه را بزنید. نرم‌افزار کل طرح را بررسی و مشکلات را با برچسب رنگی نشان می‌دهد:</p>
          <table>
            <thead><tr><th>پیام</th><th>معنی</th><th>راه‌حل</th></tr></thead>
            <tbody>
              <tr><td>غیرقابل برش / LEN</td><td>طول مضرب گام برش نیست و هندسه قابل اصلاح نبود (مثلاً خط صافِ قفل‌شده).</td><td>مسیر را کمی تغییر شکل دهید یا قفل انتهاها را باز کنید، بعد Snap Lengths.</td></tr>
              <tr><td>فاصله / SPACE</td><td>دو مسیر از حداقل فاصلهٔ مجاز به هم نزدیک‌ترند.</td><td>یکی را جابه‌جا کنید یا Min Path Spacing را کم کنید.</td></tr>
              <tr><td>شعاع خم / BEND</td><td>گوشه‌ای تیزتر از حداقل شعاع خم نئون است — ریسه می‌شکند.</td><td>گوشه را نرم‌تر کنید (ابزار Bezier) یا Minimum Bend Radius را مطابق دیتاشیت ریسه تنظیم کنید.</td></tr>
              <tr><td>باز/ناقص / OPEN</td><td>مسیر کمتر از 2 نقطه دارد یا خیلی کوتاه است.</td><td>تکمیل یا حذفش کنید.</td></tr>
              <tr><td>اتصال / JOIN</td><td>دو انتهای مسیرها تقریباً چسبیده‌اند ولی به هم وصل نیستند.</td><td>یکی را روی دیگری بکشید (اتصال) یا بیشتر فاصله دهید.</td></tr>
              <tr><td>توان / PSU</td><td>توان کل از ظرفیت منبع تغذیهٔ واردشده بیشتر است.</td><td>منبع بزرگ‌تر بگذارید (یا PSU Capacity را اصلاح کنید).</td></tr>
              <tr><td>تکهٔ بلند / LONG</td><td>مسیر از حداکثر طول تکه بلندتر است (به چند تکه تقسیم شده — اتصال‌ها را چک کنید).</td><td>طبیعی است؛ فقط مطمئن شوید نقطه‌های تقسیم برای ساخت مناسبند.</td></tr>
              <tr><td>گرید برش / GRID</td><td>طول تکه روی گام 2.5 ننشسته (در حالت دستی پیش می‌آید).</td><td>دکمهٔ Snap Lengths را بزنید.</td></tr>
            </tbody>
          </table>
          <p>وقتی همه‌چیز درست باشد پیام «All checks passed» سبز می‌بینید — طرح آمادهٔ خروجی و ساخت است.</p>
        </section>

        <section id="hs10">
          <h3>۱۰. پروفایل نئون (ذخیرهٔ مشخصات ریسه)</h3>
          <p>اگر همیشه با یک نوع ریسه کار می‌کنید، مشخصاتش را یک‌بار ذخیره کنید:</p>
          <ol>
            <li>مشخصات را در PROPERTIES پر کنید (نام، عرض، ولتاژ، گام برش، شعاع خم، توان، طول رول).</li>
            <li>دکمهٔ <b>Save Profile</b> را بزنید.</li>
            <li>در پروژه‌های بعدی از فهرست <b>Saved profiles</b> همان را انتخاب کنید — همهٔ تنظیمات یک‌جا اعمال می‌شود.</li>
            <li>با <b>Delete Profile</b> می‌توانید پروفایل حذف کنید.</li>
          </ol>
          <p>مثال: «Neon Flex 8mm» با عرض 8mm، ولتاژ 24V، برش هر 25mm، حداقل خم 30mm، توان 10W/m، رول 5m.</p>
        </section>

        <section id="hs11">
          <h3>۱۱. ذخیره‌سازی، بازیابی و میان‌برها</h3>
          <h4>ذخیره و باز کردن</h4>
          <ul>
            <li><b>SAVE</b> — پروژه در همین مرورگر (localStorage) ذخیره می‌شود. نام پروژه را در نوار بالا تنظیم کنید.</li>
            <li><b>OPEN</b> — فهرست پروژه‌های ذخیره‌شده؛ هر کدام را باز یا حذف کنید.</li>
            <li><b>JSON</b> (خروجی) و <b>IMPORT</b> — انتقال پروژه بین سیستم‌ها یا افراد.</li>
            <li>هشدار: پاک‌کردن داده‌های مرورگر، پروژه‌های ذخیره‌شده را پاک می‌کند؛ برای طرح‌های مهم حتماً JSON خروجی بگیرید.</li>
          </ul>
          <h4>میان‌برهای صفحه‌کلید</h4>
          <table>
            <thead><tr><th>کلید</th><th>کار</th></tr></thead>
            <tbody>
              <tr><td><kbd>V</kbd></td><td>ابزار Select</td></tr>
              <tr><td><kbd>P</kbd></td><td>ابزار Pen</td></tr>
              <tr><td><kbd>L</kbd></td><td>ابزار Line</td></tr>
              <tr><td><kbd>B</kbd></td><td>ابزار Bezier</td></tr>
              <tr><td><kbd>T</kbd></td><td>ابزار Text (متن نئونی)</td></tr>
              <tr><td><kbd>S</kbd></td><td>ابزار Split</td></tr>
              <tr><td><kbd>M</kbd></td><td>ابزار Measure</td></tr>
              <tr><td><kbd>R</kbd> / <kbd>E</kbd></td><td>مستطیل / بیضی</td></tr>
              <tr><td><kbd>Y</kbd> / <kbd>G</kbd> / <kbd>I</kbd></td><td>چندضلعی / ستاره / مارپیچ</td></tr>
              <tr><td><kbd>F</kbd></td><td>Fit Page — تناسب با صفحه</td></tr>
              <tr><td><kbd>+</kbd> / <kbd>−</kbd></td><td>بزرگ‌نمایی / کوچک‌نمایی</td></tr>
              <tr><td><kbd>X</kbd></td><td>حذف انتخاب</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd> / <kbd>C</kbd> / <kbd>V</kbd> / <kbd>A</kbd></td><td>تکرار / کپی / چسباندن / انتخاب همه</td></tr>
              <tr><td><kbd>Enter</kbd> / دوکلیک</td><td>پایان ترسیم جاری</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>لغو ترسیم / بستن پنجره / بازگشت به Select</td></tr>
              <tr><td><kbd>Delete</kbd></td><td>حذف انتخاب</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Undo / Redo</td></tr>
              <tr><td><kbd>Space</kbd>+درگ</td><td>جابه‌جایی نما</td></tr>
              <tr><td><kbd>F1</kbd></td><td>باز کردن همین راهنما</td></tr>
            </tbody>
          </table>
        </section>

        <section id="hs12">
          <h3>۱۲. نکات مهم و عیب‌یابی</h3>
          <h4>چرا طول‌ها بعد از ترسیم کمی عوض می‌شوند؟</h4>
          <p>چون نرم‌افزار طول واقعی مسیر را <b>هندسیاً</b> اصلاح می‌کند تا دقیقاً مضرب گام برش (2.5cm) شود. این کار عمدی است: ریسه نئون فقط در نقاط برش کارخانه‌ای (هر 2.5cm) بریده می‌شود و اگر طول قطعه روی این گام نباشد، یا قطعه کوتاه می‌آید یا نمی‌توان آن را برید. شکل تا حد امکان حفظ می‌شود.</p>
          <h4>چرا ستون «تعداد برش» مهم است؟</h4>
          <p>به‌جای سانتی‌متر، کارخانه و تیم برش با «تعداد واحد 2.5cm» کار می‌کنند (مثلاً 50 یعنی 125 سانت). این ستون دقیقاً همان چیزی است که هنگام سفارش و برش لازم دارید.</p>
          <h4>منبع تغذیه چند وات بگیرم؟</h4>
          <p>از تب MATERIALS &amp; POWER مقدار «پیشنهادی» را ببینید. این عدد با ضریب اطمینان (پیش‌فرض 80٪) حساب شده؛ یعنی 20٪ ظرفیت منبع آزاد می‌ماند تا طولانی‌کاری و گرمای کمتری داشته باشید.</p>
          <h4>تریس عکس تمیز درنیامد؟ (نسخهٔ ۲)</h4>
          <ul>
            <li>اول <b>Auto threshold</b> را روشن بگذارید — Otsu خودش بهترین مرز سیاه/سفید را پیدا می‌کند.</li>
            <li>خط ناقص می‌افتد؟ Quality را به 1200 یا 1600 ببرید و Noise removal را کم کنید.</li>
            <li>لکه و نویز اضافه می‌آید؟ Noise removal را زیاد کنید (۳ تا ۶) و Min stroke را بالا ببرید.</li>
            <li>Detail را کم کنید تا خطوط نرم شوند؛ بیشتر برای لوگوهای ریز.</li>
            <li>برای متن و طرح‌های برجسته، حالت <b>Outline — دو خطی</b> را امتحان کنید: مسیرها دور خطوط می‌افتند و بسیار تمیزتر از قبل تشخیص داده می‌شوند.</li>
            <li>عکس پرکنتراست (سیاه روی سفید) همیشه بهترین نتیجه را می‌دهد.</li>
          </ul>
          <h4>تفاوت AUTO و MANUAL چیست؟</h4>
          <p>AUTO برای طراحی سریع و مطمئن: همه‌چیز خودکار مرتب می‌شود. MANUAL وقتی لازم است دقیقاً کنترل کنید: کدام نقطه قفل باشد، کجا تقسیم شود، جهت مسیر کدام باشد. حتی در MANUAL هم دکمه‌های Snap Lengths و Optimize در دسترس‌اند.</p>
          <div class="tip">برای شروع سریع: منوی EXAMPLES را باز کنید و «Cafe Sign» را انتخاب کنید. یک تابلوی آماده با دایره، نوشتهٔ فارسی نئون و چند شکل می‌بینید — همان را ویرایش کنید یا از روی آن یاد بگیرید.</div>
        </section>

      </div>
    </div>
    <div class="modal-actions">
      <button id="btnCloseHelp" class="btn primary">بستن</button>
    </div>
  </div>
</div>

<div id="printArea"></div>
<input type="file" id="fileInput" accept=".svg,.json,.txt" style="display:none">
<input type="file" id="imgInput" accept="image/*" style="display:none">

<script>
/* =========================================================================
   CORE-PURE-BEGIN  (no DOM — geometry & manufacturing algorithms)
   Extractable for automated tests (see scripts/check-worker.mjs).
   ========================================================================= */

var EPS = 1e-9;

function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function lerp2(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  var r = Math.round(n * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return String(r);
}

/* ---- Gauss-Legendre 16-point quadrature on [a,b] ---- */
var GL_X = [
  -0.0950125098376374, 0.0950125098376374, -0.2816035507792589, 0.2816035507792589,
  -0.4580167776572274, 0.4580167776572274, -0.6178762444026438, 0.6178762444026438,
  -0.7554044083550030, 0.7554044083550030, -0.8656312023878318, 0.8656312023878318,
  -0.9445750230732326, 0.9445750230732326, -0.9894009349916499, 0.9894009349916499
];
var GL_W = [
  0.1894506104550685, 0.1894506104550685, 0.1826034150449236, 0.1826034150449236,
  0.1691565193950025, 0.1691565193950025, 0.1495959888165767, 0.1495959888165767,
  0.1246289712555339, 0.1246289712555339, 0.0951585116824928, 0.0951585116824928,
  0.0622535239386479, 0.0622535239386479, 0.0271524594117541, 0.0271524594117541
];
function gauss16(f, a, b) {
  var c1 = (b - a) / 2, c2 = (b + a) / 2, s = 0;
  for (var i = 0; i < 16; i++) s += GL_W[i] * f(c1 * GL_X[i] + c2);
  return c1 * s;
}

/* ---- segments of a path: {a,b,c1,c2} (c1/c2 null => straight) ---- */
function pathSegs(path) {
  var segs = [], n = path.points.length;
  for (var i = 0; i < n - 1; i++) {
    var c = (path.type === 'bezier' && path.ctrl && path.ctrl[i]) ? path.ctrl[i] : null;
    if (c && c.c1 && c.c2) segs.push({ a: path.points[i], b: path.points[i + 1], c1: c.c1, c2: c.c2 });
    else segs.push({ a: path.points[i], b: path.points[i + 1] });
  }
  return segs;
}
function segPoint(seg, t) {
  if (!seg.c1) return lerp2(seg.a, seg.b, t);
  var mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2 * mt * seg.a.x + 3 * mt2 * t * seg.c1.x + 3 * mt * t2 * seg.c2.x + t2 * t * seg.b.x,
    y: mt2 * mt * seg.a.y + 3 * mt2 * t * seg.c1.y + 3 * mt * t2 * seg.c2.y + t2 * t * seg.b.y
  };
}
function segDeriv(seg, t) {
  if (!seg.c1) return { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y };
  var mt = 1 - t, a = 3 * mt * mt, b = 6 * mt * t, c = 3 * t * t;
  return {
    x: a * (seg.c1.x - seg.a.x) + b * (seg.c2.x - seg.c1.x) + c * (seg.b.x - seg.c2.x),
    y: a * (seg.c1.y - seg.a.y) + b * (seg.c2.y - seg.c1.y) + c * (seg.b.y - seg.c2.y)
  };
}
function segLength(seg) {
  if (!seg.c1) return dist(seg.a, seg.b);
  return gauss16(function (t) {
    var d = segDeriv(seg, t);
    return Math.sqrt(d.x * d.x + d.y * d.y);
  }, 0, 1);
}
function pathLength(path) {
  var segs = pathSegs(path), L = 0;
  for (var i = 0; i < segs.length; i++) L += segLength(segs[i]);
  return L;
}
/* cumulative lengths at every vertex: cum[0]=0 ... cum[n-1]=L */
function pathCum(path) {
  var segs = pathSegs(path), cum = [0];
  for (var i = 0; i < segs.length; i++) cum.push(cum[i] + segLength(segs[i]));
  return cum;
}
/* point at arc-length s from start */
function pathPointAt(path, s) {
  var segs = pathSegs(path), cum = pathCum(path), L = cum[cum.length - 1];
  s = clamp(s, 0, L);
  var i = 0;
  while (i < segs.length - 1 && cum[i + 1] < s - EPS) i++;
  var seg = segs[i], segLen = cum[i + 1] - cum[i];
  if (segLen < EPS) return { x: seg.a.x, y: seg.a.y };
  if (!seg.c1) return lerp2(seg.a, seg.b, (s - cum[i]) / segLen);
  /* sample table + binary search on t */
  var N = 64, ts = [], ls = [0], acc = 0, prev = seg.a, j;
  for (j = 1; j <= N; j++) {
    var t = j / N, p = segPoint(seg, t);
    acc += dist(prev, p); ts.push(t); ls.push(acc); prev = p;
  }
  var target = (s - cum[i]) / segLen * acc, lo = 0, hi = N, mid;
  while (hi - lo > 1) { mid = (lo + hi) >> 1; if (ls[mid] < target) lo = mid; else hi = mid; }
  var f = (target - ls[lo]) / Math.max(ls[hi] - ls[lo], EPS);
  return segPoint(seg, ts[lo] + (ts[hi] - ts[lo]) * f);
}
/* de Casteljau split of a cubic segment at t */
function splitSeg(seg, t) {
  if (!seg.c1) {
    var p = lerp2(seg.a, seg.b, t);
    return { left: { a: seg.a, b: p }, right: { a: p, b: seg.b } };
  }
  var p01 = lerp2(seg.a, seg.c1, t), p12 = lerp2(seg.c1, seg.c2, t), p23 = lerp2(seg.c2, seg.b, t);
  var p012 = lerp2(p01, p12, t), p123 = lerp2(p12, p23, t), p = lerp2(p012, p123, t);
  return {
    left: { a: seg.a, b: p, c1: p01, c2: p012 },
    right: { a: p, b: seg.b, c1: p123, c2: p23 }
  };
}
function clonePath(path) {
  return JSON.parse(JSON.stringify(path));
}
/* split path at arc-length s -> [left, right] */
function pathSplitAt(path, s) {
  var segs = pathSegs(path), cum = pathCum(path), L = cum[cum.length - 1];
  s = clamp(s, 0, L);
  if (s <= EPS) return [null, clonePath(path)];
  if (s >= L - EPS) return [clonePath(path), null];
  var i = 0;
  while (i < segs.length - 1 && cum[i + 1] < s - EPS) i++;
  var seg = segs[i], segLen = cum[i + 1] - cum[i], t = (s - cum[i]) / Math.max(segLen, EPS);
  if (!seg.c1) {
    var p = { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t };
    t = dist(seg.a, p) / Math.max(segLen, EPS);
  }
  var parts = splitSeg(seg, clamp(t, 0, 1));
  var Lp = clonePath(path), Rp = clonePath(path);
  Lp.points = []; Lp.ctrl = [];
  Rp.points = []; Rp.ctrl = [];
  for (var k = 0; k < i; k++) {
    Lp.points.push(clonePath({ v: path.points[k] }).v);
    Lp.ctrl.push(path.ctrl && path.ctrl[k] ? JSON.parse(JSON.stringify(path.ctrl[k])) : null);
  }
  Lp.points.push({ x: parts.left.a.x, y: parts.left.a.y });
  Lp.points.push({ x: parts.left.b.x, y: parts.left.b.y });
  Lp.ctrl.push(parts.left.c1 ? { c1: parts.left.c1, c2: parts.left.c2 } : null);
  Rp.points.push({ x: parts.right.a.x, y: parts.right.a.y });
  Rp.points.push({ x: parts.right.b.x, y: parts.right.b.y });
  Rp.ctrl.push(parts.right.c1 ? { c1: parts.right.c1, c2: parts.right.c2 } : null);
  for (var k2 = i + 1; k2 < segs.length; k2++) {
    Rp.points.push(clonePath({ v: path.points[k2 + 1] }).v);
    Rp.ctrl.push(path.ctrl && path.ctrl[k2] ? JSON.parse(JSON.stringify(path.ctrl[k2])) : null);
  }
  return [Lp, Rp];
}
/* slice a path between arc-lengths s0..s1 -> new path */
function pathSlice(path, s0, s1) {
  var parts = pathSplitAt(path, s1);
  var mid = parts[0] ? parts[0] : clonePath(path);
  if (s0 > EPS) {
    var pr = pathSplitAt(mid, s0);
    mid = pr[1] ? pr[1] : mid;
  }
  return mid;
}

/* ---- length snapping: REAL geometry correction (never bare rounding) ---- */
function snapTarget(L, I) {
  var n = Math.max(1, Math.ceil(L / I - 1e-9));
  return n * I;
}
function centroid(pts) {
  var x = 0, y = 0;
  for (var i = 0; i < pts.length; i++) { x += pts[i].x; y += pts[i].y; }
  return { x: x / pts.length, y: y / pts.length };
}
function scaleAbout(path, c, s) {
  for (var i = 0; i < path.points.length; i++) {
    path.points[i].x = c.x + (path.points[i].x - c.x) * s;
    path.points[i].y = c.y + (path.points[i].y - c.y) * s;
  }
  if (path.ctrl) for (var j = 0; j < path.ctrl.length; j++) {
    var cc = path.ctrl[j];
    if (!cc) continue;
    cc.c1.x = c.x + (cc.c1.x - c.x) * s; cc.c1.y = c.y + (cc.c1.y - c.y) * s;
    cc.c2.x = c.x + (cc.c2.x - c.x) * s; cc.c2.y = c.y + (cc.c2.y - c.y) * s;
  }
}
/* perpendicular scale of every point about the chord line (fixed endpoints) */
function perpScale(path, k) {
  var n = path.points.length, a = path.points[0], b = path.points[n - 1];
  var vx = b.x - a.x, vy = b.y - a.y, vv = vx * vx + vy * vy;
  if (vv < EPS) return;
  function apply(p) {
    var t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / vv;
    var px = a.x + vx * t, py = a.y + vy * t;
    p.x = px + (p.x - px) * k;
    p.y = py + (p.y - py) * k;
  }
  for (var i = 1; i < n - 1; i++) apply(path.points[i]);
  if (path.ctrl) for (var j = 0; j < path.ctrl.length; j++) {
    var cc = path.ctrl[j];
    if (!cc) continue;
    apply(cc.c1); apply(cc.c2);
  }
}
/*
  Snap a path so its REAL arc length becomes a multiple of the cutting interval.
  - both ends free  : uniform scale about centroid (shape kept, size tweaked)
  - one end locked  : uniform scale about the locked endpoint
  - both locked     : perpendicular scale about the chord, bisect on factor k
  Returns true if the geometry was corrected (or already exact), false if
  geometrically impossible (reported by CHECK DESIGN).
*/
function snapPath(path, I) {
  var L = pathLength(path);
  var target = snapTarget(L, I);
  if (Math.abs(L - target) < 1e-7) {
    path.snapped = true; path.snapDelta = 0;
    return true;
  }
  if (!path.origPoints) path.origPoints = JSON.parse(JSON.stringify(path.points));
  var freeS = !path.lockedStart, freeE = !path.lockedEnd;
  if (freeS && freeE) {
    scaleAbout(path, centroid(path.points), target / L);
    path.snapped = true; path.snapDelta = target - L;
    return true;
  }
  if (freeS !== freeE) {
    var anchor = freeS ? path.points[path.points.length - 1] : path.points[0];
    scaleAbout(path, { x: anchor.x, y: anchor.y }, target / L);
    path.snapped = true; path.snapDelta = target - L;
    return true;
  }
  /* both locked */
  var a = path.points[0], b = path.points[path.points.length - 1];
  var chord = dist(a, b);
  if (target < chord - 1e-7) return false;                 /* impossible */
  if (L - chord < 1e-9) return false;                      /* straight & fixed */
  /* length(k) with k=0 -> chord, grows with k (bisection on [0,8]) */
  var saved = JSON.parse(JSON.stringify(path.points));
  var savedCtrl = path.ctrl ? JSON.parse(JSON.stringify(path.ctrl)) : null;
  var lo = 0, hi = 8, mid = 0, ok = false;
  for (var it = 0; it < 60; it++) {
    mid = (lo + hi) / 2;
    path.points = JSON.parse(JSON.stringify(saved));
    if (savedCtrl) path.ctrl = JSON.parse(JSON.stringify(savedCtrl));
    perpScale(path, mid);
    var Lm = pathLength(path);
    if (Math.abs(Lm - target) < 1e-7) { ok = true; break; }
    if (Lm < target) lo = mid; else hi = mid;
  }
  if (!ok) {
    path.points = saved;
    if (savedCtrl) path.ctrl = savedCtrl;
    /* verify residual */
    if (Math.abs(pathLength(path) - target) > 1e-4) return false;
    ok = true;
  }
  path.snapped = true; path.snapDelta = target - L;
  return true;
}

/* ---- pieces + nodes + cut list ---- */
function buildPieces(project) {
  var I = project.profile.intervalCm, maxP = project.settings.maxPieceLengthCm;
  var step = Math.floor(maxP / I + 1e-9) * I;
  if (step < I) step = I;
  var pieces = [], pn = 0;
  for (var i = 0; i < project.paths.length; i++) {
    var path = project.paths[i];
    if (!path.points || path.points.length < 2) continue;
    if (path.hidden) continue; /* hidden = reference art: no cutting, no power */
    var L = pathLength(path);
    if (L < I - EPS) {
      pn++;
      pieces.push({
        n: pn, pathId: path.id, pathName: path.name,
        startS: 0, endS: L, lengthCm: L, cuts: 0,
        points: JSON.parse(JSON.stringify(path.points)),
        isSub: false, full: true, pathIndex: i
      });
      continue;
    }
    var pos = 0;
    while (pos < L - EPS) {
      var end = Math.min(pos + step, L);
      if (end < L - EPS) end = Math.round(end / I) * I;
      if (end <= pos + EPS) end = pos + I;
      if (end > L - EPS) end = L;
      var sub = (pos > EPS || end < L - EPS);
      var slice = sub ? pathSlice(path, pos, end) : clonePath(path);
      pn++;
      pieces.push({
        n: pn, pathId: path.id, pathName: path.name,
        startS: pos, endS: end, lengthCm: end - pos,
        cuts: Math.round((end - pos) / I),
        points: JSON.parse(JSON.stringify(slice.points)),
        isSub: sub, full: !sub, pathIndex: i
      });
      pos = end;
    }
  }
  return pieces;
}
/* cluster piece endpoints into nodes; labels A, B, C ... in order of appearance */
function computeNodes(pieces, tol) {
  var nodes = [];
  function letter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(65 + Math.floor(idx / 26) - 1) + String.fromCharCode(65 + (idx % 26));
  }
  function add(pt, piece, which) {
    for (var i = 0; i < nodes.length; i++) {
      if (dist(nodes[i], pt) <= tol + EPS) {
        nodes[i].refs.push({ n: piece.n, which: which });
        if (nodes[i].refs.length > nodes[i].count) nodes[i].count = nodes[i].refs.length;
        return nodes[i];
      }
    }
    var node = {
      x: pt.x, y: pt.y, label: letter(nodes.length),
      refs: [{ n: piece.n, which: which }]
    };
    nodes.push(node);
    return node;
  }
  for (var p = 0; p < pieces.length; p++) {
    var pts = pieces[p].points;
    if (!pts || pts.length < 1) continue;
    pieces[p].startNode = add(pts[0], pieces[p], 'start');
    pieces[p].endNode = add(pts[pts.length - 1], pieces[p], 'end');
    pieces[p].startLabel = pieces[p].startNode.label;
    pieces[p].endLabel = pieces[p].endNode.label;
  }
  return nodes;
}

/* ---- power supply ---- */
var STD_PSU = [30, 40, 60, 75, 100, 120, 150, 200, 240, 320, 350, 400, 500, 600, 750, 1000, 1500];
function computePower(project, totalCm) {
  var m = totalCm / 100;
  var wPerM = project.profile.powerPerMeterW;
  var totalW = m * wPerM;
  var safe = clamp(project.settings.safetyFactor, 40, 100) / 100;
  var need = totalW / safe;
  var psu = STD_PSU[STD_PSU.length - 1];
  for (var i = 0; i < STD_PSU.length; i++) {
    if (STD_PSU[i] + EPS >= need) { psu = STD_PSU[i]; break; }
  }
  if (need > STD_PSU[STD_PSU.length - 1]) psu = Math.ceil(need / 50) * 50;
  var amps = project.profile.voltageV > 0 ? totalW / project.profile.voltageV : 0;
  return {
    meters: m, wPerM: wPerM, totalW: totalW,
    safetyPct: project.settings.safetyFactor, needW: need,
    psuW: psu, amps: amps, voltage: project.profile.voltageV,
    capacityW: project.settings.psuCapacityW || 0
  };
}

/* ---- Cutting Stock / Bin Packing: First-Fit-Decreasing ---- */
function packRolls(pieceLens, rollCm) {
  var items = [];
  for (var i = 0; i < pieceLens.length; i++) items.push({ len: pieceLens[i], idx: i });
  items.sort(function (a, b) { return b.len - a.len; });
  var bins = [];
  for (var k = 0; k < items.length; k++) {
    var it = items[k], placed = false;
    for (var b = 0; b < bins.length; b++) {
      if (bins[b].rem + EPS >= it.len) {
        bins[b].rem -= it.len; bins[b].items.push(it); placed = true; break;
      }
    }
    if (!placed) {
      if (it.len > rollCm + EPS) {
        bins.push({ rem: 0, items: [it], overflow: true });
      } else {
        bins.push({ rem: rollCm - it.len, items: [it] });
      }
    }
  }
  var totalWaste = 0, totalUsed = 0;
  for (var j = 0; j < bins.length; j++) {
    bins[j].waste = bins[j].overflow ? 0 : bins[j].rem;
    totalWaste += bins[j].waste;
    totalUsed += rollCm - bins[j].rem;
  }
  return {
    bins: bins, rollCm: rollCm, count: bins.length,
    totalWaste: totalWaste, totalUsed: totalUsed,
    wastePct: totalUsed + totalWaste > 0 ? totalWaste / (totalUsed + totalWaste) * 100 : 0
  };
}

/* ---- demo project: cut list matches the spec example exactly ---- */
function demoProject() {
  var d = 82.5 / Math.SQRT2;
  function P(id, name, pts) {
    return {
      id: id, name: name, type: 'polyline', points: pts,
      ctrl: null, lockedStart: false, lockedEnd: false,
      snapped: true, snapDelta: 0, origPoints: null, note: ''
    };
  }
  var project = {
    version: 1,
    name: "DEMO — Chain ABCD",
    board: { widthCm: 200, heightCm: 100 },
    settings: {
      intervalCm: 2.5, maxPieceLengthCm: 500, minSpacingCm: 1.5,
      safetyFactor: 80, psuCapacityW: 0, nodeTolCm: 0.5, joinGapCm: 1.0, gridCm: 0.5,
      channelMm: 10, shapeSides: 5, starInner: 45, spiralTurns: 3, dblGapCm: 4
    },
    profile: {
      name: "Neon Flex 8mm", widthMm: 8, voltageV: 24,
      intervalCm: 2.5, minBendRadiusMm: 30, powerPerMeterW: 10, rollLengthCm: 500
    },
    paths: [
      P('p1', 'NEON 01', [{ x: 15, y: 22 }, { x: 140, y: 22 }]),
      P('p2', 'NEON 02', [{ x: 140, y: 22 }, { x: 140 - d, y: 22 + d }]),
      P('p3', 'NEON 03', [{ x: 140 - d, y: 22 + d }, { x: 140 - d + 47.5, y: 22 + d }])
    ],
    texts: [{ id: 't1', x: 15, y: 12, text: 'DEMO CHAIN A-B-C-D', sizeCm: 4 }],
    mode: 'auto'
  };
  /* mark junction locks: p2 shares B with p1.end and C with p3.start */
  project.paths[1].lockedStart = true;
  project.paths[1].lockedEnd = true;
  project.paths[2].lockedStart = true;
  project.paths[0].lockedEnd = true;
  return project;
}

/* ---- simplify (Ramer-Douglas-Peucker) ---- */
function rdpSimplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  var keep = new Array(pts.length);
  keep[0] = true; keep[pts.length - 1] = true;
  var stack = [[0, pts.length - 1]];
  while (stack.length) {
    var seg = stack.pop(), a = seg[0], b = seg[1];
    var maxD = -1, idx = -1;
    var A = pts[a], B = pts[b];
    var dx = B.x - A.x, dy = B.y - A.y, len2 = dx * dx + dy * dy;
    for (var i = a + 1; i < b; i++) {
      var d;
      if (len2 < 1e-12) {
        d = dist(pts[i], A);
      } else {
        var t = ((pts[i].x - A.x) * dx + (pts[i].y - A.y) * dy) / len2;
        t = clamp(t, 0, 1);
        d = dist(pts[i], { x: A.x + dx * t, y: A.y + dy * t });
      }
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  var out = [];
  for (var k = 0; k < pts.length; k++) if (keep[k]) out.push(pts[k]);
  return out;
}

/* ---- polyline offset: double-line cutting channel around a centerline ----
   d > 0 offsets to the left of the direction of travel, d < 0 to the right.
   Collinear sample points are removed first: otherwise dense edge samples
   overshoot past the miter join at sharp corners (spikes on the inner side). */
function offsetPolyline(pts, d, closed) {
  var m = pts.length;
  if (m < 2) return [];
  var P = pts;
  if (closed && dist(P[0], P[m - 1]) > 1e-9) {
    P = pts.slice();
    P.push({ x: pts[0].x, y: pts[0].y });
    m = P.length;
  }
  P = rdpSimplify(P, Math.max(0.02, Math.abs(d) * 0.05));
  m = P.length;
  var nrm = [];
  for (var s = 0; s < m - 1; s++) {
    var dx = P[s + 1].x - P[s].x, dy = P[s + 1].y - P[s].y;
    var l = Math.sqrt(dx * dx + dy * dy) || 1;
    nrm.push({ x: dy / l, y: -dx / l });
  }
  function vertexOffset(i) {
    /* i: vertex index in 0..m-1 (for closed, m-1 duplicates 0 and is handled by caller) */
    var ia = i - 1, ib = i;
    var na = nrm[ia], nb = nrm[ib];
    var bx = na.x + nb.x, by = na.y + nb.y;
    var bl = Math.sqrt(bx * bx + by * by);
    if (bl < 1e-9) {
      /* 180 degree turn -> bevel */
      return [
        { x: P[i].x + na.x * d, y: P[i].y + na.y * d },
        { x: P[i].x + nb.x * d, y: P[i].y + nb.y * d }
      ];
    }
    bx /= bl; by /= bl;
    var denom = bx * nb.x + by * nb.y;
    var miter = d / Math.max(denom, 0.45);
    var lim = Math.abs(d) * 3;
    if (Math.abs(miter) > lim) miter = miter > 0 ? lim : -lim;
    return [{ x: P[i].x + bx * miter, y: P[i].y + by * miter }];
  }
  var out = [];
  if (!closed) {
    out.push({ x: P[0].x + nrm[0].x * d, y: P[0].y + nrm[0].y * d });
    for (var i = 1; i < m - 1; i++) {
      var vo = vertexOffset(i);
      for (var q = 0; q < vo.length; q++) out.push(vo[q]);
    }
    out.push({ x: P[m - 1].x + nrm[m - 2].x * d, y: P[m - 1].y + nrm[m - 2].y * d });
    return out;
  }
  var real = m - 1; /* number of real vertices (last == first) */
  for (var j = 0; j < real; j++) {
    /* vertex j uses normals [j-1] and [j] with wrap for closed shapes */
    var na2 = nrm[(j - 1 + real) % real], nb2 = nrm[j];
    var bx2 = na2.x + nb2.x, by2 = na2.y + nb2.y;
    var bl2 = Math.sqrt(bx2 * bx2 + by2 * by2), pt;
    if (bl2 < 1e-9) {
      out.push({ x: P[j].x + na2.x * d, y: P[j].y + na2.y * d });
      pt = { x: P[j].x + nb2.x * d, y: P[j].y + nb2.y * d };
    } else {
      bx2 /= bl2; by2 /= bl2;
      var den2 = bx2 * nb2.x + by2 * nb2.y;
      var mit2 = d / Math.max(den2, 0.45);
      var lim2 = Math.abs(d) * 3;
      if (Math.abs(mit2) > lim2) mit2 = mit2 > 0 ? lim2 : -lim2;
      pt = { x: P[j].x + bx2 * mit2, y: P[j].y + by2 * mit2 };
    }
    out.push(pt);
  }
  out.push({ x: out[0].x, y: out[0].y });
  return out;
}

/* ---- flatten a path (polyline or bezier) to dense polyline points ---- */
function flattenPath(path, step) {
  step = step || 0.5;
  var segs = pathSegs(path), out = [];
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i], L = segLength(seg);
    var n = Math.max(2, Math.ceil(L / step));
    for (var k = (i === 0 ? 0 : 1); k <= n; k++) out.push(segPoint(seg, k / n));
  }
  return out;
}

/* ---- raster pipeline v2 (image trace / text trace / boolean ops) ----
   Modes:
     'center'  -> binarize + Zhang-Suen skeleton + centerline chains (neon on the stroke axis)
     'outline' -> binarize + marching-squares contour tracing (neon follows BOTH edges of
                  every stroke = the double-line / outline look used on real neon signs) */
function binarize(rgba, w, h, threshold, invert, lum) {
  /* threshold === 'auto' -> Otsu (computed once from the histogram) */
  if (threshold === 'auto' || threshold === null || threshold === undefined) {
    threshold = otsuLum(lum || imgLuminance(rgba, w, h));
  }
  return binarizeLum(lum || imgLuminance(rgba, w, h), threshold, invert);
}
/* binarize a luminance map: ON = ink (darker than threshold) */
function binarizeLum(lum, threshold, invert) {
  var bin = new Uint8Array(lum.length);
  for (var i = 0; i < bin.length; i++) {
    var on = lum[i] < threshold;
    if (invert) on = !on;
    bin[i] = on ? 1 : 0;
  }
  return bin;
}
/* ---- Otsu automatic threshold (between background and ink) ---- */
function otsuThreshold(rgba, w, h) {
  return otsuLum(imgLuminance(rgba, w, h));
}
/* luminance byte map of an RGBA buffer */
function imgLuminance(rgba, w, h) {
  var n = w * h, lum = new Uint8Array(n);
  for (var i = 0, p = 0; i < n; i++, p += 4) {
    var v = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) | 0;
    lum[i] = v < 0 ? 0 : (v > 255 ? 255 : v);
  }
  return lum;
}
/* Otsu on a luminance map */
function otsuLum(lum) {
  var hist = new Array(256);
  for (var i = 0; i < 256; i++) hist[i] = 0;
  var n = lum.length;
  for (var k = 0; k < n; k++) hist[lum[k]]++;
  var sum = 0;
  for (var t2 = 0; t2 < 256; t2++) sum += t2 * hist[t2];
  var sumB = 0, wB = 0, best = 0, thr = 128;
  for (var t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    var wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    var mB = sumB / wB, mF = (sum - sumB) / wF;
    var between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  /* nudge slightly toward the ink side for noisy JPEGs */
  return Math.min(254, Math.max(2, thr + 6));
}
/* morphological 3x3 dilate / erode / close on a binary mask */
function dilate3(bin, w, h) {
  var out = new Uint8Array(bin.length);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var on = 0;
      for (var dy = -1; dy <= 1 && !on; dy++) {
        var yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (bin[yy * w + xx]) { on = 1; break; }
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}
function erode3(bin, w, h) {
  var out = new Uint8Array(bin.length);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var all = 1;
      for (var dy = -1; dy <= 1 && all; dy++) {
        var yy = y + dy;
        if (yy < 0 || yy >= h) { all = 0; break; }
        for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx;
          if (xx < 0 || xx >= w) { all = 0; break; }
          if (!bin[yy * w + xx]) { all = 0; break; }
        }
      }
      out[y * w + x] = all;
    }
  }
  return out;
}
/* closing = dilate then erode: bridges small gaps/cracks in strokes
   (noisy photos make strokes crack; closing reconnects them) */
function closeBin(bin, w, h, iters) {
  var b = bin;
  for (var i = 0; i < (iters || 1); i++) {
    b = erode3(dilate3(b, w, h), w, h);
  }
  return b;
}
/* 3x3 median filter on a luminance map — kills per-pixel photo/JPEG noise
   BEFORE binarization (salt-and-pepper would otherwise become fake strokes). */
function medianLum3(lum, w, h) {
  var out = new Uint8Array(lum.length);
  var win = new Array(9);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var k = 0;
      for (var dy = -1; dy <= 1; dy++) {
        var yy = y + dy;
        if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
        for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx;
          if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
          win[k++] = lum[yy * w + xx];
        }
      }
      /* insertion sort of 9 items, take middle */
      for (var a = 1; a < 9; a++) {
        var v = win[a], b = a - 1;
        while (b >= 0 && win[b] > v) { win[b + 1] = win[b]; b--; }
        win[b + 1] = v;
      }
      out[y * w + x] = win[4];
    }
  }
  return out;
}
/* ---- despeckle: drop connected ON components smaller than minPx pixels ---- */
function removeSmallComponents(bin, w, h, minPx) {
  if (!minPx || minPx < 1) return bin;
  var seen = new Uint8Array(w * h), stack = [], out = Uint8Array.from ? Uint8Array.from(bin) : bin.slice();
  for (var i = 0; i < bin.length; i++) {
    if (!bin[i] || seen[i]) continue;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    var comp = [i], k = 0;
    while (k < stack.length) {
      var id = stack[k++], x = id % w, y = (id / w) | 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var nid = ny * w + nx;
          if (bin[nid] && !seen[nid]) { seen[nid] = 1; stack.push(nid); comp.push(nid); }
        }
      }
    }
    if (comp.length < minPx) {
      for (var c = 0; c < comp.length; c++) out[comp[c]] = 0;
    }
  }
  return out;
}
/* ---- prune short spurs (whiskers) left by skeletonization ---- */
function pruneSpurs(skel, w, h, maxLen) {
  if (!maxLen || maxLen < 1) return skel;
  var img = Uint8Array.from ? Uint8Array.from(skel) : skel.slice();
  function deg(id) {
    var x = id % w, y = (id / w) | 0, d = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (img[ny * w + nx]) d++;
      }
    }
    return d;
  }
  for (var pass = 0; pass < 2; pass++) {
    var ends = [];
    for (var id2 = 0; id2 < img.length; id2++) {
      if (img[id2] && deg(id2) === 1) ends.push(id2);
    }
    for (var e = 0; e < ends.length; e++) {
      var cur = ends[e];
      if (!img[cur] || deg(cur) !== 1) continue;
      var collected = [cur];
      var walk = 0, ok = false;
      while (walk < maxLen) {
        var x = cur % w, y = (cur / w) | 0, next = -1, cnt = 0;
        for (var dy2 = -1; dy2 <= 1; dy2++) {
          for (var dx2 = -1; dx2 <= 1; dx2++) {
            if (!dx2 && !dy2) continue;
            var nx2 = x + dx2, ny2 = y + dy2;
            if (nx2 < 0 || ny2 < 0 || nx2 >= w || ny2 >= h) continue;
            var nid2 = ny2 * w + nx2;
            if (img[nid2]) { cnt++; if (collected.indexOf(nid2) < 0) next = nid2; }
          }
        }
        if (cnt === 0) { ok = true; break; }            /* isolated dot */
        if (cnt > 1 || next < 0) { ok = walk < maxLen; break; } /* reached a junction */
        collected.push(next);
        cur = next;
        walk++;
      }
      if (ok && collected.length <= maxLen + 1 && collected.length > 0) {
        /* never prune if it is the whole component (2 pts line) and long enough */
        var total = 0;
        for (var q = 0; q < img.length; q++) if (img[q]) total++;
        if (total - collected.length >= 2) {
          for (var r = 0; r < collected.length; r++) img[collected[r]] = 0;
        }
      }
    }
  }
  return img;
}
function zhangSuen(bin, w, h) {
  var img = Uint8Array.from ? Uint8Array.from(bin) : Uint8Array.prototype.slice.call(bin);
  var NB = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1]; /* N NE E SE S SW W NW */
  var changed = true, iter = 0;
  while (changed && iter < 300) {
    changed = false;
    for (var step = 0; step < 2; step++) {
      var toDel = [];
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var idx = y * w + x;
          if (!img[idx]) continue;
          var p = [0, 0, 0, 0, 0, 0, 0, 0], B = 0, k;
          for (k = 0; k < 8; k++) {
            p[k] = img[idx + NB[k]] ? 1 : 0;
            B += p[k];
          }
          if (B < 2 || B > 6) continue;
          var A = 0;
          for (k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++;
          if (A !== 1) continue;
          if (step === 0) {
            if (p[0] * p[2] * p[4] !== 0) continue;
            if (p[2] * p[4] * p[6] !== 0) continue;
          } else {
            if (p[0] * p[2] * p[6] !== 0) continue;
            if (p[0] * p[4] * p[6] !== 0) continue;
          }
          toDel.push(idx);
        }
      }
      if (toDel.length) {
        changed = true;
        for (var t = 0; t < toDel.length; t++) img[toDel[t]] = 0;
      }
    }
    iter++;
  }
  return img;
}
function traceSkeleton(skel, w, h, minLenPx) {
  var BIG = w * h + 1;
  function nbrs(id) {
    var x = id % w, y = (id / w) | 0, out = [];
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var nid = ny * w + nx;
        if (skel[nid]) out.push(nid);
      }
    }
    return out;
  }
  function key(a, b) { return a < b ? a * BIG + b : b * BIG + a; }
  function toPt(id) { return { x: id % w, y: (id / w) | 0 }; }
  var visited = new Set(), chains = [];
  function walk(start, first) {
    var chain = [start, first];
    visited.add(key(start, first));
    var prev = start, cur = first;
    while (true) {
      var ns = nbrs(cur), usable = [];
      for (var i = 0; i < ns.length; i++) {
        if (ns[i] === prev) continue;
        if (visited.has(key(cur, ns[i]))) continue;
        usable.push(ns[i]);
      }
      if (usable.length === 1 && ns.length === 2) {
        var nxt = usable[0];
        visited.add(key(cur, nxt));
        chain.push(nxt);
        prev = cur; cur = nxt;
      } else break;
    }
    return chain;
  }
  var nodeIds = [];
  for (var id = 0; id < skel.length; id++) {
    if (!skel[id]) continue;
    if (nbrs(id).length !== 2) nodeIds.push(id);
  }
  var minL = minLenPx || 4;
  for (var n = 0; n < nodeIds.length; n++) {
    var s = nodeIds[n], ss = nbrs(s);
    for (var j = 0; j < ss.length; j++) {
      if (visited.has(key(s, ss[j]))) continue;
      var ch = walk(s, ss[j]);
      if (ch.length >= minL) chains.push(ch.map(toPt));
    }
  }
  /* pure loops (all degree-2) */
  for (var id2 = 0; id2 < skel.length; id2++) {
    if (!skel[id2]) continue;
    var ns2 = nbrs(id2);
    for (var k = 0; k < ns2.length; k++) {
      if (visited.has(key(id2, ns2[k]))) continue;
      var ch2 = walk(id2, ns2[k]);
      if (ch2.length >= minL) chains.push(ch2.map(toPt));
    }
  }
  return chains;
}
/*
  Zhang-Suen erodes stroke ENDS (a 36px bar skeletonizes to ~31px).
  extendChainEnds grows each chain endpoint outward along its direction while
  it stays inside the ORIGINAL blob — the traced neon reaches the true tips.
*/
function extendChainEnds(chains, bin, skel, w, h, maxExtend) {
  maxExtend = maxExtend === undefined ? 10 : maxExtend;
  function idAt(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return -1;
    return y * w + x;
  }
  /* degree of a pixel in the SKELETON — 1 = true stroke tip, 3+ = junction */
  function skelDeg(p) {
    var d = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var id = idAt(p.x + dx, p.y + dy);
      if (id >= 0 && skel[id]) d++;
    }
    return d;
  }
  function extend(chain, fromEnd) {
    if (chain.length < 2) return chain;
    var n = chain.length;
    var tip = fromEnd ? chain[n - 1] : chain[0];
    var prev = fromEnd ? chain[n - 2] : chain[1];
    if (skelDeg(tip) > 1) return chain; /* junction / loop end — never extend */
    var dx = tip.x - prev.x, dy = tip.y - prev.y;
    var dl = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dl; dy /= dl;
    var added = [];
    var cx = tip.x, cy = tip.y;
    for (var s = 0; s < maxExtend; s++) {
      var nx = Math.round(cx + dx * (s + 1)), ny = Math.round(cy + dy * (s + 1));
      var id = idAt(nx, ny);
      if (id < 0 || !bin[id]) break;
      var pt = { x: nx, y: ny };
      var clash = false;
      for (var c = 0; c < chain.length; c++) {
        if (chain[c].x === nx && chain[c].y === ny) { clash = true; break; }
      }
      for (var a = 0; a < added.length; a++) {
        if (added[a].x === nx && added[a].y === ny) { clash = true; break; }
      }
      if (clash) break;
      added.push(pt);
    }
    if (!added.length) return chain;
    return fromEnd ? chain.concat(added.reverse()) : added.reverse().concat(chain);
  }
  var out = [];
  for (var i = 0; i < chains.length; i++) {
    var ch = extend(chains[i], false);
    ch = extend(ch, true);
    out.push(ch);
  }
  return out;
}

/* ---- catmull-rom control points for a smooth cubic chain through pts ---- */
function catmullCtrl(pts) {
  var n = pts.length, ctrl = [];
  for (var i = 0; i < n - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    ctrl.push({
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    });
  }
  return ctrl;
}
/* catmull-rom for a CLOSED loop (pts[0] == pts[last]); wraps tangents around */
function catmullCtrlClosed(pts) {
  var m = pts.length - 1; /* real vertices; pts[m] duplicates pts[0] */
  var ctrl = [];
  for (var i = 0; i < m; i++) {
    var p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[i + 1], p3 = pts[(i + 2) % m];
    ctrl.push({
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    });
  }
  return ctrl;
}

/* ---- marching-squares contour tracing (OUTLINE / double-line mode) ----
   Extracts every boundary loop of the ON region (outer borders AND inner holes),
   with sub-pixel edge midpoints. ON region is kept on the LEFT of each loop.
   Returns [{pts:[{x,y},...], closed:true}] in pixel coordinates. */
function traceContours(bin, w, h) {
  function on(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return bin[y * w + x] ? 1 : 0;
  }
  /* cell edge mid-points: T=(x+.5,y)  R=(x+1,y+.5)  B=(x+.5,y+1)  L=(x,y+.5) */
  function ex(x, y, e) {
    if (e === 0) return x + 0.5;
    if (e === 1) return x + 1;
    if (e === 2) return x + 0.5;
    return x;
  }
  function ey(x, y, e) {
    if (e === 0) return y;
    if (e === 1) return y + 0.5;
    if (e === 2) return y + 1;
    return y + 0.5;
  }
  /* oriented segment tables: directed edge pairs [from,to] with ON on the left.
     saddles (5: TL+BR, 10: TR+BL) are joined because ON pixels are 8-connected */
  var TAB = {
    1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]],
    5: [[1, 0], [3, 2]],
    6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[2, 0]],
    10: [[0, 3], [2, 1]],
    11: [[2, 1]], 12: [[1, 3]], 13: [[1, 0]], 14: [[0, 3]]
  };
  var outMap = {}; /* "x,y" (rounded to quarter px) -> {x,y} exit point */
  function addSeg(x, y, from, to) {
    var fx = ex(x, y, from), fy = ey(x, y, from);
    var tx = ex(x, y, to), ty = ey(x, y, to);
    outMap[(Math.round(fx * 4)) + ',' + (Math.round(fy * 4))] = { x: tx, y: ty };
  }
  for (var yy = -1; yy < h; yy++) {
    for (var xx = -1; xx < w; xx++) {
      var v00 = on(xx, yy), v10 = on(xx + 1, yy), v11 = on(xx + 1, yy + 1), v01 = on(xx, yy + 1);
      var cs = v00 | (v10 << 1) | (v11 << 2) | (v01 << 3);
      if (!cs || cs === 15) continue;
      var segs = TAB[cs];
      if (!segs) continue;
      for (var s = 0; s < segs.length; s++) addSeg(xx, yy, segs[s][0], segs[s][1]);
    }
  }
  /* stitch directed segments into closed loops */
  var loops = [], visited = {}, guardMax = w * h * 4 + 64;
  for (var key in outMap) {
    if (visited[key]) continue;
    var loop = [], curKey = key, guard = 0;
    while (curKey !== undefined && !visited[curKey] && guard < guardMax) {
      visited[curKey] = 1;
      var parts = curKey.split(',');
      loop.push({ x: parseInt(parts[0], 10) / 4, y: parseInt(parts[1], 10) / 4 });
      var seg = outMap[curKey];
      curKey = (Math.round(seg.x * 4)) + ',' + (Math.round(seg.y * 4));
      guard++;
    }
    if (loop.length >= 4) loops.push({ pts: loop, closed: true });
  }
  return loops;
}
/* ---- contour loops -> simplified / smoothed closed path geometry ---- */
function loopsToGeoms(loops, opts) {
  opts = opts || {};
  var eps = opts.eps === undefined ? 1.2 : opts.eps;
  var minLen = opts.minLenPx === undefined ? 6 : opts.minLenPx;
  var out = [];
  for (var l = 0; l < loops.length; l++) {
    var pts = loops[l].pts;
    if (!pts || pts.length < 4) continue;
    /* rotate so the loop starts at the point farthest from the centroid */
    var cx = 0, cy = 0, i;
    for (i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
    cx /= pts.length; cy /= pts.length;
    var far = 0, fd = -1;
    for (i = 0; i < pts.length; i++) {
      var dd = (pts[i].x - cx) * (pts[i].x - cx) + (pts[i].y - cy) * (pts[i].y - cy);
      if (dd > fd) { fd = dd; far = i; }
    }
    var rot = pts.slice(far).concat(pts.slice(0, far));
    if (dist(rot[0], rot[rot.length - 1]) > 1e-9) rot.push({ x: rot[0].x, y: rot[0].y });
    var simp = rdpSimplify(rot, eps);
    if (simp.length < 4) continue;
    /* perimeter filter (noise) */
    var per = 0;
    for (i = 1; i < simp.length; i++) per += dist(simp[i - 1], simp[i]);
    if (per < minLen) continue;
    if (opts.smooth !== false) {
      out.push({ type: 'bezier', closed: true, points: simp, ctrl: catmullCtrlClosed(simp) });
    } else {
      out.push({ type: 'polyline', closed: true, points: simp, ctrl: null });
    }
  }
  return out;
}

/* ---- traced chains -> path geometry ({type, points, ctrl}) ---- */
function chainsToPaths(chains, opts) {
  opts = opts || {};
  var eps = opts.eps === undefined ? 1.2 : opts.eps;
  var out = [];
  for (var c = 0; c < chains.length; c++) {
    var pts = rdpSimplify(chains[c], eps);
    if (pts.length < 2) continue;
    if (opts.smooth !== false && pts.length >= 3) {
      if (pts.length > 64) {
        var step = Math.ceil(pts.length / 64), sub = [], s;
        for (s = 0; s < pts.length; s += step) sub.push({ x: pts[s].x, y: pts[s].y });
        if (sub[sub.length - 1] !== pts[pts.length - 1]) sub.push(pts[pts.length - 1]);
        pts = sub;
      }
      out.push({ type: 'bezier', points: pts, ctrl: catmullCtrl(pts) });
    } else {
      out.push({ type: 'polyline', points: pts, ctrl: null });
    }
  }
  return out;
}

/* =========================================================================
   BOOLEAN OPERATIONS (CorelDRAW-style Weld / Trim / Intersect)
   Pure raster-precision implementation:
   paths -> scanline even-odd fill masks -> combine -> contour trace -> paths
   ========================================================================= */
/* even-odd scanline fill of polygons (array of point arrays) -> mask */
function fillPolyMask(polys, w, h) {
  var mask = new Uint8Array(w * h);
  for (var y = 0; y < h; y++) {
    var yc = y + 0.5, xs = [];
    for (var p = 0; p < polys.length; p++) {
      var poly = polys[p];
      if (!poly || poly.length < 3) continue;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var a = poly[j], b = poly[i];
        if ((a.y <= yc && b.y > yc) || (b.y <= yc && a.y > yc)) {
          var t = (yc - a.y) / (b.y - a.y);
          xs.push(a.x + t * (b.x - a.x));
        }
      }
    }
    xs.sort(function (m, n) { return m - n; });
    for (var k = 0; k + 1 < xs.length; k += 2) {
      var x0 = Math.max(0, Math.ceil(xs[k] - 0.5));
      var x1 = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (var x = x0; x <= x1; x++) mask[y * w + x] = 1;
    }
  }
  return mask;
}
/* combine two masks: 'or' | 'and' | 'sub' (a minus b) */
function maskCombine(a, b, op) {
  var out = new Uint8Array(a.length);
  if (op === 'or') {
    for (var i = 0; i < a.length; i++) out[i] = a[i] | b[i];
  } else if (op === 'and') {
    for (var j = 0; j < a.length; j++) out[j] = a[j] & b[j];
  } else {
    for (var k = 0; k < a.length; k++) out[k] = a[k] & (b[k] ? 0 : 1);
  }
  return out;
}
/*
  booleanGeoms(objects, op, pxPerCm)
  objects : array of path-likes (each flattened to polygons) — first is the TARGET
  op      : 'weld' | 'trim' | 'intersect'
  returns new geometry paths in the ORIGINAL coordinate space (cm).
*/
function booleanGeoms(objects, op, pxPerCm) {
  if (!objects || objects.length < 2) return [];
  pxPerCm = pxPerCm || 6;
  /* bounding box of everything */
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, i, j, p;
  for (i = 0; i < objects.length; i++) {
    var pts = objects[i];
    for (j = 0; j < pts.length; j++) {
      p = pts[j];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX > maxX) return [];
  var pad = 2;
  var w = Math.max(4, Math.min(4000, Math.ceil((maxX - minX) * pxPerCm) + pad * 2));
  var h = Math.max(4, Math.min(4000, Math.ceil((maxY - minY) * pxPerCm) + pad * 2));
  function toPx(poly) {
    var out = [];
    for (var k = 0; k < poly.length; k++) {
      out.push({ x: (poly[k].x - minX) * pxPerCm + pad, y: (poly[k].y - minY) * pxPerCm + pad });
    }
    return out;
  }
  var masks = [];
  for (i = 0; i < objects.length; i++) masks.push(fillPolyMask([toPx(objects[i])], w, h));
  var res;
  if (op === 'weld') {
    res = masks[0];
    for (i = 1; i < masks.length; i++) res = maskCombine(res, masks[i], 'or');
  } else if (op === 'intersect') {
    res = masks[0];
    for (i = 1; i < masks.length; i++) res = maskCombine(res, masks[i], 'and');
  } else { /* trim: target minus the rest */
    var rest = masks[1];
    for (i = 2; i < masks.length; i++) rest = maskCombine(rest, masks[i], 'or');
    res = maskCombine(masks[0], rest, 'sub');
  }
  /* despeckle 1-2 px, then trace outlines */
  var clean = removeSmallComponents(res, w, h, 6);
  var loops = traceContours(clean, w, h);
  var geoms = loopsToGeoms(loops, {
    eps: Math.max(0.8, pxPerCm * 0.12),
    smooth: true,
    minLenPx: pxPerCm * 0.8
  });
  /* px -> cm */
  for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) {
      geoms[i].points[j].x = (geoms[i].points[j].x - pad) / pxPerCm + minX;
      geoms[i].points[j].y = (geoms[i].points[j].y - pad) / pxPerCm + minY;
    }
    if (geoms[i].ctrl) for (var c = 0; c < geoms[i].ctrl.length; c++) {
      var cc = geoms[i].ctrl[c];
      if (!cc) continue;
      cc.c1.x = (cc.c1.x - pad) / pxPerCm + minX; cc.c1.y = (cc.c1.y - pad) / pxPerCm + minY;
      cc.c2.x = (cc.c2.x - pad) / pxPerCm + minX; cc.c2.y = (cc.c2.y - pad) / pxPerCm + minY;
    }
  }
  return geoms;
}

/* ---- fit traced geometry into the board (keeps aspect) ---- */
function fitPathsToBoard(geoms, W, H, marginFrac) {
  var mg = marginFrac === undefined ? 0.06 : marginFrac;
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, i, j, p;
  function acc(pt) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) acc(geoms[i].points[j]);
    if (geoms[i].ctrl) for (j = 0; j < geoms[i].ctrl.length; j++) {
      if (geoms[i].ctrl[j]) { acc(geoms[i].ctrl[j].c1); acc(geoms[i].ctrl[j].c2); }
    }
  }
  if (minX > maxX) return 1;
  var bw = Math.max(maxX - minX, 1e-6), bh = Math.max(maxY - minY, 1e-6);
  var sc = Math.min(W * (1 - 2 * mg) / bw, H * (1 - 2 * mg) / bh);
  var offX = (W - bw * sc) / 2 - minX * sc, offY = (H - bh * sc) / 2 - minY * sc;
  for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) {
      p = geoms[i].points[j];
      p.x = p.x * sc + offX; p.y = p.y * sc + offY;
    }
    if (geoms[i].ctrl) for (j = 0; j < geoms[i].ctrl.length; j++) {
      var cc = geoms[i].ctrl[j];
      if (!cc) continue;
      cc.c1.x = cc.c1.x * sc + offX; cc.c1.y = cc.c1.y * sc + offY;
      cc.c2.x = cc.c2.x * sc + offX; cc.c2.y = cc.c2.y * sc + offY;
    }
  }
  return sc;
}

/* export the pure core for tests / console */
var NEONCORE = {
  dist: dist, fmt: fmt, pathLength: pathLength, pathCum: pathCum,
  pathPointAt: pathPointAt, pathSplitAt: pathSplitAt, pathSlice: pathSlice,
  snapTarget: snapTarget, snapPath: snapPath,
  buildPieces: buildPieces, computeNodes: computeNodes,
  computePower: computePower, packRolls: packRolls,
  demoProject: demoProject, segLength: segLength, splitSeg: splitSeg,
  rdpSimplify: rdpSimplify, offsetPolyline: offsetPolyline, flattenPath: flattenPath,
  binarize: binarize, zhangSuen: zhangSuen, traceSkeleton: traceSkeleton,
  catmullCtrl: catmullCtrl, chainsToPaths: chainsToPaths, fitPathsToBoard: fitPathsToBoard,
  otsuThreshold: otsuThreshold, removeSmallComponents: removeSmallComponents,
  imgLuminance: imgLuminance, otsuLum: otsuLum, medianLum3: medianLum3, binarizeLum: binarizeLum,
  dilate3: dilate3, erode3: erode3, closeBin: closeBin,
  pruneSpurs: pruneSpurs, traceContours: traceContours, loopsToGeoms: loopsToGeoms,
  extendChainEnds: extendChainEnds,
  catmullCtrlClosed: catmullCtrlClosed, fillPolyMask: fillPolyMask,
  maskCombine: maskCombine, booleanGeoms: booleanGeoms
};

/* =========================================================================
   CORE-PURE-END
   ========================================================================= */

/* =========================================================================
   UI STATE & PIPELINE
   ========================================================================= */
function $(id) { return document.getElementById(id); }

var S = {
  project: demoProject(),
  tool: 'select',
  sel: [],
  nodes: [], pieces: [], power: null, pack: null, issues: [],
  view: { x: -8, y: -6, zoom: 7.5 },
  gridOn: true,
  showChannel: false,
  spaceDown: false,
  drag: null, hoverW: null, draft: null, measure: null,
  shapeDraft: null,   /* rect/ellipse/polygon/star/spiral in-progress */
  marquee: null,      /* rubber-band selection */
  clipboard: [],
  textAt: null,       /* where the TEXT tool was clicked (world cm) */
  undo: [], redo: [],
  dpr: window.devicePixelRatio || 1
};

var PALETTE = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80', '#e879f9', '#f97316'];

function pushUndo() {
  try {
    S.undo.push(JSON.stringify(S.project));
    if (S.undo.length > 60) S.undo.shift();
    S.redo.length = 0;
  } catch (e) { }
}
function doUndo() {
  if (!S.undo.length) return;
  S.redo.push(JSON.stringify(S.project));
  S.project = JSON.parse(S.undo.pop());
  S.sel = []; syncPropsFromProject(); recompute();
}
function doRedo() {
  if (!S.redo.length) return;
  S.undo.push(JSON.stringify(S.project));
  S.project = JSON.parse(S.redo.pop());
  S.sel = []; syncPropsFromProject(); recompute();
}

function newId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

/* ---- main recompute: numbering, pieces, nodes, power, packing, issues ---- */
function recompute() {
  var pr = S.project;
  pr.profile.intervalCm = pr.profile.intervalCm || 2.5;
  var I = pr.profile.intervalCm;

  /* auto numbering of paths */
  for (var i = 0; i < pr.paths.length; i++) {
    if (pr.mode === 'auto' || !pr.paths[i].name) {
      pr.paths[i].name = 'NEON ' + (i + 1 < 10 ? '0' : '') + (i + 1);
    }
    /* auto lock endpoints that touch other paths (junctions) */
    if (pr.mode === 'auto') {
      var pth = pr.paths[i];
      pth.lockedStart = touchesOther(pth, 0, pr);
      pth.lockedEnd = touchesOther(pth, 1, pr);
    }
  }
  /* auto snap lengths */
  if (pr.mode === 'auto') {
    for (var s = 0; s < pr.paths.length; s++) {
      try { snapPath(pr.paths[s], I); } catch (e) { }
    }
  }
  S.pieces = buildPieces(pr);
  S.nodes = computeNodes(S.pieces, pr.settings.nodeTolCm);
  var total = 0;
  for (var t = 0; t < S.pieces.length; t++) total += S.pieces[t].lengthCm;
  S.power = computePower(pr, total);
  S.totalCm = total;
  var lens = [];
  for (var l = 0; l < S.pieces.length; l++) lens.push(S.pieces[l].lengthCm);
  S.pack = packRolls(lens, pr.profile.rollLengthCm);
  S.issues = runChecks();
  renderCutList(); renderMaterials(); renderRolls(); renderSel(); renderStatus(); renderObjects();
  draw();
}
function touchesOther(path, which, pr) {
  var pt = which === 0 ? path.points[0] : path.points[path.points.length - 1];
  var tol = pr.settings.nodeTolCm;
  for (var i = 0; i < pr.paths.length; i++) {
    var o = pr.paths[i];
    if (o.id === path.id) continue;
    if (dist(pt, o.points[0]) <= tol + EPS) return true;
    if (dist(pt, o.points[o.points.length - 1]) <= tol + EPS) return true;
  }
  return false;
}

/* =========================================================================
   CANVAS RENDERING
   ========================================================================= */
function toWorld(ev) {
  var r = $('cv').getBoundingClientRect();
  return {
    x: S.view.x + (ev.clientX - r.left) / S.view.zoom,
    y: S.view.y + (ev.clientY - r.top) / S.view.zoom
  };
}
function snapGridPt(p) {
  if (!S.gridOn) return { x: p.x, y: p.y };
  var g = S.project.settings.gridCm || 0.5;
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}

function draw() {
  var cv = $('cv');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var w = cv.clientWidth, h = cv.clientHeight;
  var dpr = S.dpr;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#080c11';
  ctx.fillRect(0, 0, w, h);
  var z = S.view.zoom;
  ctx.save();
  ctx.translate(-S.view.x * z, -S.view.y * z);
  ctx.scale(z, z);

  /* grid */
  var pr = S.project, B = pr.board;
  var x0 = S.view.x, y0 = S.view.y, x1 = x0 + w / z, y1 = y0 + h / z;
  var g = 1;
  if (z < 3.5) g = 5;
  if (z < 1.2) g = 10;
  ctx.lineWidth = 1 / z;
  for (var gx = Math.floor(x0 / g) * g; gx <= x1; gx += g) {
    var major = Math.abs(gx / (g * 10) - Math.round(gx / (g * 10))) < 1e-6;
    ctx.strokeStyle = major ? '#152232' : '#0e1724';
    ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
  }
  for (var gy = Math.floor(y0 / g) * g; gy <= y1; gy += g) {
    var majorY = Math.abs(gy / (g * 10) - Math.round(gy / (g * 10))) < 1e-6;
    ctx.strokeStyle = majorY ? '#152232' : '#0e1724';
    ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
  }
  /* board */
  ctx.strokeStyle = '#3b5268'; ctx.lineWidth = 2 / z;
  ctx.strokeRect(0, 0, B.widthCm, B.heightCm);
  ctx.fillStyle = '#0c121855'; ctx.fillRect(0, 0, B.widthCm, B.heightCm);
  /* board size badge */
  ctx.fillStyle = '#5b7591'; ctx.font = 'bold ' + (2.2) + 'px sans-serif';
  ctx.fillText(fmt(B.widthCm) + ' x ' + fmt(B.heightCm) + ' cm', 1.5, -1.8);

  var neonCm = (pr.profile.widthMm || 8) / 10;

  /* texts */
  for (var ti = 0; ti < pr.texts.length; ti++) {
    var tx = pr.texts[ti];
    ctx.fillStyle = '#8fa3b8';
    ctx.font = 'bold ' + (tx.sizeCm || 3) + 'px sans-serif';
    ctx.fillText(tx.text, tx.x, tx.y);
  }

  /* paths — neon look */
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var color = path.color || PALETTE[i % PALETTE.length];
    var dim = path.hidden ? 0.25 : 1;
    tracePath(ctx, path);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.globalAlpha = 0.10 * dim; ctx.lineWidth = neonCm * 3.2; ctx.stroke();
    ctx.globalAlpha = 0.22 * dim; ctx.lineWidth = neonCm * 1.9; ctx.stroke();
    ctx.globalAlpha = dim; ctx.lineWidth = neonCm * 0.9; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.75 * dim; ctx.lineWidth = neonCm * 0.28; ctx.stroke();
    ctx.globalAlpha = 1;
    if (path.locked) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.14; ctx.setLineDash([0.4, 0.4]);
      ctx.stroke(); ctx.setLineDash([]);
    }

    /* name label at middle */
    var L = pathLength(path);
    var mid = pathPointAt(path, L / 2);
    var mid2 = pathPointAt(path, Math.min(L / 2 + 0.5, L));
    var nx = -(mid2.y - mid.y), ny = (mid2.x - mid.x);
    var nl = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= nl; ny /= nl;
    ctx.font = 'bold 2.1px sans-serif';
    var lw = ctx.measureText(path.name).width;
    ctx.fillStyle = '#0b0f14cc';
    ctx.fillRect(mid.x + nx * 1.6 - lw / 2 - 0.5, mid.y + ny * 1.6 - 1.7, lw + 1, 2.6);
    ctx.fillStyle = color;
    ctx.fillText(path.name, mid.x + nx * 1.6 - lw / 2, mid.y + ny * 1.6);
  }

  /* pieces: START / END marks + nodes */
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    var a = pts[0], b = pts[pts.length - 1];
    drawMark(ctx, a, 'START ' + pad2(pc.n), '#34d399');
    drawMark(ctx, b, 'END ' + pad2(pc.n), '#f87171');
  }
  ctx.font = 'bold 1.9px sans-serif';
  for (var ni = 0; ni < S.nodes.length; ni++) {
    var nd = S.nodes[ni];
    ctx.save();
    ctx.translate(nd.x, nd.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-0.9, -0.9, 1.8, 1.8);
    ctx.restore();
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(nd.x + 1.1, nd.y - 2.4, 1.6, 2.2);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(nd.label, nd.x + 1.2, nd.y - 0.7);
  }

  /* channel (double-line cutting preview) */
  if (S.showChannel) {
    ctx.strokeStyle = '#ffffff77';
    ctx.lineWidth = 0.16;
    ctx.setLineDash([0.7, 0.5]);
    for (var chI = 0; chI < pr.paths.length; chI++) {
      var chd = channelForPath(pr.paths[chI]);
      if (!chd) continue;
      drawPts(ctx, chd.left);
      drawPts(ctx, chd.right);
    }
    ctx.setLineDash([]);
  }

  /* selection + vertices */
  for (var si = 0; si < S.sel.length; si++) {
    var sp = findPath(S.sel[si]);
    if (!sp) continue;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.25;
    ctx.setLineDash([1, 0.6]);
    tracePath(ctx, sp); ctx.stroke();
    ctx.setLineDash([]);
    for (var vi = 0; vi < sp.points.length; vi++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sp.points[vi].x - 0.7, sp.points[vi].y - 0.7, 1.4, 1.4);
    }
    if (sp.type === 'bezier' && sp.ctrl) {
      ctx.strokeStyle = '#22d3ee88'; ctx.lineWidth = 0.18;
      for (var ci = 0; ci < sp.ctrl.length; ci++) {
        var c = sp.ctrl[ci];
        if (!c) continue;
        ctx.beginPath();
        ctx.moveTo(sp.points[ci].x, sp.points[ci].y);
        ctx.lineTo(c.c1.x, c.c1.y);
        ctx.moveTo(sp.points[ci + 1].x, sp.points[ci + 1].y);
        ctx.lineTo(c.c2.x, c.c2.y);
        ctx.stroke();
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(c.c1.x - 0.5, c.c1.y - 0.5, 1, 1);
        ctx.fillRect(c.c2.x - 0.5, c.c2.y - 0.5, 1, 1);
      }
    }
  }

  /* CorelDRAW-style selection box + transform handles */
  if (S.sel.length) {
    var sbb = selBBox();
    if (sbb) {
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 0.18;
      ctx.setLineDash([0.9, 0.6]);
      ctx.strokeRect(sbb.minX, sbb.minY, sbb.w, sbb.h);
      ctx.setLineDash([]);
      var hs = selHandles(sbb), hs2 = 8 / S.view.zoom, hi;
      for (hi = 0; hi < hs.length; hi++) {
        var h = hs[hi];
        if (h.kind === 'rot') {
          ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 0.16;
          ctx.beginPath();
          ctx.moveTo(h.x, h.y + Math.max(1.2, 10 / S.view.zoom));
          ctx.lineTo(h.x, sbb.minY);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(h.x, h.y, Math.max(0.55, 6 / S.view.zoom), 0, Math.PI * 2);
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.22; ctx.stroke();
          ctx.fillStyle = '#fbbf2499'; ctx.fill();
        } else {
          var hsz = h.kind === 'corner' ? hs2 : hs2 * 0.72;
          ctx.fillStyle = h.kind === 'corner' ? '#22d3ee' : '#0e7490';
          ctx.fillRect(h.x - hsz / 2, h.y - hsz / 2, hsz, hsz);
          ctx.strokeStyle = '#e0f7ff'; ctx.lineWidth = 0.1;
          ctx.strokeRect(h.x - hsz / 2, h.y - hsz / 2, hsz, hsz);
        }
      }
    }
  }

  /* rubber-band marquee */
  if (S.marquee) {
    var mq = S.marquee;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 0.2; ctx.setLineDash([0.8, 0.5]);
    ctx.strokeRect(Math.min(mq.a.x, mq.b.x), Math.min(mq.a.y, mq.b.y),
      Math.abs(mq.b.x - mq.a.x), Math.abs(mq.b.y - mq.a.y));
    ctx.fillStyle = '#22d3ee14';
    ctx.fillRect(Math.min(mq.a.x, mq.b.x), Math.min(mq.a.y, mq.b.y),
      Math.abs(mq.b.x - mq.a.x), Math.abs(mq.b.y - mq.a.y));
    ctx.setLineDash([]);
  }

  /* shape tool draft preview (rect / ellipse / polygon / star / spiral) */
  if (S.shapeDraft && S.shapeDraft.b) {
    var sd = S.shapeDraft;
    var gm = null;
    try { gm = buildShapeGeom(sd.tool, sd.a, sd.b, sd.shift); } catch (e) { gm = null; }
    if (gm) {
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 0.3; ctx.setLineDash([0.7, 0.4]);
      tracePath(ctx, gm);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    var lbl = sd.tool.toUpperCase();
    ctx.font = 'bold 2px sans-serif';
    var lw2 = ctx.measureText(lbl).width;
    ctx.fillStyle = '#0b0f14cc';
    ctx.fillRect(sd.b.x + 1, sd.b.y - 3.2, lw2 + 1, 2.4);
    ctx.fillStyle = '#f472b6';
    ctx.fillText(lbl, sd.b.x + 1.5, sd.b.y - 1.4);
  }

  /* draft */
  if (S.draft && S.draft.points.length) {
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 0.35; ctx.setLineDash([0.8, 0.5]);
    ctx.beginPath();
    ctx.moveTo(S.draft.points[0].x, S.draft.points[0].y);
    for (var di = 1; di < S.draft.points.length; di++) ctx.lineTo(S.draft.points[di].x, S.draft.points[di].y);
    if (S.draft.preview) ctx.lineTo(S.draft.preview.x, S.draft.preview.y);
    ctx.stroke(); ctx.setLineDash([]);
    for (var dpi = 0; dpi < S.draft.points.length; dpi++) {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(S.draft.points[dpi].x - 0.5, S.draft.points[dpi].y - 0.5, 1, 1);
    }
  }

  /* measure */
  if (S.measure && S.measure.a) {
    var mb = S.measure.b || S.measure.hover || S.measure.a;
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.3; ctx.setLineDash([1, 0.5]);
    ctx.beginPath(); ctx.moveTo(S.measure.a.x, S.measure.a.y); ctx.lineTo(mb.x, mb.y); ctx.stroke();
    ctx.setLineDash([]);
    var md = dist(S.measure.a, mb);
    var mm = { x: (S.measure.a.x + mb.x) / 2, y: (S.measure.a.y + mb.y) / 2 };
    ctx.font = 'bold 2px sans-serif';
    var mtxt = fmt(Math.round(md * 100) / 100) + ' cm';
    var mw = ctx.measureText(mtxt).width;
    ctx.fillStyle = '#0b0f14dd';
    ctx.fillRect(mm.x - mw / 2 - 0.5, mm.y - 3, mw + 1, 2.6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(mtxt, mm.x - mw / 2, mm.y - 1);
  }

  /* hover highlight */
  if (S.hoverId && S.tool === 'select') {
    var hp = findPath(S.hoverId);
    if (hp) {
      ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = neonCm * 2.4;
      tracePath(ctx, hp); ctx.stroke();
    }
  }

  ctx.restore();
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function tracePath(ctx, path) {
  var segs = pathSegs(path);
  ctx.beginPath();
  if (!segs.length) return;
  ctx.moveTo(segs[0].a.x, segs[0].a.y);
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    if (s.c1) ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.b.x, s.b.y);
    else ctx.lineTo(s.b.x, s.b.y);
  }
}
function drawMark(ctx, p, label, color) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y, 1.75, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 0.22; ctx.stroke();
  ctx.font = 'bold 1.7px sans-serif';
  var w = ctx.measureText(label).width;
  ctx.fillStyle = '#0b0f14cc';
  ctx.fillRect(p.x - w / 2 - 0.4, p.y + 2, w + 0.8, 2.2);
  ctx.fillStyle = color;
  ctx.fillText(label, p.x - w / 2, p.y + 3.7);
}
function findPath(id) {
  for (var i = 0; i < S.project.paths.length; i++) if (S.project.paths[i].id === id) return S.project.paths[i];
  return null;
}

/* ---- hit testing ---- */
function hitPath(w, tolPx) {
  var tol = (tolPx || 8) / S.view.zoom;
  var best = null, bestD = tol;
  for (var i = 0; i < S.project.paths.length; i++) {
    var path = S.project.paths[i];
    if (path.hidden || path.locked) continue;
    var segs = pathSegs(path);
    for (var j = 0; j < segs.length; j++) {
      var seg = segs[j], N = 16;
      for (var k = 0; k <= N; k++) {
        var p = segPoint(seg, k / N), d = dist(p, w);
        if (d < bestD) { bestD = d; best = { path: path, pathIndex: i }; }
      }
    }
  }
  return best;
}
function hitVertex(w) {
  var tol = 9 / S.view.zoom;
  for (var i = 0; i < S.project.paths.length; i++) {
    var path = S.project.paths[i];
    if (path.hidden || path.locked) continue;
    for (var j = 0; j < path.points.length; j++) {
      if (dist(path.points[j], w) < tol) return { path: path, index: j, kind: 'pt' };
    }
    if (path.type === 'bezier' && path.ctrl) {
      for (var c = 0; c < path.ctrl.length; c++) {
        if (!path.ctrl[c]) continue;
        if (dist(path.ctrl[c].c1, w) < tol) return { path: path, seg: c, which: 'c1', kind: 'ctrl' };
        if (dist(path.ctrl[c].c2, w) < tol) return { path: path, seg: c, which: 'c2', kind: 'ctrl' };
      }
    }
  }
  return null;
}

/* ---- tools & pointer input ---- */
function setTool(t) {
  S.tool = t;
  S.draft = null;
  S.shapeDraft = null;
  S.marquee = null;
  if (t !== 'measure') S.measure = null;
  var els = document.querySelectorAll('.tool[data-tool]');
  for (var i = 0; i < els.length; i++) {
    els[i].classList.toggle('active', els[i].getAttribute('data-tool') === t);
  }
  $('hud').innerHTML = '<b>CANVAS</b> &nbsp;|&nbsp; tool: <b>' + t.toUpperCase() + '</b> &nbsp;|&nbsp; wheel = zoom &nbsp;|&nbsp; space+drag = pan';
  $('cv').style.cursor = (t === 'select') ? 'default' : 'crosshair';
  draw();
}
function finishDraft() {
  if (!S.draft || S.draft.points.length < 2) { S.draft = null; draw(); return; }
  pushUndo();
  var path;
  if (S.draft.type === 'bezier') {
    path = catmullToBezier(S.draft.points);
  } else {
    path = {
      id: newId(), name: '', type: 'polyline',
      points: S.draft.points.slice(), ctrl: null,
      lockedStart: false, lockedEnd: false,
      snapped: true, snapDelta: 0, origPoints: null, note: ''
    };
  }
  S.project.paths.push(path);
  S.draft = null;
  recompute();
}
function catmullToBezier(pts) {
  var n = pts.length, ctrl = [];
  for (var i = 0; i < n - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    ctrl.push({
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    });
  }
  return {
    id: newId(), name: '', type: 'bezier',
    points: pts.slice(), ctrl: ctrl,
    lockedStart: false, lockedEnd: false,
    snapped: true, snapDelta: 0, origPoints: null, note: ''
  };
}
function splitAtPoint(w) {
  var hit = hitPath(w, 12);
  if (!hit) { setStatus('Split: click on a neon path.', 'warn'); return; }
  var path = hit.path, L = pathLength(path), I = S.project.profile.intervalCm;
  /* nearest arc-length to click */
  var bestS = 0, bestD = 1e9;
  for (var s = 0; s <= L; s += I / 10) {
    var p = pathPointAt(path, s), d = dist(p, w);
    if (d < bestD) { bestD = d; bestS = s; }
  }
  /* snap split position to real cutting point */
  var cutS = Math.round(bestS / I) * I;
  cutS = clamp(cutS, I, Math.floor(L / I - EPS) * I);
  if (cutS <= EPS || cutS >= L - EPS) { setStatus('Split: cannot split here (too close to an end).', 'warn'); return; }
  pushUndo();
  var parts = pathSplitAt(path, cutS);
  if (!parts[0] || !parts[1]) return;
  var idx = S.project.paths.indexOf(path);
  var b = parts[1], a = parts[0];
  a.id = newId(); b.id = newId();
  a.lockedEnd = true; b.lockedStart = true;
  a.origPoints = null; b.origPoints = null;
  a.snapped = true; b.snapped = true;
  S.project.paths.splice(idx, 1, a, b);
  recompute();
  setStatus('Split at ' + fmt(cutS) + ' cm (cutting point).', 'ok');
}

function onPointerDown(ev) {
  var cv = $('cv');
  cv.setPointerCapture(ev.pointerId);
  var w = toWorld(ev);
  if (ev.button === 1 || S.spaceDown) {
    S.drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: S.view.x, vy: S.view.y };
    return;
  }
  if (S.tool === 'select') {
    /* 1. transform handles (scale / rotate) */
    var hd = hitSelHandle(w);
    if (hd) {
      pushUndo();
      S.drag = {
        kind: hd.kind === 'rot' ? 'rotate' : 'scale',
        handle: hd, bb: selBBox(), saved: snapshotSel(),
        start: w, moved: false
      };
      draw();
      return;
    }
    /* 2. vertex handles */
    var v = hitVertex(w);
    if (v) {
      pushUndo();
      S.drag = { kind: 'vertex', hit: v };
      if (S.sel.indexOf(v.path.id) < 0) { S.sel = [v.path.id]; renderSel(); }
      return;
    }
    /* 3. path hit -> select + move */
    var hit = hitPath(w);
    if (hit) {
      if (S.sel.indexOf(hit.path.id) < 0) {
        S.sel = (ev.shiftKey) ? S.sel.concat([hit.path.id]) : [hit.path.id];
        renderSel();
      }
      pushUndo();
      S.drag = { kind: 'move', last: w, start: w, moved: false };
    } else {
      /* 4. empty area -> rubber-band marquee selection */
      S.marquee = { a: w, b: w, shift: ev.shiftKey, moved: false };
    }
    draw();
    return;
  }
  if (S.tool === 'pen' || S.tool === 'line' || S.tool === 'bezier') {
    var sp = snapGridPt(w);
    if (!S.draft) S.draft = { type: (S.tool === 'bezier') ? 'bezier' : (S.tool === 'line' ? 'line' : 'pen'), points: [] };
    S.draft.points.push(sp);
    if (S.tool === 'line' && S.draft.points.length >= 2) finishDraft();
    draw();
    return;
  }
  if (S.tool === 'rect' || S.tool === 'ellipse' || S.tool === 'polygon' || S.tool === 'star' || S.tool === 'spiral') {
    S.shapeDraft = { tool: S.tool, a: snapGridPt(w), b: snapGridPt(w), shift: ev.shiftKey };
    draw();
    return;
  }
  if (S.tool === 'text') {
    S.textAt = w;
    openTextDialog();
    return;
  }
  if (S.tool === 'split') { splitAtPoint(w); return; }
  if (S.tool === 'measure') {
    if (!S.measure || S.measure.b) S.measure = { a: snapGridPt(w), b: null };
    else {
      S.measure.b = snapGridPt(w);
      setStatus('Distance: ' + fmt(dist(S.measure.a, S.measure.b)) + ' cm', 'ok');
    }
    draw();
    return;
  }
}
function onPointerMove(ev) {
  var w = toWorld(ev);
  S.hoverW = w;
  $('stCoords').innerHTML = 'x: ' + fmt(Math.round(w.x * 100) / 100) + ' &nbsp; y: ' + fmt(Math.round(w.y * 100) / 100);
  if (S.drag && S.drag.kind === 'pan') {
    S.view.x = S.drag.vx - (ev.clientX - S.drag.sx) / S.view.zoom;
    S.view.y = S.drag.vy - (ev.clientY - S.drag.sy) / S.view.zoom;
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'vertex') {
    var v = S.drag.hit, sp = snapGridPt(w);
    if (v.kind === 'pt') {
      v.path.points[v.index].x = sp.x; v.path.points[v.index].y = sp.y;
      v.path.snapped = false;
    } else {
      v.path.ctrl[v.seg][v.which].x = sp.x; v.path.ctrl[v.seg][v.which].y = sp.y;
    }
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'move') {
    var dx = w.x - S.drag.last.x, dy = w.y - S.drag.last.y;
    if (Math.abs(w.x - S.drag.start.x) + Math.abs(w.y - S.drag.start.y) > 0.2) S.drag.moved = true;
    for (var i = 0; i < S.sel.length; i++) {
      var path = findPath(S.sel[i]);
      if (!path || path.locked) continue;
      for (var j = 0; j < path.points.length; j++) { path.points[j].x += dx; path.points[j].y += dy; }
      if (path.ctrl) for (var c = 0; c < path.ctrl.length; c++) {
        if (!path.ctrl[c]) continue;
        path.ctrl[c].c1.x += dx; path.ctrl[c].c1.y += dy;
        path.ctrl[c].c2.x += dx; path.ctrl[c].c2.y += dy;
      }
    }
    S.drag.last = w;
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'rotate') {
    restoreSaved(S.drag.saved);
    var bbR = S.drag.bb;
    var cx = (bbR.minX + bbR.maxX) / 2, cy = (bbR.minY + bbR.maxY) / 2;
    var a0 = Math.atan2(S.drag.start.y - cy, S.drag.start.x - cx);
    var a1 = Math.atan2(w.y - cy, w.x - cx);
    var deg = (a1 - a0) * 180 / Math.PI;
    if (ev.shiftKey) deg = Math.round(deg / 15) * 15; /* snap to 15 degrees with Shift */
    for (var ri = 0; ri < S.sel.length; ri++) {
      var rp = findPath(S.sel[ri]);
      if (rp && !rp.locked) xformPath(rp, matAbout(matRotate(deg), cx, cy));
    }
    S.drag.moved = true;
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'scale') {
    restoreSaved(S.drag.saved);
    var bbS = S.drag.bb, hd2 = S.drag.handle;
    var anchorX = hd2.ax, anchorY = hd2.ay;
    /* ratio of (pointer - anchor) to (original handle position - anchor), per axis */
    var fx = (w.x - anchorX) / ((Math.abs(hd2.x - anchorX) < 1e-6) ? 1e-6 : (hd2.x - anchorX));
    var fy = (w.y - anchorY) / ((Math.abs(hd2.y - anchorY) < 1e-6) ? 1e-6 : (hd2.y - anchorY));
    var sx = 1, sy = 1;
    if (hd2.kind === 'corner') {
      var f = Math.abs(fx) > Math.abs(fy) ? fx : fy;
      if (ev.shiftKey) f = Math.abs(fx) > Math.abs(fy) ? fy : fx;
      sx = f; sy = f;
    } else if (hd2.kind === 'edgeH') {
      sx = fx;
    } else {
      sy = fy;
    }
    sx = clamp(sx, -50, 50); sy = clamp(sy, -50, 50);
    if (Math.abs(sx) < 0.02) sx = 0.02;
    if (Math.abs(sy) < 0.02) sy = 0.02;
    var mS = matAbout(matScale(sx, sy), anchorX, anchorY);
    for (var si = 0; si < S.sel.length; si++) {
      var spp = findPath(S.sel[si]);
      if (spp && !spp.locked) xformPath(spp, mS);
    }
    S.drag.moved = true;
    draw(); return;
  }
  if (S.marquee) {
    S.marquee.b = w;
    if (Math.abs(w.x - S.marquee.a.x) + Math.abs(w.y - S.marquee.a.y) > 0.3) S.marquee.moved = true;
    draw(); return;
  }
  if (S.shapeDraft) {
    S.shapeDraft.b = snapGridPt(w);
    S.shapeDraft.shift = ev.shiftKey;
    draw(); return;
  }
  if (S.draft && S.draft.points.length) {
    S.draft.preview = snapGridPt(w);
    draw();
    return;
  }
  if (S.measure && S.measure.a && !S.measure.b) { S.measure.b = null; S.measure.hover = snapGridPt(w); draw(); }
  if (S.tool === 'select') {
    var hit = hitPath(w, 7);
    var id = hit ? hit.path.id : null;
    if (id !== S.hoverId) { S.hoverId = id; draw(); }
  }
}
function onPointerUp(ev) {
  if (S.drag && S.drag.kind === 'move' && !S.drag.moved) {
    /* simple click on path — no recompute needed */
  } else if (S.drag && (S.drag.kind === 'vertex' || S.drag.kind === 'move' || S.drag.kind === 'rotate' || S.drag.kind === 'scale')) {
    recompute();
  }
  S.drag = null;
  if (S.marquee) {
    if (S.marquee.moved) {
      var x0 = Math.min(S.marquee.a.x, S.marquee.b.x), x1 = Math.max(S.marquee.a.x, S.marquee.b.x);
      var y0 = Math.min(S.marquee.a.y, S.marquee.b.y), y1 = Math.max(S.marquee.a.y, S.marquee.b.y);
      var picked = (S.marquee.shift) ? S.sel.slice() : [];
      for (var i = 0; i < S.project.paths.length; i++) {
        var p = S.project.paths[i];
        if (p.hidden || p.locked) continue;
        var bb = pathBBoxOf(p);
        if (!bb) continue;
        if (bb.minX >= x0 && bb.maxX <= x1 && bb.minY >= y0 && bb.maxY <= y1) {
          if (picked.indexOf(p.id) < 0) picked.push(p.id);
        }
      }
      S.sel = picked;
      renderSel(); renderObjects();
      setStatus(picked.length + ' path(s) selected.', '');
    } else {
      S.sel = []; renderSel(); renderObjects();
    }
    S.marquee = null;
    draw();
  }
  if (S.shapeDraft) {
    var sd = S.shapeDraft;
    S.shapeDraft = null;
    var gm = null;
    try { gm = buildShapeGeom(sd.tool, sd.a, sd.b, sd.shift); } catch (e) { gm = null; }
    if (gm) {
      pushUndo();
      var wrapped = wrapGeoms([gm]);
      S.project.paths.push(wrapped[0]);
      S.sel = [wrapped[0].id];
      recompute();
      setStatus(sd.tool.toUpperCase() + ' created — drag the white vertices or cyan handles to edit.', 'ok');
    } else {
      draw();
    }
  }
}
function onWheel(ev) {
  ev.preventDefault();
  var r = $('cv').getBoundingClientRect();
  var mx = ev.clientX - r.left, my = ev.clientY - r.top;
  var wx = S.view.x + mx / S.view.zoom, wy = S.view.y + my / S.view.zoom;
  var f = (ev.deltaY < 0) ? 1.12 : 1 / 1.12;
  S.view.zoom = clamp(S.view.zoom * f, 0.25, 80);
  S.view.x = wx - mx / S.view.zoom;
  S.view.y = wy - my / S.view.zoom;
  $('stZoom').innerHTML = 'zoom: ' + Math.round(S.view.zoom / 7.5 * 100) + '%';
  draw();
}

/* =========================================================================
   PANELS: CUT LIST / MATERIALS & POWER / ROLLS & WASTE / STATUS
   ========================================================================= */
function renderCutList() {
  var tb = $('cutBody');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    html += '<tr>' +
      '<td class="num">' + p.n + '</td>' +
      '<td class="num"><b>' + fmt(Math.round(p.lengthCm * 1000) / 1000) + ' cm</b></td>' +
      '<td class="num">' + p.cuts + '</td>' +
      '<td class="lbl"><b>' + (p.startLabel || '-') + '</b></td>' +
      '<td class="lbl"><b>' + (p.endLabel || '-') + '</b></td>' +
      '<td>' + esc(p.pathName || '') + (p.isSub ? ' <small style="color:#8fa3b8">(split)</small>' : '') + '</td>' +
      '</tr>';
  }
  if (S.pieces.length) {
    html += '<tr class="tot"><td>TOTAL</td><td>' + fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</td>' +
      '<td>' + Math.round(S.totalCm / S.project.profile.intervalCm) + '</td><td></td><td></td><td></td></tr>';
  }
  tb.innerHTML = html;
}
function renderMaterials() {
  var g = $('matGrid');
  if (!g) return;
  var pw = S.power, pr = S.project;
  var cap = pw.capacityW || pw.psuW;
  var psuTxt = pw.capacityW
    ? fmt(pw.capacityW) + ' W (user)'
    : fmt(pw.psuW) + ' W (recommended)';
  var wPerM = fmt(pw.wPerM), total = Math.round(pw.totalW * 10) / 10;
  g.innerHTML =
    card('TOTAL NEON', fmt(Math.round(pw.meters * 1000) / 1000) + ' m', 'pink',
      fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm of neon in ' + S.pieces.length + ' piece(s)') +
    card('POWER @ ' + wPerM + ' W/m', total + ' W', 'gold',
      'Total Power = ' + fmt(Math.round(pw.meters * 1000) / 1000) + ' m x ' + wPerM + ' W/m = ' + total + ' W') +
    card('POWER SUPPLY', psuTxt, '',
      'Safety factor ' + fmt(pw.safetyPct) + '% -> need ' + fmt(Math.round(pw.needW * 10) / 10) +
      ' W available. Current at ' + fmt(pw.voltage) + 'V: ' + fmt(Math.round(pw.amps * 100) / 100) + ' A') +
    card('ROLLS & WASTE', S.pack.count + ' roll(s)', 'gold',
      'Roll length ' + fmt(S.pack.rollCm) + ' cm. Waste ' + fmt(Math.round(S.pack.totalWaste * 10) / 10) +
      ' cm (' + fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)') +
    card('CUTTING INTERVAL', fmt(pr.profile.intervalCm) + ' cm', '',
      'Every START/END lies on a real cutting point. Max piece ' + fmt(pr.settings.maxPieceLengthCm) + ' cm.') +
    card('BEND / SPACING', fmt(pr.profile.minBendRadiusMm) + ' mm / ' + fmt(pr.settings.minSpacingCm) + ' cm', '',
      'Neon width ' + fmt(pr.profile.widthMm) + ' mm, ' + fmt(pr.profile.voltageV) + ' V. Profile: ' + esc(pr.profile.name));
}
function card(title, big, cls, p) {
  return '<div class="mat-card"><h4>' + title + '</h4><div class="big ' + (cls || '') + '">' + big + '</div><p>' + p + '</p></div>';
}
function renderRolls() {
  var g = $('rollPanel');
  if (!g) return;
  var html = '', colors = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#fb7185'];
  for (var b = 0; b < S.pack.bins.length; b++) {
    var bin = S.pack.bins[b];
    html += '<div class="roll-row"><div class="roll-tag">ROLL ' + pad2(b + 1) + '</div><div class="roll-bar">';
    for (var i = 0; i < bin.items.length; i++) {
      var pct = bin.items[i].len / S.pack.rollCm * 100;
      html += '<div class="roll-fill" style="width:' + pct + '%;background:' + colors[i % colors.length] +
        '" title="' + fmt(bin.items[i].len) + ' cm"></div>';
    }
    var wastePct = bin.waste / S.pack.rollCm * 100;
    html += '<div class="roll-fill" style="width:' + wastePct + '%;background:#243041"></div>';
    html += '</div><div class="roll-tag" style="width:150px">used ' +
      fmt(Math.round((S.pack.rollCm - bin.waste) * 10) / 10) + ' / ' + fmt(S.pack.rollCm) +
      ' cm &nbsp; waste ' + fmt(Math.round(bin.waste * 10) / 10) + ' cm</div></div>';
    html += '<div class="hint" style="margin:-4px 0 10px 74px">pieces: ';
    var names = [];
    for (var k = 0; k < bin.items.length; k++) names.push(fmt(bin.items[k].len) + ' cm');
    html += bin.items.length ? names.join(' + ') : '(empty)';
    html += '</div>';
  }
  html += '<div class="mat-card" style="margin-top:12px"><h4>CUTTING STOCK SUMMARY (FFD)</h4>' +
    '<p>Roll length: <b>' + fmt(S.pack.rollCm) + ' cm</b> &nbsp;|&nbsp; Rolls needed: <b>' + S.pack.count +
    '</b> &nbsp;|&nbsp; Total waste: <b>' + fmt(Math.round(S.pack.totalWaste * 10) / 10) + ' cm (' +
    fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)</b><br>Algorithm: First-Fit-Decreasing on piece lengths. ' +
    'Reduce waste by reordering or combining pieces per roll in the table above.</p></div>';
  g.innerHTML = html;
}
function renderSel() {
  if (!$('selNone')) return;
  var ids = S.sel;
  if (!ids.length) {
    $('selNone').style.display = 'block';
    $('selInfo').style.display = 'none';
    return;
  }
  var path = findPath(ids[0]);
  if (!path) return;
  $('selNone').style.display = 'none';
  $('selInfo').style.display = 'block';
  var L = pathLength(path);
  var I = S.project.profile.intervalCm;
  $('selName').textContent = (ids.length > 1 ? ids.length + ' paths — ' : '') + path.name;
  $('selLen').textContent = fmt(Math.round(L * 1000) / 1000) + ' cm' + (ids.length > 1 ? ' (first)' : '');
  $('selLen2').textContent = (path.snapped ? fmt(Math.round(snapTarget(L, I) * 1000) / 1000) + ' cm' : 'not snapped');
  var pcs = [];
  for (var i = 0; i < S.pieces.length; i++) if (S.pieces[i].pathId === path.id) pcs.push(S.pieces[i]);
  $('selPieces').textContent = pcs.length + ' / ' + pcs.reduce(function (a, p) { return a + p.cuts; }, 0);
  $('selSE').textContent = (pcs.length ? pcs[0].startLabel + ' / ' + pcs[pcs.length - 1].endLabel : '-');
  $('selNameIn').value = path.name;
  $('selNote').value = path.note || '';
  $('selLockS').classList.toggle('primary', !!path.lockedStart);
  $('selLockE').classList.toggle('primary', !!path.lockedEnd);
  /* transform inputs */
  var bb = selBBox();
  if (bb && $('tfX')) {
    $('tfX').value = Math.round(bb.minX * 100) / 100;
    $('tfY').value = Math.round(bb.minY * 100) / 100;
    $('tfW').value = Math.round(bb.w * 100) / 100;
    $('tfH').value = Math.round(bb.h * 100) / 100;
  }
}
function renderStatus() {
  if (!$('stTotal')) return;
  $('stTotal').innerHTML = 'Total: <b style="color:#22d3ee">' +
    fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</b> = ' +
    fmt(Math.round(S.power.meters * 1000) / 1000) + ' m &nbsp;|&nbsp; ' +
    fmt(Math.round(S.power.totalW * 10) / 10) + ' W';
  var err = 0, warn = 0;
  for (var i = 0; i < S.issues.length; i++) {
    if (S.issues[i].level === 'error') err++;
    else if (S.issues[i].level === 'warn') warn++;
  }
  $('stIssues').innerHTML = 'CHECK: ' + (err ? '<span class="err">' + err + ' error(s)</span>' : '<span class="ok">0 errors</span>') +
    ' ' + (warn ? '<span class="warn">' + warn + ' warning(s)</span>' : '<span class="ok">0 warnings</span>');
}
function setStatus(msg, cls) {
  var el = $('stHint');
  if (!el) return;
  el.textContent = msg;
  el.className = cls || '';
}
function esc(s) {
  return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}

/* =========================================================================
   CHECK DESIGN
   ========================================================================= */
function runChecks() {
  var out = [], pr = S.project, I = pr.profile.intervalCm;
  var minR = (pr.profile.minBendRadiusMm || 0) / 10; /* cm */

  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    /* 4. open / incomplete */
    if (!path.points || path.points.length < 2) {
      out.push({ level: 'error', code: 'OPEN', msg: path.name + ': path is incomplete (needs at least 2 points).', pathId: path.id });
      continue;
    }
    var L = pathLength(path);
    if (L < I - EPS) {
      out.push({ level: 'error', code: 'SHORT', msg: path.name + ': length ' + fmt(L) + ' cm is shorter than one cutting interval (' + fmt(I) + ' cm).', pathId: path.id });
    }
    /* 1. length not cuttable / snap failed */
    var target = snapTarget(L, I);
    if (Math.abs(L - target) > 1e-4) {
      out.push({
        level: 'error', code: 'LEN',
        msg: path.name + ': geometry length ' + fmt(Math.round(L * 1000) / 1000) + ' cm is not a multiple of ' + fmt(I) +
          ' cm and could not be corrected geometrically (target ' + fmt(target) + ' cm).',
        pathId: path.id
      });
    } else if (path.snapped === false) {
      out.push({ level: 'warn', code: 'SNAP', msg: path.name + ': length not yet corrected. Run Snap Lengths.', pathId: path.id });
    }
    /* 7. piece too long */
    if (L > pr.settings.maxPieceLengthCm + EPS) {
      out.push({
        level: 'warn', code: 'LONG',
        msg: path.name + ': total length ' + fmt(L) + ' cm exceeds max piece length ' +
          fmt(pr.settings.maxPieceLengthCm) + ' cm — it is split into multiple pieces (check joints).',
        pathId: path.id
      });
    }
    /* 3a. bend radius at vertices (circumradius of 3 consecutive points) */
    for (var v = 1; v < path.points.length - 1; v++) {
      var a = path.points[v - 1], b = path.points[v], c = path.points[v + 1];
      var ab = dist(a, b), bc = dist(b, c), ca = dist(c, a);
      var area2 = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y));
      if (area2 < 1e-9) continue; /* collinear */
      var R = ab * bc * ca / (2 * area2);
      if (R < minR - 1e-6) {
        out.push({
          level: 'warn', code: 'BEND',
          msg: path.name + ': bend radius at vertex ' + (v + 1) + ' is ' + fmt(Math.round(R * 10) / 10) +
            ' cm — smaller than minimum ' + fmt(Math.round(minR * 10) / 10) + ' cm.',
          pathId: path.id
        });
      }
    }
    /* 3b. curvature of bezier segments */
    if (path.type === 'bezier' && path.ctrl) {
      var segs = pathSegs(path);
      for (var si = 0; si < segs.length; si++) {
        if (!segs[si].c1) continue;
        for (var tt = 0.05; tt < 1; tt += 0.05) {
          var d1 = segDeriv(segs[si], tt), d2 = segDeriv2(segs[si], tt);
          var speed = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
          if (speed < 1e-6) continue;
          var cross = Math.abs(d1.x * d2.y - d1.y * d2.x);
          if (cross < 1e-9) continue;
          var R2 = speed * speed * speed / cross;
          if (R2 < minR - 1e-6) {
            out.push({
              level: 'warn', code: 'BEND',
              msg: path.name + ': curve radius ~' + fmt(Math.round(R2 * 10) / 10) + ' cm at t=' +
                fmt(Math.round(tt * 100) / 100) + ' is below minimum ' + fmt(Math.round(minR * 10) / 10) + ' cm.',
              pathId: path.id
            });
            tt = 1;
          }
        }
      }
    }
    /* 8. almost-joined endpoints */
    for (var j = i + 1; j < pr.paths.length; j++) {
      var o = pr.paths[j];
      if (!o.points || o.points.length < 2) continue;
      var pairs = [
        [path.points[0], o.points[0]], [path.points[0], o.points[o.points.length - 1]],
        [path.points[path.points.length - 1], o.points[0]],
        [path.points[path.points.length - 1], o.points[o.points.length - 1]]
      ];
      for (var pi = 0; pi < pairs.length; pi++) {
        var dd = dist(pairs[pi][0], pairs[pi][1]);
        if (dd > pr.settings.nodeTolCm + EPS && dd < pr.settings.joinGapCm + EPS) {
          out.push({
            level: 'warn', code: 'JOIN',
            msg: 'Endpoints of ' + path.name + ' and ' + o.name + ' are ' + fmt(Math.round(dd * 100) / 100) +
              ' cm apart — they probably need to be connected (or snapped apart).'
          });
        }
      }
    }
    /* 2. spacing between paths (sampled) */
  }
  /* 2. min spacing between distinct paths */
  for (var p1 = 0; p1 < pr.paths.length; p1++) {
    for (var p2 = p1 + 1; p2 < pr.paths.length; p2++) {
      var A = pr.paths[p1], B = pr.paths[p2];
      if (!A.points || A.points.length < 2 || !B.points || B.points.length < 2) continue;
      var minD = 1e9;
      var sA = pathSegs(A), sB = pathSegs(B);
      for (var qa = 0; qa < sA.length; qa++) {
        for (var ia = 0; ia <= 20; ia++) {
          var pa = segPoint(sA[qa], ia / 20);
          for (var qb = 0; qb < sB.length; qb++) {
            for (var ib = 0; ib <= 20; ib++) {
              var pb = segPoint(sB[qb], ib / 20);
              var d2 = dist(pa, pb);
              if (d2 < minD) minD = d2;
            }
          }
        }
      }
      if (minD < pr.settings.minSpacingCm - 1e-6) {
        out.push({
          level: 'error', code: 'SPACE',
          msg: A.name + ' and ' + B.name + ' come as close as ' + fmt(Math.round(minD * 100) / 100) +
            ' cm — below minimum spacing ' + fmt(pr.settings.minSpacingCm) + ' cm.'
        });
      }
    }
  }
  /* 5. pieces without valid start/end labels */
  for (var pc = 0; pc < S.pieces.length; pc++) {
    if (!S.pieces[pc].startLabel || !S.pieces[pc].endLabel) {
      out.push({ level: 'warn', code: 'LBL', msg: 'Piece ' + S.pieces[pc].n + ' has no start/end label.' });
    }
  }
  /* 6. power vs capacity */
  if (S.power.capacityW > 0 && S.power.totalW > S.power.capacityW + EPS) {
    out.push({
      level: 'error', code: 'PSU',
      msg: 'Total power ' + fmt(Math.round(S.power.totalW * 10) / 10) + ' W exceeds PSU capacity ' +
        fmt(S.power.capacityW) + ' W. Recommended supply: ' + fmt(S.power.psuW) + ' W.'
    });
  }
  /* 9. split/END positions must sit on cutting points (verified on pieces) */
  for (var pi2 = 0; pi2 < S.pieces.length; pi2++) {
    var pc2 = S.pieces[pi2];
    var cutsExact = pc2.lengthCm / I;
    if (Math.abs(cutsExact - Math.round(cutsExact)) > 1e-4) {
      out.push({
        level: 'error', code: 'GRID',
        msg: 'Piece ' + pc2.n + ' (' + pc2.pathName + '): length ' + fmt(pc2.lengthCm) +
          ' cm is not on the ' + fmt(I) + ' cm cutting grid — START/END would miss real cut marks.'
      });
    }
  }
  if (!out.length) out.push({ level: 'info', code: 'OK', msg: 'All checks passed. Design is ready for export and fabrication.' });
  return out;
}
function segDeriv2(seg, t) {
  if (!seg.c1) return { x: 0, y: 0 };
  var mt = 1 - t;
  return {
    x: 6 * mt * (seg.c2.x - 2 * seg.c1.x + seg.a.x) + 6 * t * (seg.b.x - 2 * seg.c2.x + seg.c1.x),
    y: 6 * mt * (seg.c2.y - 2 * seg.c1.y + seg.a.y) + 6 * t * (seg.b.y - 2 * seg.c2.y + seg.c1.y)
  };
}
function showCheck() {
  recompute();
  var list = $('checkList');
  var html = '';
  for (var i = 0; i < S.issues.length; i++) {
    var is = S.issues[i];
    html += '<div class="issue"><span class="badge ' + is.level + '">' + is.level.toUpperCase() + '</span>' +
      '<div class="msg">' + esc(is.msg) + '</div></div>';
  }
  list.innerHTML = html;
  $('checkSub').textContent = 'Pre-export validation — ' + S.pieces.length + ' piece(s), ' +
    fmt(Math.round(S.totalCm * 10) / 10) + ' cm total, ' + S.power.totalW.toFixed(1) + ' W.';
  $('modalCheck').classList.remove('hidden');
}

/* =========================================================================
   EXPORTS / PRINT / IMPORT / PERSISTENCE
   ========================================================================= */
function fnum(n) { return (Math.round(n * 10000) / 10000).toString(); }
function pathD(path) {
  var segs = pathSegs(path);
  if (!segs.length) return '';
  var d = 'M ' + fnum(segs[0].a.x) + ' ' + fnum(segs[0].a.y);
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    if (s.c1) d += ' C ' + fnum(s.c1.x) + ' ' + fnum(s.c1.y) + ' ' + fnum(s.c2.x) + ' ' + fnum(s.c2.y) + ' ' + fnum(s.b.x) + ' ' + fnum(s.b.y);
    else d += ' L ' + fnum(s.b.x) + ' ' + fnum(s.b.y);
  }
  return d;
}
function svgBody() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm, a = [];
  a.push('<rect x="0" y="0" width="' + fnum(W) + '" height="' + fnum(H) + '" fill="#ffffff" stroke="#333333" stroke-width="0.25"/>');
  var neonCm = (pr.profile.widthMm || 8) / 10;
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2 || path.hidden) continue;
    var color = path.color || PALETTE[i % PALETTE.length];
    a.push('<path d="' + pathD(path) + '" fill="none" stroke="' + color + '" stroke-width="' + fnum(neonCm * 0.9) +
      '" stroke-linecap="round" stroke-linejoin="round"/>');
    var L = pathLength(path), mid = pathPointAt(path, L / 2);
    a.push('<text x="' + fnum(mid.x) + '" y="' + fnum(mid.y - 1.4) + '" font-size="2.1" font-weight="bold" fill="' + color +
      '" text-anchor="middle" font-family="sans-serif">' + esc(path.name) + '</text>');
  }
  for (var p = 0; p < S.pieces.length; p++) {
    var pc = S.pieces[p], pts = pc.points;
    if (!pts || !pts.length) continue;
    var s0 = pts[0], e0 = pts[pts.length - 1];
    a.push('<circle cx="' + fnum(s0.x) + '" cy="' + fnum(s0.y) + '" r="1.1" fill="#16a34a"/>' +
      '<text x="' + fnum(s0.x - 1) + '" y="' + fnum(s0.y - 1.8) + '" font-size="1.7" font-weight="bold" fill="#166534" font-family="sans-serif">START ' + pad2(pc.n) + '</text>');
    a.push('<circle cx="' + fnum(e0.x) + '" cy="' + fnum(e0.y) + '" r="1.1" fill="#dc2626"/>' +
      '<text x="' + fnum(e0.x - 1) + '" y="' + fnum(e0.y + 3.2) + '" font-size="1.7" font-weight="bold" fill="#991b1b" font-family="sans-serif">END ' + pad2(pc.n) + '</text>');
  }
  for (var n = 0; n < S.nodes.length; n++) {
    var nd = S.nodes[n];
    a.push('<rect x="' + fnum(nd.x - 0.8) + '" y="' + fnum(nd.y - 0.8) + '" width="1.6" height="1.6" fill="#d97706" transform="rotate(45 ' + fnum(nd.x) + ' ' + fnum(nd.y) + ')"/>' +
      '<text x="' + fnum(nd.x + 1.2) + '" y="' + fnum(nd.y - 0.8) + '" font-size="1.8" font-weight="bold" fill="#b45309" font-family="sans-serif">' + nd.label + '</text>');
  }
  for (var t = 0; t < pr.texts.length; t++) {
    var tx = pr.texts[t];
    a.push('<text x="' + fnum(tx.x) + '" y="' + fnum(tx.y) + '" font-size="' + fnum(tx.sizeCm || 3) +
      '" fill="#444" font-family="sans-serif">' + esc(tx.text) + '</text>');
  }
  a.push('<text x="2" y="' + fnum(H - 2) + '" font-size="2" fill="#888" font-family="sans-serif">NEON CAD — ' +
    esc(pr.name) + ' — ' + fnum(W) + ' x ' + fnum(H) + ' cm</text>');
  return a.join('');
}
function exportSVG() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + fnum(W) + 'cm" height="' + fnum(H) + 'cm" viewBox="0 0 ' +
    fnum(W) + ' ' + fnum(H) + '">' + svgBody() + '</svg>';
  download(safeName() + '.svg', svg, 'image/svg+xml');
  setStatus('SVG exported (real scale 1:1).', 'ok');
}
function safeName() {
  return (S.project.name || 'neon-project').split(' ').join('_');
}
function exportDXF() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var o = [];
  function push(s) { o.push(s); }
  function yflip(y) { return H - y; }
  push('0'); push('SECTION'); push('2'); push('HEADER');
  push('9'); push('$INSUNITS'); push('70'); push('4');
  push('9'); push('$MEASUREMENT'); push('70'); push('1');
  push('0'); push('ENDSEC');
  push('0'); push('SECTION'); push('2'); push('ENTITIES');
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2 || path.hidden) continue;
    var segs = pathSegs(path), layer = 'NEON';
    for (var j = 0; j < segs.length; j++) {
      var seg = segs[j], steps = seg.c1 ? 12 : 1, prev = seg.a;
      for (var k = 1; k <= steps; k++) {
        var p = segPoint(seg, k / steps);
        push('0'); push('LINE'); push('8'); push(layer);
        push('10'); push(fnum(prev.x)); push('20'); push(fnum(yflip(prev.y))); push('30'); push('0');
        push('11'); push(fnum(p.x)); push('21'); push(fnum(yflip(p.y))); push('31'); push('0');
        prev = p;
      }
    }
    var L = pathLength(path), mid = pathPointAt(path, L / 2);
    push('0'); push('TEXT'); push('8'); push('LABELS');
    push('10'); push(fnum(mid.x)); push('20'); push(fnum(yflip(mid.y))); push('30'); push('0');
    push('40'); push('2.0'); push('1'); push(path.name);
  }
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    var s0 = pts[0], e0 = pts[pts.length - 1];
    push('0'); push('CIRCLE'); push('8'); push('POINTS');
    push('10'); push(fnum(s0.x)); push('20'); push(fnum(yflip(s0.y))); push('30'); push('0'); push('40'); push('1.0');
    push('0'); push('TEXT'); push('8'); push('POINTS');
    push('10'); push(fnum(s0.x)); push('20'); push(fnum(yflip(s0.y) + 1.5)); push('30'); push('0');
    push('40'); push('1.7'); push('1'); push('START ' + pad2(pc.n));
    push('0'); push('CIRCLE'); push('8'); push('POINTS');
    push('10'); push(fnum(e0.x)); push('20'); push(fnum(yflip(e0.y))); push('30'); push('0'); push('40'); push('1.0');
    push('0'); push('TEXT'); push('8'); push('POINTS');
    push('10'); push(fnum(e0.x)); push('20'); push(fnum(yflip(e0.y) - 2.5)); push('30'); push('0');
    push('40'); push('1.7'); push('1'); push('END ' + pad2(pc.n));
  }
  for (var ni = 0; ni < S.nodes.length; ni++) {
    var nd = S.nodes[ni];
    push('0'); push('TEXT'); push('8'); push('NODES');
    push('10'); push(fnum(nd.x)); push('20'); push(fnum(yflip(nd.y) - 1.5)); push('30'); push('0');
    push('40'); push('1.8'); push('1'); push(nd.label);
  }
  push('0'); push('ENDSEC');
  push('0'); push('EOF');
  download(safeName() + '.dxf', o.join(String.fromCharCode(13, 10)), 'application/dxf');
  setStatus('DXF exported (R12, units = cm, Y-up).', 'ok');
}
function renderStandalone(scale) {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var cv = document.createElement('canvas');
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  var neonCm = (pr.profile.widthMm || 8) / 10;
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2 || path.hidden) continue;
    var color = path.color || PALETTE[i % PALETTE.length];
    tracePath(ctx, path);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = neonCm * 1.6; ctx.globalAlpha = 0.25; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = neonCm * 0.9; ctx.stroke();
  }
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + 2.2 + 'px sans-serif';
  for (var n = 0; n < pr.paths.length; n++) {
    var pth = pr.paths[n], L = pathLength(pth), mid = pathPointAt(pth, L / 2);
    ctx.fillText(pth.name, mid.x - 2, mid.y - 1.2);
  }
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    ctx.fillStyle = '#16a34a'; ctx.fillRect(pts[0].x - 0.8, pts[0].y - 0.8, 1.6, 1.6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(pts[pts.length - 1].x - 0.8, pts[pts.length - 1].y - 0.8, 1.6, 1.6);
    ctx.font = 'bold 1.7px sans-serif';
    ctx.fillStyle = '#166534'; ctx.fillText('START ' + pad2(pc.n), pts[0].x + 1, pts[0].y - 1);
    ctx.fillStyle = '#991b1b'; ctx.fillText('END ' + pad2(pc.n), pts[pts.length - 1].x + 1, pts[pts.length - 1].y + 2.4);
  }
  ctx.strokeStyle = '#333'; ctx.lineWidth = 0.25;
  ctx.strokeRect(0, 0, W, H);
  return cv;
}
function exportPNG() {
  var cv = renderStandalone(113.4); /* px per cm ~= 300 dpi */
  cv.toBlob(function (blob) {
    downloadBlob(safeName() + '.png', blob);
    setStatus('PNG exported (high resolution).', 'ok');
  });
}
function exportCSV() {
  var crlf = String.fromCharCode(13, 10);
  var rows = [];
  rows.push('No,Length_cm,Cuts_2.5cm,Start,End,Path');
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    rows.push([p.n, fmt(Math.round(p.lengthCm * 1000) / 1000), p.cuts, p.startLabel || '', p.endLabel || '', '"' + (p.pathName || '') + '"'].join(','));
  }
  rows.push('');
  rows.push('TOTAL_cm,' + fmt(Math.round(S.totalCm * 1000) / 1000));
  rows.push('TOTAL_m,' + fmt(Math.round(S.power.meters * 1000) / 1000));
  rows.push('POWER_W_per_m,' + fmt(S.power.wPerM));
  rows.push('TOTAL_POWER_W,' + fmt(Math.round(S.power.totalW * 10) / 10));
  rows.push('PSU_RECOMMENDED_W,' + fmt(S.power.psuW));
  rows.push('ROLLS,' + S.pack.count);
  rows.push('WASTE_cm,' + fmt(Math.round(S.pack.totalWaste * 10) / 10));
  var bom = String.fromCharCode(0xFEFF);
  download(safeName() + '-cutlist.csv', bom + rows.join(crlf), 'text/csv');
  setStatus('CSV cut list exported.', 'ok');
}
function exportJSON() {
  download(safeName() + '.json', JSON.stringify(S.project, null, 2), 'application/json');
  setStatus('Project JSON exported.', 'ok');
}
function download(filename, content, mime) {
  var blob = new Blob([content], { type: (mime || 'application/octet-stream') + ';charset=utf-8' });
  downloadBlob(filename, blob);
}
function downloadBlob(filename, blob) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
}

/* ---- PRINT / PDF sheet ---- */
function buildPrint() {
  recompute();
  var pr = S.project, pw = S.power;
  var dateStr = new Date().toLocaleDateString('fa-IR') + ' — ' + new Date().toLocaleDateString('en-CA');
  var rows = '';
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    rows += '<tr><td>' + p.n + '</td><td>' + fmt(Math.round(p.lengthCm * 1000) / 1000) + ' cm</td><td>' + p.cuts +
      '</td><td>' + (p.startLabel || '-') + '</td><td>' + (p.endLabel || '-') + '</td><td>' + esc(p.pathName || '') + '</td></tr>';
  }
  rows += '<tr><td><b>مجموع / TOTAL</b></td><td><b>' + fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</b></td><td><b>' +
    Math.round(S.totalCm / pr.profile.intervalCm) + '</b></td><td></td><td></td><td></td></tr>';
  var rollRows = '';
  for (var b = 0; b < S.pack.bins.length; b++) {
    var bin = S.pack.bins[b], lens = [];
    for (var k = 0; k < bin.items.length; k++) lens.push(fmt(bin.items[k].len));
    rollRows += '<tr><td>' + (b + 1) + '</td><td>' + (lens.join(' + ') || '—') + '</td><td>' +
      fmt(Math.round((S.pack.rollCm - bin.waste) * 10) / 10) + ' cm</td><td>' + fmt(Math.round(bin.waste * 10) / 10) + ' cm</td></tr>';
  }
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + fnum(pr.board.widthCm) + ' ' + fnum(pr.board.heightCm) + '">' +
    svgBody() + '</svg>';
  $('printArea').innerHTML =
    '<div class="pr-h"><h1>NEON CAD — برگه ساخت / FABRICATION SHEET</h1>' +
    '<div class="pr-sub">پروژه / Project: <b>' + esc(pr.name) + '</b> &nbsp;|&nbsp; تاریخ / Date: ' + dateStr +
    ' &nbsp;|&nbsp; ابعاد تابلو / Board: ' + fmt(pr.board.widthCm) + ' x ' + fmt(pr.board.heightCm) + ' cm' +
    ' &nbsp;|&nbsp; پروفایل / Profile: ' + esc(pr.profile.name) + ' (' + fmt(pr.profile.widthMm) + 'mm, ' +
    fmt(pr.profile.voltageV) + 'V, cut every ' + fmt(pr.profile.intervalCm) + ' cm)</div></div>' +
    '<div class="pr-h2">جدول برش / CUT LIST</div>' +
    '<table><thead><tr><th>شماره</th><th>طول</th><th>تعداد برش ' + fmt(pr.profile.intervalCm) + 'cm</th><th>شروع</th><th>پایان</th><th>مسیر</th></tr></thead><tbody>' +
    rows + '</tbody></table>' +
    '<div class="pr-h2">مواد و برق / MATERIALS &amp; POWER</div>' +
    '<table class="pr-kv">' +
    '<tr><td>متراژ کل نئون / Total neon</td><td><b>' + fmt(Math.round(pw.meters * 1000) / 1000) + ' m</b> (' +
    fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm)</td></tr>' +
    '<tr><td>توان واحد / Power per meter</td><td><b>' + fmt(pw.wPerM) + ' W/m</b></td></tr>' +
    '<tr><td>توان کل / Total power</td><td><b>' + fmt(Math.round(pw.totalW * 10) / 10) + ' W</b></td></tr>' +
    '<tr><td>ضریب اطمینان / Safety factor</td><td>' + fmt(pw.safetyPct) + '% → required ' + fmt(Math.round(pw.needW * 10) / 10) + ' W</td></tr>' +
    '<tr><td>منبع تغذیه پیشنهادی / PSU</td><td><b>' + fmt(pw.psuW) + ' W @ ' + fmt(pw.voltage) + ' V</b> (' +
    fmt(Math.round(pw.amps * 100) / 100) + ' A)</td></tr>' +
    '<tr><td>حداقل شعاع خم / Min bend radius</td><td>' + fmt(pr.profile.minBendRadiusMm) + ' mm</td></tr>' +
    '<tr><td>حداقل فاصله مسیرها / Min spacing</td><td>' + fmt(pr.settings.minSpacingCm) + ' cm</td></tr>' +
    '</table>' +
    '<div class="pr-h2">بهینه‌سازی رول / ROLLS &amp; WASTE (FFD)</div>' +
    '<table><thead><tr><th>رول</th><th>قطعات (cm)</th><th>مصرف</th><th>پرت</th></tr></thead><tbody>' + rollRows +
    '<tr><td colspan="2"><b>مجموع / TOTAL</b></td><td><b>' + fmt(Math.round(S.pack.totalUsed * 10) / 10) + ' cm</b></td><td><b>' +
    fmt(Math.round(S.pack.totalWaste * 10) / 10) + ' cm (' + fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)</b></td></tr>' +
    '</tbody></table>' +
    '<div class="pr-h2">طرح / DESIGN (real scale ' + fmt(pr.board.widthCm) + ' x ' + fmt(pr.board.heightCm) + ' cm)</div>' +
    '<div class="pr-svg">' + svg + '</div>' +
    '<div class="pr-sign"><div>سازنده / Fabricated by</div><div>کنترل / Checked by</div><div>تاریخ / Date</div></div>' +
    '<div class="pr-foot">Generated by NEON CAD — all START/END points lie on real ' + fmt(pr.profile.intervalCm) +
    ' cm cutting points. Geometry was corrected (not just rounded) to match cuttable lengths.</div>';
}
function doPrint() {
  buildPrint();
  setTimeout(function () { window.print(); }, 120);
}

/* ---- SVG / JSON import ---- */
var NUMRE = /[-+]?[0-9]*[.]?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
function parsePathD(d) {
  var tk = d.match(/[a-zA-Z]|[-+]?[0-9]*[.]?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
  var i = 0, cmd = '', cur = { x: 0, y: 0 }, startPt = { x: 0, y: 0 };
  var subs = [], pts = null, ctrl = null, sawCurve = false, lastC = null, lastQ = null;
  function n() { return parseFloat(tk[i++]); }
  function pushSeg(to, c1, c2) {
    if (!pts) { pts = [{ x: cur.x, y: cur.y }]; ctrl = []; }
    if (c1) sawCurve = true;
    ctrl.push(c1 ? { c1: c1, c2: c2 } : null);
    pts.push({ x: to.x, y: to.y });
    cur = { x: to.x, y: to.y };
  }
  function finishSub() {
    if (pts && pts.length >= 2) subs.push({ points: pts, ctrl: ctrl, curve: sawCurve });
    pts = null; ctrl = null; sawCurve = false;
  }
  while (i < tk.length) {
    var t = tk[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; }
    if (!cmd) { i++; continue; }
    var up = cmd.toUpperCase(), rel = (cmd !== up);
    if (up === 'M') {
      var x = n(), y = n();
      if (rel) { x += cur.x; y += cur.y; }
      finishSub();
      cur = { x: x, y: y }; startPt = { x: x, y: y };
      pts = [{ x: x, y: y }]; ctrl = []; sawCurve = false;
      cmd = rel ? 'l' : 'L';
      continue;
    }
    if (up === 'Z') {
      if (pts) pushSeg({ x: startPt.x, y: startPt.y }, null, null);
      cur = { x: startPt.x, y: startPt.y };
      finishSub();
      continue;
    }
    if (up === 'L') {
      var x2 = n(), y2 = n();
      if (rel) { x2 += cur.x; y2 += cur.y; }
      pushSeg({ x: x2, y: y2 }, null, null); continue;
    }
    if (up === 'H') {
      var xh = n(); if (rel) xh += cur.x;
      pushSeg({ x: xh, y: cur.y }, null, null); continue;
    }
    if (up === 'V') {
      var yh = n(); if (rel) yh += cur.y;
      pushSeg({ x: cur.x, y: yh }, null, null); continue;
    }
    if (up === 'C') {
      var ax = n(), ay = n(), bx = n(), by = n(), x3 = n(), y3 = n();
      if (rel) { ax += cur.x; ay += cur.y; bx += cur.x; by += cur.y; x3 += cur.x; y3 += cur.y; }
      lastC = { x: bx, y: by };
      pushSeg({ x: x3, y: y3 }, { x: ax, y: ay }, { x: bx, y: by }); continue;
    }
    if (up === 'S') {
      var ex = n(), ey = n(), x4 = n(), y4 = n();
      if (rel) { ex += cur.x; ey += cur.y; x4 += cur.x; y4 += cur.y; }
      var c1x = lastC ? 2 * cur.x - lastC.x : cur.x, c1y = lastC ? 2 * cur.y - lastC.y : cur.y;
      lastC = { x: ex, y: ey };
      pushSeg({ x: x4, y: y4 }, { x: c1x, y: c1y }, { x: ex, y: ey }); continue;
    }
    if (up === 'Q') {
      var qx = n(), qy = n(), x5 = n(), y5 = n();
      if (rel) { qx += cur.x; qy += cur.y; x5 += cur.x; y5 += cur.y; }
      var q1 = { x: cur.x + 2 / 3 * (qx - cur.x), y: cur.y + 2 / 3 * (qy - cur.y) };
      var q2 = { x: x5 + 2 / 3 * (qx - x5), y: y5 + 2 / 3 * (qy - y5) };
      lastQ = { x: qx, y: qy }; lastC = null;
      pushSeg({ x: x5, y: y5 }, q1, q2); continue;
    }
    if (up === 'T') {
      var x6 = n(), y6 = n();
      if (rel) { x6 += cur.x; y6 += cur.y; }
      var qq = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : { x: cur.x, y: cur.y };
      var t1 = { x: cur.x + 2 / 3 * (qq.x - cur.x), y: cur.y + 2 / 3 * (qq.y - cur.y) };
      var t2 = { x: x6 + 2 / 3 * (qq.x - x6), y: y6 + 2 / 3 * (qq.y - y6) };
      lastQ = qq;
      pushSeg({ x: x6, y: y6 }, t1, t2); continue;
    }
    if (i < tk.length && !/[a-zA-Z]/.test(tk[i])) i++;
  }
  finishSub();
  return subs;
}
function importSvgText(text) {
  var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  var root = doc.documentElement;
  if (!root) { setStatus('SVG import failed.', 'err'); return; }
  var els = root.querySelectorAll('path, polyline, polygon, line, rect, circle');
  var built = [];
  for (var e = 0; e < els.length; e++) {
    var el = els[e], tag = el.tagName.toLowerCase();
    if (tag === 'path') {
      var subs = parsePathD(el.getAttribute('d') || '');
      for (var s = 0; s < subs.length; s++) {
        built.push({
          type: subs[s].curve ? 'bezier' : 'polyline',
          points: subs[s].points,
          ctrl: subs[s].curve ? subs[s].ctrl : null
        });
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      var nums = (el.getAttribute('points') || '').match(NUMRE) || [];
      var parr = [];
      for (var k = 0; k + 1 < nums.length; k += 2) parr.push({ x: parseFloat(nums[k]), y: parseFloat(nums[k + 1]) });
      if (tag === 'polygon' && parr.length) parr.push({ x: parr[0].x, y: parr[0].y });
      if (parr.length >= 2) built.push({ type: 'polyline', points: parr, ctrl: null });
    } else if (tag === 'line') {
      built.push({
        type: 'polyline', ctrl: null,
        points: [
          { x: parseFloat(el.getAttribute('x1') || 0), y: parseFloat(el.getAttribute('y1') || 0) },
          { x: parseFloat(el.getAttribute('x2') || 0), y: parseFloat(el.getAttribute('y2') || 0) }
        ]
      });
    } else if (tag === 'rect') {
      var rx = parseFloat(el.getAttribute('x') || 0), ry = parseFloat(el.getAttribute('y') || 0);
      var rw = parseFloat(el.getAttribute('width') || 0), rh = parseFloat(el.getAttribute('height') || 0);
      if (rw > 0 && rh > 0) built.push({
        type: 'polyline', ctrl: null,
        points: [{ x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }, { x: rx, y: ry }]
      });
    } else if (tag === 'circle') {
      var cx = parseFloat(el.getAttribute('cx') || 0), cy = parseFloat(el.getAttribute('cy') || 0);
      var rr = parseFloat(el.getAttribute('r') || 0);
      if (rr > 0) {
        var cp = [];
        for (var a = 0; a <= 32; a++) {
          var ang = a / 32 * Math.PI * 2;
          cp.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
        }
        built.push({ type: 'polyline', points: cp, ctrl: null });
      }
    }
  }
  if (!built.length) { setStatus('SVG import: no geometry found.', 'warn'); return; }
  /* bbox of all */
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var b = 0; b < built.length; b++) {
    for (var pi = 0; pi < built[b].points.length; pi++) {
      var p = built[b].points[pi];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  var bw = Math.max(maxX - minX, 0.001), bh = Math.max(maxY - minY, 0.001);
  var B = S.project.board;
  var sc = Math.min(B.widthCm * 0.92 / bw, B.heightCm * 0.92 / bh);
  var offX = (B.widthCm - bw * sc) / 2 - minX * sc, offY = (B.heightCm - bh * sc) / 2 - minY * sc;
  pushUndo();
  for (var q = 0; q < built.length; q++) {
    var pts2 = built[q].points.map(function (p) {
      return { x: Math.round((p.x * sc + offX) * 1000) / 1000, y: Math.round((p.y * sc + offY) * 1000) / 1000 };
    });
    var ctrl2 = null;
    if (built[q].type === 'bezier' && built[q].ctrl) {
      ctrl2 = built[q].ctrl.map(function (c) {
        if (!c) return null;
        return {
          c1: { x: c.c1.x * sc + offX, y: c.c1.y * sc + offY },
          c2: { x: c.c2.x * sc + offX, y: c.c2.y * sc + offY }
        };
      });
    }
    S.project.paths.push({
      id: newId(), name: '', type: built[q].type, points: pts2, ctrl: ctrl2,
      lockedStart: false, lockedEnd: false, snapped: false, snapDelta: 0, origPoints: null,
      note: 'imported'
    });
  }
  recompute();
  setStatus('SVG imported: ' + built.length + ' path(s), scaled to board.', 'ok');
}
function importJsonText(text) {
  try {
    var obj = JSON.parse(text);
    if (!obj || !obj.paths) throw new Error('bad');
    pushUndo();
    obj.settings = obj.settings || demoProject().settings;
    obj.profile = obj.profile || demoProject().profile;
    obj.texts = obj.texts || [];
    obj.mode = obj.mode || 'auto';
    S.project = obj;
    syncPropsFromProject();
    recompute();
    setStatus('Project JSON loaded.', 'ok');
  } catch (e) {
    setStatus('JSON import failed: ' + e.message, 'err');
  }
}

/* ---- persistence: projects + neon profiles ---- */
function lsProjects() {
  var out = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf('narmafzar:proj:') === 0) out.push(k.substring('narmafzar:proj:'.length));
  }
  return out;
}
function saveProject() {
  var name = $('projName').value || 'Untitled';
  S.project.name = name;
  try {
    localStorage.setItem('narmafzar:proj:' + name, JSON.stringify(S.project));
    setStatus('Project saved in browser: ' + name, 'ok');
  } catch (e) {
    setStatus('Save failed (localStorage): ' + e.message, 'err');
  }
}
function openProject(name) {
  try {
    var raw = localStorage.getItem('narmafzar:proj:' + name);
    if (!raw) return;
    S.project = JSON.parse(raw);
    S.sel = []; S.undo.length = 0; S.redo.length = 0;
    syncPropsFromProject(); recompute();
    setStatus('Project opened: ' + name, 'ok');
  } catch (e) { setStatus('Open failed: ' + e.message, 'err'); }
}
function showOpenList() {
  var names = lsProjects();
  var html = '';
  for (var i = 0; i < names.length; i++) {
    html += '<div class="issue"><div class="msg"><b>' + esc(names[i]) + '</b></div>' +
      '<button class="btn sm open-proj" data-name="' + esc(names[i]) + '">Open</button>' +
      '<button class="btn sm del-proj" data-name="' + esc(names[i]) + '">Delete</button></div>';
  }
  if (!names.length) html = '<div class="hint">No saved projects yet. Use SAVE in the top bar.</div>';
  $('openList').innerHTML = html;
  $('modalOpen').classList.remove('hidden');
}
function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('narmafzar:profiles') || '[]'); } catch (e) { return []; }
}
function refreshProfileSel() {
  var sel = $('profSel'), list = loadProfiles();
  var html = '<option value="">— select profile —</option>';
  for (var i = 0; i < list.length; i++) {
    html += '<option value="' + esc(list[i].name) + '">' + esc(list[i].name) + '</option>';
  }
  sel.innerHTML = html;
  sel.value = S.project.profile.name || '';
}
function saveProfile() {
  var p = {
    name: $('profName').value || 'Custom',
    widthMm: num($('propNeonW').value, 8),
    voltageV: num($('propVolt').value, 24),
    intervalCm: num($('propInterval').value, 2.5),
    minBendRadiusMm: num($('propBend').value, 30),
    powerPerMeterW: num($('propPower').value, 10),
    rollLengthCm: num($('propRoll').value, 500)
  };
  var list = loadProfiles(), found = false;
  for (var i = 0; i < list.length; i++) if (list[i].name === p.name) { list[i] = p; found = true; }
  if (!found) list.push(p);
  try {
    localStorage.setItem('narmafzar:profiles', JSON.stringify(list));
    S.project.profile = p;
    refreshProfileSel();
    recompute();
    setStatus('Profile saved: ' + p.name, 'ok');
  } catch (e) { setStatus('Profile save failed.', 'err'); }
}
function deleteProfile() {
  var name = $('profName').value;
  var list = loadProfiles(), out = [];
  for (var i = 0; i < list.length; i++) if (list[i].name !== name) out.push(list[i]);
  localStorage.setItem('narmafzar:profiles', JSON.stringify(out));
  refreshProfileSel();
  setStatus('Profile deleted: ' + name, 'ok');
}
function num(v, dflt) {
  var n = parseFloat(v);
  return isNaN(n) ? dflt : n;
}

/* ---- props <-> project ---- */
function syncPropsFromProject() {
  var pr = S.project;
  $('projName').value = pr.name || 'Untitled';
  $('propWidth').value = pr.board.widthCm;
  $('propHeight').value = pr.board.heightCm;
  $('propNeonW').value = pr.profile.widthMm;
  $('propInterval').value = pr.profile.intervalCm;
  $('propBend').value = pr.profile.minBendRadiusMm;
  $('propVolt').value = pr.profile.voltageV;
  $('propPower').value = pr.profile.powerPerMeterW;
  $('propRoll').value = pr.profile.rollLengthCm;
  $('propMaxPiece').value = pr.settings.maxPieceLengthCm;
  $('propSpacing').value = pr.settings.minSpacingCm;
  $('propSafety').value = pr.settings.safetyFactor;
  $('propPsu').value = pr.settings.psuCapacityW;
  $('propGrid').value = pr.settings.gridCm;
  $('propNodeTol').value = pr.settings.nodeTolCm;
  $('propChannel').value = pr.settings.channelMm || 10;
  $('propSides').value = pr.settings.shapeSides || 5;
  $('propStarInner').value = pr.settings.starInner || 45;
  $('propSpiral').value = pr.settings.spiralTurns || 3;
  $('propDblGap').value = pr.settings.dblGapCm || 4;
  $('profName').value = pr.profile.name || '';
  refreshProfileSel();
}
function readProps() {
  var pr = S.project;
  pr.name = $('projName').value || 'Untitled';
  pr.board.widthCm = Math.max(1, num($('propWidth').value, 200));
  pr.board.heightCm = Math.max(1, num($('propHeight').value, 100));
  pr.profile.name = $('profName').value || 'Custom';
  pr.profile.widthMm = num($('propNeonW').value, 8);
  pr.profile.intervalCm = Math.max(0.1, num($('propInterval').value, 2.5));
  pr.profile.minBendRadiusMm = num($('propBend').value, 30);
  pr.profile.voltageV = num($('propVolt').value, 24);
  pr.profile.powerPerMeterW = Math.max(0.01, num($('propPower').value, 10));
  pr.profile.rollLengthCm = Math.max(10, num($('propRoll').value, 500));
  pr.settings.maxPieceLengthCm = Math.max(10, num($('propMaxPiece').value, 500));
  pr.settings.minSpacingCm = num($('propSpacing').value, 1.5);
  pr.settings.safetyFactor = clamp(num($('propSafety').value, 80), 40, 100);
  pr.settings.psuCapacityW = Math.max(0, num($('propPsu').value, 0));
  pr.settings.gridCm = Math.max(0.05, num($('propGrid').value, 0.5));
  pr.settings.nodeTolCm = Math.max(0.05, num($('propNodeTol').value, 0.5));
  pr.settings.channelMm = Math.max(1, num($('propChannel').value, 10));
  pr.settings.shapeSides = clamp(Math.round(num($('propSides').value, 5)), 3, 60);
  pr.settings.starInner = clamp(num($('propStarInner').value, 45), 10, 95);
  pr.settings.spiralTurns = clamp(Math.round(num($('propSpiral').value, 3)), 1, 10);
  pr.settings.dblGapCm = Math.max(0.5, num($('propDblGap').value, 4));
}

/* ---- path edit helpers ---- */
function reversePath(path) {
  path.points.reverse();
  if (path.ctrl && path.ctrl.length) {
    var nc = [];
    for (var i = path.ctrl.length - 1; i >= 0; i--) {
      var c = path.ctrl[i];
      nc.push(c ? { c1: { x: c.c2.x, y: c.c2.y }, c2: { x: c.c1.x, y: c.c1.y } } : null);
    }
    path.ctrl = nc;
  }
  var t = path.lockedStart;
  path.lockedStart = path.lockedEnd;
  path.lockedEnd = t;
}
function deleteSelected() {
  if (!S.sel.length) return;
  pushUndo();
  S.project.paths = S.project.paths.filter(function (p) { return S.sel.indexOf(p.id) < 0; });
  S.sel = [];
  recompute();
}
function snapAll() {
  pushUndo();
  var I = S.project.profile.intervalCm, ok = 0, fail = 0;
  for (var i = 0; i < S.project.paths.length; i++) {
    if (snapPath(S.project.paths[i], I)) ok++; else fail++;
  }
  recompute();
  setStatus('Snap lengths: ' + ok + ' corrected, ' + fail + ' could not be corrected geometrically.', fail ? 'warn' : 'ok');
}

/* =========================================================================
   CORELDRAW-STYLE TOOLKIT — transforms, shapes, align, order, boolean,
   double-line, clipboard, objects manager, zoom helpers
   ========================================================================= */

/* ---- matrices {a,b,c,d,e,f}: x' = a*x + c*y + e ; y' = b*x + d*y + f ---- */
function matMul(m1, m2) {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
}
function matTranslate(dx, dy) { return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }; }
function matScale(sx, sy) { return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }; }
function matRotate(deg) {
  var r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
  return { a: co, b: si, c: -si, d: co, e: 0, f: 0 };
}
function matApply(p, m) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}
function matAbout(m, cx, cy) {
  return matMul(matTranslate(cx, cy), matMul(m, matTranslate(-cx, -cy)));
}
function xformPath(path, m) {
  for (var i = 0; i < path.points.length; i++) path.points[i] = matApply(path.points[i], m);
  if (path.ctrl) for (var c = 0; c < path.ctrl.length; c++) {
    var cc = path.ctrl[c];
    if (!cc) continue;
    cc.c1 = matApply(cc.c1, m); cc.c2 = matApply(cc.c2, m);
  }
  path.snapped = false;
}
function xformGeoms(geoms, m) {
  for (var i = 0; i < geoms.length; i++) {
    for (var j = 0; j < geoms[i].points.length; j++) geoms[i].points[j] = matApply(geoms[i].points[j], m);
    if (geoms[i].ctrl) for (var c = 0; c < geoms[i].ctrl.length; c++) {
      var cc = geoms[i].ctrl[c];
      if (!cc) continue;
      cc.c1 = matApply(cc.c1, m); cc.c2 = matApply(cc.c2, m);
    }
  }
  return geoms;
}

/* ---- bounding boxes ---- */
function pathBBoxOf(path) {
  var pts = flattenPath(path, 1.0), minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var i = 0; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x;
    if (pts[i].y < minY) minY = pts[i].y;
    if (pts[i].x > maxX) maxX = pts[i].x;
    if (pts[i].y > maxY) maxY = pts[i].y;
  }
  if (minX > maxX) return null;
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
}
function selBBox() {
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (!p) continue;
    var bb = pathBBoxOf(p);
    if (!bb) continue;
    if (bb.minX < minX) minX = bb.minX;
    if (bb.minY < minY) minY = bb.minY;
    if (bb.maxX > maxX) maxX = bb.maxX;
    if (bb.maxY > maxY) maxY = bb.maxY;
  }
  if (minX > maxX) return null;
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
}

/* ---- selection transform handles (CorelDRAW-style) ---- */
function selHandles(bb) {
  if (!bb) return [];
  return [
    { id: 'nw', x: bb.minX, y: bb.minY, kind: 'corner', ax: bb.maxX, ay: bb.maxY },
    { id: 'ne', x: bb.maxX, y: bb.minY, kind: 'corner', ax: bb.minX, ay: bb.maxY },
    { id: 'sw', x: bb.minX, y: bb.maxY, kind: 'corner', ax: bb.maxX, ay: bb.minY },
    { id: 'se', x: bb.maxX, y: bb.maxY, kind: 'corner', ax: bb.minX, ay: bb.minY },
    { id: 'n', x: (bb.minX + bb.maxX) / 2, y: bb.minY, kind: 'edgeV', ax: (bb.minX + bb.maxX) / 2, ay: bb.maxY },
    { id: 's', x: (bb.minX + bb.maxX) / 2, y: bb.maxY, kind: 'edgeV', ax: (bb.minX + bb.maxX) / 2, ay: bb.minY },
    { id: 'w', x: bb.minX, y: (bb.minY + bb.maxY) / 2, kind: 'edgeH', ax: bb.maxX, ay: (bb.minY + bb.maxY) / 2 },
    { id: 'e', x: bb.maxX, y: (bb.minY + bb.maxY) / 2, kind: 'edgeH', ax: bb.minX, ay: (bb.minY + bb.maxY) / 2 },
    { id: 'rot', x: (bb.minX + bb.maxX) / 2, y: bb.minY - Math.max(2.5, 14 / S.view.zoom), kind: 'rot', ax: 0, ay: 0 }
  ];
}
function hitSelHandle(w) {
  if (!S.sel.length) return null;
  var bb = selBBox();
  if (!bb) return null;
  var hs = selHandles(bb), tol = 9 / S.view.zoom, best = null, bd = tol;
  for (var i = 0; i < hs.length; i++) {
    var d = dist(hs[i], w);
    if (d < bd) { bd = d; best = hs[i]; }
  }
  return best;
}
function restoreSaved(saved) {
  for (var i = 0; i < saved.length; i++) {
    var p = findPath(saved[i].id);
    if (!p) continue;
    p.points = JSON.parse(JSON.stringify(saved[i].points));
    p.ctrl = saved[i].ctrl ? JSON.parse(JSON.stringify(saved[i].ctrl)) : null;
  }
}
function snapshotSel() {
  var out = [];
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) out.push({ id: p.id, points: JSON.parse(JSON.stringify(p.points)), ctrl: p.ctrl ? JSON.parse(JSON.stringify(p.ctrl)) : null });
  }
  return out;
}

/* ---- shape builders for the drawing tools ---- */
function buildShapeGeom(tool, a, b, shift) {
  var x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
  var w = x1 - x0, h = y1 - y0;
  if (Math.abs(w) < 0.05 && Math.abs(h) < 0.05) return null;
  if (tool === 'rect') {
    if (shift) { /* square */
      var s = Math.max(Math.abs(w), Math.abs(h));
      x1 = x0 + (w < 0 ? -s : s); y1 = y0 + (h < 0 ? -s : s);
    }
    return {
      type: 'polyline', closed: true, ctrl: null,
      points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0, y: y0 }],
      note: 'Rectangle'
    };
  }
  if (tool === 'ellipse') {
    if (shift) { /* circle */
      var sc = Math.max(Math.abs(w), Math.abs(h));
      x1 = x0 + (w < 0 ? -sc : sc); y1 = y0 + (h < 0 ? -sc : sc);
    }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (rx < 0.05 || ry < 0.05) return null;
    var kx = 0.5522847498 * rx, ky = 0.5522847498 * ry;
    return {
      type: 'bezier', closed: true,
      points: [{ x: cx + rx, y: cy }, { x: cx, y: cy + ry }, { x: cx - rx, y: cy }, { x: cx, y: cy - ry }, { x: cx + rx, y: cy }],
      ctrl: [
        { c1: { x: cx + rx, y: cy + ky }, c2: { x: cx + kx, y: cy + ry } },
        { c1: { x: cx - kx, y: cy + ry }, c2: { x: cx - rx, y: cy + ky } },
        { c1: { x: cx - rx, y: cy - ky }, c2: { x: cx - kx, y: cy - ry } },
        { c1: { x: cx + kx, y: cy - ry }, c2: { x: cx + rx, y: cy - ky } }
      ],
      note: 'Ellipse'
    };
  }
  if (tool === 'polygon' || tool === 'star') {
    var R = dist(a, b);
    if (R < 0.3) return null;
    var n = Math.max(3, Math.round(S.project.settings.shapeSides || 5));
    var pts = [], i, ang;
    if (tool === 'polygon') {
      for (i = 0; i < n; i++) {
        ang = -Math.PI / 2 + i * 2 * Math.PI / n;
        pts.push({ x: a.x + Math.cos(ang) * R, y: a.y + Math.sin(ang) * R });
      }
      pts.push({ x: pts[0].x, y: pts[0].y });
      return { type: 'polyline', closed: true, ctrl: null, points: pts, note: 'Polygon ' + n };
    }
    var inner = clamp((S.project.settings.starInner || 45) / 100, 0.1, 0.95);
    for (i = 0; i < 2 * n; i++) {
      ang = -Math.PI / 2 + i * Math.PI / n;
      var rr = (i % 2 === 0) ? R : R * inner;
      pts.push({ x: a.x + Math.cos(ang) * rr, y: a.y + Math.sin(ang) * rr });
    }
    pts.push({ x: pts[0].x, y: pts[0].y });
    return { type: 'polyline', closed: true, ctrl: null, points: pts, note: 'Star ' + n };
  }
  if (tool === 'spiral') {
    var R2 = dist(a, b);
    if (R2 < 0.5) return null;
    var turns = clamp(Math.round((S.project.settings.spiralTurns || 3)), 1, 10);
    var total = turns * 2 * Math.PI, steps = turns * 72, pts2 = [], i2;
    for (i2 = 0; i2 <= steps; i2++) {
      var t = i2 / steps, th = t * total, r = R2 * t;
      pts2.push({ x: a.x + Math.cos(th) * r, y: a.y + Math.sin(th) * r });
    }
    return { type: 'bezier', closed: false, points: pts2, ctrl: catmullCtrl(pts2), note: 'Spiral' };
  }
  return null;
}

/* ---- clipboard / duplicate / select-all ---- */
function copySelection() {
  if (!S.sel.length) { setStatus('Nothing selected.', 'warn'); return; }
  var out = [];
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) out.push(JSON.parse(JSON.stringify(p)));
  }
  S.clipboard = out;
  setStatus('Copied ' + out.length + ' path(s).', 'ok');
}
function pasteClipboard() {
  if (!S.clipboard || !S.clipboard.length) { setStatus('Clipboard is empty.', 'warn'); return; }
  pushUndo();
  var ids = [];
  for (var i = 0; i < S.clipboard.length; i++) {
    var np = JSON.parse(JSON.stringify(S.clipboard[i]));
    np.id = newId();
    np.lockedStart = false; np.lockedEnd = false;
    xformPath(np, matTranslate(3, 3));
    S.project.paths.push(np);
    ids.push(np.id);
  }
  S.sel = ids;
  recompute();
  setStatus('Pasted ' + ids.length + ' path(s).', 'ok');
}
function duplicateSelection() {
  if (!S.sel.length) { setStatus('Nothing selected.', 'warn'); return; }
  S.clipboard = [];
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) S.clipboard.push(JSON.parse(JSON.stringify(p)));
  }
  pasteClipboard();
}
function selectAll() {
  S.sel = [];
  for (var i = 0; i < S.project.paths.length; i++) {
    if (!S.project.paths[i].hidden && !S.project.paths[i].locked) S.sel.push(S.project.paths[i].id);
  }
  renderSel(); renderObjects(); draw();
  setStatus(S.sel.length + ' path(s) selected.', '');
}

/* ---- flip / rotate / order ---- */
function flipSelection(horiz) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var bb = selBBox();
  var cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) xformPath(p, matAbout(horiz ? matScale(-1, 1) : matScale(1, -1), cx, cy));
  }
  recompute();
  setStatus(horiz ? 'Flipped horizontally.' : 'Flipped vertically.', 'ok');
}
function rotateSelection(deg) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var bb = selBBox(), cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) xformPath(p, matAbout(matRotate(deg), cx, cy));
  }
  recompute();
  setStatus('Rotated ' + fmt(deg) + ' degrees.', 'ok');
}
function orderSelection(where) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var moving = [], rest = [];
  for (var i = 0; i < S.project.paths.length; i++) {
    if (S.sel.indexOf(S.project.paths[i].id) >= 0) moving.push(S.project.paths[i]);
    else rest.push(S.project.paths[i]);
  }
  if (where === 'front') S.project.paths = rest.concat(moving);
  else if (where === 'back') S.project.paths = moving.concat(rest);
  else {
    /* forward / backward by one */
    var arr = S.project.paths.slice();
    var idxs = [];
    for (var j = 0; j < arr.length; j++) if (S.sel.indexOf(arr[j].id) >= 0) idxs.push(j);
    if (where === 'forward') {
      for (var k = idxs.length - 1; k >= 0; k--) {
        var ix = idxs[k];
        if (ix < arr.length - 1 && S.sel.indexOf(arr[ix + 1].id) < 0) {
          var tmp = arr[ix]; arr[ix] = arr[ix + 1]; arr[ix + 1] = tmp;
        }
      }
    } else {
      for (var k2 = 0; k2 < idxs.length; k2++) {
        var ix2 = idxs[k2];
        if (ix2 > 0 && S.sel.indexOf(arr[ix2 - 1].id) < 0) {
          var tmp2 = arr[ix2]; arr[ix2] = arr[ix2 - 1]; arr[ix2 - 1] = tmp2;
        }
      }
    }
    S.project.paths = arr;
  }
  recompute();
  setStatus(where === 'front' ? 'Brought to front.' : where === 'back' ? 'Sent to back.' : 'Order changed.', 'ok');
}

/* ---- align & distribute (relative to the board, CorelDRAW-style) ---- */
function alignSelection(mode) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var B = S.project.board;
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (!p) continue;
    var bb = pathBBoxOf(p);
    if (!bb) continue;
    var dx = 0, dy = 0;
    if (mode === 'left') dx = -bb.minX;
    if (mode === 'right') dx = B.widthCm - bb.maxX;
    if (mode === 'chcenter') dx = (B.widthCm - bb.w) / 2 - bb.minX;
    if (mode === 'top') dy = -bb.minY;
    if (mode === 'bottom') dy = B.heightCm - bb.maxY;
    if (mode === 'vcenter') dy = (B.heightCm - bb.h) / 2 - bb.minY;
    if (dx || dy) xformPath(p, matTranslate(dx, dy));
  }
  recompute();
  setStatus('Aligned: ' + mode + ' (relative to board).', 'ok');
}
function distributeSelection(axis) {
  if (S.sel.length < 3) { setStatus('Select at least 3 paths to distribute.', 'warn'); return; }
  pushUndo();
  var items = [];
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) items.push({ path: p, bb: pathBBoxOf(p) });
  }
  var B = S.project.board;
  if (axis === 'h') {
    items.sort(function (a, b) { return a.bb.minX - b.bb.minX; });
    var sumW = 0;
    for (var j = 0; j < items.length; j++) sumW += items[j].bb.w;
    var gap = Math.max(0, (B.widthCm - sumW) / (items.length - 1));
    var cur = 0;
    for (var k = 0; k < items.length; k++) {
      var dx = cur - items[k].bb.minX;
      if (dx) xformPath(items[k].path, matTranslate(dx, 0));
      cur += items[k].bb.w + gap;
    }
  } else {
    items.sort(function (a, b) { return a.bb.minY - b.bb.minY; });
    var sumH = 0;
    for (var j2 = 0; j2 < items.length; j2++) sumH += items[j2].bb.h;
    var gap2 = Math.max(0, (B.heightCm - sumH) / (items.length - 1));
    var cur2 = 0;
    for (var k2 = 0; k2 < items.length; k2++) {
      var dy = cur2 - items[k2].bb.minY;
      if (dy) xformPath(items[k2].path, matTranslate(0, dy));
      cur2 += items[k2].bb.h + gap2;
    }
  }
  recompute();
  setStatus('Distributed ' + (axis === 'h' ? 'horizontally' : 'vertically') + ' across the board.', 'ok');
}

/* ---- DOUBLE LINE: replace selected centerline(s) with two parallel neon lines ---- */
function doubleLineSelection(keepCenter) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var gapCm = Math.max(0.5, S.project.settings.dblGapCm || 4);
  var half = gapCm / 2;
  var out = [], made = 0;
  for (var i = 0; i < S.project.paths.length; i++) {
    var path = S.project.paths[i];
    if (S.sel.indexOf(path.id) < 0) { out.push(path); continue; }
    var pts = flattenPath(path, 0.5);
    if (pts.length < 2) { out.push(path); continue; }
    var closed = dist(pts[0], pts[pts.length - 1]) < 1e-6;
    var L = pathTypeLabel(path);
    var a = offsetPolyline(pts, half, closed);
    var b = offsetPolyline(pts, -half, closed);
    var ga = { type: 'polyline', closed: closed, points: a, ctrl: null, note: 'DBL-A ' + L };
    var gb = { type: 'polyline', closed: closed, points: b, ctrl: null, note: 'DBL-B ' + L };
    if (keepCenter) {
      out.push(wrapGeoms([ga])[0]);
      out.push(wrapGeoms([gb])[0]);
      var cClone = clonePath(path);
      cClone.id = newId(); cClone.note = 'DBL-CENTER';
      out.push(cClone);
    } else {
      out.push(wrapGeoms([ga])[0]);
      out.push(wrapGeoms([gb])[0]);
    }
    made++;
  }
  S.project.paths = out;
  S.sel = [];
  recompute();
  setStatus('Double line: ' + made + ' path(s) -> two parallel neon lines (gap ' + fmt(gapCm) + ' cm).', 'ok');
}
function pathTypeLabel(path) {
  return (path.note || path.name || 'path').toString().slice(0, 24);
}

/* ---- BOOLEAN: Weld / Trim / Intersect (raster-precision, for closed shapes) ---- */
function booleanSelection(op) {
  if (S.sel.length < 2) {
    setStatus('Boolean ' + op + ': select at least 2 paths (works best on closed shapes).', 'warn');
    return;
  }
  var objects = [], selPaths = [];
  for (var i = 0; i < S.project.paths.length; i++) {
    var p = S.project.paths[i];
    if (S.sel.indexOf(p.id) >= 0) { selPaths.push(p); objects.push(flattenPath(p, 1.0)); }
  }
  if (selPaths.length < 2) return;
  var pxPerCm = 6;
  var geoms = booleanGeoms(objects, op, pxPerCm);
  if (!geoms.length) { setStatus('Boolean ' + op + ': result is empty.', 'warn'); return; }
  pushUndo();
  var insertAt = S.project.paths.indexOf(selPaths[0]);
  var ids = [];
  for (var s = 0; s < S.sel.length; s++) {
    var ix = S.project.paths.indexOf(selPaths[s]);
    if (ix >= 0) S.project.paths.splice(ix, 1);
  }
  var wrapped = wrapGeoms(geoms);
  for (var g = 0; g < wrapped.length; g++) {
    wrapped[g].note = op.toUpperCase() + ' result';
    S.project.paths.splice(Math.max(0, insertAt) + g, 0, wrapped[g]);
    ids.push(wrapped[g].id);
  }
  S.sel = ids;
  recompute();
  setStatus('Boolean ' + op.toUpperCase() + ' done: ' + wrapped.length + ' path(s).', 'ok');
}

/* ---- set neon color of selection ---- */
function setSelectionColor(hex) {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) p.color = hex;
  }
  recompute();
  setStatus('Neon color set: ' + hex, 'ok');
}

/* ---- zoom helpers ---- */
function zoomStep(f) {
  var cv = $('cv'), r = cv.getBoundingClientRect();
  var mx = r.width / 2, my = r.height / 2;
  var wx = S.view.x + mx / S.view.zoom, wy = S.view.y + my / S.view.zoom;
  S.view.zoom = clamp(S.view.zoom * f, 0.25, 80);
  S.view.x = wx - mx / S.view.zoom;
  S.view.y = wy - my / S.view.zoom;
  $('stZoom').innerHTML = 'zoom: ' + Math.round(S.view.zoom / 7.5 * 100) + '%';
  draw();
}
function zoomFit() {
  var cv = $('cv'), r = cv.getBoundingClientRect();
  var B = S.project.board;
  var m = 0.92;
  var zx = (r.width * m) / Math.max(B.widthCm, 1);
  var zy = (r.height * m) / Math.max(B.heightCm, 1);
  S.view.zoom = clamp(Math.min(zx, zy), 0.25, 80);
  S.view.x = (B.widthCm - r.width / S.view.zoom) / 2;
  S.view.y = (B.heightCm - r.height / S.view.zoom) / 2;
  $('stZoom').innerHTML = 'zoom: ' + Math.round(S.view.zoom / 7.5 * 100) + '%';
  draw();
  setStatus('Fit to page.', '');
}

/* ---- transform panel apply (X / Y / W / H) ---- */
function applyTransformInputs() {
  if (!S.sel.length) { setStatus('Select path(s) first.', 'warn'); return; }
  pushUndo();
  var bb = selBBox();
  if (!bb) return;
  var nx = num($('tfX').value, bb.minX), ny = num($('tfY').value, bb.minY);
  var nw = Math.max(0.05, num($('tfW').value, bb.w)), nh = Math.max(0.05, num($('tfH').value, bb.h));
  /* scale about the bbox min corner, then move to the typed position */
  var m = matMul(matTranslate(nx - bb.minX, ny - bb.minY), matAbout(matScale(nw / Math.max(bb.w, 1e-6), nh / Math.max(bb.h, 1e-6)), bb.minX, bb.minY));
  for (var i = 0; i < S.sel.length; i++) {
    var p = findPath(S.sel[i]);
    if (p) xformPath(p, m);
  }
  recompute();
  setStatus('Transform applied.', 'ok');
}

/* ---- OBJECTS manager (CorelDRAW Object Manager style) ---- */
function renderObjects() {
  var tb = $('objBody');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < S.project.paths.length; i++) {
    var p = S.project.paths[i];
    var L = 0;
    try { L = pathLength(p); } catch (e) { }
    var col = p.color || PALETTE[i % PALETTE.length];
    var sel = S.sel.indexOf(p.id) >= 0;
    html += '<tr' + (sel ? ' style="background:#14202c"' : '') + '>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><span class="dot" style="background:' + col + '"></span> <b class="obj-name" data-id="' + p.id + '" style="cursor:pointer">' + esc(p.name || '(unnamed)') + '</b>' +
      (p.note ? ' <small style="color:#8fa3b8">' + esc(String(p.note).slice(0, 18)) + '</small>' : '') + '</td>' +
      '<td class="num">' + fmt(Math.round(L * 10) / 10) + ' cm</td>' +
      '<td class="num">' + (p.snapped ? '✓' : '—') + '</td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn sm obj-eye" data-id="' + p.id + '" title="Show / hide (hidden paths stay out of the cut list and exports)">' + (p.hidden ? '🚫' : '👁') + '</button> ' +
      '<button class="btn sm obj-lock" data-id="' + p.id + '" title="Lock / unlock (locked paths cannot be edited)">' + (p.locked ? '🔒' : '🔓') + '</button> ' +
      '<button class="btn sm obj-del" data-id="' + p.id + '" title="Delete">✖</button></td></tr>';
  }
  if (!S.project.paths.length) html = '<tr><td colspan="5" class="hint">No objects yet — draw with the tools or use TEXT / TRACE IMAGE.</td></tr>';
  tb.innerHTML = html;
}

/* ---- EPS export (opens cleanly in CorelDRAW / Illustrator) ---- */
function exportEPS() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var PT = 28.3464566929; /* points per cm */
  var o = [];
  o.push('%!PS-Adobe-3.0 EPSF-3.0');
  o.push('%%BoundingBox: 0 0 ' + Math.ceil(W * PT) + ' ' + Math.ceil(H * PT));
  o.push('%%Title: ' + (pr.name || 'NEON CAD project'));
  o.push('%%Creator: NEON CAD');
  o.push('%%EndComments');
  o.push('/m {moveto} bind def /l {lineto} bind def /c {curveto} bind def /s {stroke} bind def');
  o.push('0 setlinewidth 1 setlinejoin 1 setlinecap');
  function Y(y) { return (H - y) * PT; }
  var neonCm = (pr.profile.widthMm || 8) / 10;
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2 || path.hidden) continue;
    var color = path.color || PALETTE[i % PALETTE.length];
    var rgb = hexRGB(color);
    o.push(rgb[0] + ' ' + rgb[1] + ' ' + rgb[2] + ' setrgbcolor ' + (neonCm * 0.9 * PT) + ' setlinewidth');
    var segs = pathSegs(path);
    o.push((segs[0].a.x * PT) + ' ' + Y(segs[0].a.y) + ' m');
    for (var j = 0; j < segs.length; j++) {
      var sg = segs[j];
      if (sg.c1) {
        o.push((sg.c1.x * PT) + ' ' + Y(sg.c1.y) + ' ' + (sg.c2.x * PT) + ' ' + Y(sg.c2.y) + ' ' + (sg.b.x * PT) + ' ' + Y(sg.b.y) + ' c');
      } else {
        o.push((sg.b.x * PT) + ' ' + Y(sg.b.y) + ' l');
      }
    }
    o.push('s');
  }
  o.push('showpage');
  o.push('%%EOF');
  download(safeName() + '.eps', o.join(String.fromCharCode(10)), 'application/postscript');
  setStatus('EPS exported (vector, opens in CorelDRAW / Illustrator).', 'ok');
}
function hexRGB(hex) {
  var h = String(hex || '#22d3ee').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.substring(0, 2), 16) / 255, g = parseInt(h.substring(2, 4), 16) / 255, b = parseInt(h.substring(4, 6), 16) / 255;
  if (isNaN(r)) r = 0.13; if (isNaN(g)) g = 0.83; if (isNaN(b)) b = 0.93;
  return [Math.round(r * 1000) / 1000, Math.round(g * 1000) / 1000, Math.round(b * 1000) / 1000];
}

/* =========================================================================
   PROFESSIONAL EXAMPLES / IMAGE TRACE / DOUBLE-LINE CUT CHANNEL
   ========================================================================= */
function emptyProject() {
  var d = demoProject();
  d.paths = []; d.texts = [];
  d.name = 'New Project';
  d.settings.channelMm = 10;
  d.settings.shapeSides = 5; d.settings.starInner = 45;
  d.settings.spiralTurns = 3; d.settings.dblGapCm = 4;
  return d;
}
function wrapGeoms(geoms) {
  var out = [];
  for (var i = 0; i < geoms.length; i++) {
    out.push({
      id: newId(), name: '', type: geoms[i].type,
      points: geoms[i].points, ctrl: geoms[i].ctrl || null,
      lockedStart: false, lockedEnd: false,
      snapped: false, snapDelta: 0, origPoints: null,
      note: geoms[i].note || ''
    });
  }
  return out;
}

/* ---- shape builders (smooth bezier neon geometry) ---- */
function geomCircle(cx, cy, r) {
  var k = 0.5522847498 * r;
  return {
    type: 'bezier', closed: true,
    points: [
      { x: cx + r, y: cy }, { x: cx, y: cy + r }, { x: cx - r, y: cy },
      { x: cx, y: cy - r }, { x: cx + r, y: cy }
    ],
    ctrl: [
      { c1: { x: cx + r, y: cy + k }, c2: { x: cx + k, y: cy + r } },
      { c1: { x: cx - k, y: cy + r }, c2: { x: cx - r, y: cy + k } },
      { c1: { x: cx - r, y: cy - k }, c2: { x: cx - k, y: cy - r } },
      { c1: { x: cx + k, y: cy - r }, c2: { x: cx + r, y: cy - k } }
    ]
  };
}
function geomHeart(cx, cy, s) {
  var f = s / 48;
  function m(x, y) { return { x: cx + (x - 50) * f, y: cy + (y - 48) * f }; }
  return {
    type: 'bezier', closed: true,
    points: [m(50, 88), m(4, 32), m(28, 8), m(50, 22), m(72, 8), m(96, 32), m(50, 88)],
    ctrl: [
      { c1: m(20, 68), c2: m(4, 48) },
      { c1: m(4, 16), c2: m(16, 8) },
      { c1: m(38, 8), c2: m(46, 14) },
      { c1: m(54, 14), c2: m(62, 8) },
      { c1: m(84, 8), c2: m(96, 16) },
      { c1: m(96, 48), c2: m(80, 68) }
    ]
  };
}
function geomStar(cx, cy, R, r) {
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var ang = i * Math.PI / 5 - Math.PI / 2;
    var rad = (i % 2 === 0) ? R : r;
    pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
  }
  pts.push({ x: pts[0].x, y: pts[0].y });
  return { type: 'bezier', closed: true, points: pts, ctrl: catmullCtrl(pts) };
}
function geomBolt(cx, cy, s) {
  var f = s / 64;
  function m(x, y) { return { x: cx + (x - 2) * f, y: cy + (y - 32) * f }; }
  var pts = [m(12, 0), m(-8, 32), m(2, 32), m(-12, 64), m(14, 28), m(4, 28), m(12, 0)];
  return { type: 'bezier', closed: false, points: pts, ctrl: catmullCtrl(pts) };
}
function geomWave(x0, x1, y, amp, waves) {
  var pts = [], ctrl = [];
  var n = Math.max(2, waves * 2);
  var dx = (x1 - x0) / n;
  pts.push({ x: x0, y: y });
  for (var i = 0; i < n; i++) {
    var xa = x0 + i * dx, xb = xa + dx;
    var dir = (i % 2 === 0) ? -amp : amp;
    ctrl.push({ c1: { x: xa + dx * 0.35, y: y + dir }, c2: { x: xb - dx * 0.35, y: y + dir } });
    pts.push({ x: xb, y: y });
  }
  return { type: 'bezier', closed: false, points: pts, ctrl: ctrl };
}
function geomSmiley(cx, cy, r) {
  var out = [geomCircle(cx, cy, r)];
  out.push(geomCircle(cx - r * 0.36, cy - r * 0.33, r * 0.1));
  out.push(geomCircle(cx + r * 0.36, cy - r * 0.33, r * 0.1));
  var s0 = { x: cx - r * 0.5, y: cy + r * 0.22 }, s2 = { x: cx + r * 0.5, y: cy + r * 0.22 };
  out.push({
    type: 'bezier', closed: false,
    points: [s0, { x: cx, y: cy + r * 0.62 }, s2],
    ctrl: [
      { c1: { x: cx - r * 0.32, y: cy + r * 0.55 }, c2: { x: cx - r * 0.18, y: cy + r * 0.62 } },
      { c1: { x: cx + r * 0.18, y: cy + r * 0.62 }, c2: { x: cx + r * 0.32, y: cy + r * 0.55 } }
    ]
  });
  return out;
}

/* ---- raster (image / text) -> neon geoms, v2: centerline OR outline mode ---- */
function rasterToGeoms(rgba, w, h, opts) {
  opts = opts || {};
  var mode = opts.mode || 'auto';
  /* noise removal: median pre-filter kills photo/JPEG grain BEFORE thresholding */
  var lum = imgLuminance(rgba, w, h);
  var noise = opts.despeckle || 0;
  if (noise > 0) {
    lum = medianLum3(lum, w, h);
    if (noise >= 6) lum = medianLum3(lum, w, h); /* heavy noise -> second pass */
  }
  var bin = binarize(rgba, w, h,
    (opts.threshold === undefined || opts.threshold === null) ? 'auto' : opts.threshold,
    !!opts.invert, lum);
  if (noise) {
    bin = removeSmallComponents(bin, w, h, noise * noise);
  }
  /*
    AUTO mode — estimate the effective stroke width from the contours:
    for a ribbon of width t:  Area = t*L, Perimeter ~= 2L  =>  t ~= 2*Area/Perimeter.
    Works for rings too (donut: t = R - r).  Solid shapes / fat fonts / filled
    logos give a big t -> OUTLINE (double-line) is the right neon rendering.
    Thin line art and script give a small t -> CENTERLINE.
  */
  rasterToGeoms.autoInfo = null;
  if (mode === 'auto') {
    var ink = 0, i0;
    for (i0 = 0; i0 < bin.length; i0++) if (bin[i0]) ink++;
    var probe = traceContours(bin, w, h), per = 0, li, lj;
    for (li = 0; li < probe.length; li++) {
      var lp = probe[li].pts;
      for (lj = 1; lj < lp.length; lj++) per += dist(lp[lj - 1], lp[lj]);
      if (lp.length > 1) per += dist(lp[lp.length - 1], lp[0]);
    }
    var wEff = 2 * ink / Math.max(per, 1);
    var solidLimit = Math.max(18, 0.03 * Math.max(w, h));
    mode = (wEff > solidLimit) ? 'outline' : 'center';
    rasterToGeoms.autoInfo = { mode: mode, strokeWidthPx: wEff, solidLimit: solidLimit };
  }
  if (noise && mode !== 'outline') bin = closeBin(bin, w, h, 1); /* reconnect cracked strokes */
  if (mode === 'outline') {
    var loops = traceContours(bin, w, h);
    return loopsToGeoms(loops, {
      eps: opts.eps === undefined ? 1.2 : opts.eps,
      smooth: opts.smooth !== false,
      minLenPx: opts.minLenPx === undefined ? 8 : opts.minLenPx
    });
  }
  var skel = zhangSuen(bin, w, h);
  if (opts.prune) skel = pruneSpurs(skel, w, h, opts.prune);
  var chains = traceSkeleton(skel, w, h, opts.minLenPx || 5);
  chains = extendChainEnds(chains, bin, skel, w, h, 12); /* Zhang-Suen erodes tips — grow them back */
  return chainsToPaths(chains, {
    eps: opts.eps === undefined ? 1.2 : opts.eps,
    smooth: opts.smooth !== false
  });
}
function textToNeonGeoms(text, fontPx) {
  /* legacy helper kept for compatibility — single line, centerline mode */
  return textNeonGeoms(text, { sizeCm: (fontPx || 280) / 14, pxPerCm: 14, mode: 'center', bold: true });
}
/*
  textNeonGeoms — REAL neon text (not a note).
  Renders the text with the browser font engine (Persian/Arabic shaping works),
  then vectorizes it:
    mode 'center'  -> one neon line on the stroke axis of every letter
    mode 'outline' -> neon follows BOTH edges of every stroke (double-line look)
  Returns geoms in cm, normalized so the text block starts at (0,0).
*/
function textNeonGeoms(text, o) {
  o = o || {};
  text = String(text === undefined || text === null ? '' : text);
  if (!text.trim()) return [];
  var pxPerCm = o.pxPerCm || 14;
  var sizeCm = Math.max(0.5, o.sizeCm || 20);
  var fontPx = Math.max(10, Math.round(sizeCm * pxPerCm));
  var fam = String(o.family || 'Tahoma').split('"').join('');
  var font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + fontPx +
    'px "' + fam + '", Tahoma, Arial, sans-serif';
  var spacing = Math.round(((o.spacing || 0) / 100) * fontPx); /* percent of font size -> px */
  var cv = document.createElement('canvas');
  var ctx = cv.getContext('2d');
  ctx.font = font;
  try { ctx.letterSpacing = spacing + 'px'; } catch (e) { }
  var met = ctx.measureText(text);
  var asc = met.actualBoundingBoxAscent || fontPx * 0.85;
  var desc = met.actualBoundingBoxDescent || fontPx * 0.25;
  var w = Math.min(5000, Math.max(16, Math.ceil(met.width + fontPx * 0.5)));
  var h = Math.min(5000, Math.max(16, Math.ceil(asc + desc + fontPx * 0.5)));
  cv.width = w; cv.height = h;
  ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.font = font;
  try { ctx.letterSpacing = spacing + 'px'; } catch (e) { }
  try { ctx.direction = (o.rtl === false) ? 'ltr' : 'auto'; } catch (e) { }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, w / 2, h / 2);
  if (o.thicken) {
    ctx.lineWidth = fontPx * 0.05; ctx.lineJoin = 'round'; ctx.strokeText(text, w / 2, h / 2);
  }
  var data = ctx.getImageData(0, 0, w, h).data;
  var mode = o.mode === 'outline' ? 'outline' : 'center';
  var geoms = rasterToGeoms(data, w, h, {
    mode: mode,
    threshold: 'auto',
    eps: Math.max(1.1, pxPerCm * 0.12),
    smooth: o.smooth !== false,
    minLenPx: mode === 'outline' ? pxPerCm * 0.5 : 8,
    despeckle: 2,
    prune: mode === 'center' ? 3 : 0
  });
  /* px -> cm, then normalize to origin (0,0) */
  var cmPerPx = 1 / pxPerCm, i, j;
  for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) {
      geoms[i].points[j].x *= cmPerPx; geoms[i].points[j].y *= cmPerPx;
    }
    if (geoms[i].ctrl) for (var c = 0; c < geoms[i].ctrl.length; c++) {
      var cc = geoms[i].ctrl[c];
      if (!cc) continue;
      cc.c1.x *= cmPerPx; cc.c1.y *= cmPerPx; cc.c2.x *= cmPerPx; cc.c2.y *= cmPerPx;
    }
  }
  var bb = geomsBBox(geoms);
  if (bb) for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) {
      geoms[i].points[j].x -= bb.minX; geoms[i].points[j].y -= bb.minY;
    }
    if (geoms[i].ctrl) for (var c2 = 0; c2 < geoms[i].ctrl.length; c2++) {
      var cc2 = geoms[i].ctrl[c2];
      if (!cc2) continue;
      cc2.c1.x -= bb.minX; cc2.c1.y -= bb.minY; cc2.c2.x -= bb.minX; cc2.c2.y -= bb.minY;
    }
  }
  for (i = 0; i < geoms.length; i++) geoms[i].note = (mode === 'outline' ? 'TEXT-2L: ' : 'TEXT: ') + text.slice(0, 24);
  return geoms;
}
/* bbox of a geometry list */
function geomsBBox(geoms) {
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, i, j;
  for (i = 0; i < geoms.length; i++) {
    for (j = 0; j < geoms[i].points.length; j++) {
      var p = geoms[i].points[j];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX > maxX) return null;
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
}
function fitGeomsInto(geoms, bx, by, bw, bh) {
  if (!geoms.length) return;
  fitPathsToBoard(geoms, bw, bh, 0.04);
  for (var i = 0; i < geoms.length; i++) {
    for (var j = 0; j < geoms[i].points.length; j++) {
      geoms[i].points[j].x += bx;
      geoms[i].points[j].y += by;
    }
    if (geoms[i].ctrl) for (var k = 0; k < geoms[i].ctrl.length; k++) {
      var c = geoms[i].ctrl[k];
      if (!c) continue;
      c.c1.x += bx; c.c1.y += by; c.c2.x += bx; c.c2.y += by;
    }
  }
}

/* ---- example projects ---- */
function demoShapesProject() {
  var pr = emptyProject();
  pr.name = 'PRO — Shapes Gallery';
  pr.texts = [{ id: newId(), x: 6, y: 8, text: 'PRO EXAMPLE — smooth neon shapes', sizeCm: 2.6 }];
  var geoms = [];
  geoms.push(geomStar(32, 30, 17, 7.5));
  geoms.push(geomHeart(82, 30, 15));
  geoms.push(geomBolt(126, 30, 18));
  geoms = geoms.concat(geomSmiley(172, 30, 16));
  geoms.push(geomWave(10, 120, 74, 6.5, 4));
  geoms.push(geomCircle(150, 72, 13));
  geoms.push(geomHeart(186, 72, 9));
  pr.paths = wrapGeoms(geoms);
  return pr;
}
function demoCafeProject() {
  var pr = emptyProject();
  pr.name = 'PRO — Cafe Sign (circle + نئون)';
  pr.texts = [{ id: newId(), x: 6, y: 8, text: 'PRO EXAMPLE — circle + Persian neon text + shapes', sizeCm: 2.6 }];
  var geoms = [];
  geoms.push(geomCircle(52, 52, 30));
  var tg = textNeonGeoms('نئون', { sizeCm: 21, family: 'Tahoma', bold: true, mode: 'center' });
  fitGeomsInto(tg, 52 - 20, 52 - 11, 40, 22);
  geoms = geoms.concat(tg);
  geoms.push(geomStar(112, 30, 15, 6.5));
  geoms.push(geomHeart(150, 30, 13));
  geoms.push(geomBolt(184, 30, 16));
  geoms = geoms.concat(geomSmiley(112, 76, 13));
  geoms.push(geomWave(138, 196, 76, 5, 3));
  pr.paths = wrapGeoms(geoms);
  return pr;
}
/* double-line neon text showcase: outline (2 tubes around every stroke) + a double-lined circle */
function demoDoubleProject() {
  var pr = emptyProject();
  pr.name = 'PRO — Double-Line Text (دو خطی)';
  pr.texts = [{ id: newId(), x: 6, y: 8, text: 'PRO EXAMPLE — double-line (outline) neon text + double-lined ring', sizeCm: 2.6 }];
  var geoms = [];
  var en = textNeonGeoms('NEON', { sizeCm: 24, family: 'Impact', bold: false, mode: 'outline' });
  fitGeomsInto(en, 12, 26, 108, 30);
  geoms = geoms.concat(en);
  var fa = textNeonGeoms('تابلو', { sizeCm: 18, family: 'Tahoma', bold: true, mode: 'center' });
  fitGeomsInto(fa, 12, 62, 80, 22);
  geoms = geoms.concat(fa);
  /* double-lined ring: two concentric circles */
  geoms.push(geomCircle(160, 46, 26));
  geoms.push(geomCircle(160, 46, 21.5));
  geoms.push(geomStar(160, 46, 8.5, 3.8));
  pr.paths = wrapGeoms(geoms);
  return pr;
}
function loadExample(key) {
  pushUndo();
  if (key === 'chain') S.project = demoProject();
  else if (key === 'shapes') S.project = demoShapesProject();
  else if (key === 'cafe') S.project = demoCafeProject();
  else if (key === 'double') S.project = demoDoubleProject();
  else S.project = emptyProject();
  S.sel = [];
  syncPropsFromProject();
  recompute();
  setStatus('Example loaded: ' + key + ' — ' + S.project.paths.length + ' path(s).', 'ok');
}

/* ---- double-line cutting channel (neon sits between the two lines) ---- */
function channelForPath(path) {
  var ch = (S.project.settings.channelMm || 10) / 20; /* half-width, cm */
  var pts = flattenPath(path, 0.45);
  if (pts.length < 2) return null;
  var closed = dist(pts[0], pts[pts.length - 1]) < 1e-6;
  return {
    center: pts,
    left: offsetPolyline(pts, ch, closed),
    right: offsetPolyline(pts, -ch, closed)
  };
}
function drawPts(ctx, pts) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}
function polylineSvg(pts, layer, color) {
  var s = [];
  for (var i = 0; i < pts.length; i++) s.push(fnum(pts[i].x) + ',' + fnum(pts[i].y));
  return '<polyline points="' + s.join(' ') + '" fill="none" stroke="' + color +
    '" stroke-width="0.15" data-layer="' + layer + '"/>';
}
function exportCutSvg() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var a = ['<rect x="0" y="0" width="' + fnum(W) + '" height="' + fnum(H) + '" fill="none" stroke="#bbbbbb" stroke-width="0.2"/>'];
  var incCenter = $('chkCutCenter') && $('chkCutCenter').checked;
  for (var i = 0; i < pr.paths.length; i++) {
    if (pr.paths[i].hidden) continue;
    var ch = channelForPath(pr.paths[i]);
    if (!ch) continue;
    a.push(polylineSvg(ch.left, 'CUT1', '#000000'));
    a.push(polylineSvg(ch.right, 'CUT2', '#000000'));
    if (incCenter) a.push(polylineSvg(ch.center, 'CENTER', '#888888'));
  }
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + fnum(W) + 'cm" height="' + fnum(H) +
    'cm" viewBox="0 0 ' + fnum(W) + ' ' + fnum(H) + '">' + a.join('') + '</svg>';
  download(safeName() + '-cut.svg', svg, 'image/svg+xml');
  setStatus('CUT SVG exported — double-line channel for the cutting machine (real scale).', 'ok');
}
function exportCutDxf() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var o = [];
  function push(s) { o.push(s); }
  function yflip(y) { return H - y; }
  function line(x1, y1, x2, y2, layer) {
    push('0'); push('LINE'); push('8'); push(layer);
    push('10'); push(fnum(x1)); push('20'); push(fnum(yflip(y1))); push('30'); push('0');
    push('11'); push(fnum(x2)); push('21'); push(fnum(yflip(y2))); push('31'); push('0');
  }
  push('0'); push('SECTION'); push('2'); push('HEADER');
  push('9'); push('$INSUNITS'); push('70'); push('4');
  push('0'); push('ENDSEC');
  push('0'); push('SECTION'); push('2'); push('ENTITIES');
  var incCenter = $('chkCutCenter') && $('chkCutCenter').checked;
  for (var i = 0; i < pr.paths.length; i++) {
    if (pr.paths[i].hidden) continue;
    var ch = channelForPath(pr.paths[i]);
    if (!ch) continue;
    var sides = [['CUT1', ch.left], ['CUT2', ch.right]];
    if (incCenter) sides.push(['CENTER', ch.center]);
    for (var s = 0; s < sides.length; s++) {
      var pts = sides[s][1], layer = sides[s][0];
      for (var k = 1; k < pts.length; k++) {
        line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, layer);
      }
    }
  }
  push('0'); push('ENDSEC');
  push('0'); push('EOF');
  download(safeName() + '-cut.dxf', o.join(String.fromCharCode(13, 10)), 'application/dxf');
  setStatus('CUT DXF exported — send this to the cutting machine (units cm, Y-up, layers CUT1/CUT2).', 'ok');
}

/* ---- trace image modal ---- */
/* ---- trace image modal (v2: WYSIWYG, centerline OR outline/double-line) ---- */
var TRACE = { img: null, res: null, geoms: null, dirty: true, busy: false, timer: null };
function openTraceFromImage(img) {
  TRACE.img = img;
  TRACE.geoms = null;
  TRACE.dirty = true;
  $('modalTrace').classList.remove('hidden');
  traceCompute();
}
function traceScaledData(maxDim) {
  var img = TRACE.img;
  var sc = Math.min(1, maxDim / Math.max(img.width, img.height));
  var w = Math.max(2, Math.round(img.width * sc)), h = Math.max(2, Math.round(img.height * sc));
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w: w, h: h };
}
function traceOpts() {
  var auto = $('traceAuto') ? $('traceAuto').checked : true;
  return {
    mode: ($('traceMode') && $('traceMode').value) || 'auto',
    threshold: auto ? 'auto' : parseFloat($('traceThresh').value),
    invert: $('traceInvert').checked,
    eps: Math.max(0.4, parseFloat($('traceDetail').value) / 4),
    smooth: $('traceSmooth').checked,
    despeckle: parseInt($('traceNoise').value, 10) || 0,
    prune: ($('traceMode') && $('traceMode').value === 'outline') ? 0 : 3,
    minLenPx: 5
  };
}
function traceStatus(msg, cls) {
  var el = $('traceStatus');
  if (el) { el.innerHTML = msg; el.className = cls || ''; }
}
function scheduleTrace() {
  TRACE.dirty = true;
  if (TRACE.timer) clearTimeout(TRACE.timer);
  TRACE.timer = setTimeout(traceCompute, 200);
}
function traceCompute() {
  if (!TRACE.img || TRACE.busy) return;
  TRACE.busy = true;
  traceStatus('⏳ Processing — binarize + ' +
    (($('traceMode') && $('traceMode').value === 'outline') ? 'outline trace…' : 'skeletonize…'));
  setTimeout(function () {
    try {
      var maxDim = parseInt($('traceQuality').value, 10) || 900;
      var t = traceScaledData(maxDim);
      TRACE.res = { w: t.w, h: t.h };
      TRACE.geoms = rasterToGeoms(t.data, t.w, t.h, traceOpts());
      TRACE.dirty = false;
      drawTracePreview();
      var autoNote = '';
      if (rasterToGeoms.autoInfo) {
        autoNote = rasterToGeoms.autoInfo.mode === 'outline'
          ? ' — AUTO picked OUTLINE (دو خطی): solid/fat shapes detected (stroke ≈ ' + Math.round(rasterToGeoms.autoInfo.strokeWidthPx) + 'px)'
          : ' — AUTO picked CENTERLINE (تک‌خط): thin line-art detected (stroke ≈ ' + Math.round(rasterToGeoms.autoInfo.strokeWidthPx) + 'px)';
      }
      traceStatus('✔ <b>' + TRACE.geoms.length + '</b> neon path(s) — ' +
        t.w + '×' + t.h + ' px — preview = exact result' + autoNote, 'ok');
    } catch (e) {
      traceStatus('Error: ' + esc(e.message), 'err');
    }
    TRACE.busy = false;
  }, 30);
}
function drawTracePreview() {
  if (!TRACE.img || !TRACE.geoms) return;
  var t = TRACE.res;
  var cv = $('traceCv');
  var maxW = 380, maxH = 400;
  var w = maxW, h = Math.max(80, Math.round(maxW * t.h / t.w));
  if (h > maxH) { h = maxH; w = Math.max(80, Math.round(maxH * t.w / t.h)); }
  cv.width = w; cv.height = h;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  /* dimmed original underlay */
  try {
    ctx.globalAlpha = 0.18;
    ctx.drawImage(TRACE.img, 0, 0, w, h);
    ctx.globalAlpha = 1;
  } catch (e) { }
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (var g = 0; g < TRACE.geoms.length; g++) {
    traceGeomPx(ctx, TRACE.geoms[g], t.w, t.h, w, h);
  }
}
function traceGeomPx(ctx, gm, sw, sh, dw, dh) {
  var sx = dw / sw, sy = dh / sh, pts = gm.points;
  if (gm.type === 'bezier' && gm.ctrl) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * sx, pts[0].y * sy);
    for (var i = 0; i < gm.ctrl.length; i++) {
      var c = gm.ctrl[i];
      if (c) {
        ctx.bezierCurveTo(c.c1.x * sx, c.c1.y * sy, c.c2.x * sx, c.c2.y * sy, pts[i + 1].x * sx, pts[i + 1].y * sy);
      } else {
        ctx.lineTo(pts[i + 1].x * sx, pts[i + 1].y * sy);
      }
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * sx, pts[0].y * sy);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x * sx, pts[j].y * sy);
    ctx.stroke();
  }
}
function applyTrace() {
  if (!TRACE.img) return;
  var run = function () {
    try {
      var geoms = TRACE.geoms;
      if (!geoms || !geoms.length) { traceStatus('Nothing traced — adjust the settings.', 'warn'); return; }
      geoms = geoms.map(function (g) {
        return { type: g.type, closed: g.closed, points: JSON.parse(JSON.stringify(g.points)), ctrl: g.ctrl ? JSON.parse(JSON.stringify(g.ctrl)) : null };
      });
      fitPathsToBoard(geoms, S.project.board.widthCm, S.project.board.heightCm, 0.06);
      var minLen = parseFloat($('traceMinLen').value) || 0;
      var keep = [];
      for (var i = 0; i < geoms.length; i++) {
        var L = 0, pts = geoms[i].points;
        for (var j = 1; j < pts.length; j++) L += dist(pts[j - 1], pts[j]);
        if (L >= minLen) keep.push(geoms[i]);
      }
      pushUndo();
      var wrapped = wrapGeoms(keep);
      for (var k = 0; k < wrapped.length; k++) S.project.paths.push(wrapped[k]);
      $('modalTrace').classList.add('hidden');
      recompute();
      var usedMode = ($('traceMode') && $('traceMode').value) || 'auto';
      if (usedMode === 'auto' && rasterToGeoms.autoInfo) usedMode = rasterToGeoms.autoInfo.mode;
      setStatus('Traced ' + wrapped.length + ' neon path(s) from image (' +
        (usedMode === 'outline' ? 'OUTLINE / double-line — دو خطی' : 'centerline — تک‌خط') +
        ') — lengths corrected to the ' + fmt(S.project.profile.intervalCm) +
        ' cm cutting grid. Use CUT DXF for the machine.', 'ok');
    } catch (e) {
      setStatus('Trace failed: ' + e.message, 'err');
    }
  };
  if (TRACE.dirty || !TRACE.geoms) {
    if (TRACE.busy) { traceStatus('Still processing — try again in a moment.', 'warn'); return; }
    traceCompute();
    /* traceCompute is async; poll until done */
    var wait = setInterval(function () {
      if (!TRACE.busy) { clearInterval(wait); run(); }
    }, 120);
  } else run();
}

/* =========================================================================
   TEXT TOOL — real neon text (CorelDRAW artistic-text style) or plain label
   ========================================================================= */
var TXT = { timer: null };
function openTextDialog() {
  $('modalText').classList.remove('hidden');
  $('txtInput').value = '';
  try { $('txtInput').focus(); } catch (e) { }
  updateTextPreview();
}
function textDialogOpts() {
  var fam = $('txtFont').value;
  if (fam === '__custom__') fam = $('txtFontCustom').value || 'Tahoma';
  return {
    text: $('txtInput').value,
    family: fam,
    sizeCm: Math.max(1, num($('txtSize').value, 20)),
    bold: $('txtBold').checked,
    italic: $('txtItalic').checked,
    spacing: num($('txtSpacing').value, 0),
    mode: $('txtMode').value,           /* 'center' | 'outline' */
    thicken: $('txtThicken').checked
  };
}
function updateTextPreview() {
  var o = textDialogOpts();
  var cv = $('txtPreview');
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#0e141c'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!o.text || !o.text.trim()) {
    ctx.fillStyle = '#8fa3b8'; ctx.font = '12px sans-serif';
    ctx.fillText('متن را بنویسید… (فارسی / English)', 12, 24);
    return;
  }
  /* render the raw raster exactly like the tracer will see it */
  var fontPx = 120;
  var font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + fontPx +
    'px "' + String(o.family).split('"').join('') + '", Tahoma, Arial, sans-serif';
  var c2 = document.createElement('canvas');
  var x2 = c2.getContext('2d');
  x2.font = font;
  try { x2.letterSpacing = Math.round((o.spacing / 100) * fontPx) + 'px'; } catch (e) { }
  var met = x2.measureText(o.text);
  var w = Math.max(10, Math.ceil(met.width + 40)), h = 190;
  c2.width = Math.min(4000, w); c2.height = h;
  x2 = c2.getContext('2d');
  x2.fillStyle = '#fff'; x2.fillRect(0, 0, c2.width, c2.height);
  x2.font = font;
  try { x2.letterSpacing = Math.round((o.spacing / 100) * fontPx) + 'px'; } catch (e) { }
  try { x2.direction = 'auto'; } catch (e) { }
  x2.fillStyle = '#000'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
  x2.fillText(o.text, c2.width / 2, h / 2);
  if (o.thicken) { x2.lineWidth = 5; x2.strokeText(o.text, c2.width / 2, h / 2); }
  var sc = Math.min(cv.width / c2.width, (cv.height - 10) / c2.height);
  ctx.fillStyle = '#ffffff';
  ctx.drawImage(c2, (cv.width - c2.width * sc) / 2, (cv.height - c2.height * sc) / 2, c2.width * sc, c2.height * sc);
  ctx.fillStyle = '#34d399'; ctx.font = '11px sans-serif';
  ctx.fillText((o.mode === 'outline' ? 'OUTLINE / دو خطی — neon traces both edges of every stroke'
    : 'CENTERLINE / تک‌خط — one neon tube on the stroke axis'), 12, cv.height - 8);
}
function scheduleTextPreview() {
  if (TXT.timer) clearTimeout(TXT.timer);
  TXT.timer = setTimeout(updateTextPreview, 200);
}
function applyTextDialog() {
  var o = textDialogOpts();
  if (!o.text || !o.text.trim()) { setStatus('Type some text first.', 'warn'); return; }
  if ($('txtAsLabel').checked) {
    pushUndo();
    var at = S.textAt || { x: S.project.board.widthCm / 2, y: S.project.board.heightCm / 2 };
    S.project.texts.push({ id: newId(), x: at.x, y: at.y, text: o.text, sizeCm: Math.min(10, Math.max(1, o.sizeCm / 4)) });
    $('modalText').classList.add('hidden');
    recompute();
    setStatus('Label added (note only — not neon). Untick "label only" for real neon text.', '');
    return;
  }
  var geoms = textNeonGeoms(o.text, {
    family: o.family, sizeCm: o.sizeCm, bold: o.bold, italic: o.italic,
    spacing: o.spacing, mode: o.mode, thicken: o.thicken, pxPerCm: 14
  });
  if (!geoms.length) { setStatus('Text trace failed — try another font or size.', 'err'); return; }
  pushUndo();
  var B = S.project.board;
  var bb = geomsBBox(geoms);
  /* scale down if wider than the board */
  var maxW = B.widthCm * 0.94, maxH = B.heightCm * 0.9;
  if (bb && (bb.w > maxW || bb.h > maxH)) {
    var f = Math.min(maxW / bb.w, maxH / bb.h);
    xformGeoms(geoms, matScale(f, f));
    bb = geomsBBox(geoms);
  }
  /* place: at the click point (centered) or centered on the board */
  var tx, ty;
  if (S.textAt) { tx = S.textAt.x - bb.w / 2 - bb.minX; ty = S.textAt.y - bb.h / 2 - bb.minY; }
  else { tx = (B.widthCm - bb.w) / 2 - bb.minX; ty = (B.heightCm - bb.h) / 2 - bb.minY; }
  xformGeoms(geoms, matTranslate(tx, ty));
  var wrapped = wrapGeoms(geoms);
  var ids = [];
  for (var i = 0; i < wrapped.length; i++) { S.project.paths.push(wrapped[i]); ids.push(wrapped[i].id); }
  S.sel = ids;
  $('modalText').classList.add('hidden');
  recompute();
  setStatus('Neon text "' + o.text.slice(0, 20) + '" created: ' + wrapped.length + ' path(s) — ' +
    (o.mode === 'outline' ? 'double-line outline' : 'centerline') + '. Lengths snap to the cutting grid.', 'ok');
}

function openHelp() {
  $('modalHelp').classList.remove('hidden');
  try { localStorage.setItem('narmafzar:helpSeen', '1'); } catch (e) { }
}

/* ---- keyboard / tabs / init ---- */
function bindEvents() {
  /* tools */
  var toolEls = document.querySelectorAll('.tool[data-tool]');
  for (var i = 0; i < toolEls.length; i++) {
    (function (el) {
      el.addEventListener('click', function () { setTool(el.getAttribute('data-tool')); });
    })(toolEls[i]);
  }
  $('toolSnap').addEventListener('click', function () {
    S.gridOn = !S.gridOn;
    $('toolSnap').classList.toggle('active', S.gridOn);
    setStatus('Grid snap: ' + (S.gridOn ? 'ON' : 'OFF'), '');
    draw();
  });
  $('toolSnapLen').addEventListener('click', snapAll);
  $('toolChannel').addEventListener('click', function () {
    S.showChannel = !S.showChannel;
    $('toolChannel').classList.toggle('active', S.showChannel);
    setStatus('Cutting channel preview: ' + (S.showChannel ? 'ON — double lines show what the machine cuts.' : 'OFF'), '');
    draw();
  });
  $('toolReverse').addEventListener('click', function () {
    if (!S.sel.length) { setStatus('Select a path first.', 'warn'); return; }
    pushUndo();
    for (var i = 0; i < S.sel.length; i++) {
      var p = findPath(S.sel[i]);
      if (p) reversePath(p);
    }
    recompute();
    setStatus('Path direction reversed.', 'ok');
  });
  $('toolDelete').addEventListener('click', deleteSelected);
  $('toolDup').addEventListener('click', duplicateSelection);
  $('toolCopy').addEventListener('click', copySelection);
  $('toolPaste').addEventListener('click', pasteClipboard);
  $('toolAlign').addEventListener('click', function () { $('modalAlign').classList.remove('hidden'); });
  $('toolFront').addEventListener('click', function () { orderSelection('front'); });
  $('toolBack').addEventListener('click', function () { orderSelection('back'); });
  $('toolFlipH').addEventListener('click', function () { flipSelection(true); });
  $('toolFlipV').addEventListener('click', function () { flipSelection(false); });
  $('toolWeld').addEventListener('click', function () { booleanSelection('weld'); });
  $('toolTrim').addEventListener('click', function () { booleanSelection('trim'); });
  $('toolIntersect').addEventListener('click', function () { booleanSelection('intersect'); });
  $('toolDblLine').addEventListener('click', function () {
    if (!S.sel.length) { setStatus('Double Line: select path(s) first.', 'warn'); return; }
    var keep = window.confirm('DOUBLE LINE: two parallel neon lines only?  [OK = two lines / Cancel = also keep the centerline]');
    doubleLineSelection(keep);
  });
  $('toolZoomIn').addEventListener('click', function () { zoomStep(1.25); });
  $('toolZoomOut').addEventListener('click', function () { zoomStep(1 / 1.25); });
  $('toolZoomFit').addEventListener('click', zoomFit);

  /* topbar */
  $('btnMode').addEventListener('click', function () {
    var pr = S.project;
    pr.mode = (pr.mode === 'auto') ? 'manual' : 'auto';
    var b = $('btnMode');
    b.textContent = (pr.mode === 'auto') ? 'AUTO MODE' : 'MANUAL MODE';
    b.className = 'btn ' + (pr.mode === 'auto' ? 'mode-auto' : 'mode-manual');
    recompute();
    setStatus('Mode: ' + pr.mode.toUpperCase() + (pr.mode === 'auto' ? ' — lengths, numbering and cuts are managed automatically.' : ' — full manual control.'), '');
  });
  $('btnUndo').addEventListener('click', doUndo);
  $('btnRedo').addEventListener('click', doRedo);
  $('btnCheck').addEventListener('click', showCheck);
  $('btnPrint').addEventListener('click', doPrint);
  $('btnPrint2').addEventListener('click', doPrint);
  $('btnPrint3').addEventListener('click', doPrint);
  $('expSvg').addEventListener('click', exportSVG);
  $('expDxf').addEventListener('click', exportDXF);
  $('expPng').addEventListener('click', exportPNG);
  $('expCsv').addEventListener('click', exportCSV);
  $('expJson').addEventListener('click', exportJSON);
  $('expCutDxf').addEventListener('click', exportCutDxf);
  $('expCutSvg').addEventListener('click', exportCutSvg);
  $('btnTrace').addEventListener('click', function () { $('imgInput').click(); });
  $('toolTrace2').addEventListener('click', function () { $('imgInput').click(); });
  $('btnNeonText').addEventListener('click', function () { S.textAt = null; openTextDialog(); });
  $('expEps').addEventListener('click', exportEPS);
  $('imgInput').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { openTraceFromImage(img); };
      img.onerror = function () { setStatus('Image could not be loaded.', 'err'); };
      img.src = String(reader.result);
    };
    reader.readAsText ? reader.readAsDataURL(file) : reader.readAsDataURL(file);
    ev.target.value = '';
  });
  var traceIds = ['traceThresh', 'traceDetail', 'traceInvert', 'traceSmooth', 'traceMode', 'traceAuto', 'traceNoise', 'traceQuality'];
  for (var ti = 0; ti < traceIds.length; ti++) {
    $(traceIds[ti]).addEventListener('input', scheduleTrace);
    $(traceIds[ti]).addEventListener('change', scheduleTrace);
  }
  $('traceCancel').addEventListener('click', function () {
    $('modalTrace').classList.add('hidden');
  });
  $('traceApply').addEventListener('click', applyTrace);
  $('exampleSel').addEventListener('change', function () {
    var key = $('exampleSel').value;
    $('exampleSel').value = '';
    if (!key) return;
    if (window.confirm('Load example "' + key + '" and replace the current design?')) loadExample(key);
  });
  $('btnSave').addEventListener('click', saveProject);
  $('btnOpen').addEventListener('click', showOpenList);
  $('btnNew').addEventListener('click', function () {
    if (!window.confirm('Start a new empty project? (unsaved changes are kept in undo)')) return;
    pushUndo();
    S.project = emptyProject();
    S.sel = [];
    syncPropsFromProject(); recompute();
    setTool('pen');
  });
  $('btnImport').addEventListener('click', function () { $('fileInput').click(); });
  $('btnHelp').addEventListener('click', openHelp);
  $('btnCloseHelp').addEventListener('click', function () {
    $('modalHelp').classList.add('hidden');
    try { localStorage.setItem('narmafzar:helpSeen', '1'); } catch (e) { }
  });
  var tocEls = document.querySelectorAll('.help-toc button');
  for (var tocI = 0; tocI < tocEls.length; tocI++) {
    (function (el) {
      el.addEventListener('click', function () {
        var sec = document.getElementById(el.getAttribute('data-target'));
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    })(tocEls[tocI]);
  }
  $('fileInput').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var txt = String(reader.result);
      if (file.name.toLowerCase().lastIndexOf('.json') === file.name.length - 5) importJsonText(txt);
      else importSvgText(txt);
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  /* props */
  var propIds = ['projName', 'propWidth', 'propHeight', 'propNeonW', 'propInterval', 'propBend', 'propVolt',
    'propPower', 'propRoll', 'propMaxPiece', 'propSpacing', 'propSafety', 'propPsu', 'propGrid', 'propNodeTol', 'propChannel', 'profName',
    'propSides', 'propStarInner', 'propSpiral', 'propDblGap'];
  for (var p = 0; p < propIds.length; p++) {
    $(propIds[p]).addEventListener('change', function () {
      pushUndo(); readProps(); recompute();
    });
  }
  $('profSel').addEventListener('change', function () {
    var name = $('profSel').value;
    if (!name) return;
    var list = loadProfiles();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        pushUndo();
        S.project.profile = JSON.parse(JSON.stringify(list[i]));
        S.project.profile.intervalCm = list[i].intervalCm || 2.5;
        S.project.settings.intervalCm = S.project.profile.intervalCm;
        syncPropsFromProject();
        recompute();
        setStatus('Profile applied: ' + name, 'ok');
      }
    }
  });
  $('btnSaveProf').addEventListener('click', saveProfile);
  $('btnDelProf').addEventListener('click', deleteProfile);
  $('btnAutoAll').addEventListener('click', snapAll);

  /* selected path panel */
  $('selReverse').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); reversePath(path); recompute();
  });
  $('selLockS').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.lockedStart = !path.lockedStart; recompute();
  });
  $('selLockE').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.lockedEnd = !path.lockedEnd; recompute();
  });
  $('selSnap').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo();
    if (snapPath(path, S.project.profile.intervalCm)) setStatus('Length corrected geometrically.', 'ok');
    else setStatus('Cannot correct geometry — see CHECK DESIGN.', 'warn');
    recompute();
  });
  $('selDel').addEventListener('click', deleteSelected);
  $('selNameIn').addEventListener('change', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.name = $('selNameIn').value; recompute();
  });
  $('selNote').addEventListener('change', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.note = $('selNote').value;
  });

  /* tabs */
  var tabEls = document.querySelectorAll('.tab');
  for (var t = 0; t < tabEls.length; t++) {
    (function (el) {
      el.addEventListener('click', function () {
        for (var j = 0; j < tabEls.length; j++) tabEls[j].classList.remove('active');
        el.classList.add('active');
        $('tabCut').style.display = el.getAttribute('data-tab') === 'cut' ? '' : 'none';
        $('tabMat').style.display = el.getAttribute('data-tab') === 'mat' ? '' : 'none';
        $('tabRoll').style.display = el.getAttribute('data-tab') === 'roll' ? '' : 'none';
        $('tabObj').style.display = el.getAttribute('data-tab') === 'obj' ? '' : 'none';
      });
    })(tabEls[t]);
  }

  /* modals */
  $('btnCloseCheck').addEventListener('click', function () { $('modalCheck').classList.add('hidden'); });
  $('btnRecheck').addEventListener('click', showCheck);
  $('btnCloseOpen').addEventListener('click', function () { $('modalOpen').classList.add('hidden'); });
  $('openList').addEventListener('click', function (ev) {
    var b = ev.target;
    if (b.classList && b.classList.contains('open-proj')) {
      openProject(b.getAttribute('data-name'));
      $('modalOpen').classList.add('hidden');
    }
    if (b.classList && b.classList.contains('del-proj')) {
      localStorage.removeItem('narmafzar:proj:' + b.getAttribute('data-name'));
      showOpenList();
    }
  });

  /* neon text modal */
  var txtIds = ['txtInput', 'txtFont', 'txtFontCustom', 'txtSize', 'txtBold', 'txtItalic', 'txtSpacing', 'txtMode', 'txtThicken'];
  for (var tx = 0; tx < txtIds.length; tx++) {
    $(txtIds[tx]).addEventListener('input', scheduleTextPreview);
    $(txtIds[tx]).addEventListener('change', scheduleTextPreview);
  }
  $('txtInput').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); applyTextDialog(); }
  });
  $('txtCancel').addEventListener('click', function () { $('modalText').classList.add('hidden'); });
  $('txtApply').addEventListener('click', applyTextDialog);

  /* align & distribute modal */
  var alignBtns = document.querySelectorAll('#modalAlign [data-align]');
  for (var ab = 0; ab < alignBtns.length; ab++) {
    (function (btn) {
      btn.addEventListener('click', function () { alignSelection(btn.getAttribute('data-align')); });
    })(alignBtns[ab]);
  }
  $('distH').addEventListener('click', function () { distributeSelection('h'); });
  $('distV').addEventListener('click', function () { distributeSelection('v'); });
  $('btnCloseAlign').addEventListener('click', function () { $('modalAlign').classList.add('hidden'); });

  /* objects manager */
  $('objBody').addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t) return;
    var id = t.getAttribute('data-id');
    if (t.classList.contains('obj-eye') && id) {
      var pe = findPath(id);
      if (pe) {
        pe.hidden = !pe.hidden;
        if (pe.hidden) S.sel = S.sel.filter(function (q3) { return q3 !== id; });
        recompute();
      }
    } else if (t.classList.contains('obj-lock') && id) {
      var pl = findPath(id);
      if (pl) { pl.locked = !pl.locked; recompute(); }
    } else if (t.classList.contains('obj-del') && id) {
      pushUndo();
      S.project.paths = S.project.paths.filter(function (q) { return q.id !== id; });
      S.sel = S.sel.filter(function (q2) { return q2 !== id; });
      recompute();
    } else if (t.classList.contains('obj-name') && id) {
      S.sel = (ev.shiftKey) ? S.sel.concat([id]) : [id];
      renderSel(); renderObjects(); draw();
    }
  });

  /* transform panel */
  $('tfApply').addEventListener('click', applyTransformInputs);
  $('tfRotL').addEventListener('click', function () { rotateSelection(-90); });
  $('tfRotR').addEventListener('click', function () { rotateSelection(90); });
  $('tfRot15').addEventListener('click', function () { rotateSelection(15); });

  /* color swatches */
  var cr = $('colorRow');
  var swHtml = '';
  for (var sw = 0; sw < PALETTE.length; sw++) {
    swHtml += '<button class="swatch" data-color="' + PALETTE[sw] + '" style="background:' + PALETTE[sw] + '" title="' + PALETTE[sw] + '"></button>';
  }
  cr.innerHTML = swHtml;
  cr.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t && t.getAttribute && t.getAttribute('data-color')) setSelectionColor(t.getAttribute('data-color'));
  });
  $('colorSet').addEventListener('click', function () { setSelectionColor($('colorCustom').value); });

  /* canvas */
  var cv = $('cv');
  cv.addEventListener('pointerdown', onPointerDown);
  cv.addEventListener('pointermove', onPointerMove);
  cv.addEventListener('pointerup', onPointerUp);
  cv.addEventListener('pointercancel', onPointerUp);
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('dblclick', function () {
    if (S.draft) finishDraft();
    if (S.tool === 'pen' || S.tool === 'bezier') setTool('select');
  });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* keyboard */
  window.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT')) return;
    if (ev.code === 'Space') { S.spaceDown = true; ev.preventDefault(); }
    if (ev.key === 'Escape') {
      if (!$('modalHelp').classList.contains('hidden')) { $('modalHelp').classList.add('hidden'); return; }
      if (!$('modalCheck').classList.contains('hidden')) { $('modalCheck').classList.add('hidden'); return; }
      if (!$('modalOpen').classList.contains('hidden')) { $('modalOpen').classList.add('hidden'); return; }
      if (!$('modalTrace').classList.contains('hidden')) { $('modalTrace').classList.add('hidden'); return; }
      if (!$('modalText').classList.contains('hidden')) { $('modalText').classList.add('hidden'); return; }
      if (!$('modalAlign').classList.contains('hidden')) { $('modalAlign').classList.add('hidden'); return; }
      S.draft = null; S.measure = null; S.shapeDraft = null; S.marquee = null;
      setTool('select');
    }
    if (ev.key === 'F1') { ev.preventDefault(); openHelp(); return; }
    if (ev.key === 'Enter' && S.draft) finishDraft();
    if (ev.key === 'Delete' || ev.key === 'Backspace') deleteSelected();
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); doUndo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicateSelection(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'c') { copySelection(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'v') { pasteClipboard(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'a') { ev.preventDefault(); selectAll(); return; }
    if (ev.key === '+' || ev.key === '=') { zoomStep(1.25); }
    if (ev.key === '-') { zoomStep(1 / 1.25); }
    if (!ev.ctrlKey && !ev.metaKey) {
      var map = {
        v: 'select', p: 'pen', l: 'line', b: 'bezier', t: 'text', s: 'split', m: 'measure',
        r: 'rect', e: 'ellipse', y: 'polygon', g: 'star', i: 'spiral'
      };
      var tk = map[ev.key.toLowerCase()];
      if (tk) setTool(tk);
      if (ev.key.toLowerCase() === 'f') zoomFit();
      if (ev.key.toLowerCase() === 'x' && S.sel.length) deleteSelected();
    }
  });
  window.addEventListener('keyup', function (ev) {
    if (ev.code === 'Space') S.spaceDown = false;
  });
  window.addEventListener('resize', draw);
}

function init() {
  try { S.project = demoCafeProject(); } catch (e) { S.project = demoProject(); }
  syncPropsFromProject();
  bindEvents();
  var b = $('btnMode');
  b.textContent = S.project.mode === 'auto' ? 'AUTO MODE' : 'MANUAL MODE';
  b.className = 'btn ' + (S.project.mode === 'auto' ? 'mode-auto' : 'mode-manual');
  $('toolSnap').classList.add('active');
  recompute();
  setStatus('Ready — demo project loaded. Try Pen / Line / Bezier, then CHECK DESIGN and PRINT.', 'ok');
  /* first visit: open the Persian guide automatically */
  var helpSeen = null;
  try { helpSeen = localStorage.getItem('narmafzar:helpSeen'); } catch (e) { }
  if (!helpSeen) openHelp();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response(HTML_PAGE, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache'
      }
    });
  }
};
