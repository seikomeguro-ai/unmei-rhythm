/*
 * 運命リズム診断 — 選文エンジン（ブラウザ / Node 共有）
 *
 * 正本: CONTENT_RULES.md「毎朝の4カードの担当割り」「レイヤーの重なり方」
 * ここは文章を作らない。content/ 配下の人間監修プールから「選ぶ」だけ。
 *
 * 選び方（2026-08-23せいこさん決裁の2点を反映）:
 *  - THEME: 日の宮の候補プールから、月のリズム(+2)・大きな季節(+1)・本質(+1)・
 *           life_theme一致(+1)の相性スコアで選ぶ。同点は日付シードで回転
 *  - MESSAGE: 日の宮ベース文 + 受け取り方（本質×日の宮）。受け取り方は
 *           月のmotionに合うvariantがあればそれを使う＝月は毎日効く
 *  - ACTION: 日の宮プールから、選ばれたTHEMEのmotionに合うものを回転選択
 *  - WORD: 本質タイプのプールが主役。今日のmotionに合う言葉を優先、なければ普遍の言葉
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.URSelect = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // 宮→motion の構造マップ（CONTENT_RULES.md「タグ」の項と同一に保つ）
  var PALACE_MOTION = {
    1: 'reflect', 2: 'prepare', 3: 'start', 4: 'connect', 5: 'center',
    6: 'elevate', 7: 'receive', 8: 'release', 9: 'express'
  };

  // 本質タイプ→motion親和（選文のチューニング値。タイプの人格描写から設定。調整可）
  var TYPE_MOTION = {
    1: ['reflect', 'connect'],   // 一白: 流れ・感受
    2: ['prepare', 'receive'],   // 二黒: 育てる・実り
    3: ['start'],                // 三碧: 始動
    4: ['connect'],              // 四緑: ご縁
    5: ['center', 'release'],    // 五黄: 中心・組み替え
    6: ['elevate'],              // 六白: 基準・高み
    7: ['receive', 'express'],   // 七赤: 喜び
    8: ['release', 'elevate'],   // 八白: 節目・更新
    9: ['express', 'start']      // 九紫: 輝き・感性
  };

  function intersects(a, b) {
    if (!a || !b) return false;
    for (var i = 0; i < a.length; i++) { if (b.indexOf(a[i]) >= 0) return true; }
    return false;
  }

  // 日付キー→通算日数（メッセージの日替わり回転に使う）
  function daysOf(dateKey) {
    var p = dateKey.split('-');
    return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }

  // day_base / ukekata の新旧形式を texts 配列に正規化
  function baseTexts(entry) {
    if (!entry || entry.pending) return [];
    if (entry.texts) return entry.texts.map(function (t) { return typeof t === 'string' ? { text: t } : t; });
    if (entry.text) return [{ text: entry.text }];
    return [];
  }
  function ukeTexts(entry) {
    if (!entry || entry.pending) return [];
    if (entry.texts) return entry.texts;
    var arr = [];
    if (entry.base) arr.push({ text: entry.base });
    (entry.variants || []).forEach(function (v) { arr.push({ text: v.text, month_motion: v.month_motion }); });
    return arr;
  }

  // 日付キー("YYYY-MM-DD")→決定的シード（同じ日・同じ人なら必ず同じ選択になる）
  function seedOf(dateKey, typeNo) {
    var n = 0;
    for (var i = 0; i < dateKey.length; i++) { n = (n * 31 + dateKey.charCodeAt(i)) % 1000000007; }
    return n + typeNo * 7;
  }

  function usable(item) { return item && !item.pending; }

  /**
   * 毎朝の4カードを選ぶ。
   * ctx: { typeNo, yearZone, monthZone, dayZone, dateKey }
   * content: { themes, actions, words, dayBase, ukekata }
   * 戻り値: { theme, message, action, word } 各カードは {..} または {pending:true}
   */
  function selectDaily(ctx, content) {
    var typeNo = ctx.typeNo, dayZone = ctx.dayZone;
    var seed = seedOf(ctx.dateKey, typeNo);
    var monthMotion = ctx.monthZone ? PALACE_MOTION[ctx.monthZone] : null;
    var yearMotion = ctx.yearZone ? PALACE_MOTION[ctx.yearZone] : null;
    var typeMotions = TYPE_MOTION[typeNo] || [];

    if (!dayZone) {
      return { theme: { pending: true }, message: { pending: true }, action: { pending: true }, word: { pending: true } };
    }

    // --- THEME: 日の宮が主軸、他レイヤーとの相性スコアで候補を絞る ---
    var pool = content.themes.filter(function (t) { return t.palace === dayZone && usable(t); });
    var theme = null;
    if (pool.length) {
      var scored = pool.map(function (t) {
        var s = 0;
        if (monthMotion && t.motion.indexOf(monthMotion) >= 0) s += 2; // 月は毎日効かせる
        if (yearMotion && t.motion.indexOf(yearMotion) >= 0) s += 1;
        if (intersects(t.motion, typeMotions)) s += 1;
        if (t.life_theme && t.life_theme.length && intersects(t.life_theme, typeLifeThemes(typeNo))) s += 1;
        return { t: t, s: s };
      });
      var max = Math.max.apply(null, scored.map(function (x) { return x.s; }));
      var top = scored.filter(function (x) { return x.s === max; }).map(function (x) { return x.t; });
      theme = top[seed % top.length];
    }

    // --- MESSAGE: 日の宮ベース文 + 受け取り方 ---
    // 日替わり回転（2026-08-25決裁: 同じ宮の日でも同月内に同じ文を繰り返さない）:
    // 同じ宮の日は9日ごとに巡るので、9日単位で進むカウンタ rot によって
    // ベース文と受け取り方の組み合わせが毎回ずれる（3×3なら81日間重複なし）。
    var bases = baseTexts(content.dayBase[dayZone]);
    var ukAll = ukeTexts(content.ukekata[typeNo + '-' + dayZone]);
    var message = null;
    if (bases.length && ukAll.length) {
      // 月のmotionに合う受け取り方を優先的に回転プールへ（月は毎日効かせる）
      var matching = ukAll.filter(function (u) { return u.month_motion && u.month_motion === monthMotion; });
      var neutral = ukAll.filter(function (u) { return !u.month_motion; });
      var ukPool = matching.length ? matching.concat(neutral) : (neutral.length ? neutral : ukAll);
      var rot = Math.floor(daysOf(ctx.dateKey) / 9) + typeNo;
      var b = bases[rot % bases.length];
      var u = ukPool[Math.floor(rot / bases.length) % ukPool.length];
      message = { text: b.text + u.text, usedMonthMotion: !!u.month_motion };
    }

    // --- ACTION: 日の宮×THEMEのmotion一致 ---
    var acts = content.actions.filter(function (a) { return a.palace === dayZone && usable(a); });
    if (theme) {
      var matched = acts.filter(function (a) { return intersects(a.motion, theme.motion); });
      if (matched.length) acts = matched;
    }
    var action = acts.length ? acts[seed % acts.length] : null;

    // --- WORD: 本質が主役。今日のmotionに合えば優先、なければ普遍の言葉 ---
    var words = content.words.filter(function (w) { return w.type === typeNo && usable(w); });
    var word = null;
    if (words.length) {
      var todayMotions = theme ? theme.motion : [PALACE_MOTION[dayZone]];
      var wMatched = words.filter(function (w) { return intersects(w.motion, todayMotions); });
      var wUniversal = words.filter(function (w) { return !w.motion || w.motion.length === 0; });
      var wPool = wMatched.length ? wMatched : (wUniversal.length ? wUniversal : words);
      word = wPool[seed % wPool.length];
    }

    return {
      theme: theme || { pending: true },
      message: message || { pending: true },
      action: action || { pending: true },
      word: word || { pending: true }
    };
  }

  // 本質タイプ→life_theme親和（当面は未設定＝空。埋めるときはCONTENT_RULES.mdの語彙で）
  function typeLifeThemes(typeNo) { return []; }

  return {
    PALACE_MOTION: PALACE_MOTION,
    TYPE_MOTION: TYPE_MOTION,
    seedOf: seedOf,
    daysOf: daysOf,
    selectDaily: selectDaily
  };
});
