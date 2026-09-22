/*
 * 運命リズム診断 — アカウントとBASIC権限（サーバー連携）
 * 正本: tools/unmei-rhythm/BASIC_ACCESS_DESIGN.md
 *
 * 役割:
 *   - Supabaseのログイン（メールに届くリンクを開くだけ・パスワードなし）
 *   - サーバーに「いまBASICか」を聞き、期限を localStorage に控える
 *   - PayPalの申込ボタンを出し、決済直後にその場でログイン状態にする
 *   - 登録ゲート（2026-09-18〜）: Autobiz登録直後のメールから来た人を、
 *     追加入力なしで本人確認メール送付につなげる
 *
 * 設計上の約束:
 *   - ここに置く値は「公開前提のもの」だけ。Secretは一切置かない
 *   - サーバーが落ちていても、前回聞いた期限が残っていればBASICのまま使える（フェイルオープン）
 *   - 期限そのものはサーバーが決めた日付なので、放っておけば正しく切れる
 *   - 登録メールアドレスはURLの「#」以降（フラグメント）にだけ載せる。フラグメントは
 *     ブラウザがサーバーに送らないため、アクセスログ・GoatCounter・Autobizのクリック測定に
 *     一切残らない（既存のログインリンク #access_token= と同じ考え方）
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_ACCOUNT = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // --- 公開前提の設定値（Secretではない） ---
  var SUPABASE_URL = 'https://yikjnxobuyebcqkouywr.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_vwuGHi8y7-lA64ZNYl7-SQ_kms93jMJ';
  var FN = SUPABASE_URL + '/functions/v1/basic';

  // PayPalのClient IDとプランIDは、アプリに焼き込まずサーバーから受け取る。
  // 本番かテスト環境かはサーバー側の設定だけで決まり、ブラウザからは切り替えられない。
  var _config = null;
  function getConfig() {
    if (_config) return Promise.resolve(_config);
    return fetch(FN + '/config').then(function (r) { return r.json(); }).then(function (j) {
      _config = j;
      return j;
    });
  }

  // localStorage のキー
  var K_ACCESS = 'ur_at';        // アクセストークン（1時間で切れる）
  var K_REFRESH = 'ur_rt';       // 更新用トークン
  var K_EMAIL = 'ur_email';      // 表示用（どのアドレスでログイン中か）
  var K_UNTIL = 'ur_basic_until';   // BASICの利用期限 YYYY-MM-DD（premium.jsが読む）
  var K_CHECKED = 'ur_basic_checked'; // 最後にサーバーへ聞いた日時

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { } }

  function isLoggedIn() { return !!get(K_REFRESH); }
  function email() { return get(K_EMAIL); }

  // --- ログイン状態の受け取り ---
  // メールのリンクを開くと #access_token=... 付きで戻ってくる。取り込んでURLから消す。
  function handleAuthRedirect() {
    var h = String(window.location.hash || '');
    if (h.indexOf('access_token=') < 0) return false;
    var p = {};
    h.replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    if (!p.access_token) return false;
    set(K_ACCESS, p.access_token);
    if (p.refresh_token) set(K_REFRESH, p.refresh_token);
    // トークンを画面のURLに残さない（履歴・共有・スクショから漏れないように）
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { window.location.hash = ''; }
    return true;
  }

  // --- 登録ゲート：Autobizのメールから来た人を拾う ---
  // URLの #e=（メールアドレス） を読み取り、すぐURLから消す。クエリ文字列(?e=)は使わない
  // （サーバーのアクセスログや計測ツールに残さないため。フラグメントはブラウザが送信しない）
  function handleClaimFragment() {
    var h = String(window.location.hash || '');
    var m = /(?:^|[#&])e=([^&]+)/.exec(h);
    if (!m) return null;
    var email = decodeURIComponent(m[1]);
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { window.location.hash = ''; }
    return email || null;
  }

  // 登録メールから来た人の本人確認メールを送ってもらう。
  // 登録の有無にかかわらず同じ返事（true）にする。失敗しても呼び出し側は詰まらせない
  function claim(email, src) {
    return fetch(FN + '/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim().toLowerCase(), src: src || null })
    }).then(function () { return true; }).catch(function () { return true; });
  }

  // --- トークンの更新 ---
  function refreshToken() {
    var rt = get(K_REFRESH);
    if (!rt) return Promise.resolve(false);
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) {
      if (r.ok) {
        return r.json().then(function (j) {
          if (!j.access_token) return false;
          set(K_ACCESS, j.access_token);
          if (j.refresh_token) set(K_REFRESH, j.refresh_token);
          return true;
        });
      }
      // 別のタブが先に更新していた（更新用トークンは使い捨てで入れ替わる）。そちらの新しいトークンを使う
      var now = get(K_REFRESH);
      if (now && now !== rt) return true;
      // 400/401＝このログインそのものが無効（取り消し・期限切れ）。トークンだけ捨てる
      if (r.status === 400 || r.status === 401) { del(K_ACCESS); del(K_REFRESH); }
      // それ以外（5xx・429など）はサーバー側の一時的な問題。ログインは残して次回やり直す
      return false;
    }).catch(function () {
      // 通信できない（オフライン・スリープ復帰直後など）。ログインは残して次回やり直す
      // 2026-09-13: 以前は通信失敗や一時的なサーバー障害でもトークンを捨てており、ログインが切れてしまう作りだった
      return false;
    });
  }

  // --- いまの権限をサーバーに聞く ---
  // 成否にかかわらず K_UNTIL は「聞けたときだけ」書き換える。
  // 聞けなかった場合は前回の期限がそのまま残る＝サーバーが落ちても締め出さない。

  // アクセストークンの期限（UNIX秒）。読めなければ 0＝期限切れ扱いにして先に更新する
  function tokenExp(tok) {
    try {
      var b = String(tok).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return Number(JSON.parse(atob(b)).exp) || 0;
    } catch (e) { return 0; }
  }

  function syncFromServer() {
    if (!isLoggedIn()) return Promise.resolve(null);
    var call = function (tok) {
      return fetch(FN + '/me', { headers: { 'Authorization': 'Bearer ' + tok } })
        .then(function (r) { return r.ok ? r.json() : null; });
    };
    // サーバーは、切れたトークンでも HTTP 200 で { tier:'free', reason:'invalid token' } を返す。
    // 2026-09-16: 以前は 401 だけを更新の合図にしていたため、ログインから1時間たつと
    // 「聞けた」扱いで期限を消してしまい、BASICの方が次にログインし直すまでFREEに落ちていた。
    var unusable = function (j) { return !j || j.reason === 'invalid token'; };
    var at = get(K_ACCESS);
    // 期限切れ（残り60秒未満も含む）なら、聞く前に更新しておく
    var stale = !at || tokenExp(at) * 1000 < Date.now() + 60000;
    var first = stale ? Promise.resolve(null) : call(at);
    return first.then(function (j) {
      if (!unusable(j)) return j;
      return refreshToken().then(function (ok) {
        if (!ok) return null;
        return call(get(K_ACCESS));
      });
    }).then(function (j) {
      // 聞けなかった（通信失敗・更新失敗・それでもトークン無効）＝前回の期限を残す
      if (!j || j.reason) return null;
      if (j.access_until) set(K_UNTIL, j.access_until); else del(K_UNTIL);
      if (j.email) set(K_EMAIL, j.email);
      set(K_CHECKED, new Date().toISOString());
      return j;
    }).catch(function () { return null; });
  }

  // --- メールでログインリンクを送る ---
  // create_user は付けない（サーバー側の既定で新規作成しない設定）。
  // 見ず知らずのアドレスでアカウントが増えないようにするため。
  function sendMagicLink(addr) {
    var redirect = window.location.origin + window.location.pathname;
    return fetch(SUPABASE_URL + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirect), {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(addr || '').trim().toLowerCase(), create_user: false })
    }).then(function (r) {
      // 「そのアドレスは未登録です」と教えると、誰が会員かを外から探れてしまう。
      // 成否にかかわらず同じ案内を出すため、ここでは常に true を返す。
      return true;
    }).catch(function () { return true; });
  }

  // --- アプリの中でログインを完了する（2026-09-22）---
  // iPhoneのホーム画面アプリはSafariと記録が別なので、メールのリンクを押すとSafari側でログインされ、
  // アプリはログインされないまま残る。そこで、①メールのリンクを「押さずにコピー」して貼り付ける、
  // または ②メールに書かれた数字のコードを入れる、のどちらでもアプリの中でログインできるようにする。
  // 成功したら true、失敗（期限切れ・使用済み・形式違い）なら false を返す
  function verifyInput(addr, input) {
    var v = String(input || '').trim();
    var body = null;
    var code = v.replace(/\s/g, '');
    if (/^\d{6,10}$/.test(code)) {
      var em = String(addr || get('ur_pending_email') || '').trim().toLowerCase();
      if (!em) return Promise.resolve(false);
      body = { type: 'email', email: em, token: code };
    } else {
      var m = /[?&]token=([^&#\s]+)/.exec(v);
      if (!m) return Promise.resolve(false);
      var t = /[?&]type=([^&#\s]+)/.exec(v);
      body = { type: t ? decodeURIComponent(t[1]) : 'magiclink', token_hash: decodeURIComponent(m[1]) };
    }
    return fetch(SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j || !res.j.access_token || !res.j.refresh_token) return false;
        set(K_ACCESS, res.j.access_token);
        set(K_REFRESH, res.j.refresh_token);
        if (res.j.user && res.j.user.email) set(K_EMAIL, res.j.user.email);
        del('ur_pending_email');
        return true;
      }).catch(function () { return false; });
  }
  // リンクを送った相手のアドレスを、コード入力のために一時的に覚えておく（ログイン成功で消す）
  function rememberPendingEmail(addr) { set('ur_pending_email', String(addr || '').trim().toLowerCase()); }

  function signOut() {
    del(K_ACCESS); del(K_REFRESH); del(K_EMAIL); del(K_UNTIL); del(K_CHECKED);
  }

  // --- PayPalの申込ボタン ---
  var _sdkLoading = null;
  function loadPayPalSdk() {
    if (window.paypal) return Promise.resolve(window.paypal);
    if (_sdkLoading) return _sdkLoading;
    _sdkLoading = getConfig().then(function (cfg) {
      if (!cfg || !cfg.paypal_client_id) throw new Error('paypal config missing');
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cfg.paypal_client_id) +
          '&vault=true&intent=subscription&currency=JPY&locale=ja_JP';
        s.setAttribute('data-sdk-integration-source', 'button-factory');
        s.onload = function () { resolve(window.paypal); };
        s.onerror = function () { _sdkLoading = null; reject(new Error('paypal sdk load failed')); };
        document.head.appendChild(s);
      });
    });
    return _sdkLoading;
  }

  /**
   * 申込ボタンを描画する。
   * onStatus(state, detail) で 'ready' / 'processing' / 'done' / 'error' を通知する。
   */
  function renderCheckout(containerId, onStatus) {
    var say = onStatus || function () { };
    return loadPayPalSdk().then(function (paypal) {
      var el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = '';
      return paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' },
        createSubscription: function (data, actions) {
          // サーバーにワンタイムの合言葉を作ってもらい、申込に埋め込む。
          // これがないと、他人の契約IDを送るだけでログインリンクを奪える。
          return fetch(FN + '/subscribe-start', { method: 'POST' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              if (!j.token) throw new Error('no token');
              sessionStorage.setItem('ur_sub_token', j.token);
              return actions.subscription.create({
                plan_id: _config.paypal_plan_id,
                custom_id: j.token,
                // デジタル商品なので配送先は聞かない（住所欄が出るとお客様が戸惑うため・2026-09-16）
                application_context: { shipping_preference: 'NO_SHIPPING' }
              });
            });
        },
        onApprove: function (data) {
          say('processing');
          var token = sessionStorage.getItem('ur_sub_token') || '';
          return fetch(FN + '/subscribe-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionID: data.subscriptionID, token: token })
          }).then(function (r) { return r.json(); }).then(function (j) {
            sessionStorage.removeItem('ur_sub_token');
            if (j.access_until) set(K_UNTIL, j.access_until);
            if (j.email) set(K_EMAIL, j.email);
            say('done', j);
            // サーバーが発行したログインリンクへ移動して、この端末をログイン状態にする
            if (j.login_url) { window.location.href = j.login_url; }
          }).catch(function (e) {
            say('error', e);
          });
        },
        onError: function (e) { say('error', e); }
      }).render('#' + containerId).then(function () { say('ready'); });
    }).catch(function (e) { say('error', e); });
  }

  return {
    isLoggedIn: isLoggedIn,
    email: email,
    handleAuthRedirect: handleAuthRedirect,
    handleClaimFragment: handleClaimFragment,
    claim: claim,
    syncFromServer: syncFromServer,
    sendMagicLink: sendMagicLink,
    verifyInput: verifyInput,
    rememberPendingEmail: rememberPendingEmail,
    signOut: signOut,
    renderCheckout: renderCheckout,
    getConfig: getConfig
  };
});
