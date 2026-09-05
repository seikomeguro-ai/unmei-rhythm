/*
 * 運命リズム診断 — UI・画面遷移（Morning Light版・案C採用 2026-08-25）
 *
 * 画面: ようこそ → 入力 → 診断結果 → 毎朝ホーム（再訪時は毎朝ホームに直行）
 * プロフィールは端末のlocalStorageにのみ保存（外部送信なし）。
 * 文章はすべて content/ の人間監修プールから js/select.js が選ぶ。ここでは文章を作らない。
 * 宮名はユーザー画面に出さない（VISUAL_RULES/CONTENT_RULES準拠）。
 */
'use strict';
(function () {
  var C = window.URCalc, S = window.URSelect, T = window.UR_TERMS;
  var TYPES = window.UR_TYPES.types;
  var SY = window.UR_SEASONS_YEAR, SM = window.UR_SEASONS_MONTH;
  var CONTENT = {
    themes: window.UR_THEMES, actions: window.UR_ACTIONS, words: window.UR_WORDS,
    dayBase: window.UR_DAY_BASE, ukekata: window.UR_UKEKATA
  };
  var JIRYU = window.UR_JIRYU;

  // 導線リンク（公開前に本物のURLへ差し替える）
  var MAIL_CTA_URL = '#MAIL_URL';
  var CONTACT_URL = '#CONTACT_URL';
  var CHECKOUT_URL = '#CHECKOUT_URL';  // PayPal決済ページ（フェーズ3で差し込み）

  var PENDING_TEXT = 'この部分の言葉は、ただいま丁寧に準備中です。正式公開までにお届けします。';
  var STORE_KEY = 'ur_profile';
  var EN_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var EN_DOW = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  // 日の宮→テーマ線画（意味で紐づけ・同じ宮でも日によって絵柄が替わる）
  var DAY_ICONS = {
    1: ['icon_seed', 'icon_seed2'],
    2: ['icon_nurture', 'icon_nurture2'],
    3: ['icon_start', 'icon_rabbit'],
    4: ['icon_connect', 'icon_dove'],
    5: ['icon_center', 'icon_candle'],
    6: ['icon_crown', 'icon_elevate'],
    7: ['icon_receive', 'icon_receive2'],
    8: ['icon_release', 'icon_feather'],
    9: ['icon_shine2', 'icon_shine']
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  // 文節単位の自然な改行（BudouX。Safari含む全ブラウザで効く）
  function bx(s) { return '<budoux-ja>' + esc(s) + '</budoux-ja>'; }
  function bxbr(s) { return '<budoux-ja>' + nl2br(s) + '</budoux-ja>'; }
  function show(viewId) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    $(viewId).classList.add('active');
    window.scrollTo(0, 0);
  }
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function saveProfile(p) { localStorage.setItem(STORE_KEY, JSON.stringify(p)); }
  function clearProfile() { localStorage.removeItem(STORE_KEY); }

  // --- 入力セレクトの初期化 ---
  function fillSelect(sel, from, to, unit, selected) {
    var html = '';
    for (var v = from; v <= to; v++) {
      html += '<option value="' + v + '"' + (v === selected ? ' selected' : '') + '>' + v + unit + '</option>';
    }
    sel.innerHTML = html;
  }
  // 時刻は全員に聞く（将来の占星術メニューにも使う）。「わからない」を初期値にして誰でも進める
  function fillTimeSelect(sel, from, to, unit) {
    var html = '<option value="" selected>わからない</option>';
    for (var v = from; v <= to; v++) {
      html += '<option value="' + v + '">' + v + unit + '</option>';
    }
    sel.innerHTML = html;
  }
  fillSelect($('sel-year'), 1930, 2020, '年', 1980);
  fillSelect($('sel-month'), 1, 12, '月', 1);
  fillSelect($('sel-day'), 1, 31, '日', 1);
  fillTimeSelect($('sel-hh'), 0, 23, '時');
  fillTimeSelect($('sel-mm'), 0, 59, '分');

  function readInput() {
    var p = { y: +$('sel-year').value, m: +$('sel-month').value, d: +$('sel-day').value };
    var hh = $('sel-hh').value;
    if (hh !== '') {
      p.hh = +hh;
      p.mm = $('sel-mm').value === '' ? 0 : +$('sel-mm').value;
    }
    return p;
  }
  function validDate(p) {
    var dt = new Date(p.y, p.m - 1, p.d);
    return dt.getFullYear() === p.y && dt.getMonth() === p.m - 1 && dt.getDate() === p.d;
  }

  // --- 表示部品 ---
  function labHTML(word, jp) {
    return '<div class="lab"><span class="pre">TODAY\'S</span><span class="script">' + esc(word) + '</span></div>' +
      '<div class="lab-jp">' + esc(jp) + '</div>';
  }
  function labHTML2(pre, word, jp) {
    return '<div class="lab"><span class="pre">' + esc(pre) + '</span><span class="script">' + esc(word) + '</span></div>' +
      '<div class="lab-jp">' + esc(jp) + '</div>';
  }
  function sepHTML() { return '<div class="sep"><span class="dia"></span></div>'; }
  function pendingHTML() { return '<p class="pending">' + PENDING_TEXT + '</p>'; }

  // 鍵ティザー（無料版・気配カード＝B案採用）。まとまりごとに1枚だけ置く
  var KEY_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c8b58a" stroke-width="1.1" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="9" cy="9" r="4.2"/><path d="M12.2 12.2 L19 19 M16.4 16.4 L18.4 14.4 M18 18 L20 16"/></svg>';
  function teaserHTML(items) {
    return '<div class="tease">' + KEY_SVG +
      (items ? '<div class="tease-items">' + esc(items) + '</div>' : '') +
      '<div class="tease-line"><budoux-ja>この先の読み解きは、BASICでご覧いただけます</budoux-ja></div></div>';
  }

  // --- 行動ナビ（TODAY'S Compass）2026-09-01 BASIC_DESIGN §1-1 ---
  // シーンは5つ固定・方角は「東へ」のみ（凝った言い回しはしない）。いまの時間帯をそっと強調。
  var NAV_SCENES = [
    { label: 'モーニング', from: 4, to: 10 },
    { label: 'ランチ', from: 10, to: 14 },
    { label: 'カフェ', from: 14, to: 17 },
    { label: 'ディナー', from: 17, to: 23 },
    { label: 'お買い物', from: null, to: null }
  ];

  function joinDirs(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + 'と' + names[1];
    return names.join('・');
  }

  function navHTML(r, today) {
    var an = window.URHouiban.analyzeFull(today.dayCenter, {
      honmei: r.honmeisei, getsumei: r.getsumei, haDir: today.dayHa, haName: '日破'
    });
    var saidai = [], kichi = [];
    an.dirs.forEach(function (d, i) {
      if (d.state === 'saidai') saidai.push(i);
      else if (d.state === 'kichi') kichi.push(i);
    });
    var good = saidai.length ? saidai : kichi;
    var html = '<div class="sec compass">' + labHTML('Compass', '今日のおすすめ方位');
    if (!good.length) {
      // 吉方位がない日（2026-09-02 せいこさん指定文言。詳しい考え方は講座で扱う＝アプリでは説明しない）
      html += '<div class="nav-lead"><budoux-ja>今日は、方位はお休み。行き先より、心地よさを優先して。</budoux-ja></div>' +
        '<div class="nav-note"><budoux-ja>吉方位がない＝悪い日、という意味ではありません。</budoux-ja></div>';
      return html + '</div>';
    }
    var names = good.slice(0, 3).map(function (i) { return C.DIR_NAMES[i]; });
    html += '<div class="nav-lead"><budoux-ja>今日は、' + esc(joinDirs(names)) + 'が味方。</budoux-ja></div>';

    var hour = new Date().getHours();
    var seed = S.seedOf(today.dateKey, r.honmeisei);
    html += '<div class="nav-rows">';
    NAV_SCENES.forEach(function (sc, i) {
      var dir = good[(seed + i) % good.length];
      var now = sc.from !== null && hour >= sc.from && hour < sc.to;
      html += '<div class="nav-row' + (now ? ' now' : '') + '">' +
        '<span class="nav-scene">' + esc(sc.label) + '</span>' +
        '<span class="nav-dot"></span>' +
        '<span class="nav-dir">' + esc(C.DIR_NAMES[dir]) + 'へ</span></div>';
    });
    html += '</div></div>';
    return html;
  }

  // --- 根拠の方位盤（折りたたみ・日盤/月盤/年盤タブ）---
  var _boardTab = 'day';
  function boardDefs(r, today) {
    var defs = {
      day: { key: 'day', label: '日盤', center: today.dayCenter, haDir: today.dayHa, haName: '日破', aria: '今日の方位盤' },
      year: {
        key: 'year', label: '年盤', center: today.yearCenter, haDir: today.yearHaDir, haName: '歳破',
        taisaiDir: today.taisaiDir, ehoDeg: today.ehoDeg, aria: '今年の方位盤'
      }
    };
    if (today.monthInfo) {
      defs.month = {
        key: 'month', label: '月盤', center: today.monthInfo.center,
        haDir: today.monthHaDir, haName: '月破', aria: '今月の方位盤'
      };
    }
    return defs;
  }
  function boardPanelHTML(r, today) {
    var defs = boardDefs(r, today);
    var order = ['day', 'month', 'year'];
    if (!defs[_boardTab]) _boardTab = 'day';
    var html = '<div class="hb-tabs">';
    order.forEach(function (k) {
      if (!defs[k]) return;
      html += '<button type="button" class="hb-tab' + (k === _boardTab ? ' on' : '') + '" data-board="' + k + '">' +
        esc(defs[k].label) + '</button>';
    });
    html += '</div>';
    var d = defs[_boardTab];
    html += '<div class="hb-wrap">' + window.URHouiban.renderBoard({
      center: d.center, honmei: r.honmeisei, getsumei: r.getsumei,
      haDir: d.haDir, haName: d.haName, premium: true,
      taisaiDir: d.taisaiDir, ehoDeg: d.ehoDeg, ariaLabel: d.aria
    }) + '</div>' +
      '<div class="hb-legend">' +
      '<span class="lg"><span class="dot" style="background:#ecd695;"></span>最大吉方</span>' +
      '<span class="lg"><span class="dot" style="background:#f4e9cd;"></span>吉方位</span>' +
      '<span class="lg"><span class="dot" style="background:#e3e0da;"></span>控えめにしたい方位</span>' +
      '</div>' +
      '<div class="hb-note">北が上の、地図と同じ向きの盤です。</div>';
    return html;
  }
  function compassBlockHTML(r, today) {
    if (!today.dayCenter) return '';
    var html = navHTML(r, today);
    html += '<details class="hb-details"' + (window._boardOpen ? ' open' : '') + '>' +
      '<summary>根拠の方位盤を見る</summary>' +
      '<div id="board-panel">' + boardPanelHTML(r, today) + '</div></details>';
    return html;
  }

  // --- 明日のひとこと予告 ---
  // 2026-09-02 せいこさん決裁: 公開版では非表示（「今日どう動くか」に集中）。
  // 仕組みは残し、反応を見て true に戻すだけで再開できる。
  var SHOW_TOMORROW = false;
  function tomorrowHTML(r, today) {
    if (!SHOW_TOMORROW) return '';
    var TW = window.UR_TOMORROW;
    if (!TW || !today.tomorrowCenter) return '';
    var zone = C.zoneStar(r.honmeisei, today.tomorrowCenter);
    var hint = TW.hints[zone];
    if (!hint) return '';
    return '<div class="tmw"><span class="tmw-lab">TOMORROW</span>' +
      '<budoux-ja>' + esc(hint) + '</budoux-ja></div>';
  }
  function dateEn(dateKey) {
    var p = dateKey.split('-');
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    return EN_MONTHS[dt.getMonth()] + ' ' + (+p[2]) + ', ' + EN_DOW[dt.getDay()];
  }

  function dailyCardsHTML(r, today) {
    var picks = S.selectDaily({
      typeNo: r.honmeisei, yearZone: r.yearZone, monthZone: r.monthZone,
      dayZone: r.dayZone, dateKey: today.dateKey
    }, CONTENT);

    var html = '';
    var locked = UR_PREMIUM.tier() === 'free';  // 無料版だけロック（体験中・BASICは全部見える）

    // 1. THEME（線画つき）
    html += '<div class="sec">' + labHTML('Theme', '今日のテーマ');
    if (picks.theme.pending) {
      html += pendingHTML();
    } else {
      var icons = DAY_ICONS[r.dayZone] || [];
      var icon = picks.theme.icon ||
        (icons.length ? icons[S.seedOf(today.dateKey, r.honmeisei) % icons.length] : null);
      html += '<div class="theme">' + bx(picks.theme.text) + '</div>' +
        (icon ? '<div class="theme-art"><img src="assets/icons/trimmed/' + icon + '.png" alt=""></div>' : '');
    }
    html += '</div>' + sepHTML();

    if (locked) {
      // 無料版: 鍵カードは1枚だけにまとめる（BASIC_DESIGN §3。鍵だらけにしない）
      html += '<div class="sec">' + teaserHTML('今日のメッセージ ・ 今日の一歩 ・ おすすめ方位') + '</div>';
    } else {
      // 2. MESSAGE
      html += '<div class="sec prose">' + labHTML('Message', '今日のメッセージ') +
        (picks.message.pending ? pendingHTML() : '<p>' + esc(picks.message.text) + '</p>') +
        '</div>' + sepHTML();

      // 3. ACTION（今日の一歩）
      html += '<div class="sec action">' + labHTML('Action', '今日の一歩') +
        (picks.action.pending ? pendingHTML() : '<p>' + esc(picks.action.text) + '</p>') +
        '</div>';

      // 4. おすすめ方位＋行動ナビ ＋ 5. 根拠の方位盤（折りたたみ・3盤タブ）
      html += compassBlockHTML(r, today);
    }

    // 6. WORD（ベージュの帯）
    html += '<div class="word">' + labHTML('Word', '今日の言葉') +
      (picks.word.pending ? pendingHTML() : '<p style="margin-top:12px;">' + bx(picks.word.text) + '</p>') +
      '</div>';

    // 7. 明日のひとこと予告（BASIC。気配だけ・中身は明日開いてから）
    if (!locked) html += tomorrowHTML(r, today);

    // THIS MONTH'S FLOW（時流）: 中身があるときだけBASICに表示（無料はティザーも出さない）
    var jiryuKey = today.kigakuYear + '-' + (today.monthInfo ? today.monthInfo.monthNo : '');
    var j = JIRYU[jiryuKey];
    if (j && j.message && !locked) {
      var kanshi = (today.yearKanshi || '') + 'の年' +
        (today.monthInfo && today.monthInfo.kanshi ? ' × ' + today.monthInfo.kanshi + 'の月' : '');
      html += '<div class="jiryu">' +
        '<div class="lab"><span class="pre">THIS MONTH\'S</span><span class="script">Flow</span></div>' +
        '<div class="lab-jp">今月の時流</div>' +
        '<div class="t" style="margin-top:10px;">' + esc(j.message) + '</div>' +
        '<div class="k">' + esc(kanshi) + '</div></div>';
    }

    // BASIC案内カード（無料版のみ・文言はbrand-check前の下書き）
    if (locked) {
      html += '<div class="premium-cta">' +
        '<div class="pc-lab">BASIC</div>' +
        '<div class="pc-title"><budoux-ja>その流れを、今日どう使うかまで。</budoux-ja></div>' +
        '<div class="pc-copy"><budoux-ja>毎朝の読み解きと今日の一歩、「今日はどちらへ」のおすすめ方位、年盤・月盤・日盤、今月の詳しい読み解きをお届けします。</budoux-ja></div>' +
        '<div class="pc-price">月額 1,100円</div>' +
        '<a class="pc-btn" id="checkout-link" href="' + CHECKOUT_URL + '">くわしく見る</a>' +
        '<div class="pc-note">決済確認後、通常24時間以内に解錠のご案内メールをお送りします。</div>' +
        '</div>';
      UR_TRACK.daily('premium_notice_view', 'ur_evt_notice', (today && today.dateKey) || '');
    }

    // 表示プレビュー切替（テスト用・公開GO時に除去）
    html += '<div class="hb-dev"><a href="#" id="premium-toggle">表示プレビュー切替（テスト用・現在: ' + esc(UR_PREMIUM.devTierLabel()) + '）</a></div>';

    // モチーフ図鑑への導線
    html += '<div class="linkline" style="margin-top:26px;"><a href="motifs.html">今日の絵柄にこめた意味を知る →</a></div>';

    return html;
  }

  function seasonLines(r) {
    var y = SY[r.yearZone];
    var html = 'いまは「' + esc(y.season) + '」';
    var m = r.monthZone ? SM[r.monthZone] : null;
    if (m && m.season) html += '<br>今月は「' + esc(m.season) + '」';
    return '<budoux-ja>' + html + '</budoux-ja>';
  }

  // --- 診断結果画面 ---
  function renderResult(diag) {
    var r = diag.results[0];
    var t = TYPES[r.honmeisei];
    var y = SY[r.yearZone];
    var html = '';

    // あなたのカード（せいこさん制作のフルアートカード・2026-08-26採用）
    var cnameColor = r.honmeisei === 6 ? '#a8946a' : t.color.main.hex; // パールホワイトのみ読める色で表示
    html += '<div class="sec" style="margin-top:34px;">' + labHTML2('YOUR', 'Card', 'あなたのカード') +
      '<div class="tcard-photo"><img src="assets/type-cards-final/web/type_' + r.honmeisei + '.jpg" alt="' + esc(t.title) + '"></div>' +
      '<div class="color-band" style="margin-top:18px;">' +
      '<span class="sw" style="background:' + esc(t.color.main.hex) + ';"></span>' +
      '<span class="cname" style="color:' + esc(cnameColor) + ';">' + esc(t.color.name) + '</span>' +
      '<span class="sw" style="background:' + esc(t.color.sub.hex) + ';border:1px solid #e0dacd;"></span>' +
      '</div>' +
      '<div class="t-sub" style="margin-top:8px;">' + esc(t.code) + ' ｜ ' + esc(t.name) + '</div>' +
      '<div class="catch">' + bx(t.catch) + '</div>' +
      '<div class="prose"><p>' + esc(t.essence) + '</p></div>';

    // くわしい診断（9タイプ別読み物・content/types_deep.js。空のタイプは出さない）
    var deep = (typeof UR_TYPES_DEEP !== 'undefined') ? UR_TYPES_DEEP[String(r.honmeisei)] : null;
    if (deep && deep.aruaru && deep.aruaru.length) {
      html += '<div class="month-sub" style="margin-top:26px;">こんなところ、ない？</div>' +
        '<ul class="deep-aru">' + deep.aruaru.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
        '<div class="month-sub" style="margin-top:24px;">あなたの才能が生きる場面</div>' +
        '<div class="prose"><p style="margin-top:4px;">' + esc(deep.talent) + '</p></div>' +
        '<div class="month-sub" style="margin-top:24px;">エネルギーが下がったときは</div>' +
        '<div class="prose"><p style="margin-top:4px;">' + esc(deep.recharge) + '</p></div>' +
        '<div class="imagine" style="margin-top:28px;">' +
        '<div class="imagine-label">FOR YOU｜これからのあなたへ</div>' +
        '<p>' + esc(deep.next) + '</p></div>';
    }
    html += '</div>';

    // 節入り当日生まれ（時刻不明）への小さな注記（月の星の判定に関わる・文言は味見対象）
    if (r.getsumeiBoundary) {
      html += '<div class="notice" style="margin-top:16px;"><budoux-ja>お生まれの日は、暦の節目にあたります。生まれた時刻がわかると、月の星の判定がより正確になります。</budoux-ja></div>';
    }
    html += sepHTML();

    // いまの大きな季節
    html += '<div class="sec">' + labHTML2('YOUR', 'Season', 'いまの大きな季節') +
      '<div class="theme" style="font-size:24px;">' + bx(y.season) + '</div>' +
      '<div class="subcopy">' + bx(y.meaning) + '</div>' +
      '<div class="prose"><p>' + esc(y.message) + '</p></div>' +
      '<div class="action"><p>' + esc(y.step) + '</p></div>' +
      '</div>' + sepHTML();

    // 今月のリズム（5パート＋IMAGINE）。無料版は「今月の流れ」まで＝今どんな流れかはわかる。
    // その先（意識したいこと・未来へのつながり・IMAGINE）はティザー1枚にまとめる（鍵だらけにしない）
    var m = r.monthZone ? SM[r.monthZone] : null;
    if (m && m.season && m.flow) {
      var mLocked = UR_PREMIUM.tier() === 'free';
      html += '<div class="sec">' + labHTML2('THIS MONTH\'S', 'Rhythm', '今月のリズム') +
        '<div class="theme" style="font-size:24px;">' + bx(m.season) + '</div>' +
        (m.subcopy ? '<div class="subcopy">― ' + bx(m.subcopy) + '</div>' : '') +
        '<div class="month-sub">今月の流れ</div>' +
        '<div class="prose"><p style="margin-top:4px;">' + esc(m.flow) + '</p></div>';
      if (mLocked) {
        html += teaserHTML('意識したいこと ・ 未来へのつながり ・ IMAGINE');
      } else {
        html += '<div class="month-sub">意識したいこと</div>' +
          '<div class="prose"><p style="margin-top:4px;">' + esc(m.focus) + '</p></div>' +
          '<div class="month-sub">未来へのつながり</div>' +
          '<div class="prose"><p style="margin-top:4px;">' + esc(m.future) + '</p></div>' +
          '<div class="imagine">' +
          '<div class="imagine-label">IMAGINE｜未来をひとつ描く</div>' +
          '<p>' + nl2br(m.imagine) + '</p></div>';
      }
      html += '</div>' + sepHTML();
    }

    html += dailyCardsHTML(r, diag.today);
    $('result-body').innerHTML = html;
    show('view-result');
  }

  // --- 毎朝ホーム ---
  function renderMorning(diag) {
    var r = diag.results[0];
    var t = TYPES[r.honmeisei];
    $('m-date').textContent = dateEn(diag.today.dateKey);
    $('m-en').textContent = t.code;
    $('m-jp').textContent = t.title;
    $('m-season').innerHTML = seasonLines(r);
    $('morning-body').innerHTML = dailyCardsHTML(r, diag.today);
    show('view-morning');
  }

  function diagnoseProfile(profile) {
    var diag = C.diagnose(profile, T);
    // 立春当日・時刻不明で、本人が候補を選んで進んだ場合はその候補で確定表示する
    if (diag && diag.ambiguous && profile && typeof profile.pick === 'number' && diag.results[profile.pick]) {
      return { results: [diag.results[profile.pick]], today: diag.today, ambiguous: false, picked: true };
    }
    return diag;
  }

  // --- 入力処理（立春境界・2026-08-13決裁のA案拡張） ---
  function onDiagnose() {
    var err = $('input-error');
    err.style.display = 'none';
    $('timebox').classList.remove('show');
    var p = readInput();
    if (!validDate(p)) {
      err.textContent = 'この日付は存在しないようです。もう一度お確かめください。';
      err.style.display = 'block';
      return;
    }
    var diag = diagnoseProfile(p);
    if (diag.error) {
      err.textContent = '恐れ入ります、この生年月日はただいま対応範囲の外です。';
      err.style.display = 'block';
      return;
    }
    if (diag.ambiguous) {
      // 立春当日・時刻不明: 決め打ちしない（誤答を出さない）。本人が候補を選べば進める
      var html =
        'お生まれの日は、その年の<b>立春</b>にあたります。生まれた時刻によって本質のタイプが変わるため、時刻がわかる場合は上の欄で選んでください（日本時間）。<br>' +
        '時刻がわからない場合は、2つの候補のうちピンとくる方で進めます（あとから入力し直すこともできます）。' +
        (CONTACT_URL !== '#CONTACT_URL' ? '正確な判定をご希望の方は<a href="' + CONTACT_URL + '">個別にご確認</a>いただけます。' : '') +
        '<div class="choice-btns">';
      diag.results.forEach(function (cand, idx) {
        var ct = TYPES[cand.honmeisei];
        html += '<button type="button" data-pick="' + idx + '"><b>' + esc(ct.code) + '</b>｜' + esc(ct.title) + ' で進める</button>';
      });
      html += '</div>';
      $('timebox').classList.add('show');
      $('boundary-note').innerHTML = html;
      $('boundary-note').querySelectorAll('button[data-pick]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var picked = { y: p.y, m: p.m, d: p.d, pick: +btn.getAttribute('data-pick') };
          saveProfile(picked);
          UR_PREMIUM.markStart();  // 初回診断完了日＝14日体験の開始日
          UR_TRACK.once('diagnosis_complete', 'ur_evt_diag');
          var dd = diagnoseProfile(picked);
          window._diag = dd;
          renderResult(dd);
        });
      });
      return;
    }
    saveProfile(p);
    UR_PREMIUM.markStart();  // 初回診断完了日＝14日体験の開始日
    UR_TRACK.once('diagnosis_complete', 'ur_evt_diag');
    window._diag = diag;
    renderResult(diag);
  }

  // --- 遷移イベント ---
  $('btn-start').addEventListener('click', function () { show('view-input'); });
  $('btn-diagnose').addEventListener('click', onDiagnose);
  $('btn-to-morning').addEventListener('click', function () {
    var prof = loadProfile();
    if (prof) renderMorning(diagnoseProfile(prof));
  });
  $('link-to-result').addEventListener('click', function (e) {
    e.preventDefault();
    var prof = loadProfile();
    if (prof) renderResult(diagnoseProfile(prof));
  });
  function redo(e) {
    e.preventDefault();
    clearProfile();
    boundaryAsking = false;
    $('timebox').classList.remove('show');
    show('view-input');
  }
  $('link-redo').addEventListener('click', redo);
  $('link-redo2').addEventListener('click', redo);

  // 方位盤タブ（日盤/月盤/年盤）の切り替え
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('hb-tab')) {
      _boardTab = t.getAttribute('data-board');
      var panel = $('board-panel');
      var d = window._diag;
      if (panel && d && d.results) panel.innerHTML = boardPanelHTML(d.results[0], d.today);
    }
  });
  // 折りたたみの開閉状態を再描画後も保つ
  document.addEventListener('toggle', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('hb-details')) {
      window._boardOpen = e.target.open;
    }
  }, true);

  // 表示プレビュー切替（テスト用: 体験中→無料版→BASICを巡回。公開GO時に除去）
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'premium-toggle') {
      e.preventDefault();
      UR_PREMIUM.devCycle();
      var prof = loadProfile();
      if (prof) {
        var d = diagnoseProfile(prof);
        if ($('view-morning').classList.contains('active')) renderMorning(d);
        else renderResult(d);
      }
    }
  });

  // 決済ページへのクリック計測（案内カードのボタン）
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'checkout-link') {
      UR_TRACK.event('checkout_click');
    }
  });

  // --- 起動 ---
  // URLパラメータ処理（?k=解錠キー ?src=流入元。?tier=はテスト用）
  var unlocked = UR_PREMIUM.handleUrl(window.location.search);
  if (unlocked === 'unlocked-first') UR_TRACK.event('premium_unlock_first');
  else if (unlocked === 'unlocked-renew') UR_TRACK.event('premium_unlock_renew');
  // プロフィールがあれば毎朝ホームへ直行
  var prof = loadProfile();
  if (prof) {
    var diag = diagnoseProfile(prof);
    if (diag.error) { show('view-welcome'); }
    else {
      UR_PREMIUM.markStart();  // 既存利用者の移行: 初回訪問日を体験起点に
      // 継続利用の節目（2・3・7・14日目）を1回ずつ数える
      var dayIdx = UR_PREMIUM.trialDayIndex(localStorage.getItem('ur_start'), diag.today.dateKey);
      if (dayIdx) UR_TRACK.visitCheck(dayIdx);
      window._diag = diag; renderMorning(diag);
    }
  } else {
    show('view-welcome');
  }
})();
