const puppeteer = require('puppeteer');

const APP_URL = 'http://localhost:8080';
let browser, page;
let passed = 0, failed = 0;
const results = [];

function assert(cond, name) {
  if (cond) { passed++; results.push(`  ✓ ${name}`); }
  else { failed++; results.push(`  ✗ ${name}`); }
}

async function setup() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });
  page = await browser.newPage();
  page.on('pageerror', err => results.push(`  !! JS Error: ${err.message}`));
  await page.setViewport({ width: 520, height: 900 });
}

// ===== 付点トグルUI =====
async function testToggleUI() {
  results.push('\n[付点トグル UI]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const toggle = await page.$('#dotted-toggle');
  assert(toggle !== null, '付点トグルボタンが存在');

  const text = await page.$eval('#dotted-toggle', el => el.textContent);
  assert(text === '付点', '初期テキストが「付点」');

  const isActive = await page.$eval('#dotted-toggle', el => el.classList.contains('active'));
  assert(!isActive, '初期状態でactiveなし');

  // 別途付点ボタン行が消えたか確認
  const dottedBtns = await page.$$('.note-add-btn.dotted');
  assert(dottedBtns.length === 0, '旧付点音符ボタン行が存在しない');

  const dottedRestBtns = await page.$$('.rest-add-btn.dotted');
  assert(dottedRestBtns.length === 0, '旧付点休符ボタン行が存在しない');

  // 音符ボタンは4つだけ
  const noteBtns = await page.$$('.note-add-btn');
  assert(noteBtns.length === 4, '音符ボタンが4つ');

  const restBtns = await page.$$('.rest-add-btn');
  assert(restBtns.length === 4, '休符ボタンが4つ');
}

// ===== トグルON =====
async function testToggleOn() {
  results.push('\n[付点トグル ON]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  await page.click('#dotted-toggle');

  const text = await page.$eval('#dotted-toggle', el => el.textContent);
  assert(text === '付点 ON', 'ONでテキストが「付点 ON」');

  const isActive = await page.$eval('#dotted-toggle', el => el.classList.contains('active'));
  assert(isActive, 'ONでactiveクラスあり');

  // ボタンラベルが変わったか
  const labels = await page.$$eval('.note-add-btn', btns => btns.map(b => b.textContent));
  assert(labels.includes('2分.'), '2分ボタンが「2分.」に変化');
  assert(labels.includes('4分.'), '4分ボタンが「4分.」に変化');
  assert(labels.includes('8分.'), '8分ボタンが「8分.」に変化');

  const restLabels = await page.$$eval('.rest-add-btn', btns => btns.map(b => b.textContent));
  assert(restLabels.includes('2分休.'), '2分休ボタンが「2分休.」に変化');

  // 16分ボタンが無効
  const sixteenthDisabled = await page.$eval('.note-add-btn[data-duration="0.25"]', el => el.disabled);
  assert(sixteenthDisabled, '付点ON時に16分音符ボタンが無効');

  const sixteenthRestDisabled = await page.$eval('.rest-add-btn[data-duration="0.25"]', el => el.disabled);
  assert(sixteenthRestDisabled, '付点ON時に16分休符ボタンが無効');
}

// ===== トグルOFF =====
async function testToggleOff() {
  results.push('\n[付点トグル OFF]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // ON → OFF
  await page.click('#dotted-toggle');
  await page.click('#dotted-toggle');

  const text = await page.$eval('#dotted-toggle', el => el.textContent);
  assert(text === '付点', 'OFFでテキストが「付点」に戻る');

  const isActive = await page.$eval('#dotted-toggle', el => el.classList.contains('active'));
  assert(!isActive, 'OFFでactiveなし');

  // ラベルが戻ったか
  const labels = await page.$$eval('.note-add-btn', btns => btns.map(b => b.textContent));
  assert(labels.includes('2分'), '2分ボタンが「2分」に戻る');
  assert(labels.includes('16分'), '16分ボタンが「16分」に戻る');
}

// ===== 付点音符追加 =====
async function testDottedNoteAdd() {
  results.push('\n[付点ON時の音符追加]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点ONにする
  await page.click('#dotted-toggle');

  // 付点4分 (1.5拍) をクリック
  await page.click('.note-add-btn[data-duration="1"]');
  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('2.5'), '付点ON + 4分クリック → 1.5拍消費、残り2.5');

  // 付点OFF + 8分 (0.5拍)
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="0.5"]');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('2'), 'OFF + 8分 → 0.5拍消費、残り2');

  // 付点ON + 4分 (→1.5拍)
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="1"]');

  // OFF + 8分 (0.5拍)
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="0.5"]');

  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点4分+8分 x2 で小節完成');

  // SVGに付点ドットが描画
  const circles = await page.$$eval('#staff circle', els => els.length);
  assert(circles >= 2, 'SVGに付点ドットが描画');
}

// ===== 付点休符追加 =====
async function testDottedRestAdd() {
  results.push('\n[付点ON時の休符追加]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 音符 4分 (1拍)
  await page.click('.note-add-btn[data-duration="1"]');

  // 付点ON → 4分休 (→1.5拍)
  await page.click('#dotted-toggle');
  await page.click('.rest-add-btn[data-duration="1"]');

  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('1.5'), '付点ON + 4分休 → 1.5拍消費、残り1.5');

  // 付点OFF → 4分 (1拍) + 8分 (0.5拍)
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="0.5"]');

  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点休符混在パターンで小節完成');
}

// ===== 付点プリセット =====
async function testDottedPreset() {
  results.push('\n[付点リズムプリセット]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  await page.click('.preset-btn[data-preset="dotted-rhythm"]');
  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), 'プリセットで小節完成');

  // 再生可能
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));
  const playing = await page.$eval('#play-btn', el => el.classList.contains('playing'));
  assert(playing, '付点リズムが再生可能');
  await page.click('#play-btn');
}

// ===== ボタン無効化 =====
async function testDisableLogic() {
  results.push('\n[付点ON時の無効化ロジック]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 2分 (2拍) 追加 → 残り2拍
  await page.click('.note-add-btn[data-duration="2"]');

  // 付点ON
  await page.click('#dotted-toggle');

  // 付点2分 (3拍) は追加不可
  const halfDisabled = await page.$eval('.note-add-btn[data-duration="2"]', el => el.disabled);
  assert(halfDisabled, '残り2拍で付点2分(3拍)が無効');

  // 付点4分 (1.5拍) は追加可能
  const qtrEnabled = await page.$eval('.note-add-btn[data-duration="1"]', el => !el.disabled);
  assert(qtrEnabled, '残り2拍で付点4分(1.5拍)が有効');
}

// ===== JSエラーチェック =====
async function testNoErrors() {
  results.push('\n[JSエラーチェック]');

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // ON/OFF切替しながら操作
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('#dotted-toggle');
  await page.click('.rest-add-btn[data-duration="1"]');
  await page.click('#dotted-toggle');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 400));
  await page.click('#play-btn');
  await page.click('#clear-btn');
  await page.click('#dotted-toggle');
  await page.click('#dotted-toggle');
  await page.click('.preset-btn[data-preset="dotted-rhythm"]');

  assert(errors.length === 0, `全操作でJSエラーなし (検出: ${errors.length}件)`);
}

// ===== V2テスト互換 =====
async function testV2Compat() {
  results.push('\n[V2互換: 通常音符操作]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点OFF(デフォルト)で通常音符が動作する
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');

  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '通常4分x4で小節完成（従来動作維持）');

  const playEnabled = await page.$eval('#play-btn', el => !el.disabled);
  assert(playEnabled, '再生ボタンが有効');
}

// ===== メイン =====
async function main() {
  results.push('==========================================');
  results.push(' 付点トグル改修 テスト結果');
  results.push('==========================================');

  try {
    await setup();
    await testToggleUI();
    await testToggleOn();
    await testToggleOff();
    await testDottedNoteAdd();
    await testDottedRestAdd();
    await testDottedPreset();
    await testDisableLogic();
    await testNoErrors();
    await testV2Compat();
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
