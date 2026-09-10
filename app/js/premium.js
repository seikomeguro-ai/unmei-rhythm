/*
 * 運命リズム診断 — 無料版／14日体験／BASIC の判定
 * 正本: tools/unmei-rhythm/BASIC_ACCESS_DESIGN.md
 *
 * 役割: 表示側（app.js）が見るのはこのファイルの関数だけ。
 *
 * 2026-09-09 改訂: 月替わりキー方式を廃止し、サーバー連携（Supabase＋PayPal）へ移行。
 *   - BASICの期限 ur_basic_until は account.js がサーバーに聞いて書き込む
 *   - このファイルは「書かれた日付を読んで判定する」だけに徹する（同期的に答える）
 *   - 14日体験は従来どおりアプリ側の機能。起点は初回診断日（ur_start）
 *
 * テスト用: ?tier=free|trial|premium で表示を固定できる（公開GO時に除去）
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_PREMIUM = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  var TRIAL_DAYS = 14;   // 初回診断日を1日目として14日間

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function keyOfDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseKeyDate(k) {
    var p = String(k || '').split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // --- 純粋ロジック（テストから直接呼ぶ） ---

  // start/until/today はすべて 'YYYY-MM-DD'。until が今日以降ならBASIC、
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

  // --- localStorageを使う実運用API ---

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  // 初回診断完了日を体験起点として保存（すでにあれば変えない）
  function markStart(now) {
    if (!get('ur_start')) set('ur_start', keyOfDate(now || new Date()));
  }

  /**
   * いまの状態を返す。同期的に答えるため、サーバーの返事は見に行かない。
   * BASICの期限は account.js が事前に ur_basic_until へ書き込んでおく。
   * サーバーに聞けなかった場合は前回の期限がそのまま残るので、
   * 障害中でも締め出さない（期限自体はサーバーが決めた日付なので、放っておけば正しく切れる）。
   */
  function tier(now) {
    var dev = get('ur_dev_tier');
    if (dev === 'free' || dev === 'trial' || dev === 'premium') return dev;
    now = now || new Date();
    return computeTier(get('ur_start'), get('ur_basic_until'), keyOfDate(now));
  }

  function basicUntil() { return get('ur_basic_until'); }

  function trialDaysLeft(now) {
    var idx = trialDayIndex(get('ur_start'), keyOfDate(now || new Date()));
    if (idx === null) return null;
    var left = TRIAL_DAYS - idx + 1;
    return left > 0 ? left : 0;
  }

  /**
   * URLパラメータ処理。
   * 2026-09-09: 解錠キー（?k=）は廃止。流入元の記録とテスト用プレビューだけが残る。
   */
  function handleUrl(search) {
    var params = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) params[p[0]] = decodeURIComponent(p[1] || '');
    });
    if (params.src) { if (!get('ur_src')) set('ur_src', params.src); }
    // --- テスト用プレビュー（公開GO時にこのブロックを除去） ---
    if (params.tier === 'free' || params.tier === 'trial' || params.tier === 'premium') {
      set('ur_dev_tier', params.tier);
    } else if (params.tier === 'off') {
      try { localStorage.removeItem('ur_dev_tier'); } catch (e) { }
    }
    return null;
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
    TRIAL_DAYS: TRIAL_DAYS,
    computeTier: computeTier, trialDayIndex: trialDayIndex,
    markStart: markStart, tier: tier, trialDaysLeft: trialDaysLeft,
    basicUntil: basicUntil,
    handleUrl: handleUrl,
    devCycle: devCycle, devTierLabel: devTierLabel
  };
});
