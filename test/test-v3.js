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

// ===== 付点音符ボタン =====
async function testDottedButtons() {
  results.push('\n[付点ボタン UI]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const dottedNotes = await page.$$('.note-add-btn.dotted');
  assert(dottedNotes.length === 3, '付点音符ボタンが3つ');

  const dottedRests = await page.$$('.rest-add-btn.dotted');
  assert(dottedRests.length === 3, '付点休符ボタンが3つ');

  const durations = await page.$$eval('.note-add-btn.dotted', btns =>
    btns.map(b => parseFloat(b.dataset.duration))
  );
  assert(durations.includes(3), '付点2分ボタン (duration=3) あり');
  assert(durations.includes(1.5), '付点4分ボタン (duration=1.5) あり');
  assert(durations.includes(0.75), '付点8分ボタン (duration=0.75) あり');
}

// ===== 付点音符追加 =====
async function testDottedNoteAdd() {
  results.push('\n[付点音符 パターン追加]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点4分 (1.5拍) + 8分 (0.5拍) + 付点4分 (1.5拍) + 8分 (0.5拍) = 4拍
  await page.click('.note-add-btn.dotted[data-duration="1.5"]');
  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('2.5'), '付点4分追加後、残り2.5拍');

  await page.click('.note-add-btn[data-duration="0.5"]');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('2'), '8分追加後、残り2拍');

  await page.click('.note-add-btn.dotted[data-duration="1.5"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点4分+8分 x2 で小節完成');

  // SVGに付点(小さな丸)が描画されているか
  const circles = await page.$$eval('#staff circle', els => els.length);
  assert(circles >= 2, 'SVGに付点(circle)が2つ以上描画');
}

// ===== 付点休符 =====
async function testDottedRest() {
  results.push('\n[付点休符]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点4分音符 (1.5) + 付点4分休符 (1.5) + 4分音符 (1) = 4拍
  await page.click('.note-add-btn.dotted[data-duration="1.5"]');
  await page.click('.rest-add-btn.dotted[data-duration="1.5"]');
  await page.click('.note-add-btn[data-duration="1"]');

  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点音符+付点休符+音符で小節完成');

  // SVGに休符のpath要素がある
  const paths = await page.$$eval('#staff path', els => els.length);
  assert(paths >= 1, 'SVGに付点休符シェイプが描画');
}

// ===== 付点2分音符 =====
async function testDottedHalf() {
  results.push('\n[付点2分音符]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点2分 (3拍) + 4分 (1拍) = 4拍
  await page.click('.note-add-btn.dotted[data-duration="3"]');
  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('1'), '付点2分追加後、残り1拍');

  await page.click('.note-add-btn[data-duration="1"]');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点2分+4分で小節完成');

  // 白抜き符頭 (fill=none) があるか
  const hollowHead = await page.$$eval('#staff ellipse', els =>
    els.some(e => e.getAttribute('fill') === 'none')
  );
  assert(hollowHead, '付点2分の白抜き符頭がSVGに描画');
}

// ===== 付点8分音符 =====
async function testDottedEighth() {
  results.push('\n[付点8分音符]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 4拍分: (付点8分 0.75 + 16分 0.25) x 4 = 4拍
  for (let i = 0; i < 4; i++) {
    await page.click('.note-add-btn.dotted[data-duration="0.75"]');
    await page.click('.note-add-btn[data-duration="0.25"]');
  }

  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点8分+16分 x4 で小節完成');

  // ビーム(rect)が描画されるか
  const rects = await page.$$eval('#staff rect', els => els.length);
  assert(rects >= 4, '付点8分+16分のビームが描画');
}

// ===== 付点リズムプリセット =====
async function testDottedPreset() {
  results.push('\n[付点リズム プリセット]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const presetBtn = await page.$('.preset-btn[data-preset="dotted-rhythm"]');
  assert(presetBtn !== null, '付点リズムプリセットボタンが存在');

  await page.click('.preset-btn[data-preset="dotted-rhythm"]');
  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '付点リズムプリセットで小節完成');

  // 再生テスト
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 600));
  const playing = await page.$eval('#play-btn', el => el.classList.contains('playing'));
  assert(playing, '付点リズムプリセットが再生可能');

  await page.click('#play-btn');
}

// ===== ボタン無効化 =====
async function testDisableLogic() {
  results.push('\n[付点ボタン 無効化ロジック]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 2分音符 (2拍) を追加 → 残り2拍
  await page.click('.note-add-btn[data-duration="2"]');

  // 付点2分 (3拍) は追加不可
  const dotHalfDisabled = await page.$eval('.note-add-btn.dotted[data-duration="3"]', el => el.disabled);
  assert(dotHalfDisabled, '残り2拍で付点2分(3拍)ボタンが無効');

  // 付点4分 (1.5拍) は追加可能
  const dotQtrEnabled = await page.$eval('.note-add-btn.dotted[data-duration="1.5"]', el => !el.disabled);
  assert(dotQtrEnabled, '残り2拍で付点4分(1.5拍)ボタンが有効');
}

// ===== JSエラーチェック =====
async function testNoErrors() {
  results.push('\n[JSエラーチェック]');

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 付点系の各種操作
  await page.click('.note-add-btn.dotted[data-duration="1.5"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('.rest-add-btn.dotted[data-duration="1.5"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#play-btn');
  await page.click('#clear-btn');
  await page.click('.preset-btn[data-preset="dotted-rhythm"]');
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#play-btn');

  assert(errors.length === 0, `付点操作でJSエラーなし (検出: ${errors.length}件)`);
}

// ===== ガイドページ =====
async function testGuideUpdate() {
  results.push('\n[ガイドページ 付点説明]');

  await page.goto(`${APP_URL}/guide.html`, { waitUntil: 'domcontentloaded' });

  const content = await page.$eval('.content-page', el => el.textContent);
  assert(content.includes('付点音符'), 'ガイドに付点音符の説明あり');
  assert(content.includes('1.5倍'), '1.5倍の説明あり');
  assert(content.includes('付点リズム'), 'プリセット表に付点リズムあり');
}

// ===== メイン =====
async function main() {
  results.push('==========================================');
  results.push(' V3 付点音符・付点休符 テスト結果');
  results.push('==========================================');

  try {
    await setup();
    await testDottedButtons();
    await testDottedNoteAdd();
    await testDottedRest();
    await testDottedHalf();
    await testDottedEighth();
    await testDottedPreset();
    await testDisableLogic();
    await testNoErrors();
    await testGuideUpdate();
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
