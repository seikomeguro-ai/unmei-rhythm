/*
 * 運命リズム診断 — プレミアム状態管理（FUNNEL_DESIGN.md v1.2 フェーズ1）
 *
 * 役割: 無料版／14日体験中／プレミアムの判定を isPremium()/tier() に集約する。
 * 表示側（app.js）はこのファイルの関数しか見ない。将来Stripe等へ差し替えるときも
 * このファイルの中身だけを入れ替える（FUNNEL_DESIGN.md §5）。
 *
 * 解錠: 月替わりリンク（?k=月キー）。キーの平文は OPERATIONS.md 付録A（非公開）のみ。
 * ここには照合用ハッシュだけを置く。当月キーと前月キーを受け付け、タップから35日間解錠。
 *
 * テスト用: ?tier=free|trial|premium で表示プレビューを固定できる（公開GO時に除去）。
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_PREMIUM = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  var TRIAL_DAYS = 14;   // 初回診断日を1日目として14日間
  var UNLOCK_DAYS = 35;  // 解錠リンクのタップから35日間

  // 月別キーの照合用ハッシュ（平文はOPERATIONS.md付録A・非公開リポジトリのみ）
  var KEY_HASHES = {
    '2026-09': '5e079949',
    '2026-10': '44f9ef7a',
    '2026-11': 'cfc5cab9',
    '2026-12': '2c2d9ff1',
    '2027-01': 'ab1f2a9d',
    '2027-02': '70bf0e76',
    '2027-03': '727ccc41',
    '2027-04': '712b62d6',
    '2027-05': 'd2da3fd0',
    '2027-06': '6c220d7a',
    '2027-07': 'd13a3b70',
    '2027-08': '7486a060',
    '2027-09': 'c7ac5b5c',
    '2027-10': 'dabbdd9e',
    '2027-11': '2ca8fe98',
    '2027-12': '3c1268d0',
    '2028-01': '3740ebe3',
    '2028-02': '041a4afc',
    '2028-03': '40eb97c6',
    '2028-04': 'c4eee150',
    '2028-05': 'd13aa39f',
    '2028-06': 'f707d61e',
    '2028-07': 'a917856a',
    '2028-08': 'd3ab77c5',
  };

  function djb2(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((Math.imul(h, 33)) ^ s.charCodeAt(i)) >>> 0;
    }
    var hex = h.toString(16);
    while (hex.length < 8) hex = '0' + hex;
    return hex;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function keyOfDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function monthOfDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  function prevMonthOf(d) {
    var p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return monthOfDate(p);
  }
  function parseKeyDate(k) {
    var p = String(k || '').split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // --- 純粋ロジック（テストから直接呼ぶ） ---

  // start/until/today はすべて 'YYYY-MM-DD'。until が今日以降ならプレミアム、
  // 体験開始から14日以内なら体験中、どちらでもなければ無料版
  function computeTier(startKey, untilKey, todayKey) {
    if (untilKey && untilKey >= todayKey) return 'premium';
    if (startKey) {
      var days = Math.floor((parseKeyDate(todayKey) - parseKeyDate(startKey)) / 86400000) + 1;
      if (days >= 1 && days <= TRIAL_DAYS) return 'trial';
    }
    return 'free';
  }

  function trialDayIndex(startKey, todayKey) {
    if (!startKey) return null;
    return Math.floor((parseKeyDate(todayKey) - parseKeyDate(startKey)) / 86400000) + 1;
  }

  // 解錠キーの検証: 当月または前月のキーなら有効
  function verifyKey(plainKey, now) {
    var h = djb2(String(plainKey || '').toUpperCase());
    var cur = monthOfDate(now), prev = prevMonthOf(now);
    return (KEY_HASHES[cur] === h) || (KEY_HASHES[prev] === h);
  }

  function unlockUntilKey(now) {
    var until = new Date(now.getTime());
    until.setDate(until.getDate() + UNLOCK_DAYS);
    return keyOfDate(until);
  }

  // --- localStorageを使う実運用API ---

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  // 初回診断完了日を体験起点として保存（すでにあれば変えない）
  function markStart(now) {
    if (!get('ur_start')) set('ur_start', keyOfDate(now || new Date()));
  }

  function tier(now) {
    var dev = get('ur_dev_tier');
    if (dev === 'free' || dev === 'trial' || dev === 'premium') return dev;
    now = now || new Date();
    return computeTier(get('ur_start'), get('ur_premium_until'), keyOfDate(now));
  }

  function trialDaysLeft(now) {
    var idx = trialDayIndex(get('ur_start'), keyOfDate(now || new Date()));
    if (idx === null) return null;
    var left = TRIAL_DAYS - idx + 1;
    return left > 0 ? left : 0;
  }

  // URLパラメータ処理。?k=解錠キー ／ ?tier=・?tz= はテスト用プレビュー（GO時に除去）
  function handleUrl(search, now) {
    now = now || new Date();
    var params = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) params[p[0]] = decodeURIComponent(p[1] || '');
    });
    var result = null;
    if (params.k && verifyKey(params.k, now)) {
      var until = unlockUntilKey(now);
      var cur = get('ur_premium_until');
      if (!cur || until > cur) set('ur_premium_until', until);  // 延長のみ（短縮しない）
      result = cur ? 'unlocked-renew' : 'unlocked-first';       // 初回解錠か月次更新かを計測で区別する
    }
    if (params.src) { if (!get('ur_src')) set('ur_src', params.src); }
    // --- テスト用プレビュー（公開GO時にこのブロックを除去） ---
    if (params.tier === 'free' || params.tier === 'trial' || params.tier === 'premium') {
      set('ur_dev_tier', params.tier);
    } else if (params.tier === 'off') {
      try { localStorage.removeItem('ur_dev_tier'); } catch (e) { }
    }
    return result;
  }


  // テスト用: トグルで trial → free → premium を巡回（公開GO時に除去）
  function devCycle() {
    var order = ['trial', 'free', 'premium'];
    var cur = get('ur_dev_tier');
    var next = order[(order.indexOf(cur) + 1) % order.length];
    set('ur_dev_tier', next);
    return next;
  }
  function devTierLabel() {
    var t = tier();
    return t === 'premium' ? 'BASIC' : (t === 'trial' ? '体験中' : '無料版');
  }

  return {
    TRIAL_DAYS: TRIAL_DAYS, UNLOCK_DAYS: UNLOCK_DAYS,
    KEY_HASHES: KEY_HASHES, djb2: djb2,
    computeTier: computeTier, trialDayIndex: trialDayIndex,
    verifyKey: verifyKey, unlockUntilKey: unlockUntilKey,
    markStart: markStart, tier: tier, trialDaysLeft: trialDaysLeft,
    handleUrl: handleUrl,
    devCycle: devCycle, devTierLabel: devTierLabel
  };
});
