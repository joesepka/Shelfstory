// AUTO-GENERATED deck slide renderers (ported from approved mockups). Each returns
// a full slide HTML string driven by the flat data object D built in perf/overview.
/* eslint-disable */

function renderCover(D) {
  var esc = function (s) { return (s == null ? '' : String(s)); };
  var chip = function (pct) {
    if (pct == null || pct === undefined) return '';
    var neg = Number(pct) < 0;
    var color = neg ? '#B0573A' : '#3F8A5E';
    var arrow = neg ? '&#9660;' : '&#9650;';
    return '<span style="color:' + color + ';">' + arrow + ' ' + Math.abs(Number(pct)) + '%</span>';
  };
  var k = (D && D.kpi) || {};

  var cases90Delta = chip(k.casesPct);
  var acctsDelta = chip(k.accountsPct);
  var rosDelta = chip(k.rosPct);
  var placeDelta = chip(k.placementsPct);

  return '<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,\'Segoe UI\',Arial,sans-serif;">\n' +
'  <div style="position:absolute; top:0; left:0; right:0; bottom:0; padding:6.2% 7%; box-sizing:border-box; display:flex; flex-direction:column;">\n' +
'\n' +
'    <div style="display:flex; align-items:flex-start; justify-content:space-between;">\n' +
'      <div style="display:flex; align-items:center; gap:9px;">\n' +
'        <svg viewBox="0 0 64 48" style="width:34px;height:26px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg>\n' +
'        <span style="font-size:16px; font-weight:700; letter-spacing:0.2px; color:#2C3A26;">ShelfStory</span>\n' +
'      </div>\n' +
'      <div style="display:flex; align-items:center; gap:8px;">\n' +
'        <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block;"></span>\n' +
'        <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">CONFIDENTIAL</span>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <div style="height:1px; background:#E4EBDB; margin-top:14px;"></div>\n' +
'\n' +
'    <div style="flex:1 1 auto; display:flex; flex-direction:column; justify-content:center;">\n' +
'      <div style="display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:4px;">\n' +
'        <div>\n' +
'          <div style="font-size:11px; font-weight:700; letter-spacing:2.6px; color:#3F8A5E; margin-bottom:12px;">' + esc(D && D.kind ? String(D.kind).toUpperCase() + ' BUSINESS REVIEW' : 'QUARTERLY BUSINESS REVIEW') + '</div>\n' +
'          <div style="font-family:Georgia,\'Times New Roman\',serif; font-size:60px; line-height:0.98; font-weight:700; color:#2C3A26; letter-spacing:-0.5px;">' + esc(D && D.title) + '</div>\n' +
'          <div style="font-size:17px; font-weight:500; color:#5A6A50; margin-top:8px; letter-spacing:0.2px;">90-Day Performance Review</div>\n' +
'        </div>\n' +
'        <div style="text-align:right; padding-bottom:4px;">\n' +
'          <div style="font-size:9px; font-weight:700; letter-spacing:1.4px; color:#85937A; margin-bottom:3px;">TERRITORY SCOPE</div>\n' +
'          <div style="font-size:12px; font-weight:600; color:#5A6A50; letter-spacing:0.3px;">' + esc(D && D.scopeTag) + '</div>\n' +
'        </div>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <div style="background:#F4F8EF; border:1px solid #E4EBDB; border-radius:10px; box-sizing:border-box; padding:20px 8px; display:flex; align-items:stretch;">\n' +
'\n' +
'      <div style="flex:1 1 0; padding:0 20px; box-sizing:border-box; text-align:left;">\n' +
'        <div style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase; margin-bottom:9px; white-space:nowrap;">90D Cases</div>\n' +
'        <div style="font-size:34px; font-weight:700; color:#2C3A26; line-height:1; letter-spacing:-0.5px;">' + esc(k.cases90) + '</div>\n' +
'        <div style="font-size:11px; font-weight:600; color:#3F8A5E; margin-top:8px;">' + cases90Delta + ' <span style="color:#85937A; font-weight:500;">vs prior 90</span></div>\n' +
'      </div>\n' +
'\n' +
'      <div style="width:1px; background:#C2D6B4; align-self:stretch; margin:4px 0;"></div>\n' +
'\n' +
'      <div style="flex:1 1 0; padding:0 20px; box-sizing:border-box; text-align:left;">\n' +
'        <div style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase; margin-bottom:9px; white-space:nowrap;">Active Accounts</div>\n' +
'        <div style="font-size:34px; font-weight:700; color:#2C3A26; line-height:1; letter-spacing:-0.5px;">' + esc(k.accounts) + '</div>\n' +
'        <div style="font-size:11px; font-weight:600; color:#3F8A5E; margin-top:8px;">' + acctsDelta + '</div>\n' +
'      </div>\n' +
'\n' +
'      <div style="width:1px; background:#C2D6B4; align-self:stretch; margin:4px 0;"></div>\n' +
'\n' +
'      <div style="flex:1 1 0; padding:0 20px; box-sizing:border-box; text-align:left;">\n' +
'        <div style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase; margin-bottom:9px; white-space:nowrap;">Cases/mo &middot; avg acct</div>\n' +
'        <div style="font-size:34px; font-weight:700; color:#2C3A26; line-height:1; letter-spacing:-0.5px;">' + esc(k.rosMo) + '</div>\n' +
'        <div style="font-size:11px; font-weight:600; color:#3F8A5E; margin-top:8px;">' + rosDelta + '</div>\n' +
'      </div>\n' +
'\n' +
'      <div style="width:1px; background:#C2D6B4; align-self:stretch; margin:4px 0;"></div>\n' +
'\n' +
'      <div style="flex:1 1 0; padding:0 20px; box-sizing:border-box; text-align:left;">\n' +
'        <div style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase; margin-bottom:9px; white-space:nowrap;">Placements</div>\n' +
'        <div style="font-size:34px; font-weight:700; color:#2C3A26; line-height:1; letter-spacing:-0.5px;">' + esc(k.placements) + '</div>\n' +
'        <div style="font-size:11px; font-weight:600; color:#3F8A5E; margin-top:8px;">' + placeDelta + '</div>\n' +
'      </div>\n' +
'\n' +
'    </div>\n' +
'\n' +
'    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px;">\n' +
'      <div style="display:flex; align-items:center; gap:14px; font-size:10.5px; color:#5A6A50; letter-spacing:0.2px;">\n' +
'        <span style="font-weight:600;">Prepared by ' + esc(D && D.preparedBy) + '</span>\n' +
'        <span style="color:#C2D6B4;">|</span>\n' +
'        <span style="color:#85937A;">Data thru ' + esc(D && D.dataThru) + '</span>\n' +
'      </div>\n' +
'      <div style="font-size:10.5px; color:#85937A; letter-spacing:0.3px;">ShelfStory Field Analytics</div>\n' +
'    </div>\n' +
'\n' +
'  </div>\n' +
'</div>';
}

function renderContents(D) {
  D = D || {};
  var health = D.health || {};
  var esc = function(s){ return (s == null ? '' : String(s)); };
  var clampPct = function(n){ n = Number(n); if (!isFinite(n) || n < 0) return 0; if (n > 100) return 100; return n; };
  var goodPct = clampPct(health.goodPct);
  var badPct = clampPct(health.badPct);
  var scopeTag = esc(D.scopeTag);
  var dataThru = esc(D.dataThru);
  var thesis = esc(D.thesis);
  var preparedBy = esc(D.preparedBy);

  return `<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="position:absolute; inset:0; display:flex; flex-direction:column;">

    <!-- HEADER -->
    <div style="flex-shrink:0; padding:0.32in 0.42in 0.14in;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:9px;">
          <svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg>
          <span style="font-size:14px; font-weight:700; color:#2C3A26;">ShelfStory</span>
        </div>
        <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">${scopeTag}</span>
      </div>
      <div style="height:1px; background:#E4EBDB; margin-top:0.14in;"></div>
    </div>

    <!-- BODY -->
    <div style="flex:1; display:flex; flex-direction:column; padding:0.12in 0.42in 0.10in; min-height:0;">

      <!-- Title row -->
      <div style="display:flex; align-items:flex-end; justify-content:space-between; flex-shrink:0; margin-bottom:0.12in;">
        <div>
          <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; text-transform:uppercase; margin-bottom:6px;">Deck Agenda</div>
          <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:46px; line-height:0.92; letter-spacing:-1px; color:#2C3A26;">Contents</div>
        </div>
        <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; text-align:right; padding-bottom:5px;">Five Sections<br><span style="color:#C2D6B4; font-weight:400;">&mdash;</span> Pages 3&ndash;7</div>
      </div>

      <!-- Index grid + rail -->
      <div style="flex:1; display:flex; gap:0.28in; min-height:0;">

        <!-- LEFT + MIDDLE: index -->
        <div style="flex:1; display:flex; flex-direction:column; border-top:1px solid #C2D6B4;">

          <!-- 01 -->
          <div style="flex:1; display:flex; align-items:center; gap:0.30in; border-bottom:1px solid #E4EBDB; padding:0 2px;">
            <div style="width:1.05in; flex-shrink:0; display:flex; align-items:baseline; gap:5px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:44px; line-height:1; color:#2C3A26; letter-spacing:-1px;">01</span>
              <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block; transform:translateY(-3px);"></span>
            </div>
            <div style="flex:1;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:16px; color:#2C3A26; letter-spacing:-0.2px;">Pulse</div>
              <div style="font-size:11px; color:#5A6A50; margin-top:2px;">90-day performance, trend & what's moving</div>
            </div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; flex-shrink:0;">p.3</div>
          </div>

          <!-- 02 -->
          <div style="flex:1; display:flex; align-items:center; gap:0.30in; border-bottom:1px solid #E4EBDB; padding:0 2px;">
            <div style="width:1.05in; flex-shrink:0; display:flex; align-items:baseline; gap:5px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:44px; line-height:1; color:#2C3A26; letter-spacing:-1px;">02</span>
              <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block; transform:translateY(-3px);"></span>
            </div>
            <div style="flex:1;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:16px; color:#2C3A26; letter-spacing:-0.2px;">Items</div>
              <div style="font-size:11px; color:#5A6A50; margin-top:2px;">Top sellers, current 90 days vs prior</div>
            </div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; flex-shrink:0;">p.4</div>
          </div>

          <!-- 03 -->
          <div style="flex:1; display:flex; align-items:center; gap:0.30in; border-bottom:1px solid #E4EBDB; padding:0 2px;">
            <div style="width:1.05in; flex-shrink:0; display:flex; align-items:baseline; gap:5px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:44px; line-height:1; color:#2C3A26; letter-spacing:-1px;">03</span>
              <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block; transform:translateY(-3px);"></span>
            </div>
            <div style="flex:1;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:16px; color:#2C3A26; letter-spacing:-0.2px;">Account Health</div>
              <div style="font-size:11px; color:#5A6A50; margin-top:2px;">Where the book stands by status</div>
            </div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; flex-shrink:0;">p.5</div>
          </div>

          <!-- 04 -->
          <div style="flex:1; display:flex; align-items:center; gap:0.30in; border-bottom:1px solid #E4EBDB; padding:0 2px;">
            <div style="width:1.05in; flex-shrink:0; display:flex; align-items:baseline; gap:5px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:44px; line-height:1; color:#2C3A26; letter-spacing:-1px;">04</span>
              <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block; transform:translateY(-3px);"></span>
            </div>
            <div style="flex:1;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:16px; color:#2C3A26; letter-spacing:-0.2px;">Where It Sells</div>
              <div style="font-size:11px; color:#5A6A50; margin-top:2px;">Channel, chain, area & income</div>
            </div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; flex-shrink:0;">p.6</div>
          </div>

          <!-- 05 -->
          <div style="flex:1; display:flex; align-items:center; gap:0.30in; padding:0 2px;">
            <div style="width:1.05in; flex-shrink:0; display:flex; align-items:baseline; gap:5px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:44px; line-height:1; color:#2C3A26; letter-spacing:-1px;">05</span>
              <span style="width:6px; height:6px; border-radius:50%; background:#3F8A5E; display:inline-block; transform:translateY(-3px);"></span>
            </div>
            <div style="flex:1;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:16px; color:#2C3A26; letter-spacing:-0.2px;">Executive Summary</div>
              <div style="font-size:11px; color:#5A6A50; margin-top:2px;">Headwinds, opportunities & the ask</div>
            </div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; flex-shrink:0;">p.7</div>
          </div>

        </div>

        <!-- RIGHT RAIL -->
        <div style="width:2.35in; flex-shrink:0; background:#F4F8EF; border:1px solid #E4EBDB; border-radius:10px; padding:0.24in 0.22in; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:9px;">The Quarter in One Line</div>
<div style="font-family:Georgia,'Times New Roman',serif; font-size:14.5px; line-height:1.42; color:#2C3A26;">${thesis}</div>
<div style="height:1px; background:#C2D6B4; margin:0.17in 0;"></div>
<div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:8px;">Book status</div>
<div style="display:flex; height:12px; border-radius:6px; overflow:hidden; border:1px solid #E4EBDB;"><div style="width:${goodPct}%; background:#3F8A5E;"></div><div style="width:${badPct}%; background:#B0573A;"></div></div>
<div style="display:flex; align-items:center; gap:6px; margin-top:9px;"><span style="width:9px; height:9px; border-radius:2px; background:#3F8A5E; display:inline-block;"></span><span style="font-size:11px; color:#2C3A26;"><span style="font-weight:700;">${goodPct}%</span> healthy</span></div>
<div style="display:flex; align-items:center; gap:6px; margin-top:5px;"><span style="width:9px; height:9px; border-radius:2px; background:#B0573A; display:inline-block;"></span><span style="font-size:11px; color:#2C3A26;"><span style="font-weight:700;">${badPct}%</span> need attention</span></div>
<div style="flex:1;"></div>
<div style="height:1px; background:#C2D6B4; margin:0.15in 0;"></div>
<div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:5px;">Prepared By</div>
<div style="font-size:13px; font-weight:700; color:#2C3A26;">${preparedBy}</div>
<div style="font-size:10px; color:#5A6A50; margin-top:2px;">Field Sales Analytics</div>
        </div>

      </div>
    </div>

    <!-- FOOTER -->
    <div style="flex-shrink:0; padding:0.11in 0.42in;">
      <div style="height:1px; background:#E4EBDB; margin-bottom:6px;"></div>
      <div style="display:flex; justify-content:space-between; font-size:8px; color:#B9C2AE;">
        <span>ShelfStory &middot; Confidential</span>
        <span>Data thru ${dataThru}</span>
        <span>2</span>
      </div>
    </div>

  </div>
</div>`;
}

function renderPulse(D) {
  D = D || {};
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  };
  var num = function (n) {
    n = Number(n) || 0;
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  var kpi = D.kpi || {};
  var pulse = D.pulse || {};
  var vol = Array.isArray(pulse.volume) ? pulse.volume : [];
  var accts = Array.isArray(pulse.accounts) ? pulse.accounts : [];
  var ros = Array.isArray(pulse.ros) ? pulse.ros : [];
  var movers = Array.isArray(pulse.movers) ? pulse.movers : [];
  var net = pulse.net || { gain: 0, decl: 0, net: 0 };
  var scopeTag = D.scopeTag || '';
  var dataThru = D.dataThru || '';

  // delta chip helper: pct is a Number; positive->green, negative->warm
  var deltaChip = function (pct, suffix, sizePx) {
    var p = Number(pct) || 0;
    var color = p >= 0 ? '#3F8A5E' : '#B0573A';
    var arrow = p >= 0 ? '&#9650;' : '&#9660;';
    var mag = Math.abs(p);
    return '<span style="font-size:' + sizePx + 'px; color:' + color + ';">' + arrow + ' ' + mag + '%' + (suffix || '') + '</span>';
  };

  // ---- chart geometry (matches mockup) ----
  // viewBox 560x190. plot: gridlines at y=46 (top), y=100 (mid), y=154 (baseline).
  // bars: baseline y=154, first bar x=49, step 42, width 26.
  var X0 = 49, STEP = 42, BW = 26, BASE = 154, TOP = 41, TOPCAP = 41;
  var maxBarH = BASE - TOPCAP; // 113 max height like the sample (tallest bar y=41)

  // build a vertical bar chart from a series with hi flags + on-top labels.
  // greyFill = grey color; accent = final accent color for hi bars (with a fade toward accent).
  var buildBars = function (series, accent, fadeStops, labelFn, lastAnchorColor) {
    if (!series.length) return { bars: '', labels: '', months: '', xOf: function () { return 0; }, yTopOf: function () { return BASE; } };
    var vals = series.map(function (d) { return Number(d.v) || 0; });
    var maxV = Math.max.apply(null, vals);
    var minV = Math.min.apply(null, vals);
    if (!isFinite(maxV)) maxV = 0;
    if (!isFinite(minV)) minV = 0;
    // scale so tallest bar ~= maxBarH and shortest keeps proportion; use a floor so short bars stay visible.
    var span = maxV - minV;
    var minH = 34; // shortest bar height like sample (~34)
    var heightOf = function (v) {
      if (span <= 0) return maxBarH;
      return minH + (maxBarH - minH) * ((v - minV) / span);
    };
    var xOf = function (i) { return X0 + i * STEP; };
    var yTopOf = function (i) { return BASE - heightOf(vals[i]); };

    // determine hi indices for fade coloring (fade the run of hi bars toward accent)
    var hiIdx = [];
    for (var k = 0; k < series.length; k++) { if (series[k].hi) hiIdx.push(k); }
    var fadeColorFor = function (i) {
      var pos = hiIdx.indexOf(i);
      if (pos === -1) return '#D3D7DB';
      // among hi bars, earlier ones are lighter/faded; last is full accent
      var n = hiIdx.length;
      if (n <= 1) return accent;
      var t = pos / (n - 1); // 0..1
      var idx = Math.round(t * (fadeStops.length - 1));
      return fadeStops[idx];
    };

    var bars = '';
    var labels = '';
    var months = '';
    for (var i = 0; i < series.length; i++) {
      var x = xOf(i);
      var h = heightOf(vals[i]);
      var y = BASE - h;
      var fill = fadeColorFor(i);
      bars += '<rect x="' + x + '" y="' + fmt1(y) + '" width="' + BW + '" height="' + fmt1(h) + '" rx="2" fill="' + fill + '"/>';
      var cx = x + BW / 2;
      var isHi = !!series[i].hi;
      var isLast = (i === series.length - 1);
      var labY = y - 6;
      var lab = labelFn(vals[i], i);
      if (isLast) {
        labels += '<text x="' + fmt1(cx) + '" y="' + fmt1(labY) + '" text-anchor="middle" font-size="8" font-weight="700" fill="' + lastAnchorColor + '" font-family="system-ui,Arial,sans-serif">' + lab + '</text>';
      } else if (isHi) {
        labels += '<text x="' + fmt1(cx) + '" y="' + fmt1(labY) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#2C3A26" font-family="system-ui,Arial,sans-serif">' + lab + '</text>';
      } else {
        labels += '<text x="' + fmt1(cx) + '" y="' + fmt1(labY) + '" text-anchor="middle" font-size="7.5" fill="#85937A" font-family="system-ui,Arial,sans-serif">' + lab + '</text>';
      }
      var ml = (series[i].m || '').toString().charAt(0).toUpperCase();
      months += '<text x="' + fmt1(cx) + '" y="170" text-anchor="middle" font-size="7.5" fill="#85937A" font-family="system-ui,Arial,sans-serif">' + esc(ml) + '</text>';
    }
    return { bars: bars, labels: labels, months: months, xOf: xOf, yTopOf: yTopOf, cxOf: function (i) { return xOf(i) + BW / 2; } };
  };

  function fmt1(n) {
    n = Number(n) || 0;
    var r = Math.round(n * 10) / 10;
    return (r % 1 === 0) ? String(r) : r.toFixed(1);
  }

  // volume label formatting: thousands as "30.2k"
  var kLabel = function (v) {
    var kv = v / 1000;
    return (Math.round(kv * 10) / 10).toFixed(1) + 'k';
  };

  var volChart = buildBars(
    vol,
    '#3F8A5E',
    ['#AEC4BC', '#89B09C', '#649D7D', '#4A9068', '#3F8A5E'],
    function (v) { return kLabel(v); },
    '#3F8A5E'
  );
  var acctChart = buildBars(
    accts,
    '#5E8FC0',
    ['#B6C5D4', '#99B3CE', '#7BA1C7', '#5E8FC0', '#5E8FC0'],
    function (v) { return num(v); },
    '#3D6E93'
  );

  // ROS gold line over accounts chart. Map ros values to y between ~104(top,high) and ~132(low).
  var rosLine = '';
  var rosPts = '';
  var rosLabels = '';
  if (ros.length) {
    var rvals = ros.map(function (r) { return Number(r) || 0; });
    var rMax = Math.max.apply(null, rvals);
    var rMin = Math.min.apply(null, rvals);
    if (!isFinite(rMax)) rMax = 0;
    if (!isFinite(rMin)) rMin = 0;
    var rSpan = rMax - rMin;
    var ROS_TOP = 104, ROS_BOT = 122; // higher value -> smaller y (higher on chart)
    var rosY = function (v) {
      if (rSpan <= 0) return ROS_TOP;
      return ROS_BOT - (ROS_BOT - ROS_TOP) * ((v - rMin) / rSpan);
    };
    var pts = [];
    var n = Math.min(ros.length, accts.length ? accts.length : ros.length);
    for (var j = 0; j < ros.length; j++) {
      var cx = X0 + j * STEP + BW / 2;
      var cy = rosY(rvals[j]);
      pts.push(fmt1(cx) + ',' + fmt1(cy));
    }
    rosLine = '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#C2922E" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    var lastJ = ros.length - 1;
    var lastCx = X0 + lastJ * STEP + BW / 2;
    var lastCy = rosY(rvals[lastJ]);
    rosPts = '<circle cx="' + fmt1(lastCx) + '" cy="' + fmt1(lastCy) + '" r="2.8" fill="#C2922E"/>';
    // first, mid, last value labels (like sample: 8.2, 8.5, 9.0)
    var rl = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
    var firstCx = X0 + 0 * STEP + BW / 2;
    rosLabels += '<text x="' + fmt1(firstCx) + '" y="' + fmt1(rosY(rvals[0]) + 12) + '" text-anchor="middle" font-size="7" fill="#C2922E" font-family="system-ui,Arial,sans-serif">' + rl(rvals[0]) + '</text>';
    if (ros.length > 2) {
      var midJ = Math.floor((ros.length - 1) / 2);
      var midCx = X0 + midJ * STEP + BW / 2;
      rosLabels += '<text x="' + fmt1(midCx) + '" y="' + fmt1(rosY(rvals[midJ]) + 12) + '" text-anchor="middle" font-size="7" fill="#C2922E" font-family="system-ui,Arial,sans-serif">' + rl(rvals[midJ]) + '</text>';
    }
    rosLabels += '<text x="' + fmt1(lastCx) + '" y="' + fmt1(lastCy + 12) + '" text-anchor="middle" font-size="7.5" font-weight="700" fill="#C2922E" font-family="system-ui,Arial,sans-serif">' + rl(rvals[lastJ]) + '</text>';
  }

  // ---- right rail: movers ----
  var moversHtml = '';
  for (var mi = 0; mi < movers.length; mi++) {
    var mv = movers[mi];
    var up = !!mv.up;
    var color = up ? '#3F8A5E' : '#B0573A';
    var arrow = up ? '&#9650;' : '&#9660;';
    var cs = Number(mv.cases) || 0;
    var sign = cs >= 0 ? '+' : '&minus;';
    var csTxt = sign + num(Math.abs(cs)) + ' cs';
    moversHtml +=
      '<div style="display:flex; align-items:baseline; gap:6px; margin-bottom:5px;">' +
        '<span style="color:' + color + '; font-size:9px; width:10px;">' + arrow + '</span>' +
        '<span style="font-size:10.5px; font-weight:700; color:#2C3A26; flex-shrink:0;">' + esc(mv.name) + '</span>' +
        '<span style="font-size:10px; font-weight:700; color:' + color + '; margin-left:auto; white-space:nowrap;">' + csTxt + '</span>' +
      '</div>' +
      '<div style="font-size:9px; color:#85937A; margin:-2px 0 7px 16px; line-height:1.3;">' + esc(mv.why) + '</div>';
  }

  var gain = Number(net.gain) || 0;
  var decl = Number(net.decl) || 0;
  var netV = Number(net.net) || 0;
  var netColor = netV >= 0 ? '#3F8A5E' : '#B0573A';
  var netSign = netV >= 0 ? '+' : '&minus;';

  return `<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="position:absolute; inset:0; display:flex; flex-direction:column;">

    <div style="flex-shrink:0; padding:20px 30px 10px 30px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #E4EBDB;">
      <div style="display:flex; align-items:center; gap:9px;">
        <svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg>
        <span style="font-size:14px; font-weight:700; color:#2C3A26;">ShelfStory</span>
      </div>
      <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">${esc(scopeTag)}</span>
    </div>

    <div style="flex:1; min-height:0; padding:16px 30px 8px 30px; display:flex; flex-direction:column;">

      <div style="flex-shrink:0; margin-bottom:12px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; text-transform:uppercase;">01 &middot; PULSE</div>
        <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:30px; color:#2C3A26; line-height:1.05; margin-top:3px;">The last 90 days</div>
      </div>

      <div style="flex:1; min-height:0; display:flex; gap:34px;">

        <div style="flex:1.35; min-width:0; display:flex; flex-direction:column; gap:14px;">

          <div style="flex:1; min-height:0; display:flex; flex-direction:column;">
            <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:2px;">
              <span style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">Volume &middot; rolling-90 cases</span>
              <span style="font-size:9px; color:#85937A;">Jul &rarr; Jun</span>
            </div>
            <div style="flex:1; min-height:0;">
              <svg viewBox="0 0 560 190" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;" role="img" aria-label="Rolling-90-day volume in cases with the most recent months highlighted green.">
                <line x1="42" y1="46" x2="560" y2="46" stroke="#E4EBDB" stroke-width="1"/>
                <line x1="42" y1="100" x2="560" y2="100" stroke="#E4EBDB" stroke-width="1"/>
                <line x1="42" y1="154" x2="560" y2="154" stroke="#E4EBDB" stroke-width="1"/>
                ${volChart.bars}
                ${volChart.labels}
                ${volChart.months}
              </svg>
            </div>
          </div>

          <div style="flex:1; min-height:0; display:flex; flex-direction:column;">
            <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:2px;">
              <span style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">Active accounts &middot; <span style="color:#C2922E;">ROS cs/mo</span></span>
              <span style="font-size:9px; color:#85937A;">Jul &rarr; Jun</span>
            </div>
            <div style="flex:1; min-height:0;">
              <svg viewBox="0 0 560 190" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;" role="img" aria-label="Active accounts bars with the most recent months highlighted blue and a gold rate-of-sale line.">
                <line x1="42" y1="46" x2="560" y2="46" stroke="#E4EBDB" stroke-width="1"/>
                <line x1="42" y1="100" x2="560" y2="100" stroke="#E4EBDB" stroke-width="1"/>
                <line x1="42" y1="154" x2="560" y2="154" stroke="#E4EBDB" stroke-width="1"/>
                ${acctChart.bars}
                ${acctChart.labels}
                ${rosLine}
                ${rosPts}
                ${rosLabels}
                ${acctChart.months}
              </svg>
            </div>
          </div>

        </div>

        <div style="flex:1; min-width:0; border-left:1px solid #E4EBDB; padding-left:26px; display:flex; flex-direction:column;">

          <div style="display:flex; align-items:stretch; margin-bottom:12px;">
            <div style="flex:1; padding-right:10px;">
              <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">90D Cases</div>
              <div style="font-size:21px; font-weight:700; color:#2C3A26; line-height:1.1; font-family:Georgia,serif;">${esc(kpi.cases90)}</div>
              <div style="font-size:9px; color:#3F8A5E; font-weight:700;">${deltaChip(kpi.casesPct, '', 9)} <span style="color:#85937A; font-weight:400;">vs prior 90</span></div>
            </div>
            <div style="width:1px; background:#E4EBDB;"></div>
            <div style="flex:1; padding-left:14px;">
              <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">Active Accounts</div>
              <div style="font-size:21px; font-weight:700; color:#2C3A26; line-height:1.1; font-family:Georgia,serif;">${esc(kpi.accounts)}</div>
              <div style="font-size:9px; color:#3F8A5E; font-weight:700;">${deltaChip(kpi.accountsPct, '', 9)}</div>
            </div>
          </div>

          <div style="display:flex; align-items:stretch; border-top:1px solid #E4EBDB; padding-top:10px; margin-bottom:12px;">
            <div style="flex:1; padding-right:10px;">
              <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">Placements</div>
              <div style="font-size:16px; font-weight:700; color:#2C3A26; line-height:1.1;">${esc(kpi.placements)} ${deltaChip(kpi.placementsPct, '', 9)}</div>
            </div>
            <div style="width:1px; background:#E4EBDB;"></div>
            <div style="flex:1; padding-left:14px;">
              <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A;">Cases / mo &middot; avg acct</div>
              <div style="font-size:16px; font-weight:700; color:#2C3A26; line-height:1.1;">${esc(kpi.rosMo)} ${deltaChip(kpi.rosPct, '', 9)}</div>
            </div>
          </div>

          <div style="border-top:1px solid #E4EBDB; padding-top:11px; margin-bottom:12px;">
            <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#3F8A5E; margin-bottom:4px;">Verdict</div>
            <div style="font-size:11px; line-height:1.5; color:#2C3A26;">${pulse.verdict == null ? '' : pulse.verdict}</div>
          </div>

          <div style="border-top:1px solid #E4EBDB; padding-top:11px; flex:1; min-height:0;">
            <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:6px;">Biggest movers</div>

            ${moversHtml}

            <div style="display:flex; align-items:center; gap:0; border-top:1px solid #E4EBDB; padding-top:8px; margin-bottom:9px;">
              <span style="font-size:9.5px; color:#5A6A50;">Gainers <b style="color:#3F8A5E;">+${num(Math.abs(gain))}</b></span>
              <span style="color:#E4EBDB; margin:0 8px;">|</span>
              <span style="font-size:9.5px; color:#5A6A50;">Decliners <b style="color:#B0573A;">&minus;${num(Math.abs(decl))}</b></span>
              <span style="font-size:9.5px; color:#5A6A50; margin-left:auto;">Net <b style="color:${netColor};">${netSign}${num(Math.abs(netV))} cs</b></span>
            </div>

          </div>

        </div>

      </div>

    </div>

    <div style="flex-shrink:0; border-top:1px solid #E4EBDB; padding:6px 30px 8px 30px; display:flex; align-items:center; justify-content:space-between;">
      <span style="font-size:8px; color:#B9C2AE;">ShelfStory &middot; Confidential</span>
      <span style="font-size:8px; color:#B9C2AE;">Data thru ${esc(dataThru)}</span>
      <span style="font-size:8px; color:#B9C2AE;">3</span>
    </div>

  </div>
</div>`;
}

function renderItems(D) {
  var items = (D && Array.isArray(D.items)) ? D.items : [];
  var scopeTag = (D && D.scopeTag) ? D.scopeTag : "";
  var dataThru = (D && D.dataThru) ? D.dataThru : "";

  function num(n) {
    if (n == null || isNaN(n)) return "0";
    var neg = n < 0;
    var s = Math.round(Math.abs(n)).toString();
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return neg ? "-" + s : s;
  }
  function one(n) {
    if (n == null || isNaN(n)) return "0.0";
    return (Math.round(n * 10) / 10).toFixed(1);
  }
  function maxOf(arr) {
    var m = 0;
    for (var i = 0; i < arr.length; i++) { if (arr[i] > m) m = arr[i]; }
    return m;
  }
  function pctDelta(cur, prev) {
    if (!prev || isNaN(prev) || prev === 0) return null;
    return (cur - prev) / prev * 100;
  }
  function chip(cur, prev) {
    var d = pctDelta(cur, prev);
    if (d == null || Math.abs(d) <= 5) {
      return '<div style="height:13px; flex-shrink:0; display:flex; align-items:center; justify-content:center;"></div>';
    }
    var up = d > 0;
    var color = up ? "#3F8A5E" : "#B0573A";
    var arrow = up ? "&#9650;" : "&#9660;";
    var mag = Math.round(Math.abs(d));
    return '<div style="height:13px; flex-shrink:0; display:flex; align-items:center; justify-content:center;"><span style="font-size:8.5px; font-weight:800; color:' + color + ';">' + arrow + mag + '%</span></div>';
  }

  // Top chart: cur vs prev (green current / grey prior)
  var topVals = [];
  for (var a = 0; a < items.length; a++) { topVals.push(items[a].cur || 0); topVals.push(items[a].prev || 0); }
  var topMax = maxOf(topVals) || 1;

  var topCols = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var cur = it.cur || 0, prev = it.prev || 0;
    var curH = (cur / topMax * 100);
    var prevH = (prev / topMax * 100);
    topCols += '<div style="flex:1; min-width:0; display:flex; flex-direction:column; align-items:center;">'
      + chip(cur, prev)
      + '<div style="flex:1; min-height:0; width:82%; display:flex; align-items:flex-end; gap:4px;">'
      + '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">'
      + '<span style="font-size:9px; font-weight:700; color:#3F8A5E; line-height:1; margin-bottom:2px; white-space:nowrap;">' + num(cur) + '</span>'
      + '<div style="width:100%; height:' + curH.toFixed(1) + '%; background:#3F8A5E; border-radius:1.5px 1.5px 0 0;"></div>'
      + '</div>'
      + '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">'
      + '<span style="font-size:8.5px; color:#85937A; line-height:1; margin-bottom:2px; white-space:nowrap;">' + num(prev) + '</span>'
      + '<div style="width:100%; height:' + prevH.toFixed(1) + '%; background:#D3D7DB; border-radius:1.5px 1.5px 0 0;"></div>'
      + '</div>'
      + '</div>'
      + '<div style="font-size:8.5px; font-weight:600; color:#5A6A50; margin-top:6px; text-align:center; line-height:1.15; max-width:100%;">' + (it.name || "") + '</div>'
      + '</div>';
  }

  // Bottom chart: ros vs rosPrev (GOLD current / grey prior)
  var botVals = [];
  for (var b = 0; b < items.length; b++) { botVals.push(items[b].ros || 0); botVals.push(items[b].rosPrev || 0); }
  var botMax = maxOf(botVals) || 1;

  var botCols = "";
  for (var j = 0; j < items.length; j++) {
    var jt = items[j];
    var ros = jt.ros || 0, rosPrev = jt.rosPrev || 0;
    var rosH = (ros / botMax * 100);
    var rosPrevH = (rosPrev / botMax * 100);
    botCols += '<div style="flex:1; min-width:0; display:flex; flex-direction:column; align-items:center;">'
      + chip(ros, rosPrev)
      + '<div style="flex:1; min-height:0; width:82%; display:flex; align-items:flex-end; gap:4px;">'
      + '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">'
      + '<span style="font-size:9px; font-weight:700; color:#C2922E; line-height:1; margin-bottom:2px; white-space:nowrap;">' + one(ros) + '</span>'
      + '<div style="width:100%; height:' + rosH.toFixed(1) + '%; background:#C2922E; border-radius:1.5px 1.5px 0 0;"></div>'
      + '</div>'
      + '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">'
      + '<span style="font-size:8.5px; color:#85937A; line-height:1; margin-bottom:2px; white-space:nowrap;">' + one(rosPrev) + '</span>'
      + '<div style="width:100%; height:' + rosPrevH.toFixed(1) + '%; background:#D3D7DB; border-radius:1.5px 1.5px 0 0;"></div>'
      + '</div>'
      + '</div>'
      + '<div style="font-size:8.5px; font-weight:600; color:#5A6A50; margin-top:6px; text-align:center; line-height:1.15; max-width:100%;">' + (jt.name || "") + '</div>'
      + '</div>';
  }

  return `<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
 <div style="position:absolute; inset:0; display:flex; flex-direction:column;">
  <div style="flex-shrink:0; padding:18px 32px 9px 32px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #E4EBDB;">
   <div style="display:flex; align-items:center; gap:9px;"><svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg><span style="font-size:14px; font-weight:700; color:#2C3A26;">ShelfStory</span></div>
   <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">${scopeTag}</span>
  </div>
  <div style="flex:1; min-height:0; padding:13px 32px 8px 32px; display:flex; flex-direction:column;">
   <div style="flex-shrink:0;">
    <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; text-transform:uppercase;">02 &middot; ITEMS</div>
    <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:22px; color:#2C3A26; margin-top:2px; line-height:1.05;">Top items &mdash; 90 days vs prior</div>
   </div>

   <div style="flex:1; min-height:0; display:flex; flex-direction:column; margin-top:12px;">
    <div style="flex-shrink:0; display:flex; align-items:baseline; justify-content:space-between;">
     <span style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#3F8A5E;">Volume per item &middot; cases</span>
     <div style="display:flex; align-items:center; gap:12px;">
   <div style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#3F8A5E; display:inline-block; border-radius:1px;"></span><span style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#85937A;">Current 90D</span></div>
   <div style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#D3D7DB; display:inline-block; border-radius:1px;"></span><span style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#85937A;">Prior 90D</span></div>
 </div>
    </div>
    <div style="flex:1; min-height:0; display:flex; align-items:stretch; gap:5px; margin-top:6px;">${topCols}</div>
   </div>

   <div style="flex-shrink:0; border-top:1px solid #C2D6B4; margin-top:10px;"></div>

   <div style="flex:1; min-height:0; display:flex; flex-direction:column; margin-top:10px;">
    <div style="flex-shrink:0; display:flex; align-items:baseline; justify-content:space-between;">
     <span style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#C2922E;">Rate of sale per item &middot; cs/mo</span>
     <div style="display:flex; align-items:center; gap:12px;">
   <div style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#C2922E; display:inline-block; border-radius:1px;"></span><span style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#85937A;">Current 90D</span></div>
   <div style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#D3D7DB; display:inline-block; border-radius:1px;"></span><span style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#85937A;">Prior 90D</span></div>
 </div>
    </div>
    <div style="flex:1; min-height:0; display:flex; align-items:stretch; gap:5px; margin-top:6px;">${botCols}</div>
    <div style="flex-shrink:0; font-size:10px; color:#5A6A50; font-style:italic; margin-top:8px;">${(D && D.sells && D.sells.read) ? D.sells.read : ""}</div>
   </div>
  </div>
  <div style="flex-shrink:0; border-top:1px solid #E4EBDB; padding:6px 32px 9px 32px;"><div style="display:flex; align-items:center; justify-content:space-between; font-size:8px; color:#B9C2AE; font-weight:700; letter-spacing:0.4px;"><span>ShelfStory &middot; Confidential</span><span>Data thru ${dataThru}</span><span>4</span></div></div>
 </div>
</div>`;
}

function renderHealth(D) {
  D = D || {};
  var health = D.health || {};
  var kpi = D.kpi || {};
  var esc = function (s) { return s == null ? '' : String(s); };
  var num = function (n) { return (n == null || isNaN(n)) ? '' : Number(n).toLocaleString('en-US'); };
  var clampPct = function (n) {
    n = Number(n);
    if (isNaN(n)) n = 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  };

  var goodPct = clampPct(health.goodPct);
  var badPct = clampPct(health.badPct);

  var statuses = Array.isArray(health.statuses) ? health.statuses : [];
  var statusColors = { New: '#5E8FC0', Healthy: '#3F8A5E', 'At risk': '#C2922E', Lapsed: '#B0573A' };
  var statusColorByKey = { new: '#5E8FC0', healthy: '#3F8A5E', atrisk: '#C2922E', 'at risk': '#C2922E', risk: '#C2922E', lapsed: '#B0573A' };
  var statusColorFor = function (s) {
    if (s.color) return s.color;
    if (s.label != null && statusColors[s.label]) return statusColors[s.label];
    var k = (s.key != null ? String(s.key) : (s.label != null ? String(s.label) : '')).toLowerCase();
    if (statusColorByKey[k]) return statusColorByKey[k];
    return '#85937A';
  };

  var growers = Array.isArray(health.growers) ? health.growers : [];
  var decliners = Array.isArray(health.decliners) ? health.decliners : [];

  var maxCs = function (arr) {
    var m = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = Math.abs(Number(arr[i].cs));
      if (!isNaN(v) && v > m) m = v;
    }
    return m;
  };
  var barWidth = function (cs, mx) {
    if (!mx) return 0;
    var w = (Math.abs(Number(cs)) / mx) * 100;
    if (isNaN(w)) w = 0;
    if (w < 0) w = 0;
    if (w > 100) w = 100;
    return w;
  };

  // Status strip cells
  var stripCells = '';
  for (var si = 0; si < statuses.length; si++) {
    var st = statuses[si];
    var isFirst = si === 0;
    var isLast = si === statuses.length - 1;
    var pad;
    if (isFirst) pad = '9px 14px 9px 0';
    else if (isLast) pad = '9px 0 9px 14px';
    else pad = '9px 14px';
    var borderRight = isLast ? '' : ' border-right:1px solid #E4EBDB;';
    stripCells +=
      '<div style="flex:1; padding:' + pad + ';' + borderRight + '">\n' +
      '   <div style="display:flex; align-items:center; gap:6px;"><span style="width:7px; height:7px; border-radius:2px; background:' + statusColorFor(st) + '; display:inline-block;"></span><span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">' + esc(st.label) + '</span></div>\n' +
      '   <div style="font-family:Georgia,serif; font-weight:700; font-size:17px; color:#2C3A26; margin-top:5px;">' + num(st.accts) + ' <span style="font-size:10px; color:#85937A; font-family:system-ui,sans-serif;">accts</span></div>\n' +
      '   <div style="font-size:9.5px; color:#5A6A50; margin-top:2px;">' + esc(st.pct) + '% of volume</div>\n' +
      ' </div>';
  }

  // Mover rows (grower = up/green, decliner = down/warm)
  var moverRows = function (arr, up) {
    var mx = maxCs(arr);
    var fill = up ? '#3F8A5E' : '#B0573A';
    var deltaColor = up ? '#3F8A5E' : '#B0573A';
    var arrow = up ? '&#9650;' : '&#9660;';
    var sign = up ? '+' : '&minus;';
    var out = '';
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      var w = barWidth(r.cs, mx).toFixed(1);
      var city = esc(r.city);
      if (r.note != null && String(r.note) !== '') {
        city = city + ' · ' + esc(r.note);
      }
      out +=
        '<div>\n' +
        '   <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px;">\n' +
        '     <span style="font-size:10px; font-weight:700; color:#2C3A26; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;">' + esc(r.name) + ' <span style="font-weight:400; color:#85937A;">&middot; ' + city + '</span></span>\n' +
        '     <span style="font-size:10px; font-weight:700; color:#2C3A26; flex-shrink:0; margin-left:8px;">' + sign + num(Math.abs(Number(r.cs))) + ' <span style="color:' + deltaColor + ';">' + arrow + esc(r.pct) + '%</span></span>\n' +
        '   </div>\n' +
        '   <div style="height:7px; background:#D3D7DB; border-radius:2px; overflow:hidden;"><div style="width:' + w + '%; height:100%; background:' + fill + ';"></div></div>\n' +
        ' </div>';
    }
    return out;
  };

  var growerRows = moverRows(growers, true);
  var declinerRows = moverRows(decliners, false);

  return '<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,\'Segoe UI\',Arial,sans-serif;">\n' +
    ' <div style="position:absolute; inset:0; display:flex; flex-direction:column;">\n' +
    '  <div style="flex-shrink:0; padding:16px 34px 10px 34px;">\n' +
    '   <div style="display:flex; align-items:center; justify-content:space-between;">\n' +
    '    <div style="display:flex; align-items:center; gap:10px;"><svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg><span style="font-size:14px; font-weight:700; color:#2C3A26;">ShelfStory</span></div>\n' +
    '    <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">' + esc(D.scopeTag) + '</span>\n' +
    '   </div>\n' +
    '   <div style="height:1px; background:#E4EBDB; margin-top:10px;"></div>\n' +
    '  </div>\n' +
    '  <div style="flex:1; min-height:0; padding:13px 34px 8px 34px; display:flex; flex-direction:column;">\n' +
    '   <div style="flex-shrink:0; display:flex; align-items:flex-end; justify-content:space-between;">\n' +
    '    <div>\n' +
    '     <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; text-transform:uppercase;">03 &middot; ACCOUNT HEALTH</div>\n' +
    '     <div style="font-family:Georgia,\'Times New Roman\',serif; font-weight:700; font-size:25px; color:#2C3A26; margin-top:4px; line-height:1;">Where the book stands</div>\n' +
    '    </div>\n' +
    '    <div style="text-align:right; padding-bottom:2px;">\n' +
    '     <div style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">Book of business</div>\n' +
    '     <div style="font-family:Georgia,\'Times New Roman\',serif; font-weight:700; font-size:20px; color:#2C3A26; line-height:1.05;">' + esc(kpi.accounts) + ' <span style="font-size:12px; font-weight:700; color:#85937A; font-family:system-ui,sans-serif;">accounts</span></div>\n' +
    '    </div>\n' +
    '   </div>\n' +
    '\n' +
    '   <div style="flex-shrink:0; margin-top:13px;">\n' +
    '    <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px;">\n' +
    '     <span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">Share of 90-day volume</span>\n' +
    '     <span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">Healthy vs. needs attention</span>\n' +
    '    </div>\n' +
    '    <div style="display:flex; width:100%; height:30px; border-radius:3px; overflow:hidden;">\n' +
    '     <div style="width:' + goodPct + '%; background:#3F8A5E; display:flex; align-items:center; padding-left:12px; box-sizing:border-box;"><span style="color:#FFFFFF; font-size:14px; font-weight:700; font-family:Georgia,serif;">' + goodPct + '%</span></div>\n' +
    '     <div style="width:' + badPct + '%; background:#B0573A; display:flex; align-items:center; justify-content:flex-end; padding-right:12px; box-sizing:border-box;"><span style="color:#FFFFFF; font-size:14px; font-weight:700; font-family:Georgia,serif;">' + badPct + '%</span></div>\n' +
    '    </div>\n' +
    '    <div style="display:flex; justify-content:space-between; margin-top:6px;">\n' +
    '     <div style="display:flex; align-items:center; gap:6px;"><span style="width:8px; height:8px; border-radius:2px; background:#3F8A5E; display:inline-block;"></span><span style="font-size:10px; font-weight:700; color:#2C3A26;">' + goodPct + '% healthy</span><span style="font-size:9.5px; color:#85937A;">&middot; New + Healthy accounts</span></div>\n' +
    '     <div style="display:flex; align-items:center; gap:6px;"><span style="font-size:9.5px; color:#85937A;">At risk + Lapsed &middot;</span><span style="font-size:10px; font-weight:700; color:#2C3A26;">' + badPct + '% need attention</span><span style="width:8px; height:8px; border-radius:2px; background:#B0573A; display:inline-block;"></span></div>\n' +
    '    </div>\n' +
    '   </div>\n' +
    '\n' +
    '   <div style="flex-shrink:0; margin-top:13px; display:flex; border-top:1px solid #E4EBDB; border-bottom:1px solid #E4EBDB;">\n' +
    '    ' + stripCells + '\n' +
    '   </div>\n' +
    '\n' +
    '   <div style="flex:1; min-height:0; margin-top:14px; display:flex; gap:34px;">\n' +
    '    <div style="flex:1; min-width:0; display:flex; flex-direction:column;">\n' +
    '     <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:9px;"><span style="font-size:10px; font-weight:700; letter-spacing:1.2px; color:#3F8A5E; text-transform:uppercase;">Top growers</span><span style="font-size:9px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">Cases &middot; &#9650;%</span></div>\n' +
    '     <div style="display:flex; flex-direction:column; gap:8px;">' + growerRows + '</div>\n' +
    '    </div>\n' +
    '    <div style="width:1px; background:#E4EBDB; flex-shrink:0;"></div>\n' +
    '    <div style="flex:1; min-width:0; display:flex; flex-direction:column;">\n' +
    '     <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:9px;"><span style="font-size:10px; font-weight:700; letter-spacing:1.2px; color:#B0573A; text-transform:uppercase;">Biggest decliners</span><span style="font-size:9px; font-weight:700; letter-spacing:0.8px; color:#85937A; text-transform:uppercase;">Cases &middot; &#9660;%</span></div>\n' +
    '     <div style="display:flex; flex-direction:column; gap:8px;">' + declinerRows + '</div>\n' +
    '    </div>\n' +
    '   </div>\n' +
    '\n' +
    '   <div style="flex-shrink:0; margin-top:11px; padding-top:9px; border-top:1px solid #E4EBDB; display:flex; gap:9px; align-items:baseline;">\n' +
    '    <span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; color:#3F8A5E; text-transform:uppercase; flex-shrink:0;">Read</span>\n' +
    '    <span style="font-size:11px; color:#5A6A50; line-height:1.4;">' + esc(health.read) + '</span>\n' +
    '   </div>\n' +
    '  </div>\n' +
    '  <div style="flex-shrink:0; border-top:1px solid #E4EBDB; padding:7px 34px 11px 34px;"><div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; font-weight:700; color:#B9C2AE;"><span>ShelfStory &middot; Confidential</span><span>Data thru ' + esc(D.dataThru) + '</span><span>5</span></div></div>\n' +
    ' </div>\n' +
    '</div>';
}

function renderSells(D) {
  D = D || {};
  var S = D.sells || {};
  var esc = function (x) { return (x === null || x === undefined) ? '' : String(x); };
  var fmt1 = function (n) {
    var v = Number(n);
    if (!isFinite(v)) return '0';
    return (Math.round(v * 10) / 10).toString();
  };
  var deltaCell = function (gPct, right) {
    var v = Number(gPct);
    var pos = v >= 0;
    var color = pos ? '#3F8A5E' : '#B0573A';
    var arrow = pos ? '&#9650;' : '&#9660;';
    var mag = Math.abs(v);
    var pad = right ? 'padding:6px 0;' : 'padding:6px 0; border-bottom:1px solid #E4EBDB;';
    return '<td style="text-align:right; ' + pad + ' color:' + color + '; font-weight:700;">' + arrow + mag + '%</td>';
  };

  var channel = Array.isArray(S.channel) ? S.channel : [];
  var region = Array.isArray(S.region) ? S.region : [];
  var area = Array.isArray(S.area) ? S.area : [];
  var income = Array.isArray(S.income) ? S.income : [];
  var benchmark = Number(S.benchmark);
  if (!isFinite(benchmark)) benchmark = 0;

  // ---- CHANNEL TABLE ROWS ----
  // last row is highlighted (background:#D8ECD0) like sample "Mass / Club"
  // highlight the biggest REAL channel (never an "All other" catch-all, which sorts last)
  var lead = 0;
  for (var lj = 0; lj < channel.length; lj++) { if (String(channel[lj].label || '').toLowerCase().indexOf('all other') !== 0) { lead = lj; break; } }
  var channelRows = channel.map(function (r, i) {
    var last = (i === lead);
    if (last) {
      return '<tr style="background:#D8ECD0;">' +
        '<td style="text-align:left; padding:6px 5px 6px 6px; font-weight:700;">' + esc(r.label) + '</td>' +
        '<td style="text-align:right; padding:6px 0;">' + esc(r.cases) + '</td>' +
        (function () {
          var v = Number(r.gPct); var pos = v >= 0;
          var color = pos ? '#3F8A5E' : '#B0573A'; var arrow = pos ? '&#9650;' : '&#9660;';
          return '<td style="text-align:right; padding:6px 0; color:' + color + '; font-weight:700;">' + arrow + Math.abs(v) + '%</td>';
        })() +
        '<td style="text-align:right; padding:6px 0; color:#5A6A50;">' + esc(r.accts) + '</td>' +
        '<td style="text-align:right; padding:6px 5px 6px 0; font-weight:700;">' + esc(r.ros) + '</td>' +
        '</tr>';
    }
    return '<tr>' +
      '<td style="text-align:left; padding:6px 0; border-bottom:1px solid #E4EBDB; font-weight:600;">' + esc(r.label) + '</td>' +
      '<td style="text-align:right; padding:6px 0; border-bottom:1px solid #E4EBDB;">' + esc(r.cases) + '</td>' +
      deltaCell(r.gPct, false) +
      '<td style="text-align:right; padding:6px 0; border-bottom:1px solid #E4EBDB; color:#5A6A50;">' + esc(r.accts) + '</td>' +
      '<td style="text-align:right; padding:6px 0; border-bottom:1px solid #E4EBDB; font-weight:700;">' + esc(r.ros) + '</td>' +
      '</tr>';
  }).join('');

  // ---- REGION TABLE ROWS ----
  // padding 5.5px; last row has no border-bottom
  var regionDelta = function (gPct, last) {
    var v = Number(gPct); var pos = v >= 0;
    var color = pos ? '#3F8A5E' : '#B0573A'; var arrow = pos ? '&#9650;' : '&#9660;';
    var pad = last ? 'padding:5.5px 0;' : 'padding:5.5px 0; border-bottom:1px solid #E4EBDB;';
    return '<td style="text-align:right; ' + pad + ' color:' + color + '; font-weight:700;">' + arrow + Math.abs(v) + '%</td>';
  };
  var regionRows = region.map(function (r, i) {
    var last = (i === region.length - 1);
    var b = last ? '' : ' border-bottom:1px solid #E4EBDB;';
    return '<tr>' +
      '<td style="text-align:left; padding:5.5px 0;' + b + ' font-weight:600;">' + esc(r.label) + '</td>' +
      '<td style="text-align:right; padding:5.5px 0;' + b + '">' + esc(r.cases) + '</td>' +
      regionDelta(r.gPct, last) +
      '<td style="text-align:right; padding:5.5px 0;' + b + ' color:#5A6A50;">' + esc(r.accts) + '</td>' +
      '<td style="text-align:right; padding:5.5px 0;' + b + ' font-weight:700;">' + esc(r.ros) + '</td>' +
      '</tr>';
  }).join('');

  // ---- CHART GEOMETRY (shared with sample) ----
  // baseline y=108, plot top y=24, so 84px plot height.
  // sample scaled val against ~10.5 max; benchmark 8.1 -> y=43.2 => scaleMax = 8.1/((108-43.2)/84) = 10.5
  // Generalize: scaleMax = max(all bar values, benchmark) with 7% headroom, min guard.
  var allVals = [];
  area.forEach(function (r) { var v = Number(r && r.ros); if (isFinite(v)) allVals.push(v); });
  income.forEach(function (r) { var v = Number(r && r.ros); if (isFinite(v)) allVals.push(v); });
  if (isFinite(benchmark)) allVals.push(benchmark);
  var dataMax = allVals.length ? Math.max.apply(null, allVals) : 1;
  var scaleMax = dataMax * 1.07;
  if (!(scaleMax > 0)) scaleMax = 1;

  var PLOT_TOP = 24, BASE = 108, PLOT_H = BASE - PLOT_TOP; // 84
  var yFor = function (val) {
    var v = Number(val); if (!isFinite(v)) v = 0;
    return BASE - (v / scaleMax) * PLOT_H;
  };
  var benchY = yFor(benchmark);
  var benchTag = 'avg ' + fmt1(benchmark);

  // ---- FIGURE 1: BY AREA TYPE ----
  // Sample layout: 3 bars, width 54, x at 30/123/93-step. Columns evenly spaced across viewBox width 300.
  // Sample x centers: 57,150,243 => step 93, first center 57. Generalize by count.
  var areaVB_W = 300, areaVB_H = 132;
  var areaBarW = 54;
  var areaN = area.length;
  var areaBars = area.map(function (r, i) {
    var val = Number(r && r.ros);
    var above = isFinite(val) && val >= benchmark;
    var fill = above ? '#C2922E' : '#D3D7DB';
    // center columns evenly: usable width from ~30..270 (matches sample 57..243 centers)
    var left = 30, rightEdge = 270;
    var cx = areaN > 1 ? (left + (rightEdge - left) * (i / (areaN - 1))) : (left + rightEdge) / 2;
    var x = cx - areaBarW / 2;
    var yTop = yFor(val);
    var h = BASE - yTop;
    if (!(h >= 0)) h = 0;
    var labelY = yTop - 5.6; // sample: bar top minus ~5.6 (29.6->24, 40.8->35, 58.4->53)
    return '' +
      '<rect x="' + (Math.round(x * 100) / 100) + '" y="' + (Math.round(yTop * 100) / 100) + '" width="' + areaBarW + '" height="' + (Math.round(h * 100) / 100) + '" fill="' + fill + '"/>' +
      '<text x="' + (Math.round(cx * 100) / 100) + '" y="' + (Math.round(labelY * 100) / 100) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#2C3A26" font-family="system-ui,Arial,sans-serif">' + fmt1(val) + '</text>' +
      '<text x="' + (Math.round(cx * 100) / 100) + '" y="122" text-anchor="middle" font-size="9" font-weight="700" fill="#5A6A50" font-family="system-ui,Arial,sans-serif">' + esc(r && r.label) + '</text>';
  }).join('');

  // ---- FIGURE 2: BY HOUSEHOLD INCOME ----
  // Sample: 4 bars width 42, x centers 41,111,181,251 => first 41, step 70. Generalize by count.
  var incVB_W = 300, incVB_H = 138;
  var incBarW = 42;
  var incN = income.length;
  var incBars = income.map(function (r, i) {
    var val = Number(r && r.ros);
    var above = isFinite(val) && val >= benchmark;
    var fill = above ? '#C2922E' : '#D3D7DB';
    var left = 41, rightEdge = 251;
    var cx = incN > 1 ? (left + (rightEdge - left) * (i / (incN - 1))) : (left + rightEdge) / 2;
    var x = cx - incBarW / 2;
    var yTop = yFor(val);
    var h = BASE - yTop;
    if (!(h >= 0)) h = 0;
    var labelY = yTop - 5.8; // sample: 56.8->51, 45.6->40, 36.8->31, 26.4->21 (~5.4..5.8)
    return '' +
      '<rect x="' + (Math.round(x * 100) / 100) + '" y="' + (Math.round(yTop * 100) / 100) + '" width="' + incBarW + '" height="' + (Math.round(h * 100) / 100) + '" fill="' + fill + '"/>' +
      '<text x="' + (Math.round(cx * 100) / 100) + '" y="' + (Math.round(labelY * 100) / 100) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#2C3A26" font-family="system-ui,Arial,sans-serif">' + fmt1(val) + '</text>' +
      '<text x="' + (Math.round(cx * 100) / 100) + '" y="121" text-anchor="middle" font-size="8.5" font-weight="700" fill="#5A6A50" font-family="system-ui,Arial,sans-serif">' + esc(r && r.label) + '</text>';
  }).join('');

  var channelTitle = esc(S.channelTitle) || 'By channel';
  var regionTitle = esc(S.regionTitle) || 'By region';
  var read = esc(S.read);
  var scopeTag = esc(D.scopeTag) || 'MISSOURI &middot; QBR &middot; FY26 Q2';
  var dataThru = esc(D.dataThru) || '';

  return `<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="position:absolute; inset:0; display:flex; flex-direction:column;">

    <!-- HEADER -->
    <div style="flex-shrink:0; padding:16px 30px 0 30px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:9px;">
          <svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg>
          <span style="font-size:14px; font-weight:700; color:#2C3A26; letter-spacing:0.2px;">ShelfStory</span>
        </div>
        <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">${scopeTag}</span>
      </div>
      <div style="height:1px; background:#E4EBDB; margin-top:11px;"></div>
    </div>

    <!-- BODY -->
    <div style="flex:1; min-height:0; padding:16px 30px 10px 30px; display:flex; flex-direction:column;">

      <!-- title block -->
      <div style="flex-shrink:0; margin-bottom:12px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; text-transform:uppercase; margin-bottom:5px;">04 &middot; WHERE IT SELLS</div>
        <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:25px; color:#2C3A26; line-height:1.05;">Channel, region & market</div>
      </div>

      <!-- two-column split -->
      <div style="flex:1; min-height:0; display:flex; gap:34px;">

        <!-- LEFT: editorial read + two hairline tables -->
        <div style="flex:1.18; min-width:0; display:flex; flex-direction:column;">

          <!-- editorial read -->
          <div style="font-family:Georgia,'Times New Roman',serif; font-size:13.5px; line-height:1.42; color:#2C3A26; margin-bottom:14px; padding-left:9px; border-left:2px solid #C2D6B4;">
            ${read}
          </div>

          <!-- CHANNEL TABLE -->
          <div style="margin-bottom:15px;">
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:6px;">${channelTitle}</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="color:#85937A; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;">
                  <th style="text-align:left; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">Category</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">90D cs</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">&Delta;%</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">Accts</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">ROS</th>
                </tr>
              </thead>
              <tbody>
                ${channelRows}
              </tbody>
            </table>
          </div>

          <!-- REGION TABLE -->
          <div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:6px;">${regionTitle}</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="color:#85937A; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;">
                  <th style="text-align:left; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">Category</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">90D cs</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">&Delta;%</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">Accts</th>
                  <th style="text-align:right; padding:0 0 4px 0; border-bottom:1px solid #C2D6B4; font-weight:700;">ROS</th>
                </tr>
              </thead>
              <tbody>
                ${regionRows}
              </tbody>
            </table>
          </div>

        </div>

        <!-- vertical hairline divider -->
        <div style="width:1px; background:#E4EBDB; flex-shrink:0;"></div>

        <!-- RIGHT: market ROS figures -->
        <div style="flex:1; min-width:0; display:flex; flex-direction:column;">

          <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#85937A; margin-bottom:2px;">Market &middot; rate of sale</div>
          <div style="font-size:9px; color:#85937A; margin-bottom:12px;">cases / month per account &middot; benchmark ${benchTag}</div>

          <!-- FIGURE 1: area type -->
          <div style="margin-bottom:18px;">
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#5A6A50; margin-bottom:6px;">By area type</div>
            <svg viewBox="0 0 ${areaVB_W} ${areaVB_H}" style="width:100%; height:auto; display:block;">
              <line x1="6" y1="108" x2="294" y2="108" stroke="#C2D6B4" stroke-width="1"/>
              <line x1="6" y1="${Math.round(benchY * 100) / 100}" x2="270" y2="${Math.round(benchY * 100) / 100}" stroke="#5A6A50" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="294" y="${Math.round((benchY - 2.2) * 100) / 100}" text-anchor="end" font-size="8" font-weight="700" fill="#5A6A50" font-family="system-ui,Arial,sans-serif">${benchTag}</text>
              ${areaBars}
            </svg>
          </div>

          <!-- FIGURE 2: household income -->
          <div>
            <div style="font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#5A6A50; margin-bottom:6px;">By household income</div>
            <svg viewBox="0 0 ${incVB_W} ${incVB_H}" style="width:100%; height:auto; display:block;">
              <line x1="6" y1="108" x2="294" y2="108" stroke="#C2D6B4" stroke-width="1"/>
              <line x1="6" y1="${Math.round(benchY * 100) / 100}" x2="270" y2="${Math.round(benchY * 100) / 100}" stroke="#5A6A50" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="294" y="${Math.round((benchY - 2.2) * 100) / 100}" text-anchor="end" font-size="8" font-weight="700" fill="#5A6A50" font-family="system-ui,Arial,sans-serif">${benchTag}</text>
              ${incBars}
            </svg>
          </div>

        </div>

      </div>

    </div>

    <!-- FOOTER -->
    <div style="flex-shrink:0;">
      <div style="height:1px; background:#E4EBDB;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 30px 10px 30px; font-size:8px; color:#B9C2AE; font-weight:600;">
        <span>ShelfStory &middot; Confidential</span>
        <span>Data thru ${dataThru}</span>
        <span>6</span>
      </div>
    </div>

  </div>
</div>`;
}

function renderExec(D) {
  var E = D || {};
  var exec = E.exec || {};
  var esc = function (s) { return s == null ? "" : String(s); };
  var headwinds = Array.isArray(exec.headwinds) ? exec.headwinds : [];
  var opps = Array.isArray(exec.opps) ? exec.opps : [];

  var col = function (items, num) {
    var out = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var last = i === items.length - 1;
      var mb = last ? "" : " margin-bottom:12px;";
      out +=
        '<div style="display:flex; gap:10px;' + mb + '">' +
          '<div style="flex-shrink:0; width:19px; height:19px; border-radius:50%; background:' + num.bg + '; color:' + num.fg + '; font-family:Georgia,serif; font-weight:700; font-size:11px; display:flex; align-items:center; justify-content:center; margin-top:1px;">' + (i + 1) + '</div>' +
          '<div>' +
            '<div style="font-size:12.5px; font-weight:700; color:#2C3A26; line-height:1.25;">' + esc(it.t) + '</div>' +
            '<div style="font-size:10px; color:#5A6A50; line-height:1.4; margin-top:2px;">' + esc(it.d) + '</div>' +
          '</div>' +
        '</div>';
    }
    return out;
  };

  var headwindsHtml = col(headwinds, { bg: "#F1DDD2", fg: "#B0573A" });
  var oppsHtml = col(opps, { bg: "#D8ECD0", fg: "#3F8A5E" });

  return `<div style="width:100%; aspect-ratio:11 / 8.5; background:#FFFFFF; box-sizing:border-box; position:relative; overflow:hidden; color:#2C3A26; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="position:absolute; inset:0; display:flex; flex-direction:column;">

    <!-- HEADER -->
    <div style="flex-shrink:0; padding:20px 34px 0 34px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:9px;">
          <svg viewBox="0 0 64 48" style="width:30px;height:23px"><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke="#3F8A5E" stroke-width="2.4" stroke-linejoin="round"/><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke="#4A9068" stroke-width="2.6" stroke-linecap="round"/></svg>
          <span style="font-size:14px; font-weight:700; color:#2C3A26; letter-spacing:0.2px;">ShelfStory</span>
        </div>
        <span style="font-size:9px; font-weight:700; letter-spacing:1.6px; color:#85937A;">${esc(E.scopeTag)}</span>
      </div>
      <div style="height:1px; background:#E4EBDB; margin-top:11px;"></div>
    </div>

    <!-- BODY -->
    <div style="flex:1; min-height:0; padding:16px 34px 8px 34px; display:flex; flex-direction:column;">

      <!-- Title block -->
      <div style="flex-shrink:0; margin-bottom:14px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E;">05 · EXECUTIVE SUMMARY</div>
        <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; color:#2C3A26; font-size:27px; line-height:1.04; margin-top:5px;">Headwinds & opportunities</div>
      </div>

      <!-- Two columns -->
      <div style="flex:1; min-height:0; display:flex;">

        <!-- HEADWINDS -->
        <div style="flex:1; min-width:0; padding-right:26px; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:11px;">
            <span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#B0573A;">Headwinds</span>
            <span style="flex:1; height:2px; background:#F1DDD2;"></span>
          </div>

          ${headwindsHtml}
        </div>

        <!-- vertical divider -->
        <div style="flex-shrink:0; width:1px; background:#E4EBDB;"></div>

        <!-- OPPORTUNITIES -->
        <div style="flex:1; min-width:0; padding-left:26px; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:11px;">
            <span style="font-size:9.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#3F8A5E;">Opportunities</span>
            <span style="flex:1; height:2px; background:#D8ECD0;"></span>
          </div>

          ${oppsHtml}
        </div>
      </div>

      <!-- THE ASK band -->
      <div style="flex-shrink:0; margin-top:14px; background:#F4F8EF; border-top:2px solid #C2D6B4; padding:13px 18px; display:flex; align-items:center; gap:18px;">
        <div style="flex-shrink:0; font-size:10px; font-weight:700; letter-spacing:2.4px; color:#3F8A5E; writing-mode:vertical-rl; transform:rotate(180deg); text-align:center;">THE ASK</div>
        <div style="flex-shrink:0; width:1px; align-self:stretch; background:#C2D6B4;"></div>
        <div style="font-family:Georgia,'Times New Roman',serif; font-size:15.5px; line-height:1.34; color:#2C3A26; font-weight:400;">${esc(exec.ask)}</div>
      </div>

      <!-- signature -->
      <div style="flex-shrink:0; margin-top:9px; font-size:9px; color:#85937A; font-style:italic; letter-spacing:0.2px;">${esc(exec.signature)}</div>

    </div>

    <!-- FOOTER -->
    <div style="flex-shrink:0; padding:0 34px 12px 34px;">
      <div style="height:1px; background:#E4EBDB;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:8px; color:#B9C2AE; font-weight:600;">
        <span>ShelfStory · Confidential</span>
        <span>Data thru ${esc(E.dataThru)}</span>
        <span>7</span>
      </div>
    </div>

  </div>
</div>`;
}

export function buildDeckSlides(D) {
  try { return [renderCover(D), renderContents(D), renderPulse(D), renderItems(D), renderHealth(D), renderSells(D), renderExec(D)]; }
  catch (e) { if (typeof console !== "undefined") console.error("deck build error", e); return []; }
}
