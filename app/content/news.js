/*
 * 運命リズム — お知らせ（毎朝ホームに出る枠）
 *
 * 書き換え方:
 *   - 上から順に、期間内のものを最大2件まで表示する
 *   - start / end は 'YYYY-MM-DD'（その日を含む）。end を過ぎると自動で消える
 *   - id は1件ごとに変える（×で閉じた記録・クリック計測に使う）
 *   - 変更したら index.html の news.js の ?v= を上げて公開する
 */
'use strict';
var UR_NEWS = [
  {
    id: 'nenun2027',
    start: '2026-11-17',
    end: '2026-12-20',
    label: 'SEMINAR',
    title: '2027年 年運セミナー 受付中',
    sub: 'LINEで「年運」と送ると、詳しいご案内が届きます',
    url: 'https://lin.ee/swNWCnt'
  },
  {
    id: 'compass2027',
    start: '2026-11-17',
    end: '2026-12-31',
    label: 'NEW',
    title: '年間コンパス 2027 先行予約',
    sub: 'あなたの生年月日から、2027年の流れを一冊に',
    url: 'https://76auto.biz/firstclas/registp/compass2027.htm'
  }
];
