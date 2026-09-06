/*
 * 運命リズム診断 — 判定ロジック（ブラウザ / Node 共有）
 *
 * 正本: resources/ma_saison9_calc_rule_draft.md（§1〜§3。MA SAISON 9 から検証済みロジックを引き継ぎ）
 *       CONTENT_RULES.md（レイヤーの役割分担）
 * 天文計算はしない。data/terms.js（gen-data.mjsで事前計算済み）を読むだけ。
 * ブラウザ: <script src="js/calc.js"></script> → window.URCalc
 * Node(test.mjs): require('./js/calc.js')
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.URCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  var STAR_SHORT = ['', '一白', '二黒', '三碧', '四緑', '五黄', '六白', '七赤', '八白', '九紫'];
  var STAR_NAMES = ['', '一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星',
    '六白金星', '七赤金星', '八白土星', '九紫火星'];
  // ゾーン番号(1-9)→宮名。ゾーン＝「本命星がその盤で巡っている宮の定位星」なので星番号と同じ並び
  var PALACE_NAMES = ['', '坎宮', '坤宮', '震宮', '巽宮', '中宮', '乾宮', '兌宮', '艮宮', '離宮'];

  function digitalRoot(n) {
    n = Math.abs(Math.trunc(n));
    while (n > 9) {
      n = String(n).split('').reduce(function (a, c) { return a + Number(c); }, 0);
    }
    return n;
  }

  // 気学年 → その年の年家九星（＝本命星と同じ式）
  function kigakuStar(kigakuYear) {
    return digitalRoot(11 - digitalRoot(kigakuYear));
  }

  // ゾーン算出: zoneStar = ((本命星 - 中宮星 + 4) mod 9) + 1
  function zoneStar(honmeisei, centerStar) {
    var m = (honmeisei - centerStar + 4) % 9;
    if (m < 0) m += 9;
    return m + 1;
  }

  function calendarDaySerial(y, m, d) {
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }
  function minuteSerial(y, m, d, hh, mm) {
    return Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }

  /**
   * 本命星の気学年判定（立春境界・2026-08-13決裁のA案拡張）
   * input: { y, m, d, hh?, mm? }
   * 戻り値: { error } | { boundaryWindow, ambiguous, side, kigakuYear, risshun, candidates }
   */
  function determineKigakuYear(input, terms) {
    var by = input.y, bm = input.m, bd = input.d;
    var bhh = (input.hh === undefined || input.hh === null || input.hh === '') ? null : Number(input.hh);
    var bmm = (input.mm === undefined || input.mm === null || input.mm === '') ? null : Number(input.mm);

    var r = terms.risshun[String(by)];
    if (!r) return { error: 'no-data' };

    var diffDays = calendarDaySerial(by, bm, bd) - calendarDaySerial(r.y, r.m, r.d);
    var boundaryWindow = Math.abs(diffDays) <= 1;
    var timeKnown = (bhh !== null && bmm !== null);

    var side, ambiguous = false;
    if (timeKnown && diffDays === 0) {
      var bSerial = minuteSerial(by, bm, bd, bhh, bmm);
      var rSerial = minuteSerial(r.y, r.m, r.d, r.hh, r.mm);
      side = bSerial < rSerial ? 'before' : 'after';
    } else if (diffDays !== 0) {
      side = diffDays < 0 ? 'before' : 'after';
    } else {
      ambiguous = true;
      side = null;
    }

    var kigakuYear = side === 'before' ? by - 1 : (side === 'after' ? by : null);

    return {
      boundaryWindow: boundaryWindow,
      ambiguous: ambiguous,
      side: side,
      kigakuYear: kigakuYear,
      risshun: r,
      diffDays: diffDays,
      candidates: ambiguous ? { before: by - 1, after: by } : null
    };
  }

  // 「今」が属する気学月（節入り境界）のエントリを返す
  function findCurrentMonth(now, kigakuYear, terms) {
    var months = terms.monthSetsu[String(kigakuYear)];
    if (!months) return null;
    var nowSerial = minuteSerial(now.y, now.m, now.d, now.hh, now.mm);
    var current = null;
    for (var i = 0; i < months.length; i++) {
      var t = months[i];
      var tSerial = minuteSerial(t.y, t.m, t.d, t.hh, t.mm);
      if (tSerial <= nowSerial) current = t; else break;
    }
    return current;
  }

  // その日の日盤情報（terms.dayStars テーブル参照。範囲外は null）
  // 旧形式（数値のみ）と新形式（{s, ha}）の両方に対応
  function dayInfoOf(now, terms) {
    var v = terms.dayStars[dateKey(now.y, now.m, now.d)];
    if (!v) return null;
    return (typeof v === 'number') ? { s: v, ha: null } : v;
  }
  function dayCenterOf(now, terms) {
    var info = dayInfoOf(now, terms);
    return info ? info.s : null;
  }

  // 方位盤: 方角順（0=北,1=北東,2=東,3=南東,4=南,5=南西,6=西,7=北西）の定位星
  var DIR_NAMES = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  var TEII = [1, 8, 3, 4, 9, 2, 7, 6]; // 後天定位盤（方角順）

  // --- 月命星・破・大歳・恵方（2026-09-01 BASIC_DESIGN §8-2） ---

  // 十二支(0=子..11=亥) → 方角順index。子=北, 丑寅=北東, 卯=東, 辰巳=南東, 午=南, 未申=南西, 酉=西, 戌亥=北西
  var BRANCH_DIR = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7];
  // 月命星キーナンバー（本命星の五行グループ別）: 一四七=19 / 二五八=13 / 三六九=16
  var MONTH_KEY = { 1: 19, 4: 19, 7: 19, 2: 13, 5: 13, 8: 13, 3: 16, 6: 16, 9: 16 };
  // 恵方（年干 0=甲..9=癸 → 方位角。0°=北・時計回り。甲己=75° 乙庚=255° 丙辛=165° 丁壬=345° 戊癸=165°）
  var EHO_DEG = [75, 255, 165, 345, 165, 75, 255, 165, 345, 165];

  // 月命星: キーナンバー − 生月番号（小寒=1…大雪=12。小寒は年の最終月なので13として引く）
  function getsumeiFromMonthNo(honmei, monthNo) {
    var key = MONTH_KEY[honmei];
    var seq = (monthNo === 1) ? 13 : monthNo;
    var n = ((key - seq) % 9 + 9) % 9;
    return n === 0 ? 9 : n;
  }

  /**
   * 生まれた月の節月番号（小寒=1…大雪=12）を data/setsu.js のテーブルから求める。
   * input: { y, m, d, hh?, mm? } / setsu: UR_SETSU
   * sideHint: 立春当日のあいまいケースで 'before'|'after' を強制するとき指定
   * 戻り値: { monthNo, boundaryDay } | null（データ範囲外）
   * 時刻不明は正午とみなす（節入り当日生まれは boundaryDay=true で注意表示）。
   */
  function birthMonthNo(input, setsu, sideHint, risshun) {
    if (!setsu || !setsu.years) return null;
    var hasTime = !(input.hh === undefined || input.hh === null || input.hh === '');
    var hh = hasTime ? Number(input.hh) : 12;
    var mm = hasTime ? (Number(input.mm) || 0) : 0;
    var t = minuteSerial(input.y, input.m, input.d, hh, mm);
    if (sideHint && risshun) {
      var rs = minuteSerial(risshun.y, risshun.m, risshun.d, risshun.hh, risshun.mm);
      t = sideHint === 'before' ? rs - 60000 : rs + 60000;
    }
    var events = [];
    for (var y = input.y - 1; y <= input.y + 1; y++) {
      var rows = setsu.years[String(y)] || setsu.years[y];
      if (!rows) continue;
      for (var i = 0; i < rows.length; i++) {
        events.push({ no: rows[i][0], serial: minuteSerial(y, rows[i][1], rows[i][2], rows[i][3], rows[i][4]), y: y, m: rows[i][1], d: rows[i][2] });
      }
    }
    if (!events.length) return null;
    events.sort(function (a, b) { return a.serial - b.serial; });
    var cur = null, boundaryDay = false;
    for (var j = 0; j < events.length; j++) {
      if (events[j].serial <= t) cur = events[j];
      if (!hasTime && !sideHint && events[j].y === input.y && events[j].m === input.m && events[j].d === input.d) boundaryDay = true;
    }
    if (!cur) return null;
    return { monthNo: cur.no, boundaryDay: boundaryDay };
  }

  // 支番号（0=子..11=亥）
  function yearBranchOf(kigakuYear) { return ((kigakuYear - 4) % 12 + 12) % 12; }
  function yearStemOf(kigakuYear) { return ((kigakuYear - 4) % 10 + 10) % 10; }
  // 月支: アプリ暦データの monthNo（立春=1…小寒=12）→ 支番号（寅=2起点）
  function monthBranchOf(appMonthNo) { return (appMonthNo + 1) % 12; }
  function opposite8(dir) { return (dir + 4) % 8; }
  // 中宮cの盤で、各方角に巡っている星（方角順の配列）
  function boardOf(center) {
    return TEII.map(function (t) {
      var m = (t + center - 6) % 9;
      if (m < 0) m += 9;
      return m + 1;
    });
  }

  function nowJST(date) {
    date = date || new Date();
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(date);
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var hh = map.hour === '24' ? 0 : Number(map.hour);
    return { y: Number(map.year), m: Number(map.month), d: Number(map.day), hh: hh, mm: Number(map.minute) };
  }

  /**
   * 診断＋今日のリズム判定の一式。
   * input: { y, m, d, hh?, mm? }（生年月日）
   * nowOverride: テスト用（省略時は実時刻JST）
   * 戻り値: { error } |
   *  { boundaryWindow, ambiguous, results:[{ kigakuYear, honmeisei, honmeiseiName,
   *      yearZone, monthZone, dayZone }...], today: { kigakuYear, yearKanshi, monthInfo, dayCenter, dateKey } }
   */
  function diagnose(input, terms, nowOverride, setsu) {
    var det = determineKigakuYear(input, terms);
    if (det.error) return det;
    setsu = setsu || (typeof self !== 'undefined' && self.UR_SETSU) || null;

    var now = nowOverride || nowJST();
    var todayDet = determineKigakuYear(now, terms);
    if (todayDet.error) return { error: 'no-data-today' };
    var todayKigakuYear = todayDet.kigakuYear !== null ? todayDet.kigakuYear
      : (now.m > 2 ? now.y : now.y - 1);
    var yearCenter = kigakuStar(todayKigakuYear);
    var monthInfo = findCurrentMonth(now, todayKigakuYear, terms);
    var dayInfo = dayInfoOf(now, terms);
    var dayCenter = dayInfo ? dayInfo.s : null;

    function buildResult(kigakuYear, sideHint) {
      var honmeisei = kigakuStar(kigakuYear);
      // 月命星: 生年の節入りテーブルから生月番号を確定して算出（データがない場合は null）
      var bm = setsu ? birthMonthNo(input, setsu, sideHint || null, det.risshun) : null;
      var getsumei = bm ? getsumeiFromMonthNo(honmeisei, bm.monthNo) : null;
      return {
        kigakuYear: kigakuYear,
        honmeisei: honmeisei,
        honmeiseiName: STAR_NAMES[honmeisei],
        getsumei: getsumei,
        getsumeiName: getsumei ? STAR_NAMES[getsumei] : null,
        getsumeiBoundary: bm ? bm.boundaryDay : false,
        yearZone: zoneStar(honmeisei, yearCenter),
        monthZone: monthInfo ? zoneStar(honmeisei, monthInfo.center) : null,
        dayZone: dayCenter ? zoneStar(honmeisei, dayCenter) : null
      };
    }

    var results = det.ambiguous
      ? [buildResult(det.candidates.before, 'before'), buildResult(det.candidates.after, 'after')]
      : [buildResult(det.kigakuYear)];

    // 年盤・月盤の破と、大歳・恵方（年盤のみ）
    var yb = yearBranchOf(todayKigakuYear);
    var taisaiDir = BRANCH_DIR[yb];
    var yearHaDir = opposite8(taisaiDir);
    var ehoDeg = EHO_DEG[yearStemOf(todayKigakuYear)];
    var monthHaDir = null;
    if (monthInfo && monthInfo.monthNo) {
      monthHaDir = opposite8(BRANCH_DIR[monthBranchOf(monthInfo.monthNo)]);
    }

    // 明日の日盤（明日のひとこと予告用。データ範囲外は null）
    var tomorrowDate = new Date(Date.UTC(now.y, now.m - 1, now.d) + 86400000);
    var tm = { y: tomorrowDate.getUTCFullYear(), m: tomorrowDate.getUTCMonth() + 1, d: tomorrowDate.getUTCDate() };
    var tmInfo = terms.dayStars[dateKey(tm.y, tm.m, tm.d)];
    var tomorrowCenter = tmInfo ? (typeof tmInfo === 'number' ? tmInfo : tmInfo.s) : null;

    return {
      boundaryWindow: det.boundaryWindow,
      ambiguous: det.ambiguous,
      results: results,
      today: {
        kigakuYear: todayKigakuYear,
        yearKanshi: (terms.yearKanshi || {})[String(todayKigakuYear)] || null,
        yearCenter: yearCenter,
        monthInfo: monthInfo,
        dayCenter: dayCenter,
        dayHa: dayInfo ? dayInfo.ha : null,
        yearHaDir: yearHaDir,
        monthHaDir: monthHaDir,
        taisaiDir: taisaiDir,
        ehoDeg: ehoDeg,
        tomorrowCenter: tomorrowCenter,
        dateKey: dateKey(now.y, now.m, now.d)
      }
    };
  }

  // ============================================================
  // 吉日・六曜・祝日（毎朝ホームの日付下に表示・2026-09-06）
  //   六曜・一粒万倍日・天赦日・祝日は terms.goodDays（kigaku-calendar 由来・市販暦照合済み）から。
  //   寅の日・巳の日・己巳の日は日干支から計算（JDN基準・2000-01-01=戊午 で検証）。
  // ============================================================
  var ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
  function jdnOf(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function dayKanshiIndex(y, m, d) { return ((jdnOf(y, m, d) + 49) % 60 + 60) % 60; }  // 0=甲子
  /**
   * その日に該当する吉日名の配列（該当なしは []）。順番は表示順。
   * 例: ['敬老の日', '一粒万倍日', '天赦日', '寅の日', '甲子の日', '大安', '新月 12:27']（新月・満月はJST時刻つき）
   */
  function goodDayItems(key, terms) {
    var p = key.split('-').map(Number), y = p[0], m = p[1], d = p[2];
    var G = terms && terms.goodDays && terms.goodDays[String(y)];
    var doy = jdnOf(y, m, d) - jdnOf(y, 1, 1);
    var items = [];
    if (G && G.holidays[key]) items.push(G.holidays[key]);
    if (G && G.ichiryu.charAt(doy) === '1') items.push('一粒万倍日');
    if (G && G.tensha.charAt(doy) === '1') items.push('天赦日');
    var k = dayKanshiIndex(y, m, d), stem = k % 10, branch = k % 12;
    if (branch === 2) items.push('寅の日');
    if (branch === 5) items.push(stem === 5 ? '己巳の日' : '巳の日');
    if (k === 0) items.push('甲子の日');
    if (G && ROKUYO[+G.rokuyo.charAt(doy)] === '大安') items.push('大安');
    var mo = G && G.moon && G.moon[key];
    if (mo) items.push((mo[0] === 'new' ? '新月' : '満月') + ' ' + mo[1]);
    return items;
  }

  return {
    STAR_SHORT: STAR_SHORT,
    STAR_NAMES: STAR_NAMES,
    PALACE_NAMES: PALACE_NAMES,
    digitalRoot: digitalRoot,
    kigakuStar: kigakuStar,
    zoneStar: zoneStar,
    calendarDaySerial: calendarDaySerial,
    minuteSerial: minuteSerial,
    dateKey: dateKey,
    determineKigakuYear: determineKigakuYear,
    findCurrentMonth: findCurrentMonth,
    dayCenterOf: dayCenterOf,
    dayInfoOf: dayInfoOf,
    DIR_NAMES: DIR_NAMES,
    TEII: TEII,
    boardOf: boardOf,
    nowJST: nowJST,
    diagnose: diagnose,
    BRANCH_DIR: BRANCH_DIR,
    EHO_DEG: EHO_DEG,
    getsumeiFromMonthNo: getsumeiFromMonthNo,
    birthMonthNo: birthMonthNo,
    yearBranchOf: yearBranchOf,
    yearStemOf: yearStemOf,
    monthBranchOf: monthBranchOf,
    opposite8: opposite8,
    jdnOf: jdnOf,
    dayKanshiIndex: dayKanshiIndex,
    goodDayItems: goodDayItems
  };
});
