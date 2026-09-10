/*
 * 運命リズム診断 — アカウントとBASIC権限（サーバー連携）
 * 正本: tools/unmei-rhythm/BASIC_ACCESS_DESIGN.md
 *
 * 役割:
 *   - Supabaseのログイン（メールに届くリンクを開くだけ・パスワードなし）
 *   - サーバーに「いまBASICか」を聞き、期限を localStorage に控える
 *   - PayPalの申込ボタンを出し、決済直後にその場でログイン状態にする
 *
 * 設計上の約束:
 *   - ここに置く値は「公開前提のもの」だけ。Secretは一切置かない
 *   - サーバーが落ちていても、前回聞いた期限が残っていればBASICのまま使える（フェイルオープン）
 *   - 期限そのものはサーバーが決めた日付なので、放っておけば正しく切れる
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

  // --- トークンの更新 ---
  function refreshToken() {
    var rt = get(K_REFRESH);
    if (!rt) return Promise.resolve(false);
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) {
      if (!r.ok) throw new Error('refresh failed ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j.access_token) throw new Error('no access_token');
      set(K_ACCESS, j.access_token);
      if (j.refresh_token) set(K_REFRESH, j.refresh_token);
      return true;
    }).catch(function () {
      // 更新できない＝ログインが切れている。トークンだけ捨てる。
      // 期限(K_UNTIL)は消さない: サーバー都合で使えなくなるのを避けるため
      del(K_ACCESS); del(K_REFRESH);
      return false;
    });
  }

  // --- いまの権限をサーバーに聞く ---
  // 成否にかかわらず K_UNTIL は「聞けたときだけ」書き換える。
  // 聞けなかった場合は前回の期限がそのまま残る＝サーバーが落ちても締め出さない。
  function syncFromServer() {
    if (!isLoggedIn()) return Promise.resolve(null);
    var call = function (tok) {
      return fetch(FN + '/me', { headers: { 'Authorization': 'Bearer ' + tok } });
    };
    var at = get(K_ACCESS);
    var first = at ? call(at) : Promise.resolve({ status: 401, json: function () { return {}; } });
    return first.then(function (r) {
      if (r.status === 401 || !at) {
        return refreshToken().then(function (ok) {
          if (!ok) return null;
          return call(get(K_ACCESS)).then(function (r2) { return r2.ok ? r2.json() : null; });
        });
      }
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j) return null;
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
                custom_id: j.token
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
    syncFromServer: syncFromServer,
    sendMagicLink: sendMagicLink,
    signOut: signOut,
    renderCheckout: renderCheckout,
    getConfig: getConfig
  };
});
