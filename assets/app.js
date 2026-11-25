/* Hub 全局脚本：导航高亮、返回顶部、内容渲染辅助 */
(function () {
  "use strict";

  // 当前页导航高亮
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
  });

  // ---------- 深色 / 亮色主题切换 ----------
  var THEME_KEY = "hub_theme";
  var root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = t === "light" ? "🌙" : "☀️";
    if (btn) btn.title = t === "light" ? "切换到深色模式 Dark mode" : "切换到亮色模式 Light mode";
  }
  applyTheme(root.getAttribute("data-theme") || "dark");
  var navWrap = document.querySelector(".nav-wrap");
  if (navWrap) {
    var tbtn = document.createElement("button");
    tbtn.className = "theme-toggle";
    tbtn.id = "themeToggle";
    tbtn.setAttribute("aria-label", "Toggle color theme");
    tbtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
    navWrap.appendChild(tbtn);
  }

  // ---------- 移动端汉堡菜单 ----------
  var header = document.querySelector(".site-header");
  if (header && navWrap) {
    var burger = document.createElement("button");
    burger.className = "nav-burger";
    burger.setAttribute("aria-label", "Toggle navigation menu");
    burger.textContent = "☰";
    navWrap.insertBefore(burger, navWrap.firstChild.nextSibling);
    burger.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      burger.textContent = open ? "✕" : "☰";
    });
    // 点击导航链接后自动收起
    document.querySelectorAll(".main-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("nav-open");
        burger.textContent = "☰";
      });
    });
  }

  // 返回顶部
  var btn = document.createElement("button");
  btn.id = "toTop";
  btn.textContent = "↑";
  btn.title = "返回顶部 Back to top";
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("scroll", function () {
    btn.classList.toggle("show", window.scrollY > 400);
  });
  document.body.appendChild(btn);

  // 手风琴：同时只展开一项（可选，不强制）
  document.querySelectorAll("details.qa").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) {
        document.querySelectorAll("details.qa[open]").forEach(function (o) {
          if (o !== d) o.removeAttribute("open");
        });
      }
    });
  });

  // ---------- 全站内容板块折叠（渐进增强；交互工具页豁免） ----------
  var FOLD_SKIP = { "tools.html": 1, "assistant.html": 1, "quiz.html": 1 };
  if (!FOLD_SKIP[path]) {
    var mainEl = document.querySelector("main.container");
    if (mainEl) {
      var isH2 = function (el) {
        return el.nodeType === 1 && el.tagName === "H2" && el.className.indexOf("section-title") >= 0;
      };
      // 板块单元：main 直接子级的 h2.section-title，或 div.block 内以 h3 开头的块容器
      var heads = Array.prototype.filter.call(mainEl.children, function (el) {
        if (isH2(el)) return true;
        if (el.nodeType === 1 && el.tagName === "DIV" && el.className.indexOf("block") >= 0) {
          var first = null;
          for (var c = 0; c < el.children.length; c++) {
            if (el.children[c].nodeType === 1) { first = el.children[c]; break; }
          }
          if (first && first.tagName === "H3") return true;
        }
        return false;
      });
      if (heads.length > 1) {
        var FKEY = "hub_fold_" + path;
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(FKEY)); } catch (e) {}
        var folds = [];
        heads.forEach(function (h, i) {
          var d = document.createElement("details");
          d.className = "sec-fold";
          var sum = document.createElement("summary");
          h.parentNode.insertBefore(d, h);
          var headEl, stopAt = null;
          if (isH2(h)) {
            headEl = h;
            stopAt = function (el) { return isH2(el); };
          } else {
            // div.block：h3 开头的块容器，整块收进折叠
            headEl = h.querySelector("h3");
            h.parentNode.insertBefore(d, h);
            d.appendChild(sum);
            sum.appendChild(headEl);
            Array.prototype.forEach.call(h.children, function (c) { d.appendChild(c); });
            h.remove();
            folds.push(d);
            d.open = saved ? saved.indexOf(i) >= 0 : i === 0;
            d.addEventListener("toggle", function () {
              var openIdx = [];
              folds.forEach(function (fd, j) { if (fd.open) openIdx.push(j); });
              try { localStorage.setItem(FKEY, JSON.stringify(openIdx)); } catch (e) {}
              if (d.open && d.querySelector("#routes-map, #transit-map")) {
                window.dispatchEvent(new Event("resize"));
              }
            });
            return;
          }
          d.appendChild(sum);
          sum.appendChild(headEl);
          d.appendChild(sum);
          var n = d.nextSibling;
          while (n && !stopAt(n)) {
            var nx = n.nextSibling;
            d.appendChild(n);
            n = nx;
          }
          d.open = saved ? saved.indexOf(i) >= 0 : i === 0;
          folds.push(d);
          d.addEventListener("toggle", function () {
            var openIdx = [];
            folds.forEach(function (fd, j) { if (fd.open) openIdx.push(j); });
            try { localStorage.setItem(FKEY, JSON.stringify(openIdx)); } catch (e) {}
            // 折叠块内含地图时，展开后触发 resize 让 Leaflet 重算尺寸
            if (d.open && d.querySelector("#routes-map, #transit-map")) {
              window.dispatchEvent(new Event("resize"));
            }
          });
        });
      }
    }
  }

  // 页脚年份
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---------- 全站横幅：证件到期提醒 + 内容版本提示 ----------
  function hubBanner(html, cls, closable, closeKey) {
    var existed = document.getElementById("hub-banner");
    var el = document.createElement("div");
    el.id = "hub-banner";
    el.className = "hub-banner " + (cls || "");
    el.innerHTML = html;
    if (existed) existed.parentNode.insertBefore(el, existed);
    else document.body.insertBefore(el, document.body.firstChild);
    if (closable && closeKey) {
      var x = document.createElement("button");
      x.className = "hub-banner-close";
      x.textContent = "✕";
      x.onclick = function () {
        el.remove();
        try { localStorage.setItem(closeKey, "1"); } catch (e) {}
      };
      el.appendChild(x);
    }
    return el;
  }

  // ① 证件到期（数据来自工具箱 hub_certs_v1）
  try {
    var certs = JSON.parse(localStorage.getItem("hub_certs_v1")) || [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var urgent = null;
    certs.forEach(function (c) {
      if (!c || !c.date) return;
      var d = Math.round((new Date(c.date) - today) / 86400000);
      if (!urgent || d < urgent.d) urgent = { name: c.name, date: c.date, d: d };
    });
    if (urgent && urgent.d <= 90) {
      var msg = urgent.d < 0
        ? '❌ <b>' + urgent.name + '</b> 已过期 ' + (-urgent.d) + ' 天，请立即处理 <span class="hub-banner-en">Expired certificate — take action now</span>'
        : '⚠️ <b>' + urgent.name + '</b> 将于 ' + urgent.date + ' 到期（剩 <b>' + urgent.d + '</b> 天）<span class="hub-banner-en">Certificate expiring in ' + urgent.d + ' days</span>';
      hubBanner(msg + ' · <a href="tools.html#profile">去工具箱管理 →</a>', "hub-banner-cert");
    }
  } catch (e) {}

  // ② 平台内容更新提示（version.json 由内容构建流程自动生成）
  try {
    fetch("assets/version.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
      if (!v || !v.v) return;
      var seen = null;
      try { seen = localStorage.getItem("hub_content_v"); } catch (e) {}
      if (seen === v.v) return;
      var el = hubBanner('🆕 平台内容已更新至 <b>v' + v.v + '</b>（' + v.note + '）· 数据快照 ' + v.date +
        ' · <a href="index.html">回到首页看看 →</a>', "hub-banner-ver");
      var markRead = function () { try { localStorage.setItem("hub_content_v", v.v); } catch (e) {} };
      var x = document.createElement("button");
      x.className = "hub-banner-close";
      x.textContent = "✕";
      x.onclick = markRead;
      el.appendChild(x);
      el.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", markRead);
      });
    }).catch(function () {});
  } catch (e) {}
})();
