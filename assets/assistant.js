/* ============================================================
   Hub 智能助理 · 双模式引擎
   模式 A（默认）：本地知识索引检索，零成本、离线可用
   模式 B（可选）：接入大模型 API（页面右上角配置 API Key 后启用）
   ============================================================ */
(function () {
  'use strict';

  var CFG_KEY = 'hub_ai_config_v1';
  var HIST_KEY = 'hub_ai_history_v1';
  var INDEX = null;        // 懒加载
  var loading = null;

  /* ---------- 配置 ---------- */
  function getCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function setCfg(c) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function apiReady() {
    var c = getCfg();
    return !!(c.key && c.endpoint && c.model);
  }

  /* ---------- 索引加载 ---------- */
  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    if (loading) return loading;
    loading = fetch('assets/kb-index.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { INDEX = d; buildVocab(d); return d; });
    return loading;
  }

  /* ---------- 检索算法 ---------- */
  // 中文二字切分 + 英文词切分；停用词过滤
  var STOP = ('的 了 是 在 我 有 和 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有 看 好 自己 这 那 什么 怎么 如何 哪些 可以 需要 吗 呢 吧 请 问 一下 介绍 讲 说 关于 ' +
    'what how why which the a an is are do does can could should to of for in on at and or').split(' ').filter(Boolean);
  var VOCAB = new Set();      // 索引中出现过的词（提高切分准度）
  var IDF = null;

  // 判断某词元是否在索引中出现过（过滤「常见问题」这类无意义切分）
  function inCorpus(w) {
    if (!window.__CORPUS) {
      window.__CORPUS = '';
      (INDEX || []).forEach(function (e) { window.__CORPUS += (e.title || '') + (e.text || '') + (e.cat || ''); });
      window.__CORPUS = window.__CORPUS.toLowerCase();
    }
    return window.__CORPUS.indexOf(w) >= 0;
  }

  function tokens(q) {
    q = q.toLowerCase();
    var out = [];
    // 英文词
    (q.match(/[a-z][a-z0-9\-]{1,}/g) || []).forEach(function (w) { if (STOP.indexOf(w) < 0) out.push(w); });
    // 中文：最长匹配；失配时只前进 1 字（不能跳 2 字，否则会漏掉「证书」这类词）
    var cjk = q.replace(/[^\u4e00-\u9fff]/g, ' ');
    cjk.split(/\s+/).forEach(function (seg) {
      if (!seg) return;
      var i = 0;
      while (i < seg.length) {
        var matched = false;
        for (var len = Math.min(4, seg.length - i); len >= 2; len--) {
          var w = seg.substr(i, len);
          if (VOCAB.has(w)) { out.push(w); i += len; matched = true; break; }
        }
        if (!matched) {
          if (i + 1 < seg.length) {
            var cand = seg.substr(i, 2);
            if (inCorpus(cand)) out.push(cand);
          }
          i += 1;
        }
      }
    });
    var seen = Object.create(null), uniq = [];
    out.forEach(function (w) { if (!seen[w]) { seen[w] = 1; uniq.push(w); } });
    return uniq.filter(function (w) { return STOP.indexOf(w) < 0 && inCorpus(w); });
  }

  function buildVocab(d) {
    var freq = Object.create(null);
    d.forEach(function (e) {
      var t = ((e.title || '') + ' ' + (e.text || '')).replace(/[^\u4e00-\u9fff]/g, ' ');
      t.split(/\s+/).forEach(function (seg) {
        for (var i = 0; i + 1 < seg.length; i++) {
          for (var len = 2; len <= 4 && i + len <= seg.length; len++) {
            var w = seg.substr(i, len);
            freq[w] = (freq[w] || 0) + 1;
          }
        }
      });
    });
    Object.keys(freq).forEach(function (w) { if (freq[w] >= 2) VOCAB.add(w); });
    // IDF：按文档逐篇统计词频（与 vocab 同法，复杂度 O(N×L)，避免全表扫描）
    IDF = Object.create(null);
    d.forEach(function (e) {
      var t = ((e.title || '') + ' ' + (e.text || '')).replace(/[^\u4e00-\u9fff]/g, ' ');
      var seen = Object.create(null);
      t.split(/\s+/).forEach(function (seg) {
        for (var i = 0; i + 1 < seg.length; i++) {
          for (var len = 2; len <= 4 && i + len <= seg.length; len++) {
            var w = seg.substr(i, len);
            if (freq[w] && !seen[w]) { seen[w] = 1; IDF[w] = (IDF[w] || 0) + 1; }
          }
        }
      });
    });
  }

  function scoreEntry(e, qTokens, rawQ) {
    var title = (e.title || '').toLowerCase();
    var text = (e.text || '').toLowerCase();
    var en = (e.en || '').toLowerCase();
    var cat = (e.cat || '').toLowerCase();
    var s = 0, hit = 0;
    qTokens.forEach(function (t) {
      var w = IDF && IDF[t] ? Math.log(1 + 534 / IDF[t]) : 1;
      if (title.indexOf(t) >= 0) { s += 8 * w; hit++; }
      else if (cat.indexOf(t) >= 0) { s += 3 * w; hit++; }
      else if (text.indexOf(t) >= 0) { s += 2 * w; hit++; }
      else if (en.indexOf(t) >= 0) { s += 1.2 * w; hit++; }
    });
    // 完整短语命中加权
    if (rawQ.length > 3 && title.indexOf(rawQ) >= 0) s += 20;
    if (hit >= 2) s *= 1.25;
    return s;
  }

  function retrieve(q, n) {
    var qt = tokens(q);
    if (!qt.length) return [];
    var scored = INDEX.map(function (e) { return { e: e, s: scoreEntry(e, qt, q.toLowerCase()) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, n || 4);
  }

  /* ---------- 本地回答生成 ---------- */
  function localAnswer(q) {
    var hits = retrieve(q, 5);
    if (!hits.length) {
      return {
        text: '没有在平台内容里找到直接相关的资料 🤔<br><br>可以试试这样问：<br>' +
              '· <b>客房铺床的标准是什么</b><br>· <b>餐厅服务生晋升要多久</b><br>· <b>面试常见问题</b><br>· <b>STCW 是什么</b><br><br>' +
              '或者换个关键词（如具体岗位名、术语名）。',
        refs: [], mode: 'local'
      };
    }
    var top = hits[0].e;
    var parts = [];
    parts.push('<div class="ai-answer-head">' + top.title + '</div>');
    var body = top.text || '';
    // 清理条目内的标题重复
    if (body.indexOf(top.title) === 0) body = body.slice(top.title.length).trim();
    parts.push('<div class="ai-answer-body">' + esc(body.slice(0, 420)) + (body.length > 420 ? '…' : '') + '</div>');
    if (top.en) parts.push('<div class="ai-answer-en">' + esc(top.en.slice(0, 220)) + '…</div>');
    var refs = hits.slice(0, 4).map(function (h) { return h.e; });
    return { text: parts.join(''), refs: refs, mode: 'local' };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- API 回答（可选模式） ---------- */
  function buildContext(q) {
    var hits = retrieve(q, 5);
    if (!hits.length) return { ctx: '', refs: [] };
    var ctx = hits.map(function (h, i) {
      return '【资料' + (i + 1) + '｜' + h.e.src + '·' + h.e.cat + '】\n标题：' + h.e.title + '\n内容：' +
             (h.e.text || '').slice(0, 500);
    }).join('\n\n');
    return { ctx: ctx, refs: hits.map(function (h) { return h.e; }) };
  }

  function apiAnswer(q) {
    var c = getCfg();
    var k = buildContext(q);
    var sys = '你是「Hub 邮轮新人学习平台」的助理，服务对象是想进入邮轮行业的新人。' +
      '回答要简洁实用（中文，必要时附英文术语），优先使用下面提供的平台资料；资料不足时可补充行业常识，但要说明。' +
      '不要编造船司内部政策。\n\n平台资料：\n' + (k.ctx || '（无直接匹配资料）');
    return fetch(c.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
      body: JSON.stringify({
        model: c.model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: q }],
        temperature: 0.3
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('API ' + r.status);
      return r.json();
    }).then(function (j) {
      var txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '（无返回内容）';
      return { text: '<div class="ai-answer-body">' + esc(txt).replace(/\n/g, '<br>') + '</div>', refs: k.refs, mode: 'api' };
    });
  }

  /* ---------- 航线速查（结构化数据，零费用落地） ---------- */
  var ROUTES = null, routesLoading = null;
  function loadRoutes() {
    if (ROUTES) return Promise.resolve(ROUTES);
    if (!routesLoading) {
      routesLoading = fetch('assets/routes.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (d) { ROUTES = d; return d; })
        .catch(function () { return null; });
    }
    return routesLoading;
  }
  var ROUTE_INTENT = /(航线|航程|路线|哪条船|什么船|什么区域|多少天|几天|出发港|登船港|跑哪里|开哪里|德雷克|河轮|环球|斯瓦尔巴|哪个月|什么季节)/;

  /* ---------- 全链路工具（规则驱动，零 AI 依赖） ---------- */
  var TOOL_PORTS = [];
  var portsLoading = null;
  function loadPorts() {
    if (!portsLoading) {
      portsLoading = fetch('assets/ports.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (d) { TOOL_PORTS = d.ports || []; return TOOL_PORTS; })
        .catch(function () { return []; });
    }
    return portsLoading;
  }
  var TOOL_INTENT = /(天气|气温|温度|weather|打包|行李|装箱|中转|怎么去.{0,6}码头|到.{0,6}码头|怎么到.{0,6}码头|码头.{0,4}怎么走|机场.{0,4}码头|报到|集合|上岸|下船玩|岸上|简报|我的档案|建档|登船准备|怎么飞|机票|直飞|航班号|航班)/;

  function portOf(q) {
    var ql = q.toLowerCase();
    for (var i = 0; i < TOOL_PORTS.length; i++) {
      var p = TOOL_PORTS[i];
      for (var j = 0; j < p.kw.length; j++) if (q.indexOf(p.kw[j]) >= 0) return p;
      if (p.en && ql.indexOf(p.en.toLowerCase()) >= 0) return p;
    }
    return null;
  }
  function toolWeather(p, q) {
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
      '&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=3&timezone=auto')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var c = d.current, dl = d.daily;
        var names = ['晴', '大致晴', '局部多云', '阴', '雾'];
        var wc = function (x) {
          if (x <= 4) return names[x];
          if (x === 45 || x === 48) return '雾';
          if (x <= 57) return '毛毛雨';
          if (x <= 67) return '雨';
          if (x <= 77) return '雪';
          if (x <= 82) return '阵雨';
          if (x >= 95) return '雷暴';
          return '—';
        };
        var rows = [0, 1, 2].map(function (i) {
          var day = new Date(dl.time[i]);
          return (i === 0 ? '今天' : (day.getMonth() + 1) + '月' + day.getDate() + '日') + '：' +
            wc(dl.weather_code[i]) + ' · ' + dl.temperature_2m_min[i] + '–' + dl.temperature_2m_max[i] + '°C · 降水 ' +
            (dl.precipitation_probability_max[i] != null ? dl.precipitation_probability_max[i] + '%' : '—');
        }).join('<br>');
        var html = '<div class="ai-answer-head">☀️ ' + esc(p.name) + ' 实时天气（Open-Meteo · 无需 AI）</div>' +
          '<div class="ai-route-card">当前：<b>' + c.temperature_2m + '°C</b> · ' + wc(c.weather_code) + ' · 风速 ' + c.wind_speed_10m + ' km/h<br>' +
          rows + '<br><a href="tools.html#weather">打开工具箱 · 港口天气 →</a></div>' +
          '<div class="ai-answer-en">Live weather via Open-Meteo — rule-based routing, no AI backend needed.</div>';
        return { text: html, refs: [{ src: '船员工具箱', title: p.name + ' · 港口天气', url: 'tools.html#weather' }], mode: 'routes' };
      })
      .catch(function () { return null; });
  }
  function toolAnswer(q) {
    var isWx = /(天气|气温|温度|weather)/.test(q);
    var p = portOf(q);
    if (isWx) {
      if (!p) {
        return { text: '<div class="ai-answer-head">☀️ 港口天气</div><div class="ai-route-card">支持查询：济州 / 福冈 / 冲绳 / 新加坡 / 普吉 / 乌斯怀亚 / 上海吴淞口。<br>这样问：「<b>济州天气</b>」「乌斯怀亚下周冷不冷」。<br><a href="tools.html#weather">打开工具箱 · 港口天气 →</a></div>', refs: [{ src: '船员工具箱', title: '港口天气', url: 'tools.html#weather' }], mode: 'routes' };
      }
      return toolWeather(p, q); // Promise
    }
    var html = '', refs = [];
    if (/(打包|行李|装箱)/.test(q)) {
      html = '<div class="ai-answer-head">🎒 行李打包要点（5 类 39 项清单）</div>' +
        '<div class="ai-route-card"><b>证件</b>：护照（>合同期 6 个月）、海员证/签证、STCW 原件、健康证书、报到函<br>' +
        '<b>工作</b>：黑皮鞋、白衬衫、黑西裤、防滑鞋<br><b>生活</b>：7 天换洗、常用药（晕船/感冒/肠胃）、防晒<br>' +
        '<b>数字</b>：转换插头（美标/欧标）、充电宝 ≤100Wh<br><b>资金</b>：美元现金 200–500、双币信用卡<br>' +
        '<a href="tools.html#packing">打开可勾选的完整打包清单 →</a></div>';
      refs = [{ src: '船员工具箱', title: '行李打包清单', url: 'tools.html#packing' }];
    } else if (/(中转|怎么去.{0,6}码头|到.{0,6}码头|怎么到.{0,6}码头|码头.{0,4}怎么走|机场.{0,4}码头|报到|集合|登船准备)/.test(q)) {
      html = '<div class="ai-answer-head">✈️ 入职航班中转（11 条线路 · 亚洲/美洲/欧洲/大洋洲）</div>' +
        '<div class="ai-route-card"><b>上海吴淞口</b>：提前 1 天到沪住宝山；浦东机场打车 1–1.5h；船员走 Crew 通道<br>' +
        '<b>迈阿密</b>：C1-D 签证入境；MIA 机场→港 15–25 分钟；先到 Crew Processing 办手续<br>' +
        '<b>新加坡</b>：SG Arrival Card 提前 3 天内填报；樟宜→滨海湾邮轮中心约 40 分钟<br>' +
        '<b>温哥华</b>：Canada Line 直达市中心；阿拉斯加航线主要登船港<br>' +
        '<b>巴塞罗那</b>：申根首入境港；Blue Bus €3 连接码头与哥伦布大道<br>' +
        '<a href="tools.html#transit">查看完整中转攻略 →</a></div>';
      refs = [{ src: '船员工具箱', title: '入职航班中转', url: 'tools.html#transit' }];
    } else if (/(怎么飞|机票|直飞|航班号|航班)/.test(q)) {
      html = '<div class="ai-answer-head">✈️ 全球航班规划</div>' +
        '<div class="ai-route-card">国内 48 机场出发 × 全球 62 机场到达：选出发/到达机场即可看大圆弧线 + 中转方案（经停枢纽 / 推荐航司 / 时长）。<br>' +
        '支持航班号识别添加行程（69 家主流航司两字码，如 MU587、EK303）。<br>' +
        '<a href="tools.html#transit">打开全球航班规划 →</a></div>';
      refs = [{ src: '船员工具箱', title: '全球航班规划', url: 'tools.html#transit' }];
    } else if (/(上岸|下船玩|岸上)/.test(q)) {
      if (p) {
        html = '<div class="ai-answer-head">🧭 ' + esc(p.name) + ' 上岸速览</div>' +
          '<div class="ai-route-card"><b>上岸</b>：' + esc(p.shore.join('；')) + '<br><b>餐饮</b>：' + esc(p.food.join('；')) + '<br><b>交通</b>：' + esc(p.transport.join('；')) +
          '<br><a href="tools.html#port-guide">查看 ' + esc(p.name) + ' 完整上岸规划 →</a></div>';
        refs = [{ src: '船员工具箱', title: p.name + ' · 上岸规划', url: 'tools.html#port-guide' }];
      } else {
        html = '<div class="ai-answer-head">🧭 上岸规划</div><div class="ai-route-card">已收录：济州 / 福冈 / 冲绳·那霸 / 新加坡 / 普吉 / 乌斯怀亚。<br>这样问：「<b>福冈上岸怎么玩</b>」。<br><a href="tools.html#port-guide">打开上岸规划 · 餐饮 · 交通 →</a></div>';
        refs = [{ src: '船员工具箱', title: '上岸规划', url: 'tools.html#port-guide' }];
      }
    } else if (/(简报|我的档案|建档)/.test(q)) {
      html = '<div class="ai-answer-head">📇 我的档案 & 登船简报</div>' +
        '<div class="ai-route-card">在工具箱用一句话建档：「我12月8日登海洋光谱号，职位餐厅服务生」——船只 / 登船日期 / 职位自动识别，存本机浏览器。<br>「生成简报」一键汇总档案 + 证件预警 + 打包进度 + 港口天气。<br>' +
        '<a href="tools.html#profile">去建我的档案 →</a> · <a href="tools.html#briefing">生成登船简报 →</a></div>';
      refs = [{ src: '船员工具箱', title: '我的档案', url: 'tools.html#profile' }];
    } else {
      return null;
    }
    return { text: html + '<div class="ai-answer-en">Rule-based tool routing — instant, offline-friendly, zero AI cost.</div>', refs: refs, mode: 'routes' };
  }

  function routeQuery(q) {
    var routes = ROUTES && ROUTES.routes ? ROUTES.routes : [];
    if (!routes.length) return null;
    var seg = null;
    if (/南极|北极|极地|探险|德雷克|斯瓦尔巴|企鹅|冰川/.test(q)) seg = 'p';
    else if (/内河|长江|莱茵|多瑙|河轮|湄公/.test(q)) seg = 'r';
    else if (/加勒比|迈阿密|地中海|阿拉斯加|魔都|鼓浪屿|蓝梦/.test(q)) seg = 'o';
    else if (/日本|东亚|东南亚|新加坡|和平之船|横滨|香港/.test(q)) seg = 'a';
    var months = (q.match(/(\d{1,2})\s*月/g) || []).map(function (m) { return parseInt(m, 10); });
    var daysM = q.match(/(\d{1,3})\s*天/);
    var days = daysM ? parseInt(daysM[1], 10) : null;
    var kt = tokens(q);
    var pool = seg ? routes.filter(function (r) { return r.seg === seg; }) : routes;
    var scored = pool.map(function (r) {
      var blob = (r.line + r.lineEn + r.ship + r.shipEn + r.region + r.regionEn + r.port + r.hl).toLowerCase();
      var region = (r.region + r.regionEn).toLowerCase();
      var s = 0;
      kt.forEach(function (t) {
        if (region.indexOf(t) >= 0 || (r.ship + r.shipEn).toLowerCase().indexOf(t) >= 0) s += 2;
        else if (blob.indexOf(t) >= 0) s += 1;
      });
      var season = (r.season || '');
      months.forEach(function (m) {
        if (season === '全年' || /全年|各季/.test(season)) s += 1;
        else if (season.indexOf(String(m) + '月') >= 0) s += 2;
      });
      if (days != null) {
        var dm = (r.days || '').match(/(\d{1,3})\s*[–-]\s*(\d{1,3})/);
        if (dm) { var a = +dm[1], b = +dm[2]; if (days >= a - 2 && days <= b + 2) s += 2; else s -= 1; }
      }
      if (seg && r.seg === seg) s += 3;
      return { r: r, s: s };
    }).filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
    if (!scored.length) return null;
    var top = scored.slice(0, 3);
    var html = '<div class="ai-answer-head">🗺️ 航线速查 · ' + scored.length + ' 条匹配</div>' +
      top.map(function (x) {
        var r = x.r;
        return '<div class="ai-route-card"><b>' + esc(r.ship) + '</b>（' + esc(r.line) + '）' +
          '<br>' + esc(r.region) + ' · ' + esc(r.season) + ' · ' + esc(r.days) +
          '<br>出发港：' + esc(r.port) +
          '<br>' + esc(r.hl) +
          '<br><a href="' + esc(r.url) + '" target="_blank" rel="noopener">官网直达 →</a>' +
          ' · <a href="routes.html">打开航线速查页</a></div>';
      }).join('') +
      '<div class="ai-answer-en">Routes are typical references; schedules change every season — confirm on official sites.</div>';
    var refs = top.map(function (x) {
      return { src: '航线速查', title: x.r.ship + ' · ' + x.r.region, url: 'routes.html' };
    });
    return { text: html, refs: refs, mode: 'routes' };
  }

  /* ---------- 统一入口 ---------- */
  function baseAnswer(q) {
    if (apiReady()) {
      return apiAnswer(q).catch(function (err) {
        var r = localAnswer(q);
        r.text = '<div class="ai-warn">⚠️ API 调用失败（' + esc(err.message) + '），已回退本地检索</div>' + r.text;
        return r;
      });
    }
    return localAnswer(q);
  }
  function ask(q) {
    return loadIndex().then(function () {
      if (TOOL_INTENT.test(q)) return loadPorts().then(function () { var tool = toolAnswer(q); if (tool) return tool; if (!ROUTE_INTENT.test(q)) return baseAnswer(q); return loadRoutes().then(function () { return routeQuery(q) || baseAnswer(q); }); });
      if (ROUTE_INTENT.test(q)) {
        return loadRoutes().then(function () {
          var rr = routeQuery(q);
          return rr || baseAnswer(q);
        });
      }
      return baseAnswer(q);
    });
  }

  /* ---------- UI 组件 ---------- */
  function renderRefs(refs) {
    if (!refs || !refs.length) return '';
    return '<div class="ai-refs"><span class="ai-refs-label">来源</span>' + refs.map(function (r) {
      return '<a href="' + r.url + '">' + r.src + ' · ' + esc(r.title.slice(0, 22)) + '</a>';
    }).join('') + '</div>';
  }

  // 悬浮球 + 面板
  function mountWidget() {
    if (document.getElementById('ai-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'ai-fab';
    fab.title = '智能助理 AI Assistant';
    fab.innerHTML = '💬';
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML =
      '<div class="ai-head"><span>🤖 Hub 智能助理</span><button class="ai-close" id="ai-close">✕</button></div>' +
      '<div class="ai-msgs" id="ai-msgs"></div>' +
      '<div class="ai-sugs" id="ai-sugs"></div>' +
      '<div class="ai-input"><input id="ai-q" placeholder="问我任何邮轮问题…" autocomplete="off"><button id="ai-send">发送</button></div>' +
      '<div class="ai-foot"><span id="ai-mode-badge"></span><a href="assistant.html">打开完整版 →</a></div>';
    document.body.appendChild(panel);

    fab.onclick = function () { panel.classList.toggle('open'); if (panel.classList.contains('open')) document.getElementById('ai-q').focus(); };
    document.getElementById('ai-close').onclick = function () { panel.classList.remove('open'); };
    document.getElementById('ai-send').onclick = function () { sendIn(panel); };
    document.getElementById('ai-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendIn(panel); });

    var sug = ['济州天气', '南极航线有哪些', '福冈上岸怎么玩', 'STCW 是什么'];
    document.getElementById('ai-sugs').innerHTML = sug.map(function (s) {
      return '<button class="ai-sug">' + s + '</button>';
    }).join('');
    document.querySelectorAll('#ai-sugs .ai-sug').forEach(function (b) {
      b.onclick = function () { document.getElementById('ai-q').value = b.textContent; sendIn(panel); };
    });

    updateBadge();

    function updateBadge() {
      var el = document.getElementById('ai-mode-badge');
      if (!el) return;
      el.textContent = apiReady() ? '⚡ AI 模式' : '📚 本地检索模式';
    }
    window.__aiUpdateBadge = updateBadge;

    function sendIn(pnl) {
      var input = document.getElementById('ai-q');
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      var msgs = document.getElementById('ai-msgs');
      msgs.insertAdjacentHTML('beforeend', '<div class="ai-msg me">' + esc(q) + '</div>');
      var thinking = document.createElement('div');
      thinking.className = 'ai-msg bot thinking';
      thinking.innerHTML = '检索中…';
      msgs.appendChild(thinking);
      msgs.scrollTop = msgs.scrollHeight;
      ask(q).then(function (r) {
        thinking.classList.remove('thinking');
        thinking.innerHTML = r.text + renderRefs(r.refs);
        msgs.scrollTop = msgs.scrollHeight;
      });
    }
  }

  /* ---------- 独立页面模式 ---------- */
  function mountPage() {
    var box = document.getElementById('ai-page');
    if (!box) return;
    var msgs = document.getElementById('aip-msgs');
    var input = document.getElementById('aip-q');
    var send = document.getElementById('aip-send');

    var badge = document.getElementById('aip-badge');
    if (badge) badge.textContent = apiReady() ? '⚡ 已接入大模型 API' : '📚 本地检索模式（零成本 / 离线可用）';

    function push(q) {
      msgs.insertAdjacentHTML('beforeend', '<div class="ai-msg me">' + esc(q) + '</div>');
      var t = document.createElement('div');
      t.className = 'ai-msg bot thinking';
      t.textContent = '检索中…';
      msgs.appendChild(t);
      msgs.scrollTop = msgs.scrollHeight;
      ask(q).then(function (r) {
        t.classList.remove('thinking');
        t.innerHTML = r.text + renderRefs(r.refs);
        msgs.scrollTop = msgs.scrollHeight;
        saveHist(q, r.text);
      });
    }
    function go() {
      var q = input.value.trim(); if (!q) return;
      input.value = ''; push(q);
    }
    if (send) send.onclick = go;
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    document.querySelectorAll('.ai-sug').forEach(function (b) {
      b.onclick = function () { input.value = b.textContent; go(); };
    });

    function saveHist(q, a) {
      try {
        var h = JSON.parse(localStorage.getItem(HIST_KEY)) || [];
        h.unshift({ q: q, a: a, t: Date.now() });
        localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30)));
      } catch (e) {}
    }

    // 欢迎语
    msgs.innerHTML = '<div class="ai-msg bot"><div class="ai-answer-body">你好 👋 我是 Hub 智能助理。我已经读过全站 500+ 条内容（知识库、技能体系、避坑、招聘、话术……），可以直接问我任何邮轮相关问题。<br><br>' +
      '比如：「客房铺床的标准是什么」「餐厅服务生晋升要多久」「STAR 是什么」「哪家船司适合新人」</div></div>';
  }

  /* ---------- 启动 ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  function init() {
    if (document.getElementById('ai-fab') === null && !document.getElementById('ai-page')) mountWidget();
    mountPage();
  }

  // 暴露给配置面板
  window.HubAI = { getCfg: getCfg, setCfg: setCfg, apiReady: apiReady, reload: function () { location.reload(); } };
})();
