/*
 * 運命リズム診断 — 今日のカラー（TODAY'S COLOR）の選び方（2026-09-22 せいこさん指示・BASICのみ）
 *
 * 判定: 本命星がその日の日盤で入っている宮（＝その場所の定位星 1〜9）。今日のひと皿と同じ考え方。
 * 素材: content/colors.js（宮ごとの [色名, モチーフ, 画像名]）。画像は assets/icons/color/*.webp
 *
 * 選び方（すべて日付・本命星・宮から決まる＝同じ人・同じ日は何度開いても同じ）:
 *   1. 主役の色: 宮ごとの色を、本命星ごとに固定の順番に並べ替え、9日単位で1つずつ進める。
 *      本命星がひとつの宮に戻ってくるのはおよそ9日ごとなので、同じ宮に来るたびに次の色になる
 *      （一白の北は 黒・濃紺・ネイビー・チャコールグレー・パールホワイト・白 が均等に回る）
 *   2. 前日の主役と同じ色になったら、次の色へずらす（白・ベージュ・黄色など、宮をまたいで同じ色名があるため）
 *   3. 主役の画像: その色の素材から、前日の主役と同じ種類（バッグ・靴など）を避けて選ぶ
 *   4. 添え: 同じ宮の、主役と色も種類も違う素材から1〜2点（前日に出た種類は後回し）
 *   5. 配置の型（5種類）は日付で順に進める＝前日と同じ型にならない
 *   前日の結果は「前々日までを踏まえて計算した前日」と比べる（それより前はさかのぼらない）
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.URColor = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  var LAYOUTS = 5;

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // 決まった種から、毎回同じ並び替え
  function shuffled(list, seed) {
    var a = list.slice(), s = seed || 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = (s ^ (s >>> 13)) >>> 0;
      var j = s % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function dayNo(dateKey) {
    var p = dateKey.split('-').map(Number);
    return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
  }
  function colorsOf(items) {
    var seen = {}, out = [];
    items.forEach(function (it) { if (!seen[it[0]]) { seen[it[0]] = 1; out.push(it[0]); } });
    return out;
  }

  // 1日分を単独で選ぶ。prev があれば前日と続かないように調整する
  function pickDay(palace, honmei, dateKey, data, prev) {
    var P = data[palace];
    if (!P) return null;
    var items = P.items;
    var n = dayNo(dateKey);
    var base = hash(honmei + ':' + palace);
    var seed = hash(dateKey + ':' + honmei + ':' + palace);

    // 1〜2. 主役の色
    var order = shuffled(colorsOf(items), base);
    var ci = Math.floor(n / 9) % order.length;
    if (prev && order[ci] === prev.color && order.length > 1) ci = (ci + 1) % order.length;
    var color = order[ci];

    // 3. 主役の画像（同じ色の中から。前日と同じ種類は避ける）
    var same = items.filter(function (it) { return it[0] === color; });
    var okMain = same.filter(function (it) { return !prev || it[1] !== prev.mainMotif; });
    var pool = okMain.length ? okMain : same;
    var main = pool[seed % pool.length];

    // 4. 添え（主役と色も種類も違うもの。前日に出た種類は後回し）
    var prevMotifs = prev ? prev.motifs : [];
    var rest = shuffled(items.filter(function (it) { return it[0] !== color && it[1] !== main[1]; }), seed);
    rest.sort(function (a, b) {
      return (prevMotifs.indexOf(a[1]) >= 0 ? 1 : 0) - (prevMotifs.indexOf(b[1]) >= 0 ? 1 : 0);
    });
    var want = (seed >>> 3) % 2 ? 2 : 1;   // 合計2点か3点
    var subs = [], used = {};
    used[main[1]] = 1;
    for (var i = 0; i < rest.length && subs.length < want; i++) {
      if (used[rest[i][1]]) continue;       // 添え同士も種類をかぶらせない
      used[rest[i][1]] = 1; subs.push(rest[i]);
    }

    // 5. 配置の型
    // 日付で2つずつ進める（5種類なので、前日と同じ型には絶対にならない）
    var layout = ((n * 2 + honmei) % LAYOUTS + LAYOUTS) % LAYOUTS;

    return {
      palace: palace, dir: P.dir, label: P.label, line: P.line,
      color: color, main: main, subs: subs, layout: layout,
      mainMotif: main[1], motifs: [main[1]].concat(subs.map(function (s) { return s[1]; }))
    };
  }

  /**
   * 今日のカラー
   * today: { palace, dateKey } / yesterday: { palace, dateKey }（前日の宮。わからなければ null）
   */
  // dayBefore（前々日）も渡すと、前日の結果をより実際の表示に近づけて比べられる
  function pick(honmei, today, yesterday, data, dayBefore) {
    var pp = (dayBefore && dayBefore.palace) ? pickDay(dayBefore.palace, honmei, dayBefore.dateKey, data, null) : null;
    var prev = (yesterday && yesterday.palace) ? pickDay(yesterday.palace, honmei, yesterday.dateKey, data, pp) : null;
    return pickDay(today.palace, honmei, today.dateKey, data, prev);
  }

  return { pick: pick, pickDay: pickDay, LAYOUTS: LAYOUTS };
});
