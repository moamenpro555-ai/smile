/* ============================================================
   jaw-chart.js — مخطط الأسنان على شكل فكّين حقيقيين (منظر من فوق)
   JawChart.render(statusOf, labelOf) → نص SVG
     statusOf(n)  بيرجّع حالة السنة (healthy | cavity | filling | root | crown | implant | missing)
     labelOf(st)  بيرجّع اسم الحالة بالعربي (للـ tooltip)
   كل سنة عبارة عن <g class="jaw-tooth" data-t="رقم السنة"> قابلة للضغط.
   ============================================================ */
(function (g) {
  'use strict';
  var S = 4.4;                       // مقياس الرسم
  // عرض (مسافة بين الأسنان على طول الفك) وعمق كل سنة بالملّي — حسب نوعها (الرقم الثاني في ترقيم FDI)
  var W = {
    up: { 1: 8.5, 2: 6.5, 3: 7.6, 4: 7, 5: 6.6, 6: 10.6, 7: 9.4, 8: 8.6 },
    low: { 1: 5.4, 2: 6, 3: 7, 4: 7, 5: 7.1, 6: 11, 7: 10.6, 8: 10 }
  };
  var D = {
    up: { 1: 7, 2: 6.6, 3: 8.4, 4: 9, 5: 9.2, 6: 11.6, 7: 11, 8: 10.4 },
    low: { 1: 6, 2: 6.4, 3: 7.8, 4: 8.2, 5: 8.8, 6: 10.8, 7: 10.2, 8: 9.6 }
  };
  var CX = 270;                       // منتصف الرسم
  var HW = 140, DEPTH = 260, POW = 2.6; // شكل حدوة الحصان: نصف العرض، العمق، حدّة الانحناء

  function f(n) { return Math.round(n * 100) / 100; }

  /* ---------- شكل التاج + الشقوق لكل نوع سنة (إحداثيات محلية، الشفة/الخد ناحية -y) ---------- */
  function shapes(kind, w, d) {
    var a = w / 2, b = d / 2, c, fis;
    if (kind === 1 || kind === 2) {            // قاطعة
      c = 'M' + f(-a) + ' 0C' + f(-a) + ' ' + f(-b * 1.05) + ' ' + f(-a * .45) + ' ' + f(-b) + ' 0 ' + f(-b) +
        'C' + f(a * .45) + ' ' + f(-b) + ' ' + f(a) + ' ' + f(-b * 1.05) + ' ' + f(a) + ' 0' +
        'C' + f(a) + ' ' + f(b * .8) + ' ' + f(a * .55) + ' ' + f(b) + ' 0 ' + f(b) +
        'C' + f(-a * .55) + ' ' + f(b) + ' ' + f(-a) + ' ' + f(b * .8) + ' ' + f(-a) + ' 0Z';
      fis = 'M' + f(-a * .55) + ' ' + f(-b * .15) + 'Q0 ' + f(b * .05) + ' ' + f(a * .55) + ' ' + f(-b * .15);
    } else if (kind === 3) {                   // ناب: مدبّب ناحية الخد
      c = 'M' + f(-a) + ' ' + f(b * .15) + 'C' + f(-a) + ' ' + f(-b * .45) + ' ' + f(-a * .3) + ' ' + f(-b * 1.05) + ' 0 ' + f(-b * 1.12) +
        'C' + f(a * .3) + ' ' + f(-b * 1.05) + ' ' + f(a) + ' ' + f(-b * .45) + ' ' + f(a) + ' ' + f(b * .15) +
        'C' + f(a) + ' ' + f(b * .75) + ' ' + f(a * .5) + ' ' + f(b) + ' 0 ' + f(b) +
        'C' + f(-a * .5) + ' ' + f(b) + ' ' + f(-a) + ' ' + f(b * .75) + ' ' + f(-a) + ' ' + f(b * .15) + 'Z';
      fis = 'M0 ' + f(-b * .75) + 'L0 ' + f(b * .45);
    } else if (kind === 4 || kind === 5) {     // ضرس صغير: بيضاوي بتلم بين رأسين
      c = 'M' + f(-a) + ' 0C' + f(-a) + ' ' + f(-b * .62) + ' ' + f(-a * .55) + ' ' + f(-b) + ' 0 ' + f(-b) +
        'C' + f(a * .55) + ' ' + f(-b) + ' ' + f(a) + ' ' + f(-b * .62) + ' ' + f(a) + ' 0' +
        'C' + f(a) + ' ' + f(b * .62) + ' ' + f(a * .55) + ' ' + f(b) + ' 0 ' + f(b) +
        'C' + f(-a * .55) + ' ' + f(b) + ' ' + f(-a) + ' ' + f(b * .62) + ' ' + f(-a) + ' 0Z';
      fis = 'M' + f(-a * .55) + ' ' + f(b * .05) + 'Q0 ' + f(-b * .1) + ' ' + f(a * .55) + ' ' + f(b * .05) +
        'M' + f(-a * .22) + ' ' + f(-b * .25) + 'L' + f(-a * .22) + ' ' + f(b * .3) + 'M' + f(a * .22) + ' ' + f(-b * .25) + 'L' + f(a * .22) + ' ' + f(b * .3);
    } else {                                   // ضرس كبير: شبه مربع بأركان مدوّرة وشق متقاطع
      c = 'M' + f(-a) + ' 0C' + f(-a) + ' ' + f(-b * .72) + ' ' + f(-a * .72) + ' ' + f(-b) + ' 0 ' + f(-b) +
        'C' + f(a * .72) + ' ' + f(-b) + ' ' + f(a) + ' ' + f(-b * .72) + ' ' + f(a) + ' 0' +
        'C' + f(a) + ' ' + f(b * .72) + ' ' + f(a * .72) + ' ' + f(b) + ' 0 ' + f(b) +
        'C' + f(-a * .72) + ' ' + f(b) + ' ' + f(-a) + ' ' + f(b * .72) + ' ' + f(-a) + ' 0Z';
      fis = 'M' + f(-a * .62) + ' ' + f(-b * .08) + 'Q0 ' + f(b * .14) + ' ' + f(a * .62) + ' ' + f(-b * .08) +
        'M' + f(a * .04) + ' ' + f(-b * .62) + 'Q' + f(a * .16) + ' 0 ' + f(-a * .04) + ' ' + f(b * .62);
    }
    return { crown: c, fissure: fis };
  }

  /* ---------- منحنى الفك (نقاط كثيرة + طول القوس) ---------- */
  function curve() {
    var pts = [], len = 0, u, prev = null, N = 900, UMAX = 1.5;
    for (var i = 0; i <= N; i++) {
      u = UMAX * i / N;
      var p = { x: HW * u, y: DEPTH * Math.pow(u, POW) };
      if (prev) len += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
      p.s = len; pts.push(p); prev = p;
    }
    return pts;
  }
  var CURVE = curve();
  function at(s) {                    // نقطة + اتجاه المماس عند مسافة s من منتصف الفك
    var i = 1;
    while (i < CURVE.length - 1 && CURVE[i].s < s) i++;
    var a = CURVE[i - 1], b = CURVE[i], t = (s - a.s) / ((b.s - a.s) || 1);
    var dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: dx / l, ty: dy / l };
  }

  function archTeeth(order, jaw, apexY, dir) {
    // order: ترتيب الأرقام من أقصى يمين المريض لأقصى يساره (زي ما بتتعرض)
    var key = jaw === 'up' ? 'up' : 'low', out = [];
    var right = order.slice(0, 8).reverse(), left = order.slice(8); // كل جهة من منتصف الفك للخلف
    [[left, 1], [right, -1]].forEach(function (side) {
      var s = 0;
      side[0].forEach(function (n) {
        var kind = n % 10, w = W[key][kind] * S, d = D[key][kind] * S;
        var p = at(s + w / 2); s += w;
        // اتجاه الفك: الفك العلوي قمته فوق، والسفلي قمته تحت
        var px = CX + side[1] * p.x, py = apexY + dir * p.y;
        var tx = side[1] * p.tx, ty = dir * p.ty;       // مماس مُنعكس
        // محور y المحلي = عمودي على المماس، ونضبطه إن اتجاه (-y) يبقى ناحية الخد/الشفة (بعيد عن مركز الفك)
        var nx = -ty, ny = tx, ox = px - CX, oy = py - (apexY + dir * DEPTH * .62);
        if ((-nx) * ox + (-ny) * oy < 0) { nx = -nx; ny = -ny; }
        out.push({ n: n, kind: kind, w: w, d: d, x: px, y: py, a: tx, b: ty, c: nx, e: ny });
      });
    });
    return out;
  }

  /* ---------- الرسم ---------- */
  function render(statusOf, labelOf) {
    var UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    var LOW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    var top = 44, upApex = top + 22;
    var up = archTeeth(UP, 'up', upApex, 1);
    var upBottom = Math.max.apply(null, up.map(function (t) { return t.y + t.d / 2; }));
    var gapY = 104;
    var lowApex = upBottom + gapY + DEPTH * 0 + 0;
    // الفك السفلي مرآة رأسية: القمة تحت
    var lowTop = upBottom + gapY;
    var lowProbe = archTeeth(LOW, 'low', 0, -1);
    var lowReach = Math.max.apply(null, lowProbe.map(function (t) { return -t.y + t.d / 2; })); // أقصى ارتفاع فوق القمة
    lowApex = lowTop + lowReach + 4;
    var low = archTeeth(LOW, 'low', lowApex, -1);
    var H = lowApex + 50;

    var REACH = [8.5, 6.5, 7.6, 7, 6.6, 10.6, 9.4, 8.6].reduce(function (x, y) { return x + y; }, 0) * S + 8;
    function gum(apexY, dir) {
      var pts = [];
      for (var q = 0; q <= REACH; q += 5) { var p = at(q); pts.push([p.x, p.y]); }
      var pl = at(REACH);
      var right = pts.map(function (p) { return [CX + p[0], apexY + dir * p[1]]; });
      var left = pts.map(function (p) { return [CX - p[0], apexY + dir * p[1]]; });
      var line = left.slice().reverse().concat(right);
      var d = 'M' + line.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L');
      var endY = apexY + dir * pl.y;
      // الحنك/اللسان: المنطقة اللي جوه الفك، بتتقفل بمنحنى ناعم ناحية البلعوم
      var palate = d + 'Q' + CX + ' ' + f(endY + dir * 70) + ' ' + f(CX - pl.x) + ' ' + f(endY) + 'Z';
      return '<path d="' + palate + '" fill="url(#palate' + (dir === 1 ? 'U' : 'L') + ')" stroke="none"/>' +
        '<path d="' + d + '" fill="none" stroke="#e58b97" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" stroke="#f5b3bc" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" stroke="#f9ced3" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>';
    }

    function tooth(t) {
      var st = statusOf(t.n) || 'healthy', sh = shapes(t.kind, t.w, t.d);
      var m = 'matrix(' + f(t.a) + ' ' + f(t.b) + ' ' + f(t.c) + ' ' + f(t.e) + ' ' + f(t.x) + ' ' + f(t.y) + ')';
      return '<g class="jaw-tooth st-' + st + '" data-t="' + t.n + '" tabindex="0" role="button" aria-label="سنة ' + t.n + '">' +
        '<title>سنة ' + t.n + ' — ' + labelOf(st) + '</title>' +
        '<g transform="' + m + '"><path class="crown" d="' + sh.crown + '"/>' +
        '<path class="shine" d="' + sh.crown + '" fill="url(#shine)"/>' +
        '<path class="fissure" d="' + sh.fissure + '"/></g></g>';
    }
    function label(t, dir) {
      // رقم السنة برا الفك (ناحية الخد)
      var off = t.d / 2 + 17;
      var lx = t.x - t.c * off, ly = t.y - t.e * off;
      return '<text class="jaw-num" x="' + f(lx) + '" y="' + f(ly + 4) + '" text-anchor="middle">' + t.n + '</text>';
    }

    var svg = '<svg class="jaw-svg" viewBox="0 0 ' + (CX * 2) + ' ' + f(H) + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="مخطط الأسنان">' +
      '<defs>' +
      '<radialGradient id="enamel" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f7f1e3"/><stop offset="1" stop-color="#e6d9bb"/></radialGradient>' +
      '<radialGradient id="shine" cx=".34" cy=".28" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="paletteU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde6e9"/><stop offset="1" stop-color="#fde6e9" stop-opacity=".25"/></linearGradient>' +
      '<linearGradient id="paletteL" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fde6e9"/><stop offset="1" stop-color="#fde6e9" stop-opacity=".25"/></linearGradient>' +
      '</defs>' +
      gum(upApex, 1) + gum(lowApex, -1) +
      up.map(tooth).join('') + low.map(tooth).join('') +
      up.map(function (t) { return label(t, 1); }).join('') + low.map(function (t) { return label(t, -1); }).join('') +
      '<text class="jaw-cap" x="' + CX + '" y="' + f(upApex + DEPTH * .5) + '" text-anchor="middle">الفك العلوي</text>' +
      '<text class="jaw-cap" x="' + CX + '" y="' + f(lowApex - DEPTH * .5) + '" text-anchor="middle">الفك السفلي</text>' +
      '<text class="jaw-side" x="14" y="' + f(H / 2) + '" text-anchor="start">يمين المريض</text>' +
      '<text class="jaw-side" x="' + (CX * 2 - 14) + '" y="' + f(H / 2) + '" text-anchor="end">يسار المريض</text>' +
      '</svg>';
    return svg;
  }

  g.JawChart = { render: render };
})(window);
