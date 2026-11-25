/* ============================================================
   Hub 航线速查 · 结构化数据查询与地图（零费用本地方案）
   数据：assets/routes.json（人工维护，季度核验）
   ============================================================ */
(function () {
  'use strict';

  var DATA = null;
  var state = { seg: 'all', q: '' };

  var SEG_NAMES = { p: '🧊 极地', o: '🚢 跨洋大船', r: '🛶 内河河轮', a: '🎌 日本及东亚' };
  var SEG_NAMES_EN = { p: 'Polar', o: 'Ocean', r: 'River', a: 'Japan & East Asia' };

  function load() {
    if (DATA) return Promise.resolve(DATA);
    return fetch('assets/routes.json').then(function (r) { return r.json(); })
      .then(function (d) { DATA = d; return d; });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 筛选 ---------- */
  function filtered() {
    if (!DATA) return [];
    var q = state.q.trim().toLowerCase();
    return DATA.routes.filter(function (r) {
      if (state.seg !== 'all' && r.seg !== state.seg) return false;
      if (!q) return true;
      var blob = (r.line + r.lineEn + r.ship + r.shipEn + r.region + r.regionEn + r.port + r.hl).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }

  /* ---------- 渲染列表 ---------- */
  function render() {
    var list = filtered();
    var box = document.getElementById('routes-list');
    var stat = document.getElementById('routes-stat');
    if (!box) return;
    stat.textContent = '共 ' + list.length + ' 条典型航线参考' + (DATA ? ' · 数据更新于 ' + (DATA.updated || '') : '');
    if (!list.length) {
      box.innerHTML = '<p class="tool-empty">没有匹配的航线。试试换关键词，或清空筛选。</p>';
      renderMap();
      return;
    }
    var html = list.map(function (r, i) {
      var idx = DATA.routes.indexOf(r);
      return '<details class="co"' + (i === 0 ? ' open' : '') + '>' +
        '<summary><span class="co-name">' + esc(r.line) + ' · ' + esc(r.ship) +
        '<span class="en-sub">' + esc(r.region) + '</span></span>' +
        '<span class="co-chips"><span class="chip">' + SEG_NAMES[r.seg] + '</span>' +
        '<span class="chip gold">' + esc(r.days) + '</span>' +
        '<span class="chip">' + esc(r.season) + '</span></span>' +
        '<span class="co-arrow">▼</span></summary>' +
        '<div class="co-body">' +
        '<p><strong>出发港：</strong>' + esc(r.port) + '<span class="en-sub">' + esc(r.regionEn) + '</span></p>' +
        '<p><strong>亮点：</strong>' + esc(r.hl) + '</p>' +
        '<p><a href="' + esc(r.url) + '" target="_blank" rel="noopener">🚢 ' + esc(r.lineEn) + ' 官网直达 →</a></p>' +
        '</div></details>';
    }).join('');
    box.innerHTML = html;
    renderMap();
  }

  /* ---------- 地图（Cruisemapper 风格：深色底图 + 船司着色 + 典型航线弧线） ---------- */
  var MAP = null, LAYER = null;
  function lineColor(line) {
    var h = 0;
    for (var i = 0; i < line.length; i++) h = (h * 31 + line.charCodeAt(i)) >>> 0;
    return 'hsl(' + (h % 360) + ',72%,58%)';
  }
  function regionPoint(r) {
    var t = (r.region || '') + (r.regionEn || '');
    if (/南极|罗斯海|威德尔|南极点/.test(t)) return [-64, -62];
    if (/南乔治亚/.test(t)) return [-55, -37];
    if (/斯瓦尔巴|北极/.test(t)) return [78.2, 15.6];
    if (/西加勒比/.test(t)) return [17, -88];
    if (/加勒比/.test(t)) return [15, -68];
    if (/阿拉斯加/.test(t)) return [57, -148];
    if (/五大湖/.test(t)) return [45, -80];
    if (/长江|三峡/.test(t)) return [30.8, 110];
    if (/湄公/.test(t)) return [12.5, 105];
    if (/莱茵/.test(t)) return [50.1, 7.6];
    if (/多瑙/.test(t)) return [47.6, 19.1];
    if (/罗讷|波河/.test(t)) return [45.3, 4.9];
    if (/地中海/.test(t)) return [37, 8];
    if (/日本|日韩/.test(t)) return [34.5, 137];
    if (/东南亚|新加坡/.test(t)) return [7, 106];
    if (/环球/.test(t)) return [0, -30];
    if (/东亚|国内|沿海|短线/.test(t)) return [30, 124];
    return [25, 45];
  }
  function arcPoints(a, b, n) {
    var toR = Math.PI / 180, dLon = (b[1] - a[1]) * toR;
    var f1 = a[0] * toR, l1 = a[1] * toR, f2 = b[0] * toR, l2 = b[1] * toR;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((f2 - f1) / 2), 2) + Math.cos(f1) * Math.cos(f2) * Math.pow(Math.sin((l2 - l1) / 2), 2)));
    if (d === 0 || isNaN(d)) return [a, b];
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var f = i / n;
      var A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
      var y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
      var z = A * Math.sin(f1) + B * Math.sin(f2);
      pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / toR, Math.atan2(y, x) / toR]);
    }
    return pts;
  }
  function unwrap(pts) {
    for (var i = 1; i < pts.length; i++) {
      var d = pts[i][1] - pts[i - 1][1];
      if (d > 180) pts[i][1] -= 360 * Math.ceil((d - 180) / 360);
      else if (d < -180) pts[i][1] += 360 * Math.ceil((-d - 180) / 360);
    }
    return pts;
  }
  // 在 ±180° 日期变更线处切断弧线，各段经度折回 [-180,180]，保证弧线始终绘制在主世界内
  function splitAtDateline(pts) {
    var unwrapped = unwrap(pts);
    var segs = [], cur = [];
    function wrapLon(l) { return ((l + 180) % 360 + 360) % 360 - 180; }
    for (var i = 0; i < unwrapped.length; i++) {
      var p = unwrapped[i];
      if (i > 0) {
        var prev = unwrapped[i - 1];
        if (Math.abs(p[1] - prev[1]) > 180) {
          cur.push([p[0], p[1] > 0 ? 180 : -180]);
          segs.push(cur);
          cur = [[p[0], p[1] > 0 ? -180 : 180]];
        }
      }
      cur.push([p[0], wrapLon(p[1])]);
    }
    if (cur.length) segs.push(cur);
    return segs;
  }
  function renderMap() {
    var wrap = document.getElementById('routes-map');
    if (!wrap) return;
    if (typeof window.L === 'undefined') { wrap.style.display = 'none'; return; }
    if (!MAP) {
      MAP = window.L.map('routes-map', {
        scrollWheelZoom: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
        minZoom: 1
      }).setView([15, 55], 1);
      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri — Dark Gray Canvas', maxZoom: 10
      }).addTo(MAP);
      LAYER = window.L.layerGroup().addTo(MAP);
    }
    LAYER.clearLayers();
    filtered().forEach(function (r) {
      if (typeof r.lat !== 'number') return;
      var col = lineColor(r.line);
      var dest = regionPoint(r);
      var segs = splitAtDateline(arcPoints([r.lat, r.lng], dest, 48));
      segs.forEach(function (seg) {
        window.L.polyline(seg, { color: col, weight: 2, opacity: 0.75, dashArray: '4 6' }).addTo(LAYER);
      });
      window.L.circleMarker(dest, { radius: 4, color: col, fillColor: col, fillOpacity: 0.7, weight: 1 })
        .addTo(LAYER)
        .bindTooltip('▸ ' + r.region, { direction: 'top' });
      var m = window.L.circleMarker([r.lat, r.lng], { radius: 8, color: '#0b1220', weight: 2, fillColor: col, fillOpacity: 1 })
        .addTo(LAYER);
      m.bindPopup(
        '<div style="min-width:210px"><b style="font-size:14px">🚢 ' + esc(r.ship) + '</b> <span style="color:' + col + '">' + esc(r.line) + '</span><br>' +
        '<span style="font-size:12px">' + esc(r.regionEn || '') + '</span><br>' +
        '<span style="font-size:12px;color:#888">' + esc(r.season) + ' · ' + esc(r.days) + '</span><br>' +
        '<span style="font-size:12px">📍 出发港：' + esc(r.port) + '</span><br>' +
        '<span style="font-size:12px">' + esc(r.hl) + '</span><br>' +
        '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">官网直达 →</a></div>'
      );
      m.bindTooltip('🚢 ' + r.ship + ' · ' + r.line, { direction: 'top' });
    });
    setTimeout(function () { MAP.invalidateSize(); }, 300);
  }

  /* ---------- 初始化 ---------- */
  load().then(function () {
    var chips = document.getElementById('routes-cats');
    if (chips) {
      var mk = function (key, label) {
        var b = document.createElement('button');
        b.className = 'chip quiz-cat' + (state.seg === key ? ' active' : '');
        b.textContent = label;
        b.onclick = function () { state.seg = key; syncChips(); render(); };
        chips.appendChild(b);
      };
      mk('all', '全部');
      Object.keys(SEG_NAMES).forEach(function (k) {
        var n = DATA.routes.filter(function (r) { return r.seg === k; }).length;
        mk(k, SEG_NAMES[k] + ' ' + n);
      });
      function syncChips() {
        chips.querySelectorAll('.quiz-cat').forEach(function (b, i) {
          var key = ['all'].concat(Object.keys(SEG_NAMES))[i];
          b.classList.toggle('active', state.seg === key);
        });
      }
    }
    var search = document.getElementById('routes-search');
    if (search) {
      search.addEventListener('input', function () { state.q = search.value; render(); });
    }
    render();
  }).catch(function () {
    var box = document.getElementById('routes-list');
    if (box) box.innerHTML = '<p class="tool-empty">航线数据加载失败，请刷新重试。</p>';
  });
})();
