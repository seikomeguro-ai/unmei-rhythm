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

  // BASIC案内カード（月額・くわしく見る）。第一弾（2026-09-07）は無料版のみで公開するため非表示。
  // BASIC／決済を実装する第二弾で true に戻す（せいこさん決裁 2026-09-06）
  // 申込導線は「自動化が完成してから初めて出す」（2026-09-09 せいこさん決裁）。
  // 通し確認のあいだだけ、開発者ツールで localStorage.ur_dev_cta='1' を入れると出せる。
  // 公開GO時は true 固定に書き換え、この仕掛けごと消すこと。
  var SHOW_BASIC_CTA = (function () {
    try { return localStorage.getItem('ur_dev_cta') === '1'; } catch (e) { return false; }
  })();
  var _needCheckout = false;   // この描画でPayPalボタンを出す必要があるか

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
  // 「一歩」用: 読点・句点ごとの句を崩れない塊にして、「、」の位置で優先して折り返す（2026-09-11）。
  // 1句が1行に収まらないときだけ句の中を文節で折る。かぎかっこの中の「、」では区切らない
  function bxcl(s) {
    var out = [], cur = '', depth = 0, str = String(s);
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i); cur += c;
      if ('「『“（('.indexOf(c) >= 0) depth++;
      else if ('」』”）)'.indexOf(c) >= 0 && depth > 0) depth--;
      else if ((c === '、' || c === '。') && depth === 0 && i < str.length - 1) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out.map(function (c) { return '<span class="cl">' + bx(c) + '</span>'; }).join('');
  }
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
  // big=true で見出しを一段大きく（いまの大きな季節／今月のリズム／今日のテーマ）。note は「（今年の運勢）」などの補足
  function labHTML(word, jp, big) {
    return '<div class="lab"><span class="pre">TODAY\'S</span><span class="script">' + esc(word) + '</span></div>' +
      '<div class="lab-jp' + (big ? ' lab-jp-lg' : '') + '">' + esc(jp) + '</div>';
  }
  function labHTML2(pre, word, jp, note, big) {
    return '<div class="lab"><span class="pre">' + esc(pre) + '</span><span class="script">' + esc(word) + '</span></div>' +
      '<div class="lab-jp' + (big ? ' lab-jp-lg' : '') + '">' + esc(jp) +
      (note ? '<span class="lab-note">' + esc(note) + '</span>' : '') + '</div>';
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

  // --- 上部の状態通知（体験の残り／体験終了）---
  // 2026-09-10 せいこさん決裁:
  //   体験の残り3日以下 → 静かにカウントダウン
  //   15〜17日目        → 「14日間の無料体験は終了しました」
  //   18日目以降        → 何も出さない（鍵と下部の申込カードだけにする）
  function trialNoticeHTML(today) {
    if (UR_PREMIUM.tier() === 'premium') return '';
    var start = null;
    try { start = localStorage.getItem('ur_start'); } catch (e) { }
    var idx = UR_PREMIUM.trialDayIndex(start, today && today.dateKey);
    if (idx === null) return '';
    var D = UR_PREMIUM.TRIAL_DAYS;
    if (idx <= D) {
      var left = D - idx + 1;
      if (left > 3 || left < 1) return '';
      return '<div class="tnotice">体験でご覧いただけるのは、あと' + left + '日です</div>';
    }
    if (idx <= D + 3) {
      return '<div class="tnotice tnotice-end">14日間の無料体験は終了しました</div>';
    }
    return '';
  }

  // --- アカウント（BASICのログイン状態）---
  // 2026-09-10: 画面下部のリンク群（「生年月日を入れ直す」の並び）から開く形にした。
  // 常時表示だと、体験中の人にも意味のわからない欄が出てしまうため。
  // ただしリンク自体は常に置く。BASICの方が新しい端末で開くと、その端末では
  // 「体験中」に見えるので、申込カードの中だけに置くと14日間たどり着けない。
  function accountPanelHTML() {
    if (UR_ACCOUNT.isLoggedIn()) {
      var until = UR_PREMIUM.basicUntil();
      var addr = UR_ACCOUNT.email() || '';
      return '<div class="acct-line">' + esc(addr) + ' でご利用中' +
        (until ? '<span class="acct-until">' + esc(until) + ' まで</span>' : '') + '</div>' +
        '<button type="button" class="acct-link" id="acct-signout">この端末からログアウト</button>';
    }
    return '<div class="acct-form">' +
      '<div class="acct-note"><budoux-ja>お申し込みのときのメールアドレスを入れてください。ログイン用のリンクをお送りします。</budoux-ja></div>' +
      '<input type="email" id="acct-email" inputmode="email" autocomplete="email" placeholder="メールアドレス">' +
      '<button type="button" class="acct-send" id="acct-send">リンクを送る</button>' +
      '<div class="acct-msg" id="acct-msg" hidden></div>' +
      '</div>';
  }

  function toggleAccountPanel() {
    var panel = $('acct-panel');
    if (!panel) return;
    if (panel.hidden) {
      panel.innerHTML = accountPanelHTML();
      panel.hidden = false;
      var i = $('acct-email'); if (i) i.focus();
    } else {
      panel.hidden = true;
    }
  }

  // 描画のたびに呼ぶ後処理。innerHTMLを入れ替えた直後に実行する
  function afterRender() {
    if (_needCheckout && document.getElementById('paypal-button')) {
      _needCheckout = false;
      UR_ACCOUNT.renderCheckout('paypal-button', function (state) {
        var el = document.getElementById('pc-status');
        if (!el) return;
        if (state === 'processing') el.textContent = 'お手続きを確認しています…';
        else if (state === 'error') el.textContent = 'うまく進めませんでした。少し時間をおいてお試しください。';
      });
    }
  }

  // --- おすすめ方位（TODAY'S Compass）---
  // 2026-09-06 せいこさん指示: シーン別5行（モーニング/ランチ/…に同じ方角）は冗長なので、
  // 「今日は、◯◯が味方。」＋ひとこと文にまとめる。方位はその日の吉方位で自動で変わる。

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
    html += '<div class="nav-lead"><budoux-ja>今日は、' + esc(joinDirs(names)) + 'が味方。</budoux-ja></div>' +
      '<div class="nav-copy">' + bxbr('モーニング、ランチ、カフェ、ディナー、お買い物など、\nぜひこの方角へ出かけてみてね。') + '</div>';
    html += '</div>';
    return html;
  }

  // --- 今日のひと皿（2026-09-06 せいこさん指示・BASICのみ・おすすめ方位の直前）---
  // 本命星が今日の盤のどの場所に入っているか（＝その場所の定位星）で9パターンを切り替える。
  // 文言はせいこさん確定案（2026-09-07 改訂・3層構成）。星名は切り替えのキーで、画面には出さない。
  var DISH = {
    1: { star: '一白', key: '潤す',
         food: '白身魚、豆腐、やさしいスープなど、\nからだにやさしいものを。',
         mood: 'みずみずしく静かな一皿で、\n内側をそっと潤して。',
         note: '温かい飲み物をこまめに。' },
    2: { star: '二黒', key: '整える',
         food: '玄米、豆、季節野菜など、\n畑のものを丁寧に。',
         mood: '素朴でやさしい滋養が、\n今日の土台を整えます。' },
    3: { star: '三碧', key: 'フレッシュに',
         food: '柑橘、ハーブ、\nパリッとした生野菜を。',
         mood: '酸味と食感で、\n気分まで目を覚ます一皿を。' },
    4: { star: '四緑', key: '軽やかに',
         food: '蕎麦やフォーなど、\nつるりとした麺を。',
         mood: '香りのハーブや薬味を\nたっぷり添えて。' },
    5: { star: '五黄', key: '養う',
         food: '味噌汁、ぬか漬け、甘酒など。',
         mood: '発酵の力で、\n内側からやさしく養って。' },
    6: { star: '六白', key: '上質に',
         food: 'いい出汁、いい素材、上質な食を。',
         mood: 'いつもより少し上等なものを、\n姿勢よくいただいて。' },
    7: { star: '七赤', key: '楽しむ',
         food: 'カフェランチやイタリアンを。',
         mood: '見た目も会話も弾む、楽しい一皿を。\nデザートも今日はOK。' },
    8: { star: '八白', key: '蓄える',
         food: '根菜、きのこ、山菜など、\n大地と山の恵みをしっかりと。',
         mood: '静かな力を、\nじっくり蓄える一皿を。' },
    9: { star: '九紫', key: '彩る',
         food: 'アボカド、トマト、海老、貝など、\n色まで美しいものを。',
         mood: '目に入った瞬間に、\n心が華やぐ一皿を。' }
  };
  function dishHTML(r, today) {
    if (!today.dayCenter) return '';
    var seat = window.URHouiban.seatOf(today.dayCenter, r.honmeisei);
    var d = seat && DISH[seat.teii];
    if (!d) return '';
    // 3層（見出し／食の提案／気分・作用）＋必要な星だけ小さな補足。
    // 改行は意味の切れ目で固定（自動改行に任せない）。英字見出しは他（Compass/Word）と同じ筆記体
    return '<div class="sec dish">' + labHTML('Plate', '今日のひと皿') +
      '<div class="dish-sub">今日、選びたいもの</div>' +
      '<div class="dish-key">' + esc(d.key) + '</div>' +
      '<div class="dish-food">' + nl2br(d.food) + '</div>' +
      '<div class="dish-mood">' + nl2br(d.mood) + '</div>' +
      (d.note ? '<div class="dish-note">※ ' + esc(d.note) + '</div>' : '') +
      '</div>';
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
      '<span class="lg"><span class="dot" style="background:#f5cdd5;"></span>最大吉方</span>' +
      '<span class="lg"><span class="dot" style="background:#fae6ea;"></span>吉方位</span>' +
      '<span class="lg"><span class="dot" style="background:#f1efeb;"></span>控えめにしたい方位</span>' +
      '</div>' +
      '<div class="hb-note">南が上・北が下の、本来の方位盤の向きです。</div>';
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
  // 日本語の日付＋その日の吉日（該当なしなら日付だけ）。判定は calc.js の goodDayItems
  function kichiHTML(dateKey) {
    var p = dateKey.split('-').map(Number);
    var html = '<div class="kichi-date">' + p[0] + '年' + p[1] + '月' + p[2] + '日</div>';
    var items = C.goodDayItems(dateKey, T);
    if (items.length) {
      html += '<div class="kichi-items">' + items.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
    }
    return html;
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

    var locked = UR_PREMIUM.tier() === 'free';  // 無料版だけロック（体験中・BASICは全部見える）
    var html = trialNoticeHTML(today);

    // 1. THEME（線画つき）
    html += '<div class="sec">' + labHTML('Theme', '今日のテーマ', true);
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
        (picks.action.pending ? pendingHTML() : '<p>' + bxcl(picks.action.text) + '</p>') +
        '</div>';

      // 4. 今日のひと皿（おすすめ方位の直前・BASICのみ）
      html += dishHTML(r, today);

      // 5. おすすめ方位＋行動ナビ ＋ 6. 根拠の方位盤（折りたたみ・3盤タブ）
      html += compassBlockHTML(r, today);
    }

    // 6. WORD（ベージュの帯）
    html += '<div class="word">' + labHTML('Word', '今日の言葉') +
      (picks.word.pending ? pendingHTML() : '<p style="margin-top:12px;">' + bxbr(picks.word.text) + '</p>') +
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

    // BASIC案内カード（無料版のみ・文言はbrand-check前の下書き）。第一弾は SHOW_BASIC_CTA=false で出さない
    if (locked && SHOW_BASIC_CTA) {
      html += '<div class="premium-cta">' +
        '<div class="pc-lab">BASIC</div>' +
        '<div class="pc-title"><budoux-ja>続きを見るには、BASICへ。</budoux-ja></div>' +
        '<div class="pc-copy"><budoux-ja>今日のメッセージ、今日の一歩、おすすめの方位、年盤・月盤・日盤、今月の詳しい読み解きをご覧いただけます。</budoux-ja></div>' +
        '<div class="pc-price">月額 1,100円（税込）<span class="pc-price-sub">いつでも解約できます</span></div>' +
        '<div id="paypal-button" class="pc-paypal"></div>' +
        '<div class="pc-note" id="pc-status">お手続きが済むと、そのままこの画面でご覧いただけます。</div>' +
        '</div>';
      UR_TRACK.daily('premium_notice_view', 'ur_evt_notice', (today && today.dateKey) || '');
      _needCheckout = true;
    }


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
    html += '<div class="sec card" style="margin-top:34px;">' + labHTML2('YOUR', 'Card', 'あなたのカード') +
      '<div class="tcard-photo"><img src="assets/type-cards-final/web/type_' + r.honmeisei + '.jpg" alt="' + esc(t.title) + '"></div>' +
      // 色見本（.sw）は置かない: 幅ゼロで枠線だけが細い縦線に見えていたため（2026-09-06 せいこさん指示）
      '<div class="color-band" style="margin-top:18px;">' +
      '<span class="cname" style="color:' + esc(cnameColor) + ';">' + esc(t.color.name) + '</span>' +
      '</div>' +
      '<div class="t-sub" style="margin-top:8px;">' + esc(t.code) + '</div>' +
      '<div class="t-star">' + esc(t.name) + '</div>' +
      '<div class="catch">' + bx(t.catch) + '</div>' +
      '<div class="prose"><p>' + esc(t.essence) + '</p></div>';

    // くわしい診断（9タイプ別読み物・content/types_deep.js。空のタイプは出さない）
    var deep = (typeof UR_TYPES_DEEP !== 'undefined') ? UR_TYPES_DEEP[String(r.honmeisei)] : null;
    if (deep && deep.aruaru && deep.aruaru.length) {
      html += '<div class="month-sub" style="margin-top:46px;">こんなところ、ない？</div>' +
        '<ul class="deep-aru">' + deep.aruaru.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
        '<div class="month-sub" style="margin-top:44px;">あなたの才能が生きる場面</div>' +
        '<div class="prose"><p style="margin-top:4px;">' + esc(deep.talent) + '</p></div>' +
        '<div class="month-sub" style="margin-top:44px;">エネルギーが下がったときは</div>' +
        '<div class="prose"><p style="margin-top:4px;">' + esc(deep.recharge) + '</p></div>' +
        '<div class="imagine" style="margin-top:46px;">' +
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
    html += '<div class="sec">' + labHTML2('YOUR', 'Season', 'いまの大きな季節', '（今年の運勢）', true) +
      '<div class="theme" style="font-size:24px;">' + bx(y.season) + '</div>' +
      '<div class="subcopy">' + bx(y.meaning) + '</div>' +
      '<div class="prose"><p>' + esc(y.message) + '</p></div>' +
      '<div class="action"><p>' + bxcl(y.step) + '</p></div>' +
      '</div>' + sepHTML();

    // 今月のリズム（5パート＋IMAGINE）。無料版は「今月の流れ」まで＝今どんな流れかはわかる。
    // その先（意識したいこと・未来へのつながり・IMAGINE）はティザー1枚にまとめる（鍵だらけにしない）
    var m = r.monthZone ? SM[r.monthZone] : null;
    if (m && m.season && m.flow) {
      var mLocked = UR_PREMIUM.tier() === 'free';
      html += '<div class="sec">' + labHTML2('THIS MONTH\'S', 'Rhythm', '今月のリズム', '（今月の運勢）', true) +
        '<div class="theme" style="font-size:24px;">' + bx(m.season) + '</div>' +
        (m.subcopy ? '<div class="subcopy subcopy-month">― ' + bxbr(m.subcopy) + '</div>' : '') +
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
    afterRender();
  }

  // --- 毎朝ホーム ---
  function renderMorning(diag) {
    var r = diag.results[0];
    var t = TYPES[r.honmeisei];
    $('m-date').textContent = dateEn(diag.today.dateKey);
    $('m-kichi').innerHTML = kichiHTML(diag.today.dateKey);
    $('m-en').textContent = t.code;
    $('m-jp').textContent = t.title;
    $('m-season').innerHTML = seasonLines(r);
    $('morning-body').innerHTML = dailyCardsHTML(r, diag.today);
    show('view-morning');
    afterRender();
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
  $('link-account').addEventListener('click', function (e) { e.preventDefault(); toggleAccountPanel(); });

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

  // --- アカウント操作（ログイン／ログアウト）---
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'acct-send') {
      var input = $('acct-email');
      var msg = $('acct-msg');
      var addr = input ? String(input.value || '').trim() : '';
      if (!addr || addr.indexOf('@') < 0) {
        if (msg) { msg.hidden = false; msg.textContent = 'メールアドレスをご確認ください。'; }
        return;
      }
      t.disabled = true;
      UR_ACCOUNT.sendMagicLink(addr).then(function () {
        if (msg) {
          msg.hidden = false;
          // 登録の有無は答えない（誰が会員かを外から探れないようにするため）
          msg.textContent = 'ご登録のアドレスであれば、ログイン用のリンクをお送りしました。メールをご確認ください。';
        }
        var input2 = $('acct-email'); if (input2) input2.value = '';
      });
    } else if (t.id === 'acct-signout') {
      UR_ACCOUNT.signOut();
      window.location.reload();
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
  // メールのログインリンクから戻ってきた場合はここでトークンを受け取る（URLからは消す）
  var justLoggedIn = UR_ACCOUNT.handleAuthRedirect();
  UR_PREMIUM.handleUrl(window.location.search);
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
      syncAndRefresh(diag);
    }
  } else {
    show('view-welcome');
  }

  // サーバーに「いまBASICか」を聞き直し、表示が変わるときだけ描き直す。
  // 聞けなかった場合は前回の期限のまま＝障害中でも締め出さない。
  function syncAndRefresh(diag) {
    if (!UR_ACCOUNT.isLoggedIn()) return;
    var before = UR_PREMIUM.tier();
    UR_ACCOUNT.syncFromServer().then(function () {
      if (UR_PREMIUM.tier() !== before && window._diag) renderMorning(window._diag);
    });
  }
})();
