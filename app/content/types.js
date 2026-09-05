/*
 * 運命リズム診断 — 本質9タイプカード（正本）
 *
 * 文章はせいこさんの仕様書（2026-08-23）§5 を一言一句そのまま。勝手に書き換えない。
 * 肩書き・英語コードは 2026-08-26 のタイプカード画像（assets/type-cards-final/）の表記が最新の正本。
 * tenchijin: 天地人グループ。対応表はせいこさん確認待ち（null の間はUI非表示）。
 *   確定したら 'ten' | 'chi' | 'jin' を設定する。
 * color: 各タイプのカラーペア（main＋sub）。色名は2026-08-23せいこさん指示の方向性。
 *   hexは仮置き（完全固定ではない。モックを見ながら調整する）。
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.UR_TYPES = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    tenchijinLabels: { ten: '天', chi: '地', jin: '人' },
    types: {
      1: {
        name: '一白水星', code: 'THE FLOW', title: '静かに、流れを起こす人', tenchijin: null,
        color: { name: 'ミストグレー', main: { name: 'MIST GRAY', hex: '#aeb4b8' }, sub: { name: 'WHITE', hex: '#ffffff' } },
        catch: 'しなやかさは、あなたの才能。流れに乗るほど、道は自然にひらけていく。',
        essence: 'あなたは、目に見えるものだけでなく、その場の空気や人の気持ちまで自然に感じ取れる人。無理に前へ出なくても、流れを読みながら必要な場所へしなやかにたどり着けます。繊細さや柔らかさは弱さではなく、あなたが人生を軽やかに進めるための大切な才能です。'
      },
      2: {
        name: '二黒土星', code: 'THE NURTURE', title: '愛と豊かさを育む人', tenchijin: null,
        color: { name: 'モカベージュ', main: { name: 'MOCHA BEIGE', hex: '#c9ad8a' }, sub: { name: 'WARM BROWN', hex: '#8a5a3b' } },
        catch: 'あなたが丁寧に育てたものは、やがて大きな豊かさになって返ってくる。',
        essence: 'あなたは、人や物事をじっくり育てる力を持つ人。派手に結果を出すより、丁寧に積み重ねることで大きな豊かさを生み出していきます。誰かを支えたり、安心できる土台をつくったりすることも得意。あなたが大切に育てたものは、時間とともに大きな実りへ変わっていきます。'
      },
      3: {
        name: '三碧木星', code: 'THE SPARK', title: '新しい扉をひらく人', tenchijin: null,
        color: { name: 'クリアブルー', main: { name: 'CLEAR BLUE', hex: '#4aa8d8' }, sub: { name: 'LIME GREEN', hex: '#a8d158' } },
        catch: 'あなたのひらめきが、新しい流れのスイッチになる。',
        essence: 'あなたは、新しい風を起こす人。ひらめいたら動く、思いついたら試してみる。その軽やかな一歩が、周りの人や場まで動かしていきます。あなたの魅力は、考えすぎる前に未来へ向かえること。まだ誰も始めていないことに最初の火を灯すのが、あなたの役割です。'
      },
      4: {
        name: '四緑木星', code: 'THE BREEZE', title: 'つながりを運ぶ、風のような人', tenchijin: null,
        color: { name: 'ピスタチオグリーン', main: { name: 'PISTACHIO GREEN', hex: '#a9c1a1' }, sub: { name: 'IVORY', hex: '#f6f1e3' } },
        catch: '軽やかなご縁が、あなたを次の世界へ連れていく。',
        essence: 'あなたは、人と人、情報と情報、ご縁と未来を軽やかにつなぐ人。柔らかなコミュニケーション力と、相手に自然に合わせられるしなやかさがあります。あなたのもとには、人やチャンスが風のように集まってきます。心地よい流れをつくることが、あなた自身の運も大きく動かしていきます。'
      },
      5: {
        name: '五黄土星', code: 'THE CORE', title: '揺るがない核で、すべてを受けとめる人', tenchijin: null,
        color: { name: 'ゴールド', main: { name: 'GOLD', hex: '#c9a227' }, sub: { name: 'IMPERIAL YELLOW', hex: '#e6b422' } },
        catch: 'あなたが本気で決めた瞬間、止まっていた現実が動き始める。',
        essence: 'あなたは、強い存在感と大きなエネルギーを持つ人。あなたが本気で決めると、周りの人や現実まで動き始めます。物事の中心に立つことや、大きな変化を起こすことも本来の力。壊して終わるのではなく、必要なら一度すべてを組み替え、より強く豊かな世界をつくり直せる人です。'
      },
      6: {
        name: '六白金星', code: 'THE DIGNITY', title: '誇りと品格で、道を示す人', tenchijin: null,
        color: { name: 'パールホワイト', main: { name: 'PEARL WHITE', hex: '#f4f0e8' }, sub: { name: 'CHAMPAGNE GOLD', hex: '#d3bc8d' } },
        catch: 'あなたが自分の価値を認めるほど、ふさわしい世界が近づいてくる。',
        essence: 'あなたは、高い視点と美しい基準を持つ人。自分にも周りにも誠実で、「どうせならより良いものを」と自然に考えます。責任ある立場や、人を導く役割にも向いています。あなたが自分の価値を認め、堂々と立つほど、その姿が周りの人に安心と勇気を与えていきます。'
      },
      7: {
        name: '七赤金星', code: 'THE DELIGHT', title: '喜びを分かち合う人', tenchijin: null,
        color: { name: 'コーラルピンク', main: { name: 'CORAL PINK', hex: '#ef8a76' }, sub: { name: 'ORANGE', hex: '#ef8f3c' } },
        catch: 'あなたが楽しむことは、まわりの世界まで明るくする。',
        essence: 'あなたは、人生の楽しさや豊かさを人に思い出させる人。言葉、笑顔、華やかさ、会話のセンスなど、人の心を自然に開く魅力を持っています。頑張ることだけが前進ではありません。あなた自身が人生を楽しみ、喜びを受け取るほど、その明るさは周りにも広がっていきます。'
      },
      8: {
        name: '八白土星', code: 'THE SUMMIT', title: '節目を越え、次の頂へ進む人', tenchijin: null,
        color: { name: 'マホガニー', main: { name: 'MAHOGANY', hex: '#6c3b2a' }, sub: { name: 'IVORY', hex: '#f5efe2' } },
        catch: '今いる場所がゴールじゃない。あなたには、もう一段上の景色が待っている。',
        essence: 'あなたは、節目ごとに自分を大きく更新していく人。一つの山を越えると、また新しい景色を目指したくなる成長力があります。変化の前には一度立ち止まることもありますが、それは次のステージへ向かう準備期間。積み重ねてきた経験を力に変え、人生を一段ずつ高くしていける人です。'
      },
      9: {
        name: '九紫火星', code: 'THE RADIANCE', title: '輝きを放つ人', tenchijin: null,
        color: { name: 'ルビーレッド', main: { name: 'RUBY RED', hex: '#9b2335' }, sub: { name: 'DEEP WINE', hex: '#6b1f33' } },
        catch: 'あなたが輝くことを遠慮しないほど、未来はもっと華やかになる。',
        essence: 'あなたは、美しさや感性、本質を見抜く力を持つ人。人や物事の魅力を見つけ、それを光の当たる場所へ引き出すことができます。自分自身が輝くことにも遠慮はいりません。あなたが感性を隠さず表現するほど、その光は周りの人の可能性まで照らしていきます。'
      }
    }
  };
});
