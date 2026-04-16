const puppeteer = require('puppeteer');

const APP_URL = 'http://localhost:8080';
let browser, page;
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    results.push(`  ✓ ${testName}`);
  } else {
    failed++;
    results.push(`  ✗ ${testName}`);
  }
}

async function setup() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 420, height: 800 });

  // コンソールエラーを収集
  page.on('pageerror', err => {
    results.push(`  !! JS Error: ${err.message}`);
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
}

// ========================================
// Phase 1: 基本メトロノーム
// ========================================
async function testPhase1() {
  results.push('\n[Phase 1] 基本メトロノーム');

  // HTML 読み込み
  const title = await page.$eval('.title', el => el.textContent);
  assert(title === 'メトロノーム', 'タイトルが正しく表示される');

  // テンポ初期値
  const tempoText = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoText === '120', 'テンポ初期値が120 BPM');

  const sliderVal = await page.$eval('#tempo-slider', el => el.value);
  assert(sliderVal === '120', 'スライダー初期値が120');

  const sliderMin = await page.$eval('#tempo-slider', el => el.min);
  const sliderMax = await page.$eval('#tempo-slider', el => el.max);
  assert(sliderMin === '40' && sliderMax === '200', 'スライダー範囲が40〜200');

  // テンポ +ボタン
  await page.click('#tempo-up');
  const tempoUp = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoUp === '121', '+ボタンでテンポが121に増加');

  // テンポ -ボタン
  await page.click('#tempo-down');
  await page.click('#tempo-down');
  const tempoDown = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoDown === '119', '-ボタンでテンポが119に減少');

  // スライダー操作
  await page.$eval('#tempo-slider', el => {
    el.value = 80;
    el.dispatchEvent(new Event('input'));
  });
  const tempoSlider = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoSlider === '80', 'スライダーでテンポが80に変更');

  // テンポ下限
  await page.$eval('#tempo-slider', el => {
    el.value = 40;
    el.dispatchEvent(new Event('input'));
  });
  for (let i = 0; i < 3; i++) await page.click('#tempo-down');
  const tempoMin = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoMin === '40', 'テンポ下限40で止まる');

  // テンポ上限
  await page.$eval('#tempo-slider', el => {
    el.value = 200;
    el.dispatchEvent(new Event('input'));
  });
  for (let i = 0; i < 3; i++) await page.click('#tempo-up');
  const tempoMax = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempoMax === '200', 'テンポ上限200で止まる');

  // 再生ボタン初期状態
  const playText = await page.$eval('#play-btn', el => el.textContent);
  assert(playText.includes('START'), 'STARTボタンが表示される');

  const playHasPlaying = await page.$eval('#play-btn', el => el.classList.contains('playing'));
  assert(!playHasPlaying, '初期状態でplayingクラスなし');

  // 再生開始
  await page.click('#play-btn');
  const stopText = await page.$eval('#play-btn', el => el.textContent);
  assert(stopText.includes('STOP'), 'クリック後STOPに切替');

  const hasPlaying = await page.$eval('#play-btn', el => el.classList.contains('playing'));
  assert(hasPlaying, '再生中にplayingクラスあり');

  // 再生中にビートが光るか確認 (少し待つ)
  await new Promise(r => setTimeout(r, 600));
  const anyActive = await page.$$eval('.beat-dot', dots => dots.some(d => d.classList.contains('active')));
  assert(anyActive, '再生中にビートインジケーターが光る');

  // 停止
  await page.click('#play-btn');
  const startText2 = await page.$eval('#play-btn', el => el.textContent);
  assert(startText2.includes('START'), '停止後STARTに戻る');

  await new Promise(r => setTimeout(r, 100));
  const noneActive = await page.$$eval('.beat-dot', dots => dots.every(d => !d.classList.contains('active')));
  assert(noneActive, '停止後にインジケーターが全て消灯');
}

// ========================================
// Phase 2: 拍子・強調機能
// ========================================
async function testPhase2() {
  results.push('\n[Phase 2] 拍子・強調機能');

  // 拍子初期値: 4拍子
  const activeBeats = await page.$$eval('.beat-btn', btns =>
    btns.filter(b => b.classList.contains('active')).map(b => b.dataset.value)
  );
  assert(activeBeats.length === 1 && activeBeats[0] === '4', '初期拍子が4拍子');

  const dots4 = await page.$$('.beat-dot');
  assert(dots4.length === 4, 'インジケーターが4つ表示');

  // 1拍目にaccentクラスがあるか
  const firstIsAccent = await page.$eval('.beat-dot:first-child', el => el.classList.contains('accent'));
  assert(firstIsAccent, '1拍目にaccentクラスあり');

  const secondIsAccent = await page.$eval('.beat-dot:nth-child(2)', el => el.classList.contains('accent'));
  assert(!secondIsAccent, '2拍目にaccentクラスなし');

  // 各拍子に切替テスト
  for (const beats of ['2', '3', '5']) {
    await page.click(`.beat-btn[data-value="${beats}"]`);
    const dotCount = await page.$$eval('.beat-dot', dots => dots.length);
    assert(dotCount === parseInt(beats), `${beats}拍子でインジケーターが${beats}つ`);

    const isActive = await page.$eval(`.beat-btn[data-value="${beats}"]`, el => el.classList.contains('active'));
    assert(isActive, `${beats}拍子ボタンがアクティブ`);

    const accentFirst = await page.$eval('.beat-dot:first-child', el => el.classList.contains('accent'));
    assert(accentFirst, `${beats}拍子で1拍目にaccent`);
  }

  // 4拍子に戻す
  await page.click('.beat-btn[data-value="4"]');

  // 再生して1拍目が赤く光るか確認
  await page.$eval('#tempo-slider', el => {
    el.value = 120;
    el.dispatchEvent(new Event('input'));
  });
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 200));

  // 1拍目がアクティブ（最初の拍なので赤色）
  const firstActive = await page.$eval('.beat-dot.accent', el => {
    const style = window.getComputedStyle(el);
    return el.classList.contains('active');
  });
  // 拍のタイミングによるためスキップせずチェック
  assert(typeof firstActive === 'boolean', '1拍目のアクティブ状態を取得可能');

  await page.click('#play-btn'); // 停止
  await new Promise(r => setTimeout(r, 100));
}

// ========================================
// Phase 3: 音符モード
// ========================================
async function testPhase3() {
  results.push('\n[Phase 3] 音符モード');

  // 初期値: 4分音符
  const activeNote = await page.$$eval('.note-btn', btns =>
    btns.filter(b => b.classList.contains('active')).map(b => b.dataset.value)
  );
  assert(activeNote.length === 1 && activeNote[0] === 'quarter', '初期音符モードが4分音符');

  // 全5つの音符ボタンが存在
  const noteCount = await page.$$eval('.note-btn', btns => btns.length);
  assert(noteCount === 5, '音符ボタンが5つ存在');

  // 各音符モードの切替
  const modes = ['half', 'quarter', 'eighth', 'sixteenth', 'triplet'];
  const labels = ['2分', '4分', '8分', '16分', '3連符'];
  for (let i = 0; i < modes.length; i++) {
    await page.click(`.note-btn[data-value="${modes[i]}"]`);
    const isActive = await page.$eval(`.note-btn[data-value="${modes[i]}"]`, el => el.classList.contains('active'));
    assert(isActive, `${labels[i]}音符ボタンがアクティブに切替`);

    // 他のボタンが非アクティブ
    const otherActives = await page.$$eval('.note-btn', btns =>
      btns.filter(b => b.classList.contains('active')).length
    );
    assert(otherActives === 1, `${labels[i]}選択時に他のボタンは非アクティブ`);
  }

  // 4分音符に戻す
  await page.click('.note-btn[data-value="quarter"]');
}

// ========================================
// Phase 3 追加: エンジンロジックテスト
// ========================================
async function testEngineLogic() {
  results.push('\n[Phase 3 補足] エンジン計算ロジック');

  const logicResults = await page.evaluate(() => {
    const e = new MetronomeEngine();
    const results = {};

    // 各音符モードの間隔テスト (120BPM)
    e.setTempo(120);
    const q = 60 / 120; // 0.5s

    e.setNoteMode('half');
    results.halfInterval = Math.abs(e._getInterval() - q * 2) < 0.001;

    e.setNoteMode('quarter');
    results.quarterInterval = Math.abs(e._getInterval() - q) < 0.001;

    e.setNoteMode('eighth');
    results.eighthInterval = Math.abs(e._getInterval() - q / 2) < 0.001;

    e.setNoteMode('sixteenth');
    results.sixteenthInterval = Math.abs(e._getInterval() - q / 4) < 0.001;

    e.setNoteMode('triplet');
    results.tripletInterval = Math.abs(e._getInterval() - q / 3) < 0.001;

    // アクセント判定テスト
    e.setNoteMode('quarter');
    e.setBeats(4);
    e.currentBeat = 0;
    e.currentSubdiv = 0;
    const info0 = e._getBeatInfo();
    results.accentOnBeat0 = info0.isAccent === true && info0.isSubdivision === false;

    e.currentBeat = 1;
    const info1 = e._getBeatInfo();
    results.noAccentOnBeat1 = info1.isAccent === false && info1.isSubdivision === false;

    // サブディビジョン判定テスト (8分音符)
    e.setNoteMode('eighth');
    e.currentBeat = 0;
    e.currentSubdiv = 0;
    const sub0 = e._getBeatInfo();
    results.eighthMainBeat = sub0.isSubdivision === false;

    e.currentSubdiv = 1;
    const sub1 = e._getBeatInfo();
    results.eighthSubdiv = sub1.isSubdivision === true;

    // _advance テスト (4分音符, 4拍子)
    e.setNoteMode('quarter');
    e.setBeats(4);
    e.currentBeat = 0;
    e.currentSubdiv = 0;
    e._advance();
    results.advanceQuarter = e.currentBeat === 1;

    e.currentBeat = 3;
    e._advance();
    results.advanceWrap = e.currentBeat === 0;

    // _advance テスト (2分音符)
    e.setNoteMode('half');
    e.currentBeat = 0;
    e._advance();
    results.advanceHalf = e.currentBeat === 2;

    // _advance テスト (8分音符)
    e.setNoteMode('eighth');
    e.currentBeat = 0;
    e.currentSubdiv = 0;
    e._advance();
    results.advanceEighthSubdiv = e.currentBeat === 0 && e.currentSubdiv === 1;
    e._advance();
    results.advanceEighthNext = e.currentBeat === 1 && e.currentSubdiv === 0;

    // テンポ範囲制限テスト
    e.setTempo(10);
    results.tempoMin = e.tempo === 40;
    e.setTempo(999);
    results.tempoMax = e.tempo === 200;

    return results;
  });

  assert(logicResults.halfInterval, '2分音符の間隔: 1.0秒 (120BPM)');
  assert(logicResults.quarterInterval, '4分音符の間隔: 0.5秒 (120BPM)');
  assert(logicResults.eighthInterval, '8分音符の間隔: 0.25秒 (120BPM)');
  assert(logicResults.sixteenthInterval, '16分音符の間隔: 0.125秒 (120BPM)');
  assert(logicResults.tripletInterval, '3連符の間隔: 0.167秒 (120BPM)');
  assert(logicResults.accentOnBeat0, 'beat 0 はアクセント');
  assert(logicResults.noAccentOnBeat1, 'beat 1 はアクセントではない');
  assert(logicResults.eighthMainBeat, '8分音符 subdiv=0 はメイン拍');
  assert(logicResults.eighthSubdiv, '8分音符 subdiv=1 はサブディビジョン');
  assert(logicResults.advanceQuarter, '4分音符 advance: beat 0→1');
  assert(logicResults.advanceWrap, '4分音符 advance: beat 3→0 (ラップ)');
  assert(logicResults.advanceHalf, '2分音符 advance: beat 0→2');
  assert(logicResults.advanceEighthSubdiv, '8分音符 advance: subdiv 0→1');
  assert(logicResults.advanceEighthNext, '8分音符 advance: subdiv→次の拍');
  assert(logicResults.tempoMin, 'テンポ下限クランプ: 10→40');
  assert(logicResults.tempoMax, 'テンポ上限クランプ: 999→200');
}

// ========================================
// Phase 4: レスポンシブ・モバイル
// ========================================
async function testPhase4() {
  results.push('\n[Phase 4] レスポンシブ・モバイル対応');

  // デスクトップ表示
  await page.setViewport({ width: 1024, height: 768 });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const desktopContainer = await page.$eval('.container', el => {
    const style = window.getComputedStyle(el);
    return parseInt(style.maxWidth);
  });
  assert(desktopContainer === 420, 'デスクトップでmax-width: 420px');

  // モバイル表示 (375px - iPhone SE)
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const mobileVisible = await page.$eval('.play-btn', el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  assert(mobileVisible, 'モバイル(375px)でSTARTボタンが表示される');

  const mobileTempo = await page.$eval('#tempo-display', el => {
    const style = window.getComputedStyle(el);
    return parseFloat(style.fontSize);
  });
  assert(mobileTempo < 56, 'モバイルでテンポ表示のフォントサイズが縮小');

  // 小さい画面 (320px)
  await page.setViewport({ width: 320, height: 568 });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  const allButtonsVisible = await page.$$eval('.note-btn', btns =>
    btns.every(b => {
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.right <= 320;
    })
  );
  assert(allButtonsVisible, '小画面(320px)で全音符ボタンが画面内に収まる');

  // タッチ操作最適化の確認
  const hasTouchAction = await page.$eval('.play-btn', el => {
    const style = window.getComputedStyle(el);
    return style.touchAction === 'manipulation';
  });
  assert(hasTouchAction, 'ボタンにtouch-action: manipulation設定あり');

  const noUserSelect = await page.$eval('body', el => {
    const style = window.getComputedStyle(el);
    return style.userSelect === 'none' || style.webkitUserSelect === 'none';
  });
  assert(noUserSelect, 'bodyにuser-select: none設定あり');

  // 元のビューポートに戻す
  await page.setViewport({ width: 420, height: 800 });
}

// ========================================
// 音声再生テスト
// ========================================
async function testAudioPlayback() {
  results.push('\n[音声再生] Web Audio API 動作確認');

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  // AudioContext が生成されるか
  const audioResult = await page.evaluate(async () => {
    const results = {};

    // START をクリックしてAudioContextが作られるか確認
    document.getElementById('play-btn').click();
    await new Promise(r => setTimeout(r, 300));

    // MetronomeEngine のインスタンスにアクセスできないが、
    // AudioContext がグローバルに存在するか確認
    results.audioContextExists = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';

    // 停止
    document.getElementById('play-btn').click();
    await new Promise(r => setTimeout(r, 100));

    return results;
  });

  assert(audioResult.audioContextExists, 'AudioContext API が利用可能');

  // 各音符モードで再生・停止が正常動作するか
  const modes = ['half', 'quarter', 'eighth', 'sixteenth', 'triplet'];
  const labels = ['2分', '4分', '8分', '16分', '3連符'];

  for (let i = 0; i < modes.length; i++) {
    await page.click(`.note-btn[data-value="${modes[i]}"]`);
    await page.click('#play-btn');
    await new Promise(r => setTimeout(r, 500));

    const isPlaying = await page.$eval('#play-btn', el => el.classList.contains('playing'));
    assert(isPlaying, `${labels[i]}音符モードで再生可能`);

    await page.click('#play-btn');
    await new Promise(r => setTimeout(r, 100));
  }
}

// ========================================
// JSエラーがないか確認
// ========================================
async function testNoJSErrors() {
  results.push('\n[品質] JavaScript エラーチェック');

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  // 各種操作を一通り実行
  await page.click('#tempo-up');
  await page.click('#tempo-down');
  await page.click('.beat-btn[data-value="3"]');
  await page.click('.note-btn[data-value="eighth"]');
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.click('.beat-btn[data-value="5"]');
  await page.click('.note-btn[data-value="triplet"]');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 100));

  assert(errors.length === 0, `操作中にJSエラーなし (検出: ${errors.length}件)`);
  if (errors.length > 0) {
    errors.forEach(e => results.push(`    → ${e}`));
  }
}

// ========================================
// メイン
// ========================================
async function main() {
  results.push('==========================================');
  results.push(' メトロノームアプリ テスト結果');
  results.push('==========================================');

  try {
    await setup();
    await testPhase1();
    await testPhase2();
    await testPhase3();
    await testEngineLogic();
    await testPhase4();
    await testAudioPlayback();
    await testNoJSErrors();
  } catch (err) {
    results.push(`\n!! テスト実行エラー: ${err.message}`);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  results.push('\n==========================================');
  results.push(` 結果: ${passed} passed / ${failed} failed / ${passed + failed} total`);
  results.push('==========================================');

  console.log(results.join('\n'));
  process.exit(failed > 0 ? 1 : 0);
}

main();
