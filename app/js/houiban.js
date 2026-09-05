/*
 * 運命リズム診断 — 方位盤（日盤）モジュール
 *
 * 表示: 北が上の地図式（2026-08-26せいこさん決定。伝統的な北下ではない）
 * 無料版: 盤のみ（今日の星の巡り）
 * 有料版: 本人の吉方位に色、控えたい方位（凶）をグレー表示
 *
 * 吉凶ロジック（MVP簡易版・せいこさん監修前提。CONTENT_RULESの週次チェック対象）:
 * - 吉方候補: 本命星と相生（生気・退気）・比和の星の方位（五黄は常に除外）
 * - 控えたい方位: 五黄殺（五黄の方位）・暗剣殺（その対面）・日破・
 *   本命殺（自分の星の方位）・本命的殺（その対面）
 * - 吉方候補から控えたい方位を除いたものを「今日の吉方位」として表示
 * ※月命星との重ね合わせ（最大吉方）は有料版の将来拡張で対応
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.URHouiban = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  var DIR_NAMES = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  var TEII = [1, 8, 3, 4, 9, 2, 7, 6];
  var STAR_SHORT = ['', '一白', '二黒', '三碧', '四緑', '五黄', '六白', '七赤', '八白', '九紫'];
  // 五行: 1水 2土 3木 4木 5土 6金 7金 8土 9火
  var ELEMENT = ['', 'water', 'earth', 'wood', 'wood', 'earth', 'metal', 'metal', 'earth', 'fire'];
  // 相生: 木→火→土→金→水→木
  var GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };

  function boardOf(center) {
    return TEII.map(function (t) {
      var m = (t + center - 6) % 9;
      if (m < 0) m += 9;
      return m + 1;
    });
  }

  // 本命星の吉星（生気・退気・比和。五黄と自星は除く）
  function goodStarsFor(honmei) {
    var mine = ELEMENT[honmei];
    var out = [];
    for (var s = 1; s <= 9; s++) {
      if (s === 5 || s === honmei) continue;
      var e = ELEMENT[s];
      if (GENERATES[e] === mine || GENERATES[mine] === e || e === mine) out.push(s);
    }
    return out;
  }

  function opposite(dir) { return (dir + 4) % 8; }

  /**
   * 盤と吉凶を計算する。
   * center: 日盤中宮星 / ha: 日破の方角(0-7, nullあり) / honmei: 本命星
   * 戻り値: { board: [8]星, dirs: [8]{star, state} } state: 'kichi'|'kyou'|'neutral'
   */
  function analyze(center, ha, honmei) {
    var board = boardOf(center);
    var kyou = {};
    // 五黄殺・暗剣殺（五黄が中宮の日はどちらも立たない）
    var goDir = board.indexOf(5);
    if (goDir >= 0) { kyou[goDir] = true; kyou[opposite(goDir)] = true; }
    // 日破
    if (ha !== null && ha !== undefined) kyou[ha] = true;
    // 本命殺・本命的殺（自星が中宮の日は立たない）
    var honDir = board.indexOf(honmei);
    if (honDir >= 0) { kyou[honDir] = true; kyou[opposite(honDir)] = true; }

    var good = goodStarsFor(honmei);
    var dirs = board.map(function (star, d) {
      var state = 'neutral';
      if (kyou[d]) state = 'kyou';
      else if (good.indexOf(star) >= 0) state = 'kichi';
      return { star: star, state: state };
    });
    return { board: board, dirs: dirs };
  }

  /**
   * SVGを描く。premium=falseなら全マスneutral表示。
   */
  function renderSVG(center, ha, honmei, premium) {
    var a = analyze(center, ha, honmei);
    var C = 170, R = 128, LABEL_R = 150, STAR_R = 86, CENTER_R = 42;
    var FILL = { kichi: '#f0e3c0', kyou: '#e3e0da', neutral: '#fffefb' };
    var svg = '<svg viewBox="0 0 340 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="今日の方位盤">';
    for (var d = 0; d < 8; d++) {
      var aC = -90 + d * 45;
      var a1 = (aC - 22.5) * Math.PI / 180, a2 = (aC + 22.5) * Math.PI / 180;
      var x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
      var x2 = C + R * Math.cos(a2), y2 = C + R * Math.sin(a2);
      var st = premium ? a.dirs[d].state : 'neutral';
      svg += '<path d="M' + C + ',' + C + ' L' + x1.toFixed(1) + ',' + y1.toFixed(1) +
        ' A' + R + ',' + R + ' 0 0 1 ' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' Z"' +
        ' fill="' + FILL[st] + '" stroke="#c8b58a" stroke-width="1"/>';
      // 星名
      var sx = C + STAR_R * Math.cos(aC * Math.PI / 180), sy = C + STAR_R * Math.sin(aC * Math.PI / 180);
      var starColor = (premium && st === 'kyou') ? '#8f8b83' : '#1f2d47';
      svg += '<text x="' + sx.toFixed(1) + '" y="' + (sy + 5).toFixed(1) + '" text-anchor="middle"' +
        ' font-size="15" fill="' + starColor + '" font-weight="600">' + STAR_SHORT[a.board[d]] + '</text>';
      // 方角名（盤の外周）
      var lx = C + LABEL_R * Math.cos(aC * Math.PI / 180), ly = C + LABEL_R * Math.sin(aC * Math.PI / 180);
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4.5).toFixed(1) + '" text-anchor="middle"' +
        ' font-size="12" fill="#8a6f35" letter-spacing="1">' + DIR_NAMES[d] + '</text>';
    }
    // 中宮
    svg += '<circle cx="' + C + '" cy="' + C + '" r="' + CENTER_R + '" fill="#fdfcf8" stroke="#c8b58a" stroke-width="1"/>';
    svg += '<text x="' + C + '" y="' + (C + 5) + '" text-anchor="middle" font-size="15" fill="#1f2d47" font-weight="600">' +
      STAR_SHORT[center] + '</text>';
    svg += '</svg>';
    return svg;
  }

  /**
   * フル判定（2026-09-01 BASIC_DESIGN §8-2 確定基準・せいこさん監修対象）
   * center: 盤の中宮星 / o: { honmei, getsumei, haDir(0-7|null), haName('日破'|'月破'|'歳破') }
   * 凶: 五黄殺・暗剣殺・破・本命殺・本命的殺・月命殺・月命的殺
   * 吉: 最大吉方（本命×月命の共通吉星）＞ 吉方（本命の吉星）。五黄・自星・月命星は吉候補から除外
   * 戻り値: { board:[8], dirs:[8]{star, state, bads[]} } state: 'saidai'|'kichi'|'kyou'|'neutral'
   */
  function analyzeFull(center, o) {
    var board = boardOf(center);
    var honmei = o.honmei, getsumei = o.getsumei || null;
    var bads = [[], [], [], [], [], [], [], []];
    function mark(dir, name) { if (dir >= 0 && dir !== null && dir !== undefined) bads[dir].push(name); }

    var goDir = board.indexOf(5);
    if (goDir >= 0) { mark(goDir, '五黄殺'); mark(opposite(goDir), '暗剣殺'); }
    if (o.haDir !== null && o.haDir !== undefined) mark(o.haDir, o.haName || '破');
    if (honmei !== 5) {
      var honDir = board.indexOf(honmei);
      if (honDir >= 0) { mark(honDir, '本命殺'); mark(opposite(honDir), '本命的殺'); }
    }
    if (getsumei && getsumei !== 5 && getsumei !== honmei) {
      var getsuDir = board.indexOf(getsumei);
      if (getsuDir >= 0) { mark(getsuDir, '月命殺'); mark(opposite(getsuDir), '月命的殺'); }
    }

    // 吉候補: 本命の吉星（五黄・自星・月命星を除く）。最大吉方＝月命の吉星でもあるもの
    var kichiStars = [], saidaiStars = [];
    var mine = goodStarsFor(honmei);
    var getsuGood = getsumei ? goodStarsFor(getsumei) : null;
    for (var i = 0; i < mine.length; i++) {
      var s = mine[i];
      if (s === getsumei) continue;
      kichiStars.push(s);
      if (getsuGood && getsuGood.indexOf(s) >= 0) saidaiStars.push(s);
    }

    var dirs = board.map(function (star, d) {
      var state = 'neutral';
      if (bads[d].length) state = 'kyou';
      else if (saidaiStars.indexOf(star) >= 0) state = 'saidai';
      else if (kichiStars.indexOf(star) >= 0) state = 'kichi';
      return { star: star, state: state, bads: bads[d] };
    });
    return { board: board, dirs: dirs, kichiStars: kichiStars, saidaiStars: saidaiStars };
  }

  /**
   * 年盤・月盤・日盤共通の描画。
   * opts: { center, honmei, getsumei, haDir, haName, premium,
   *         taisaiDir(年盤のみ), ehoDeg(年盤のみ・0=北 時計回り), ariaLabel }
   */
  function renderBoard(opts) {
    var a = analyzeFull(opts.center, opts);
    var C = 170, R = 128, LABEL_R = 150, STAR_R = 86, CENTER_R = 42;
    var FILL = { saidai: '#ecd695', kichi: '#f4e9cd', kyou: '#e3e0da', neutral: '#fffefb' };
    var svg = '<svg viewBox="0 0 340 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      (opts.ariaLabel || '方位盤') + '">';
    for (var d = 0; d < 8; d++) {
      var aC = -90 + d * 45;
      var a1 = (aC - 22.5) * Math.PI / 180, a2 = (aC + 22.5) * Math.PI / 180;
      var x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
      var x2 = C + R * Math.cos(a2), y2 = C + R * Math.sin(a2);
      var st = opts.premium ? a.dirs[d].state : 'neutral';
      svg += '<path d="M' + C + ',' + C + ' L' + x1.toFixed(1) + ',' + y1.toFixed(1) +
        ' A' + R + ',' + R + ' 0 0 1 ' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' Z"' +
        ' fill="' + FILL[st] + '" stroke="#c8b58a" stroke-width="1"/>';
      var sx = C + STAR_R * Math.cos(aC * Math.PI / 180), sy = C + STAR_R * Math.sin(aC * Math.PI / 180);
      var starColor = (opts.premium && st === 'kyou') ? '#8f8b83' : '#1f2d47';
      svg += '<text x="' + sx.toFixed(1) + '" y="' + (sy + 5).toFixed(1) + '" text-anchor="middle"' +
        ' font-size="15" fill="' + starColor + '" font-weight="600">' + STAR_SHORT[a.board[d]] + '</text>';
      var lx = C + LABEL_R * Math.cos(aC * Math.PI / 180), ly = C + LABEL_R * Math.sin(aC * Math.PI / 180);
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4.5).toFixed(1) + '" text-anchor="middle"' +
        ' font-size="12" fill="#8a6f35" letter-spacing="1">' + DIR_NAMES[d] + '</text>';
      // 大歳（年盤のみ・盤内の外周寄りに小さく）
      if (opts.premium && opts.taisaiDir === d) {
        var tx = C + 116 * Math.cos(aC * Math.PI / 180), ty = C + 116 * Math.sin(aC * Math.PI / 180);
        svg += '<text x="' + tx.toFixed(1) + '" y="' + (ty + 3.5).toFixed(1) + '" text-anchor="middle"' +
          ' font-size="9.5" fill="#8a6f35" letter-spacing="1">大歳</text>';
      }
    }
    // 恵方（年盤のみ・金の破線＋ラベル。24方位の正確な角度で引く）
    if (opts.premium && (opts.ehoDeg || opts.ehoDeg === 0)) {
      var rad = (opts.ehoDeg - 90) * Math.PI / 180;
      var ex = C + R * Math.cos(rad), ey = C + R * Math.sin(rad);
      svg += '<line x1="' + C + '" y1="' + C + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '"' +
        ' stroke="#a8863c" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.85"/>';
      var lx2 = C + (R + 10) * Math.cos(rad), ly2 = C + (R + 10) * Math.sin(rad);
      svg += '<text x="' + lx2.toFixed(1) + '" y="' + (ly2 + 3.5).toFixed(1) + '" text-anchor="middle"' +
        ' font-size="9.5" fill="#a8863c" letter-spacing="1">恵方</text>';
    }
    svg += '<circle cx="' + C + '" cy="' + C + '" r="' + CENTER_R + '" fill="#fdfcf8" stroke="#c8b58a" stroke-width="1"/>';
    svg += '<text x="' + C + '" y="' + (C + 5) + '" text-anchor="middle" font-size="15" fill="#1f2d47" font-weight="600">' +
      STAR_SHORT[opts.center] + '</text>';
    svg += '</svg>';
    return svg;
  }

  return {
    DIR_NAMES: DIR_NAMES,
    boardOf: boardOf,
    goodStarsFor: goodStarsFor,
    analyze: analyze,
    analyzeFull: analyzeFull,
    renderSVG: renderSVG,
    renderBoard: renderBoard
  };
});
