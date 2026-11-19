/*
 * 運命リズム — お知らせ枠の表示（content/news.js を読む）
 * ×で閉じたお知らせは、その端末では出さない（localStorage: ur_news_hide_<id>）
 * タップは匿名計測（news_click_<id>）。個人情報は送らない
 */
'use strict';
var UR_NEWS_UI = (function () {
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 意味のまとまりで折る：「。」ごとに1行、「、」の後ろだけで折り返す（jp-kaigyou の考え方）
  function phrase(s) {
    return String(s).replace(/。/g, '。\n').split('\n').filter(Boolean).map(function (line) {
      return '<span class="news-line">' + line.replace(/、/g, '、\n').split('\n').filter(Boolean).map(function (p) {
        return '<span class="news-nw">' + esc(p) + '</span>';
      }).join('') + '</span>';
    }).join('');
  }

  function active(list, todayKey) {
    return (list || []).filter(function (n) {
      if (n.start && todayKey < n.start) return false;
      if (n.end && todayKey > n.end) return false;
      return !get('ur_news_hide_' + n.id);
    }).slice(0, 2);
  }

  function render(el, todayKey) {
    if (!el) return;
    var items = active(typeof UR_NEWS !== 'undefined' ? UR_NEWS : [], todayKey);
    if (!items.length) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = items.map(function (n) {
      return '<div class="news-item' + (n.img ? ' has-img' : '') + '" data-id="' + esc(n.id) + '">' +
        '<a class="news-link" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
          (n.img ? '<span class="news-img"><img src="' + esc(n.img) + '" alt="" loading="lazy"></span>' : '') +
          '<span class="news-body">' +
            (n.label ? '<span class="news-label">' + esc(n.label) + '</span>' : '') +
            '<span class="news-title">' + phrase(n.title) + '</span>' +
            (n.sub ? '<span class="news-sub">' + phrase(n.sub) + '</span>' : '') +
            '<span class="news-cta">' + esc(n.cta || '詳しく見る') + '<span class="news-arrow">›</span></span>' +
          '</span>' +
        '</a>' +
        '<button type="button" class="news-close" aria-label="このお知らせを閉じる">×</button>' +
      '</div>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.news-item'), function (box) {
      var id = box.getAttribute('data-id');
      box.querySelector('.news-link').addEventListener('click', function () {
        if (typeof UR_TRACK !== 'undefined') UR_TRACK.event('news_click_' + id);
      });
      box.querySelector('.news-close').addEventListener('click', function () {
        set('ur_news_hide_' + id, '1');
        box.remove();
        if (!el.querySelector('.news-item')) el.hidden = true;
      });
    });
  }

  return { render: render, active: active };
})();
