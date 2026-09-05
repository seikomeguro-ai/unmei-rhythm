/*
 * 運命リズム診断 — 匿名行動計測（FUNNEL_DESIGN.md §6・フェーズ1）
 *
 * 方針: 個人と紐づけない。送るのは「イベント名＋流入元src」だけ。
 * メール・生年月日・九星・本質タイプは絶対に送らない。
 *
 * 計測先: GoatCounter（Cookieなし・匿名）。ENDPOINT はフェーズ3でアカウント作成後に設定する。
 * 空のあいだは何も送信しない（一度きりイベントの既送フラグも立てないので、設定後から正しく数え始める）。
 *
 * イベント設計（§6）: diagnosis_complete / visit_d2・d3・d7・d14 /
 *                    premium_notice_view / checkout_click / premium_unlock_first・renew
 * lp_view・register・mail_url_click はLP・オートビズ側で取る（このファイルの担当外）。
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_TRACK = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // フェーズ3で 'https://（サイトコード）.goatcounter.com/count' を設定する。空=送信しない
  var ENDPOINT = '';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  function srcOf() { return get('ur_src') || 'direct'; }

  // GoatCounterのイベントはパスで数える: /イベント名/流入元
  function buildUrl(endpoint, name, src) {
    return endpoint + '?p=' + encodeURIComponent('/' + name + '/' + src) + '&e=true';
  }

  // 送信（ENDPOINT未設定なら何もしない）。戻り値=送信したか
  function event(name) {
    if (!ENDPOINT) return false;
    try { new Image().src = buildUrl(ENDPOINT, name, srcOf()); } catch (e) { }
    return true;
  }

  // 一度きりイベント（診断完了・visit_dN）。送信できたときだけ既送フラグを立てる
  function once(name, flagKey) {
    if (get(flagKey)) return false;
    if (event(name)) { set(flagKey, '1'); return true; }
    return false;
  }

  // 1日1回イベント（案内表示）
  function daily(name, flagKey, todayKey) {
    if (get(flagKey) === todayKey) return false;
    if (event(name)) { set(flagKey, todayKey); return true; }
    return false;
  }

  // 継続利用の節目（体験起点からの経過日が2・3・7・14日目のとき1回ずつ）
  function visitCheck(dayIndex) {
    if (dayIndex === 2 || dayIndex === 3 || dayIndex === 7 || dayIndex === 14) {
      once('visit_d' + dayIndex, 'ur_evt_visit_d' + dayIndex);
    }
  }

  return {
    buildUrl: buildUrl,   // テスト用に公開
    event: event, once: once, daily: daily, visitCheck: visitCheck,
    enabled: function () { return !!ENDPOINT; }
  };
});
