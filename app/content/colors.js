/*
 * 運命リズム診断 — 今日のカラー（TODAY'S COLOR）の素材表（2026-09-22）
 * キー = 宮の定位星（1=北 2=南西 3=東 4=南東 5=中央 6=北西 7=西 8=北東 9=南）
 * items = [色名, モチーフ, 画像名]（画像は assets/icons/color/画像名.webp）
 * 元データ: せいこさん提供 TODAYS_COLOR_ASSETS_FOR_CLAIRE_v2.zip の manifest.json（全75点）
 * line = 色名の下に添える一言。🟡 2026-09-22 クレア仮文・せいこさんの味見待ち
 * 金・銀の小物は色名に含まれる宮（北西）以外へ流用しない（素材の注意書きどおり）
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UR_COLORS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    1: { dir: 'north', label: '北', line: '深く澄んだ色を、ひとつ身につけて。', items: [
      ['黒', '水玉のスカーフ', '01_north_black-polka-scarf'],
      ['濃紺', 'バレエシューズ', '01_north_dark-navy-ballet-flats'],
      ['ネイビー', 'バッグ', '01_north_navy-handbag'],
      ['チャコールグレー', '香水瓶', '01_north_charcoal-gray-perfume'],
      ['黒', 'サングラス', '01_north_black-sunglasses'],
      ['パールホワイト', '腕時計', '01_north_pearl-white-watch'],
      ['ネイビー', 'ノート', '01_north_navy-notebook'],
      ['白', 'ポーチ', '01_north_white-pouch'],
      ['濃紺', 'ジャケット', '01_north_deep-navy-blazer']
    ] },
    2: { dir: 'southwest', label: '南西', line: 'やわらかな土の色で、安心感をまとって。', items: [
      ['黄茶', 'カードケース', '02_southwest_yellow-brown-card-case'],
      ['ベージュ', 'ティーカップ', '02_southwest_beige-teacup'],
      ['ハニーベージュ', '香水瓶', '02_southwest_honey-beige-perfume'],
      ['キャメル', 'ローファー', '02_southwest_camel-loafers'],
      ['ミルクティー', '芍薬', '02_southwest_milk-tea-peony'],
      ['キャメル', 'ジャケット', '02_southwest_camel-jacket'],
      ['ベージュ', 'ポーチ', '02_southwest_beige-pouch'],
      ['ミルクティー', 'ノート', '02_southwest_milk-tea-notebook']
    ] },
    3: { dir: 'east', label: '東', line: '軽やかなブルーで、動き出す気分に。', items: [
      ['青', 'パンプス', '03_east_blue-pump'],
      ['セルリアンブルー', 'バッグ', '03_east_cerulean-blue-handbag'],
      ['アクアブルー', 'ティーカップ', '03_east_aqua-blue-teacup'],
      ['ターコイズ', 'イヤリング', '03_east_turquoise-earrings'],
      ['青緑', '香水瓶', '03_east_blue-green-perfume'],
      ['青', '万年筆', '03_east_blue-fountain-pen'],
      ['アクアブルー', 'サングラス', '03_east_aqua-blue-sunglasses'],
      ['ターコイズ', 'ワンピース', '03_east_turquoise-dress']
    ] },
    4: { dir: 'southeast', label: '東南', line: 'やさしい緑を、今日の装いに。', items: [
      ['緑', 'ハンカチ', '04_southeast_green-handkerchief'],
      ['ピスタチオグリーン', 'バッグ', '04_southeast_pistachio-green-handbag'],
      ['ミントグリーン', 'ティーカップ', '04_southeast_mint-green-teacup'],
      ['エメラルドグリーン', 'イヤリング', '04_southeast_emerald-green-earrings'],
      ['ピスタチオグリーン', 'ワンピース', '04_southeast_pistachio-green-dress'],
      ['エメラルドグリーン', '腕時計', '04_southeast_emerald-green-watch'],
      ['ミントグリーン', 'ポーチ', '04_southeast_mint-green-pouch']
    ] },
    5: { dir: 'center', label: '中央', line: 'あたたかな色で、自分の真ん中を感じて。', items: [
      ['黄色', '花', '05_center_yellow-ranunculus'],
      ['ブラウン', 'カードケース', '05_center_brown-card-case'],
      ['ベージュ', 'フラットシューズ', '05_center_beige-flat-shoe'],
      ['黄色', 'ノート', '05_center_yellow-notebook'],
      ['ブラウン', '万年筆', '05_center_brown-fountain-pen'],
      ['ベージュ', 'ジャケット', '05_center_beige-jacket']
    ] },
    6: { dir: 'northwest', label: '北西', line: '上質な光を、ひとつ添えて。', items: [
      ['白', 'ハンカチ', '06_northwest_white-handkerchief'],
      ['パールホワイト', '芍薬', '06_northwest_pearl-white-peony'],
      ['シルバー', '香水瓶', '06_northwest_silver-perfume'],
      ['ライトグレー', 'バレエシューズ', '06_northwest_light-gray-ballet-flats'],
      ['パールグレー', 'バッグ', '06_northwest_pearl-gray-handbag'],
      ['ゴールド', 'イヤリング', '06_northwest_gold-earrings'],
      ['シャンパンゴールド', 'リップ', '06_northwest_champagne-gold-lipstick'],
      ['パールホワイト', 'ジャケット', '06_northwest_pearl-white-jacket'],
      ['シルバー', '腕時計', '06_northwest_silver-watch'],
      ['パールグレー', 'ノート', '06_northwest_pearl-gray-notebook'],
      ['シャンパンゴールド', 'ポーチ', '06_northwest_champagne-gold-pouch']
    ] },
    7: { dir: 'west', label: '西', line: '甘い色をひとさじ、楽しむ気持ちに。', items: [
      ['白', '薔薇', '07_west_white-rose'],
      ['ピンク', 'パンプス', '07_west_pink-pump'],
      ['ローズピンク', 'リップ', '07_west_rose-pink-lipstick'],
      ['シェルピンク', 'バッグ', '07_west_shell-pink-handbag'],
      ['オレンジ', 'ティーカップ', '07_west_orange-teacup'],
      ['ピンク', 'サングラス', '07_west_pink-sunglasses'],
      ['ローズピンク', '腕時計', '07_west_rose-pink-watch'],
      ['シェルピンク', 'ワンピース', '07_west_shell-pink-dress'],
      ['オレンジ', 'ポーチ', '07_west_orange-pouch']
    ] },
    8: { dir: 'northeast', label: '北東', line: '落ち着いた色で、じっくり自分を整えて。', items: [
      ['黄色', 'チューリップ', '08_northeast_yellow-tulip'],
      ['茶色', 'バッグ', '08_northeast_brown-handbag'],
      ['アイボリー', 'スカーフ', '08_northeast_ivory-scarf'],
      ['カフェオレ', 'バレエシューズ', '08_northeast_cafe-au-lait-ballet-flats'],
      ['モカムース', '香水瓶', '08_northeast_mocha-mousse-perfume'],
      ['アイボリー', 'ジャケット', '08_northeast_ivory-jacket'],
      ['カフェオレ', 'ノート', '08_northeast_cafe-au-lait-notebook'],
      ['モカムース', '腕時計', '08_northeast_mocha-watch']
    ] },
    9: { dir: 'south', label: '南', line: '華やかな色で、あなたらしさを輝かせて。', items: [
      ['赤', 'パンプス', '09_south_red-pump'],
      ['紫', 'バッグ', '09_south_purple-handbag'],
      ['ラベンダー', '香水瓶', '09_south_lavender-perfume'],
      ['ワインレッド', 'リップ', '09_south_wine-red-lipstick'],
      ['ボルドー', 'スカーフ', '09_south_bordeaux-scarf'],
      ['赤', 'ワンピース', '09_south_red-dress'],
      ['紫', 'サングラス', '09_south_purple-sunglasses'],
      ['ラベンダー', 'ポーチ', '09_south_lavender-pouch'],
      ['ボルドー', '万年筆', '09_south_bordeaux-fountain-pen']
    ] }
  };
});
