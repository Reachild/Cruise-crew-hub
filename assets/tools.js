/* Hub 工具箱 · 薪资计算器 / 证件倒计时 / 话术检索 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ① 薪资计算器 ---------- */
  var POSITIONS = [
    { cn: '客房管家', en: 'Stateroom Attendant', base: [900, 1300], tips: [0, 0], note: '固定薪资，无小费' },
    { cn: '助理服务生', en: 'Assistant Waiter', base: [700, 1000], tips: [900, 1600], note: '底薪+团队小费池' },
    { cn: '餐厅服务生', en: 'Waiter / Waitress', base: [1200, 1600], tips: [1500, 2500], note: '底薪+小费，收入天花板较高' },
    { cn: '前台接待', en: 'Guest Services Officer', base: [1400, 1900], tips: [0, 200], note: '固定薪资为主' },
    { cn: '免税店销售', en: 'Retail Sales Associate', base: [1300, 1800], tips: [200, 800], note: '底薪+销售提成' },
    { cn: '初级厨师', en: 'Commis', base: [900, 1300], tips: [0, 0], note: '固定薪资' },
    { cn: '管事部员（洗碗工）', en: 'Galley Utility', base: [600, 900], tips: [0, 0], note: '固定薪资，门槛最低' },
    { cn: '娱乐员工', en: 'Cruise Staff', base: [1100, 1500], tips: [0, 300], note: '固定薪资为主' },
    { cn: '荷官', en: 'Casino Dealer', base: [1200, 1700], tips: [300, 1000], note: '底薪+Tokes 牌桌分成' },
    { cn: '摄影师', en: 'Photographer', base: [1000, 1400], tips: [300, 900], note: '多为外包特许经营，底薪+销售提成' }
  ];
  var sel = $('sal-position');
  if (sel) {
    POSITIONS.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = p.cn + ' / ' + p.en;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      var p = POSITIONS[sel.value];
      $('sal-note').textContent = p.base[0] + '–' + p.base[1] + ' USD 底薪' + (p.tips[1] ? '，另加小费/提成 ' + p.tips[0] + '–' + p.tips[1] + ' USD' : '') + '；' + p.note;
    };
    sel.onchange();
    $('sal-calc').onclick = function () {
      var p = POSITIONS[sel.value];
      var months = parseFloat($('sal-months').value) || 6;
      var fx = parseFloat($('sal-fx').value) || 7.2;
      var lo = p.base[0] + p.tips[0], hi = p.base[1] + p.tips[1];
      var totalLo = Math.round(lo * months), totalHi = Math.round(hi * months);
      $('sal-result').innerHTML =
        '月综合收入：<strong>' + lo + '–' + hi + ' USD</strong>（≈ ' + (lo * fx).toFixed(0) + '–' + (hi * fx).toFixed(0) + ' 元人民币）<br>' +
        months + ' 个月合同预计总收入：<strong>' + totalLo.toLocaleString() + '–' + totalHi.toLocaleString() + ' USD</strong>（≈ ' + Math.round(totalLo * fx / 10000 * 10) / 10 + '–' + Math.round(totalHi * fx / 10000 * 10) / 10 + ' 万元）<br>' +
        '<span class="muted">※ 船上包食宿、通勤，实际可储蓄比例远高于岸上同等薪资；小费随航线（美线/欧线）与船司政策波动较大，仅供参考。</span>';
    };
  }

  /* ---------- ② 证件有效期倒计时 ---------- */
  var KEY = 'hub_certs_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function render() {
    var list = load(), box = $('cert-list');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="tool-empty">暂无证件记录，添加第一张吧（数据仅保存在本机浏览器，不上传服务器）</div>';
      return;
    }
    var today = new Date(); today.setHours(0, 0, 0, 0);
    list.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    box.innerHTML = list.map(function (c, i) {
      var d = Math.round((new Date(c.date) - today) / 86400000);
      var cls = d < 0 ? 'cert-expired' : d < 90 ? 'cert-danger' : d < 180 ? 'cert-warn' : 'cert-ok';
      var label = d < 0 ? '已过期 ' + (-d) + ' 天' : d + ' 天';
      var warn = d < 180 ? ' ⚠️ 建议尽快续办/换新' : '';
      return '<div class="cert-item"><span class="cert-name">' + c.name + '</span>' +
        '<span class="cert-date muted">' + c.date + '</span>' +
        '<span class="cert-badge ' + cls + '">' + label + '</span>' +
        '<button class="cert-del" data-i="' + i + '" title="删除">✕</button></div>' + (warn ? '<div class="muted" style="font-size:12px;margin:-4px 0 8px 12px;">⚠️ ' + c.name + ' 建议尽快续办或换新</div>' : '');
    }).join('');
    box.querySelectorAll('.cert-del').forEach(function (b) {
      b.onclick = function () { var l = load(); l.splice(parseInt(b.dataset.i), 1); save(l); render(); };
    });
  }
  if ($('cert-add')) {
    $('cert-add').onclick = function () {
      var name = $('cert-name').value.trim(), date = $('cert-date').value;
      if (!name || !date) return;
      var list = load(); list.push({ name: name, date: date }); save(list);
      $('cert-name').value = ''; $('cert-date').value = ''; render();
    };
    render();
  }

  /* ---------- ③ 话术检索 ---------- */
  var PHRASES = [
    { cn: '晨间问候', en: 'Good morning! Did you sleep well?', tag: '问候' },
    { cn: '指引方向', en: 'Go straight and turn left, it\'s on Deck 5.', tag: '指引' },
    { cn: '电梯指引', en: 'The elevators are right around the corner, next to the atrium.', tag: '指引' },
    { cn: '打扰致歉', en: 'Excuse me, sorry to interrupt.', tag: '问候' },
    { cn: '送别祝愿', en: 'Have a wonderful day ashore! See you back on board.', tag: '问候' },
    { cn: '敲门进入', en: 'Housekeeping! May I come in?', tag: '客房' },
    { cn: '询问清洁时间', en: 'Would you prefer your room cleaned in the morning or later in the day?', tag: '客房' },
    { cn: '毛巾艺术留言', en: 'We\'ve left a little surprise on your bed — enjoy!', tag: '客房' },
    { cn: '报修完成跟进', en: 'Good news, your maintenance request has been completed.', tag: '客房' },
    { cn: '勿扰牌回应', en: 'We\'ll skip your cabin today — just let us know when you\'d like service.', tag: '客房' },
    { cn: '迎宾引座', en: 'Welcome! Table for two? Right this way, please.', tag: '餐饮' },
    { cn: '点单确认', en: 'Are you ready to order, or would you like a few more minutes?', tag: '餐饮' },
    { cn: '推荐今日特选', en: 'Today\'s special is the grilled snapper — it\'s very popular.', tag: '餐饮' },
    { cn: '过敏源确认', en: 'Do you have any food allergies or dietary restrictions?', tag: '餐饮' },
    { cn: '上菜服务', en: 'Please be careful, the plate is very hot. Enjoy your meal!', tag: '餐饮' },
    { cn: '酒水推介', en: 'Would you like another round of drinks?', tag: '餐饮' },
    { cn: '结账致谢', en: 'Here\'s your check — thank you so much for dining with us.', tag: '餐饮' },
    { cn: '办理入住登记', en: 'Welcome aboard! May I see your cruise ticket and ID, please?', tag: '前台' },
    { cn: '解释账单项目', en: 'This charge is for the spa treatment on the 12th.', tag: '前台' },
    { cn: '押金说明', en: 'We\'ll place a temporary pre-authorization on your card at check-in.', tag: '前台' },
    { cn: '投诉初步响应', en: 'I completely understand how frustrating that must be. Let me help you right away.', tag: '客诉' },
    { cn: '投诉升级上报', en: 'I want to make sure this is resolved properly — let me get my supervisor for you.', tag: '客诉' },
    { cn: '延误通知', en: 'We apologize for the delay. We\'ll update you as soon as we have more information.', tag: '客诉' },
    { cn: '寄存物品', en: 'Certainly, we\'re happy to keep it for you at the front desk.', tag: '前台' },
    { cn: '集合站引导', en: 'Please proceed to your muster station with your lifejacket.', tag: '应急' },
    { cn: '应急广播格式', en: 'Attention all passengers, attention all passengers...', tag: '应急' },
    { cn: '冷静疏散用语', en: 'Stay calm and follow me, please. Watch your step.', tag: '应急' },
    { cn: '弃船信号口诀', en: 'Seven short blasts and one long — that\'s the abandon ship signal.', tag: '应急' },
    { cn: '交接班', en: 'You\'re relieved. Anything I should know before I take over?', tag: '内部' },
    { cn: '呼叫支援', en: 'Could you cover my station for five minutes, please?', tag: '内部' },
    { cn: '向主管汇报', en: 'Supervisor, we have a guest concern at table 24 that needs your attention.', tag: '内部' },
    { cn: '任务确认', en: 'Understood, on it right away.', tag: '内部' },
    { cn: '请求重复', en: 'Could you say that again, please? It\'s a bit noisy here.', tag: '内部' },
    { cn: '团队致谢', en: 'Thanks a lot for the help — great teamwork!', tag: '内部' }
  ];
  var pbox = $('phrase-list');
  if (pbox) {
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var hi = function (s, kw) {
      if (!kw) return esc(s);
      try { return esc(s).replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '<mark>$&</mark>'); }
      catch (e) { return esc(s); }
    };
    var paint = function () {
      var kw = $('phrase-q').value.trim();
      var hits = PHRASES.filter(function (p) {
        return !kw || p.en.toLowerCase().indexOf(kw.toLowerCase()) > -1 || p.cn.indexOf(kw) > -1 || p.tag.indexOf(kw) > -1;
      });
      pbox.innerHTML = hits.length ? hits.map(function (p) {
        return '<div class="phrase-hit"><div class="cn">' + hi(p.cn + ' · ' + p.tag, kw) + '</div><div class="en">' + hi(p.en, kw) + '</div></div>';
      }).join('') : '<div class="tool-empty">没有匹配的话术，换个关键词试试</div>';
    };
    $('phrase-q').oninput = paint;
    paint();
  }

  /* ---------- ④ 我的档案（规则解析，无 AI） ---------- */
  var PKEY = 'hub_profile_v1';
  var SHIP_DIC = ['海洋光谱号', '海洋奇迹号', '海洋赞礼号', '海洋量子号', '海洋水手号', '海洋航行者号', '海洋迎新号',
    '地中海荣耀号', '地中海传奇号', '抒情号', '神曲号',
    '爱达魔都号', '爱达地中海号', '鼓浪屿号', '蓝梦之星号', '和平之船', '珊瑚奥德赛号', '光谱号', '奇迹号', '魔都号'];
  var POS_DIC = ['餐厅服务生', '助理服务生', '助理餐厅服务生', '客房服务员', '客房管家', '厨工', '初级厨师', '厨师', '管事部', '洗碗工',
    '前台接待', '酒吧服务生', '调酒师', '娱乐员工', '健身教练', '免税店销售', '摄影师', '荷官', '保安', '船员服务员'];
  var PORT_DIC = ['上海', '深圳', '广州', '厦门', '天津', '青岛', '香港', '新加坡', '迈阿密', '横滨', '乌斯怀亚'];
  function loadProf() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } }
  function saveProf(p) { localStorage.setItem(PKEY, JSON.stringify(p)); }
  function fillForm(p) {
    $('prof-name').value = p.name || ''; $('prof-ship').value = p.ship || '';
    $('prof-date').value = p.date || ''; $('prof-pos').value = p.pos || ''; $('prof-port').value = p.port || '';
  }
  function profView(p) {
    var box = $('prof-view');
    if (!box) return;
    if (!p.name && !p.ship && !p.date && !p.pos) { box.innerHTML = '<div class="tool-empty">尚未建档：用上面任意方式填写即可。</div>'; return; }
    box.innerHTML = '<div class="prof-card"><b>📇 当前档案</b><br>' +
      (p.name ? '姓名：' + p.name + '<br>' : '') +
      (p.ship ? '船只：' + p.ship + '<br>' : '') +
      (p.date ? '登船日期：<b>' + p.date + '</b>（' + profCountdown(p.date) + '）<br>' : '') +
      (p.pos ? '职位：' + p.pos + '<br>' : '') +
      (p.port ? '母港：' + p.port + '<br>' : '') +
      '</div>';
  }
  function profCountdown(d) {
    var days = Math.round((new Date(d) - new Date()) / 86400000);
    if (isNaN(days)) return '';
    return days >= 0 ? '还有 ' + days + ' 天' : '已过 ' + (-days) + ' 天';
  }
  if ($('prof-parse')) {
    $('prof-parse').onclick = function () {
      var q = $('prof-nl').value.trim();
      var res = $('prof-parse-result');
      if (!q) { res.style.display = 'block'; res.textContent = '请先输入一句话。'; return; }
      var p = loadProf(), hits = [];
      // 日期：2026-12-08 / 2026年12月8日 / 12月8日
      var full = q.match(/(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*日?/);
      var md = full || q.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      if (md) {
        var y = full ? parseInt(full[1], 10) : new Date().getFullYear();
        var mo = full ? parseInt(full[2], 10) : parseInt(md[1], 10);
        var da = full ? parseInt(full[3], 10) : parseInt(md[2], 10);
        var dt = y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + da).slice(-2);
        if (new Date(dt) < new Date()) dt = (y + 1) + dt.slice(4);
        p.date = dt; hits.push('🗓️ 登船日期 → ' + dt);
      }
      // 船名
      for (var i = 0; i < SHIP_DIC.length; i++) {
        if (q.indexOf(SHIP_DIC[i]) >= 0) { p.ship = SHIP_DIC[i]; hits.push('🚢 船只 → ' + SHIP_DIC[i]); break; }
      }
      // 职位（长词优先）
      var foundPos = null;
      POS_DIC.sort(function (a, b) { return b.length - a.length; }).some(function (w) { if (q.indexOf(w) >= 0) { foundPos = w; return true; } });
      if (foundPos) { p.pos = foundPos; hits.push('💼 职位 → ' + foundPos); }
      // 母港
      for (var j = 0; j < PORT_DIC.length; j++) {
        if (q.indexOf(PORT_DIC[j]) >= 0) { p.port = p.port || PORT_DIC[j]; break; }
      }
      res.style.display = 'block';
      res.innerHTML = hits.length
        ? '<b>已识别：</b><br>' + hits.join('<br>') + (foundPos || p.ship || md ? '' : '<br>未识别到结构信息') +
          '<br><span class="muted">姓名 / 母港建议在下方表单补充后保存。</span>'
        : '未能识别日期 / 船名 / 职位，请改用下方表单填写。示例：「我12月8日登海洋光谱号，职位餐厅服务生」';
      fillForm(p);
      if (hits.length) { saveProf(p); profView(p); }
    };
    $('prof-save').onclick = function () {
      var p = { name: $('prof-name').value.trim(), ship: $('prof-ship').value.trim(), date: $('prof-date').value, pos: $('prof-pos').value.trim(), port: $('prof-port').value.trim() };
      saveProf(p); profView(p);
      $('prof-parse-result').style.display = 'block';
      $('prof-parse-result').innerHTML = '✅ 档案已保存到本机浏览器。';
    };
    $('prof-clear').onclick = function () {
      if (!confirm('确定清空档案吗？')) return;
      localStorage.removeItem(PKEY); fillForm({}); profView({});
    };
    fillForm(loadProf()); profView(loadProf());
  }

  /* ---------- ⑤ 行李打包清单 ---------- */
  var PACKKEY = 'hub_pack_v1';
  var PACK = [
    { cat: '证件 Documents', items: ['护照（有效期 > 合同期 6 个月）', '海员证 / C1-D 等签证（按航线）', 'STCW 基本安全培训证书原件', '船员健康证书', '护照规格照片 6 张', '身份证 + 复印件', '机票行程单打印件', 'Offer / 劳动合同打印件', '船司报到函（Joining Letter）'] },
    { cat: '工作 Work', items: ['黑皮鞋（正装，防滑底）', '白衬衫 2–3 件', '黑西裤 / 西装裙', '领结 / 丝巾（按部门）', '防滑工作鞋', '笔记本 + 笔', '工牌卡套', '手表（非智能款排班用）'] },
    { cat: '生活 Life', items: ['软壳行李箱 23kg×2', '换洗内衣袜子 7 天量', '洗漱包（旅行装起步）', '拖鞋', '折叠雨伞', '防晒霜 SPF50+', '常用药（晕船/感冒/肠胃）', '保温杯', '针线包', '少量衣架'] },
    { cat: '数字 Digital', items: ['手机 + 充电器', '充电宝（≤100Wh 随身）', '转换插头（美标/欧标）', '排插（注意船规）', '耳机', 'SIM 卡 / 开通国际漫游', '备份 U 盘'] },
    { cat: '资金 Finance', items: ['美元现金 200–500', '双币信用卡 Visa/Master', '银联卡备份', '小额零钱（小费/交通）', '紧急联系卡（纸）'] }
  ];
  var packBox = $('pack-list');
  function packLoad() { try { return JSON.parse(localStorage.getItem(PACKKEY)) || {}; } catch (e) { return {}; } }
  function packSave(o) { localStorage.setItem(PACKKEY, JSON.stringify(o)); }
  if (packBox) {
    function packPaint() {
      var st = packLoad(), done = 0, total = 0;
      packBox.innerHTML = PACK.map(function (g, gi) {
        return '<div class="pack-cat"><b>' + g.cat + '</b>' + g.items.map(function (it, ii) {
          total++;
          var id = gi + '-' + ii, checked = !!st[id];
          if (checked) done++;
          return '<label class="pack-item"><input type="checkbox" data-id="' + id + '"' + (checked ? ' checked' : '') + '> <span>' + it + '</span></label>';
        }).join('') + '</div>';
      }).join('');
      var pct = total ? Math.round(done / total * 100) : 0;
      $('pack-progress').innerHTML = '打包进度：<strong>' + done + ' / ' + total + '</strong>（' + pct + '%）' +
        ' <span style="display:inline-block;width:120px;height:8px;background:var(--bg-soft);border-radius:4px;vertical-align:middle;margin-left:6px"><span style="display:block;height:8px;width:' + pct + '%;background:var(--gold);border-radius:4px"></span></span>';
      packBox.querySelectorAll('input[type=checkbox]').forEach(function (c) {
        c.onchange = function () { var o = packLoad(); o[c.dataset.id] = c.checked; packSave(o); packPaint(); };
      });
    }
    packPaint();
    $('pack-reset').onclick = function () {
      if (!confirm('重置所有勾选状态？')) return;
      localStorage.removeItem(PACKKEY); packPaint();
    };
  }

  /* ---------- 共享数据（ports.json / transit.json，与智能助理共用） ---------- */
  var PORTS = [], TRANSIT = [], dataReady = null;
  function loadData() {
    if (!dataReady) {
      dataReady = Promise.all([
        fetch('assets/ports.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { ports: [] }; }),
        fetch('assets/transit.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { transits: [] }; })
      ]).then(function (rs) {
        PORTS = rs[0].ports || [];
        TRANSIT = rs[1].transits || [];
        return true;
      });
    }
    return dataReady;
  }

  function chips(arr, box, active, onPick) {
    box.innerHTML = '';
    arr.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'chip quiz-cat' + (a === active ? ' active' : '');
      b.textContent = a;
      b.onclick = function () { onPick(a); };
      box.appendChild(b);
    });
  }

  /* ---------- ⑥ 入职航班中转（时间线 + 交互地图） ---------- */
  var transitAreaBox = $('transit-area-tabs');
  var transitBox = $('transit-tabs');
  if (transitBox) {
    var trArea = '全部', trIdx = 0, trMap = null, trLayer = null;
    var TR_AREAS = ['全部', '亚洲', '美洲', '欧洲', '大洋洲'];
    function trList() {
      return TRANSIT.filter(function (t) { return trArea === '全部' || t.area === trArea; });
    }
    function trPaint() {
      chips(TR_AREAS, transitAreaBox, trArea, function (a) {
        trArea = a; trIdx = 0; trPaint();
      });
      var list = trList();
      if (trIdx >= list.length) trIdx = 0;
      chips(list.map(function (t) { return t.name; }), transitBox, list[trIdx] ? list[trIdx].name : '', function (name) {
        trIdx = list.map(function (t) { return t.name; }).indexOf(name); trPaint();
      });
      var t = list[trIdx];
      var steps = $('transit-steps'), mapEl = $('transit-map');
      if (!t) { steps.innerHTML = '<div class="tool-empty">该区域暂无线路</div>'; mapEl.style.display = 'none'; return; }
      // 步骤时间线（机场 → 落脚点 → 码头，即飞行首末 + 中转衔接）
      steps.innerHTML = t.pts.map(function (p, i) {
        return '<div class="tr-step"><span class="tr-dot">' + (i + 1) + '</span>' +
          '<div><b>' + p.t + '</b><span class="en-sub" style="display:block"> ' + p.en + '</span>' +
          '<p style="margin:6px 0 0">' + p.tip + '</p>' +
          '<p class="en-sub" style="margin:4px 0 0">' + p.tipEn + '</p></div></div>';
      }).join('');
      // 地图
      if (!window.L) { mapEl.style.display = 'none'; return; }
      mapEl.style.display = '';
      if (!trMap) {
        trMap = window.L.map('transit-map', {
          scrollWheelZoom: false,
          maxBounds: [[-85, -180], [85, 180]],
          maxBoundsViscosity: 1.0,
          worldCopyJump: true
        });
        window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri', maxZoom: 14
        }).addTo(trMap);
        trLayer = window.L.layerGroup().addTo(trMap);
      }
      trLayer.clearLayers();
      var lls = t.pts.map(function (p) { return [p.lat, p.lon]; });
      t.pts.forEach(function (p, i) {
        window.L.marker([p.lat, p.lon]).addTo(trLayer)
          .bindPopup('<b>' + (i + 1) + '. ' + p.t + '</b><br><span style="font-size:12px">' + p.en + '</span>');
      });
      window.L.polyline(lls, { color: '#d4af37', weight: 3, dashArray: '8 8', opacity: 0.9 }).addTo(trLayer);
      trMap.fitBounds(lls, { padding: [34, 34] });
      setTimeout(function () { trMap.invalidateSize(); }, 120);
    }
    loadData().then(trPaint);
  }

  /* ---------- ⑦ 上岸规划 · 餐饮 · 交通 ---------- */
  var portAreaBox = $('port-area-tabs');
  var portSel = $('port-sel');
  if (portSel) {
    var portArea = '全部';
    var AREAS = ['全部', '东亚', '东南亚', '美洲', '地中海', '极地', '大洋洲'];
    function portPool() {
      return PORTS.filter(function (p) { return portArea === '全部' || p.area === portArea; });
    }
    function portPaintSel() {
      portSel.innerHTML = '';
      portPool().forEach(function (p, i) {
        var o = document.createElement('option'); o.value = i; o.textContent = p.name + ' · ' + p.area; portSel.appendChild(o);
      });
    }
    function portInfo() {
      var p = portPool()[portSel.value];
      if (!p) { $('port-info').innerHTML = '<div class="tool-empty">暂无数据</div>'; return; }
      $('port-info').innerHTML =
        '<div class="port-grid">' +
        '<div class="port-col"><b>🧭 上岸规划 <span class="en-sub">' + p.en + '</span></b><ul>' + p.shore.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
        '<div class="port-col"><b>🍜 餐饮 <span class="en-sub">Food</span></b><ul>' + p.food.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
        '<div class="port-col"><b>🚕 交通 <span class="en-sub">Transport</span></b><ul>' + p.transport.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
        '</div>';
    }
    loadData().then(function () {
      chips(AREAS, portAreaBox, portArea, function (a) {
        portArea = a; portPaintSel(); portInfo();
      });
      portPaintSel();
      portSel.onchange = portInfo;
      portInfo();
    });
  }

  /* ---------- ⑧ 港口天气（Open-Meteo，无需 Key） ---------- */
  var WX_CODE = { 0: '晴 Clear', 1: '大致晴 Mainly clear', 2: '局部多云 Partly cloudy', 3: '阴 Overcast', 45: '雾 Fog', 48: '雾凇 Rime fog', 51: '小毛毛雨 Light drizzle', 61: '小雨 Light rain', 63: '中雨 Moderate rain', 65: '大雨 Heavy rain', 71: '小雪 Light snow', 73: '中雪 Moderate snow', 75: '大雪 Heavy snow', 80: '阵雨 Showers', 81: '较强阵雨 Moderate showers', 82: '强阵雨 Violent showers', 95: '雷暴 Thunderstorm', 96: '雷暴伴冰雹 Thunderstorm w/ hail' };
  var wxSel = $('wx-port');
  if (wxSel) {
    loadData().then(function () {
      // 按区域分组下拉
      var areas = [];
      PORTS.forEach(function (p) { if (areas.indexOf(p.area) < 0) areas.push(p.area); });
      areas.forEach(function (a) {
        var g = document.createElement('optgroup'); g.label = a;
        PORTS.forEach(function (p, i) {
          if (p.area !== a) return;
          var o = document.createElement('option'); o.value = i; o.textContent = p.name; g.appendChild(o);
        });
        wxSel.appendChild(g);
      });
    });
    $('wx-fetch').onclick = function () {
      var p = PORTS[wxSel.value];
      if (!p) return;
      var box = $('wx-result');
      box.innerHTML = '⏳ 正在查询 ' + p.name + ' 天气…';
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
        '&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=3&timezone=auto')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var c = d.current, dl = d.daily;
          var rows = [0, 1, 2].map(function (i) {
            var day = new Date(dl.time[i]);
            return '<div class="wx-day"><b>' + (i === 0 ? '今天' : (day.getMonth() + 1) + '月' + day.getDate() + '日') + '</b> ' +
              (WX_CODE[dl.weather_code[i]] || '—') + ' · ' + dl.temperature_2m_min[i] + '–' + dl.temperature_2m_max[i] + '°C' +
              ' · 降水概率 ' + (dl.precipitation_probability_max[i] != null ? dl.precipitation_probability_max[i] + '%' : '—') + '</div>';
          }).join('');
          box.innerHTML = '<b>📍 ' + p.name + ' · ' + p.area + ' 实时天气</b><br>' +
            '当前：' + c.temperature_2m + '°C · ' + (WX_CODE[c.weather_code] || '—') + ' · 风速 ' + c.wind_speed_10m + ' km/h<br>' +
            rows +
            '<span class="muted">数据源 Open-Meteo（开放接口，无需 API Key / AI）。下船日建议带伞阈值：降水概率 ≥50%。</span>';
        })
        .catch(function (e) {
          box.innerHTML = '⚠️ 天气查询失败（' + e.message + '）。可能当前网络无法访问 Open-Meteo，稍后重试；不影响其他工具使用。';
        });
    };
  }

  /* ---------- ⑥B 全球航班规划 + 航班号识别行程 ---------- */
  var fpFrom = $('fp-from'), fpTo = $('fp-to');
  if (fpFrom) {
    var AIRPORTS = null, AIRLINES = null, fpMap = null, fpLayer = null, fpSel = null;
    var flightData = Promise.all([
      fetch('assets/airports.json', { cache: 'no-store' }).then(function (r) { return r.json(); }),
      fetch('assets/airlines.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
    ]).then(function (rs) { AIRPORTS = rs[0]; AIRLINES = rs[1].airlines; return true; });

    var FKEY2 = 'hub_flights_v1';
    function fLoad() { try { return JSON.parse(localStorage.getItem(FKEY2)) || []; } catch (e) { return []; } }
    function fSave(list) { localStorage.setItem(FKEY2, JSON.stringify(list)); }

    function arcPts(a, b, n) {
      var toR = Math.PI / 180;
      var f1 = a[0] * toR, l1 = a[1] * toR, f2 = b[0] * toR, l2 = b[1] * toR;
      var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((f2 - f1) / 2), 2) + Math.cos(f1) * Math.cos(f2) * Math.pow(Math.sin((l2 - l1) / 2), 2)));
      if (!d || isNaN(d)) return [a, b];
      var pts = [];
      for (var i = 0; i <= n; i++) {
        var f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
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
    function kmBetween(a, b) {
      var toR = Math.PI / 180, R = 6371;
      var dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function fmtH(h) { return Math.floor(h) + ' 小时 ' + Math.round((h - Math.floor(h)) * 60) + ' 分钟'; }

    function fpPaintMap(segs) {
      var wrap = $('fp-map');
      if (typeof window.L === 'undefined') { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      if (!fpMap) {
        fpMap = window.L.map('fp-map', { scrollWheelZoom: false, minZoom: 1, maxBounds: [[-85, -3600], [85, 3600]], maxBoundsViscosity: 1.0 });
        window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri — Dark Gray Canvas', maxZoom: 10 }).addTo(fpMap);
        fpLayer = window.L.layerGroup().addTo(fpMap);
      }
      fpLayer.clearLayers();
      var lls = [];
      var fpLastPt = null;
      // 先收集全部弧线点，跨段串联做经度连续化（保证中转后经度延续），再把整体平移到视野中心落在 [-180,180]
      var segLens = [], flat = [];
      segs.forEach(function (seg) { var pts = arcPts(seg.a, seg.b, 48); segLens.push(pts.length); flat = flat.concat(pts); });
      unwrap(flat);
      var allPts = [], idx = 0;
      segLens.forEach(function (n) { allPts.push(flat.slice(idx, idx + n)); idx += n; });
      var minLon = Infinity, maxLon = -Infinity;
      allPts.forEach(function (pts) { pts.forEach(function (p) { if (p[1] < minLon) minLon = p[1]; if (p[1] > maxLon) maxLon = p[1]; }); });
      var off = Math.round(((minLon + maxLon) / 2) / 360) * 360;
      allPts.forEach(function (pts) { pts.forEach(function (p) { p[1] -= off; }); });
      segs.forEach(function (seg, i) {
        var pts = allPts[i];
        fpLastPt = pts[pts.length - 1];
        lls = lls.concat(pts);
        window.L.polyline(pts, { color: i === 0 ? '#4fd1c5' : '#f6ad55', weight: 2.5, opacity: 0.9 }).addTo(fpLayer);
        var ap = seg.label || (i === 0 ? '出发' : '中转');
        window.L.circleMarker(pts[0], { radius: 6, color: '#4fd1c5', fillColor: '#4fd1c5', fillOpacity: 1, weight: 1.5 }).addTo(fpLayer)
          .bindPopup('<b>' + seg.aName + '</b>' + (ap ? '<br><span style="font-size:12px">' + ap + '</span>' : ''));
      });
      var last = segs[segs.length - 1];
      window.L.circleMarker(fpLastPt || last.b, { radius: 8, color: '#f6ad55', fillColor: '#f6ad55', fillOpacity: 1, weight: 1.5 }).addTo(fpLayer)
        .bindPopup('<b>' + last.bName + '</b><br><span style="font-size:12px">到达</span>');
      fpMap.fitBounds(lls, { padding: [20, 20] });
      if (fpMap.getZoom() < 1) fpMap.setZoom(1);
      setTimeout(function () { fpMap.invalidateSize(); }, 120);
    }

    function findAp(iata) {
      return AIRPORTS.cn.concat(AIRPORTS.intl).filter(function (a) { return a.iata === iata; })[0] || null;
    }

    function plan() {
      var from = findAp(fpFrom.value), to = findAp(fpTo.value);
      if (!from || !to) return;
      var box = $('fp-result');
      var km = kmBetween([from.lat, from.lon], [to.lat, to.lon]);
      var via = null;
      // 中转枢纽：目的机场建议 via 中选取「非出发机场」的第一个
      (to.via || []).some(function (v) { if (v !== from.iata) { via = findAp(v) || null; return true; } return false; });
      var html = '<b>✈️ ' + from.city + ' ' + from.iata + ' → ' + to.city + ' ' + to.iata + '</b><br>';
      var segs;
      if (via) {
        var km1 = kmBetween([from.lat, from.lon], [via.lat, via.lon]);
        var km2 = kmBetween([via.lat, via.lon], [to.lat, to.lon]);
        var hrs = km1 / 830 + km2 / 830 + 3;
        html += '无直飞时建议中转：<b>' + via.city + ' ' + via.iata + '</b><br>' +
          '第一段 ' + fmtH(km1 / 830 + 0.4) + ' · 中转停留约 3 小时 · 第二段 ' + fmtH(km2 / 830 + 0.4) + '<br>' +
          '全程预计（含中转）：<strong>' + fmtH(hrs) + '</strong><br>' +
          '推荐航司：' + (to.carriers.length ? to.carriers.join(' / ') : '按联盟与票价选择') +
          '<br><span class="muted">C1-D 等船员签证若为单次入境，中转国是否需过境签请与航司确认。</span>';
        segs = [
          { a: [from.lat, from.lon], b: [via.lat, via.lon], aName: from.name, bName: via.name, label: '第一段' },
          { a: [via.lat, via.lon], b: [to.lat, to.lon], aName: via.name, bName: to.name, label: '第二段' }
        ];
      } else {
        var hrs2 = km / 830 + 0.4;
        html += '建议直飞或同航司一票联运<br>飞行约 <strong>' + fmtH(hrs2) + '</strong>（大圆距离 ' + Math.round(km).toLocaleString() + ' km）<br>' +
          '推荐航司：' + (to.carriers.length ? to.carriers.join(' / ') : '按票价与行李额选择') +
          '<br><span class="muted">船员票注意行李额与改签规则，报到日前后预留 1 天缓冲。</span>';
        segs = [{ a: [from.lat, from.lon], b: [to.lat, to.lon], aName: from.name, bName: to.name, label: '直飞' }];
      }
      box.innerHTML = html;
      fpPaintMap(segs);
    }

    // 下拉填充
    flightData.then(function () {
      AIRPORTS.cn.forEach(function (a) {
        var o = document.createElement('option'); o.value = a.iata; o.textContent = a.city + ' · ' + a.name + '（' + a.iata + '）'; fpFrom.appendChild(o);
      });
      var areas = [];
      AIRPORTS.intl.forEach(function (a) { if (areas.indexOf(a.area) < 0) areas.push(a.area); });
      areas.forEach(function (ar) {
        var g = document.createElement('optgroup'); g.label = ar;
        AIRPORTS.intl.forEach(function (a) {
          if (a.area !== ar) return;
          var o = document.createElement('option'); o.value = a.iata; o.textContent = a.city + ' · ' + a.name + '（' + a.iata + '）'; g.appendChild(o);
        });
        fpTo.appendChild(g);
      });
      // 默认：上海浦东 → 迈阿密
      fpFrom.value = 'PVG'; fpTo.value = 'MIA';
      $('fp-go').onclick = plan;
      plan();
    });

    // 航班号识别 + 行程
    function tripsPaint() {
      var list = fLoad(), box = $('fp-trips');
      if (!list.length) { box.innerHTML = '<div class="tool-empty">行程为空：输入航班号添加（MU587、CA987、EK303…）</div>'; return; }
      box.innerHTML = '<b>🗂️ 我的航班行程</b>' + list.map(function (t, i) {
        return '<div class="cert-item"><span class="cert-name">' + t.no + ' · ' + t.airlineCn + '</span>' +
          '<span class="cert-date muted">' + (t.hubCity || t.hub) + ' 枢纽' + (t.date ? ' · ' + t.date : '') + '</span>' +
          '<button class="cert-del" data-i="' + i + '">✕</button></div>';
      }).join('');
      box.querySelectorAll('.cert-del').forEach(function (b) {
        b.onclick = function () { var l = fLoad(); l.splice(parseInt(b.dataset.i, 10), 1); fSave(l); tripsPaint(); };
      });
    }
    $('fp-add').onclick = function () {
      var raw = $('fp-flight').value.trim().toUpperCase().replace(/\s+/g, '');
      var box = $('fp-parse');
      box.style.display = 'block';
      var m = raw.match(/^([A-Z0-9]{2})(\d{1,4})$/);
      if (!m) { box.innerHTML = '⚠️ 航班号格式：2 位航司代码 + 数字，如 <b>MU587</b>。'; return; }
      var code = m[1];
      var al = AIRLINES.filter(function (a) { return a.code === code; })[0];
      if (!al) {
        box.innerHTML = '⚠️ 未收录航司代码「' + code + '」（本地库覆盖 69 家主流航司）。可以先确认该航司两字码，或直接用上面的机场规划功能。';
        return;
      }
      var hub = findAp(al.hub);
      var trip = { no: raw, code: code, airlineCn: al.cn, airlineEn: al.en, hub: al.hub, hubCity: hub ? hub.city : al.hub, date: '' };
      var list = fLoad();
      if (list.some(function (t) { return t.no === raw; })) {
        box.innerHTML = 'ℹ️ ' + raw + ' 已在行程中。航司：' + al.cn + '（' + al.en + '）· 枢纽 ' + (hub ? hub.city : al.hub) + ' ' + al.hub;
        return;
      }
      list.push(trip); fSave(list);
      box.innerHTML = '✅ 已加入行程：<b>' + raw + '</b> · ' + al.cn + ' / ' + al.en + '<br>' +
        '枢纽：' + (hub ? hub.city + ' ' + al.hub : al.hub) + '（若非你的出发机场，可加一段国内/区域联程）<br>' +
        '<span class="muted">可到出发/到达机场规划中把行程两端连起来查看弧线。</span>';
      $('fp-flight').value = '';
      tripsPaint();
    };
    tripsPaint();
  }

  /* ---------- ⑨ 生成简报 ---------- */
  if ($('brief-gen')) {
    $('brief-gen').onclick = function () {
      var p = loadProf();
      var certs = load();
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var warns = certs.map(function (c) {
        var d = Math.round((new Date(c.date) - today) / 86400000);
        return { name: c.name, date: c.date, d: d };
      }).filter(function (c) { return c.d <= 180; }).sort(function (a, b) { return a.d - b.d; });
      var st = packLoad(), done = 0, total = 0;
      PACK.forEach(function (g, gi) { g.items.forEach(function (it, ii) { total++; if (st[gi + '-' + ii]) done++; }); });
      var lines = [];
      var todayStr = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
      lines.push('📋 Hub 登船简报 · Boarding Briefing · ' + todayStr);
      lines.push('');
      lines.push('— 我的档案 Profile —');
      if (p.name) lines.push('姓名 Name：' + p.name);
      if (p.ship) lines.push('船只 Ship：' + p.ship);
      if (p.date) lines.push('登船日期 Embarkation：' + p.date + (profCountdown(p.date) ? '（' + profCountdown(p.date) + '）' : ''));
      if (p.pos) lines.push('职位 Position：' + p.pos);
      if (p.port) lines.push('母港 Home Port：' + p.port);
      if (!p.name && !p.ship && !p.date && !p.pos) lines.push('（尚未建档，去工具箱 ④ 填写）');
      lines.push('');
      lines.push('— 证件预警 Certificates —');
      if (warns.length) warns.forEach(function (c) { lines.push((c.d < 0 ? '❌ 已过期' : '⚠️ 剩余 ' + c.d + ' 天') + '：' + c.name + '（' + c.date + '）'); });
      else lines.push('✅ 180 天内无到期证件 / 未录入（Certificate countdown: all clear / not recorded）');
      lines.push('');
      var trips = [];
      try { trips = JSON.parse(localStorage.getItem('hub_flights_v1')) || []; } catch (e) {}
      if (trips.length) {
        lines.push('');
        lines.push('— 航班行程 Flights —');
        trips.forEach(function (t) { lines.push('✈️ ' + t.no + ' · ' + t.airlineCn + (t.hubCity ? '（枢纽 ' + t.hubCity + '）' : '') + (t.date ? ' · ' + t.date : '')); });
      }
      lines.push('');
      lines.push('— 打包进度 Packing —');
      lines.push('已完成 ' + done + ' / ' + total + ' 项（' + (total ? Math.round(done / total * 100) : 0) + '%）');
      lines.push('');
      var wxPort = (wxSel && PORTS[wxSel.value]) || PORTS[0] || null;
      lines.push('— 指定港口天气 Weather (' + wxPort.name + ') —');
      lines.push('（点击生成时会自动尝试拉取；若离线则提示网络受限）');
      if (!wxPort) {
        $('brief-result').textContent = '⚠️ 港口数据尚未加载（离线或首次加载失败），刷新后再试；其余部分仍可生成。';
        return;
      }
      var box = $('brief-result');
      box.innerHTML = '<textarea id="brief-text" readonly style="width:100%;min-height:220px;background:var(--bg-soft);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:13px"></textarea>' +
        '<div class="muted mt8">已生成档案 + 证件 + 打包简报。天气部分单独调 Open-Meteo 实时补充…</div>';
      var ta = document.getElementById('brief-text');
      ta.value = lines.join('\n');
      $('brief-copy').style.display = '';
      $('brief-copy').onclick = function () { ta.select(); document.execCommand('copy'); };
      // 天气实时补充
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + wxPort.lat + '&longitude=' + wxPort.lon + '&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          ta.value = lines.join('\n') + '\n当前 ' + wxPort.name + '：' + d.current.temperature_2m + '°C · ' + (WX_CODE[d.current.weather_code] || '—') + ' · 风 ' + d.current.wind_speed_10m + ' km/h\n（数据源 Open-Meteo）';
          box.querySelector('.muted').textContent = '✅ 简报已生成（含实时天气），可直接复制。';
        })
        .catch(function () {
          ta.value = lines.join('\n');
          box.querySelector('.muted').textContent = '⚠️ 实时天气拉取失败（可能离线），其余部分已生成，可直接复制。';
        });
    };
  }
})();
