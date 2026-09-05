/*
 * 運命リズム診断 — 時流レイヤー（月額版・現在は空）
 *
 * キー: 「気学年-気学月番号」（例: '2026-7' = 丙午年・申月＝2026年8月）
 * 干支は data/terms.js が自動で持っている（yearKanshi / monthSetsu[].kanshi）ので、
 * ここには文章だけを書けばよい。
 * ユーザー画面の見出しは「THIS MONTH'S FLOW｜今月の時流」。干支は小さく添えるだけ。
 * 主役は「だから、あなたは今どうするといいの？」（2026-08-23せいこさん指示）。
 *
 * 構造（月額版で使う想定）:
 * '2026-7': {
 *   message: '今月の時流メッセージ（全員共通）',
 *   setsuiri: '節入り当日に出す特別メッセージ（任意）',
 *   perType: { 1: '本質別の一文（任意）', ... }
 * }
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_JIRYU = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    // MVPでは空。月額版の設計確定後にせいこさん監修で執筆する。
  };
});
