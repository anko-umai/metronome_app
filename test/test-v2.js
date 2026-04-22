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

// ===== ナビゲーション =====
async function testNavigation() {
  results.push('\n[ナビゲーション]');

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const navLinks = await page.$$eval('.nav-link', els => els.map(e => ({
    text: e.textContent, href: e.getAttribute('href'), active: e.classList.contains('active')
  })));
  assert(navLinks.length === 4, 'ナビリンクが4つ存在');
  assert(navLinks[0].active, 'メトロノームページがアクティブ');
  assert(navLinks[0].text === 'メトロノーム', 'メトロノームリンクのテキスト');

  // 各ページに遷移
  for (const path of ['rhythm.html', 'guide.html', 'tips.html', 'index.html']) {
    await page.goto(`${APP_URL}/${path}`, { waitUntil: 'domcontentloaded' });
    const hasNav = await page.$('.nav');
    assert(hasNav !== null, `${path} にナビゲーションあり`);
    const activeLink = await page.$eval('.nav-link.active', el => el.getAttribute('href'));
    assert(activeLink === path, `${path} で正しいリンクがアクティブ`);
  }
}

// ===== ガイドページ =====
async function testGuidePage() {
  results.push('\n[ガイドページ]');

  await page.goto(`${APP_URL}/guide.html`, { waitUntil: 'domcontentloaded' });
  const title = await page.$eval('.title', el => el.textContent);
  assert(title === '使い方ガイド', 'タイトルが正しい');

  const sections = await page.$$('.content-section');
  assert(sections.length >= 3, 'コンテンツセクションが3つ以上');

  const hasCallout = await page.$('.callout');
  assert(hasCallout !== null, 'コールアウトボックスあり');

  const hasTables = await page.$$('.info-table');
  assert(hasTables.length >= 2, '情報テーブルが2つ以上');
}

// ===== コツページ =====
async function testTipsPage() {
  results.push('\n[練習のコツページ]');

  await page.goto(`${APP_URL}/tips.html`, { waitUntil: 'domcontentloaded' });
  const title = await page.$eval('.title', el => el.textContent);
  assert(title === 'リズム練習のコツ', 'タイトルが正しい');

  const sections = await page.$$('.content-section');
  assert(sections.length >= 6, 'セクションが6つ以上');
}

// ===== リズムエディター: UI =====
async function testRhythmEditorUI() {
  results.push('\n[リズムエディター: UI]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const title = await page.$eval('.title', el => el.textContent);
  assert(title === 'リズムエディター', 'タイトルが正しい');

  // SVG五線譜
  const svg = await page.$('#staff');
  assert(svg !== null, 'SVG五線譜が存在');

  // テンポコントロール
  const tempo = await page.$eval('#tempo-display', el => el.textContent);
  assert(tempo === '120', 'テンポ初期値120');

  // 拍子ボタン
  const beatBtns = await page.$$('.beat-btn');
  assert(beatBtns.length === 4, '拍子ボタンが4つ');

  // 音符パレット
  const noteBtns = await page.$$('.note-add-btn');
  assert(noteBtns.length === 4, '音符ボタンが4つ');

  const restBtns = await page.$$('.rest-add-btn');
  assert(restBtns.length === 4, '休符ボタンが4つ');

  // プリセットボタン
  const presetBtns = await page.$$('.preset-btn');
  assert(presetBtns.length === 5, 'プリセットボタンが5つ');

  // 再生ボタン（初期は無効）
  const playDisabled = await page.$eval('#play-btn', el => el.disabled);
  assert(playDisabled, '再生ボタンが初期状態で無効');

  // 残り拍表示
  const remaining = await page.$eval('#remaining-display', el => el.textContent);
  assert(remaining.includes('4'), '残り4拍が表示');
}

// ===== リズムエディター: パターン操作 =====
async function testPatternOps() {
  results.push('\n[リズムエディター: パターン操作]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 4分音符を追加
  await page.click('.note-add-btn[data-duration="1"]');
  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('3'), '4分音符追加後、残り3拍');

  // SVGに音符が描画されたか
  let noteHeads = await page.$$eval('#staff ellipse', els => els.length);
  assert(noteHeads >= 1, 'SVGに音符（楕円）が描画');

  // もう3つ追加して小節を完成
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '小節完成メッセージ');

  // 再生ボタンが有効
  const playEnabled = await page.$eval('#play-btn', el => !el.disabled);
  assert(playEnabled, '小節完成後に再生ボタンが有効');

  // 追加ボタンが無効
  const addDisabled = await page.$eval('.note-add-btn[data-duration="1"]', el => el.disabled);
  assert(addDisabled, '小節完成後に音符ボタンが無効');

  // 削除
  await page.click('#delete-btn');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('1'), '削除後、残り1拍');

  // クリア
  await page.click('#clear-btn');
  rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('4'), 'クリア後、残り4拍');
}

// ===== リズムエディター: プリセット =====
async function testPresets() {
  results.push('\n[リズムエディター: プリセット]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const presets = [
    { name: 'basic-quarter', label: '基本4分' },
    { name: 'basic-eighth', label: '基本8分' },
    { name: 'sixteenth-eighth', label: '16分+8分' },
    { name: 'with-rests', label: '休符入り' },
    { name: 'syncopation', label: 'シンコペ' }
  ];

  for (const preset of presets) {
    await page.click(`.preset-btn[data-preset="${preset.name}"]`);
    const rem = await page.$eval('#remaining-display', el => el.textContent);
    assert(rem.includes('完成'), `${preset.label}プリセットで小節完成`);

    const noteCount = await page.$$eval('#staff ellipse', els => els.length);
    assert(noteCount >= 1 || preset.name === 'with-rests', `${preset.label}: SVGに音符あり`);

    const playEnabled = await page.$eval('#play-btn', el => !el.disabled);
    assert(playEnabled, `${preset.label}: 再生ボタンが有効`);
  }
}

// ===== リズムエディター: 休符 =====
async function testRests() {
  results.push('\n[リズムエディター: 休符]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.rest-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('.rest-add-btn[data-duration="1"]');

  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('完成'), '音符+休符の組み合わせで小節完成');

  // SVGに休符の要素が存在するか（path要素として描画）
  const paths = await page.$$eval('#staff path', els => els.length);
  assert(paths >= 1, 'SVGに休符シェイプ(path)が描画');
}

// ===== リズムエディター: 混合音符 =====
async function testMixedNotes() {
  results.push('\n[リズムエディター: 混合音符]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // 16分+8分の組み合わせを手動で作成
  await page.click('.note-add-btn[data-duration="0.25"]');
  await page.click('.note-add-btn[data-duration="0.25"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  let rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('3'), '16分x2+8分で1拍消費、残り3');

  // ビーム（連桁）が描画されているか
  const rects = await page.$$eval('#staff rect', els => els.length);
  assert(rects >= 1, 'ビーム(rect)がSVGに描画');
}

// ===== リズムエディター: 再生 =====
async function testPlayback() {
  results.push('\n[リズムエディター: 再生]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  // プリセット読み込み
  await page.click('.preset-btn[data-preset="basic-quarter"]');

  // 再生
  await page.click('#play-btn');
  const isPlaying = await page.$eval('#play-btn', el => el.classList.contains('playing'));
  assert(isPlaying, '再生中にplayingクラスあり');

  await new Promise(r => setTimeout(r, 600));

  // 再生中にハイライト
  const hasActive = await page.$$eval('#staff ellipse', els =>
    els.some(e => e.getAttribute('fill') === '#ff8c00' || e.getAttribute('stroke') === '#ff8c00')
  );
  assert(hasActive, '再生中にアクティブノートがハイライト');

  // 停止
  await page.click('#play-btn');
  const stopped = await page.$eval('#play-btn', el => !el.classList.contains('playing'));
  assert(stopped, '停止後にplayingクラスなし');

  // メトロノームON/OFF
  await page.click('#metronome-toggle');
  const toggleText = await page.$eval('#metronome-toggle', el => el.textContent);
  assert(toggleText.includes('OFF'), 'メトロノームOFF切替');

  await page.click('#metronome-toggle');
  const toggleText2 = await page.$eval('#metronome-toggle', el => el.textContent);
  assert(toggleText2.includes('ON'), 'メトロノームON切替');
}

// ===== リズムエディター: 拍子変更 =====
async function testBeatChange() {
  results.push('\n[リズムエディター: 拍子変更]');

  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  await page.click('.beat-btn[data-value="3"]');
  const rem = await page.$eval('#remaining-display', el => el.textContent);
  assert(rem.includes('3'), '3拍子に変更で残り3拍');

  const active = await page.$eval('.beat-btn[data-value="3"]', el => el.classList.contains('active'));
  assert(active, '3拍子ボタンがアクティブ');

  // 3拍追加で完成
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  await page.click('.note-add-btn[data-duration="1"]');
  const done = await page.$eval('#remaining-display', el => el.textContent);
  assert(done.includes('完成'), '3拍子で3拍追加して完成');
}

// ===== レスポンシブ =====
async function testResponsive() {
  results.push('\n[レスポンシブ]');

  // リズムページ モバイル
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });

  const staffVisible = await page.$eval('#staff', el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  assert(staffVisible, 'モバイルで五線譜が表示');

  const navVisible = await page.$eval('.nav', el => {
    const r = el.getBoundingClientRect();
    return r.width > 0;
  });
  assert(navVisible, 'モバイルでナビが表示');

  // ガイドページ モバイル
  await page.goto(`${APP_URL}/guide.html`, { waitUntil: 'domcontentloaded' });
  const guideVisible = await page.$eval('.content-section', el => {
    const r = el.getBoundingClientRect();
    return r.width > 0;
  });
  assert(guideVisible, 'モバイルでガイドコンテンツが表示');

  await page.setViewport({ width: 520, height: 900 });
}

// ===== JSエラーチェック =====
async function testNoErrors() {
  results.push('\n[JSエラーチェック]');

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // 全ページを巡回
  for (const path of ['index.html', 'rhythm.html', 'guide.html', 'tips.html']) {
    await page.goto(`${APP_URL}/${path}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 200));
  }

  // リズムエディターで各種操作
  await page.goto(`${APP_URL}/rhythm.html`, { waitUntil: 'domcontentloaded' });
  await page.click('.preset-btn[data-preset="sixteenth-eighth"]');
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#play-btn');
  await page.click('#clear-btn');
  await page.click('.beat-btn[data-value="5"]');
  await page.click('.note-add-btn[data-duration="0.5"]');
  await page.click('.rest-add-btn[data-duration="0.25"]');
  await page.click('#delete-btn');

  assert(errors.length === 0, `全ページ・操作でJSエラーなし (検出: ${errors.length}件)`);
  if (errors.length > 0) errors.forEach(e => results.push(`    → ${e}`));
}

// ===== メイン =====
async function main() {
  results.push('==========================================');
  results.push(' メトロノームアプリ V2 テスト結果');
  results.push('==========================================');

  try {
    await setup();
    await testNavigation();
    await testGuidePage();
    await testTipsPage();
    await testRhythmEditorUI();
    await testPatternOps();
    await testPresets();
    await testRests();
    await testMixedNotes();
    await testPlayback();
    await testBeatChange();
    await testResponsive();
    await testNoErrors();
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
