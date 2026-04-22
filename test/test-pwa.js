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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  page = await browser.newPage();
  page.on('pageerror', err => results.push(`  !! JS Error: ${err.message}`));
  await page.setViewport({ width: 420, height: 800 });
}

// ===== manifest.json =====
async function testManifest() {
  results.push('\n[manifest.json]');

  const res = await page.goto(`${APP_URL}/manifest.json`, { waitUntil: 'domcontentloaded' });
  assert(res.status() === 200, 'manifest.json が取得可能');

  const manifest = await res.json();
  assert(manifest.name && manifest.name.includes('メトロノーム'), 'nameにメトロノームを含む');
  assert(manifest.short_name === 'メトロノーム', 'short_nameが正しい');
  assert(manifest.start_url === './index.html', 'start_urlがindex.html');
  assert(manifest.display === 'standalone', 'displayがstandalone');
  assert(manifest.theme_color === '#1a1a2e', 'theme_colorが正しい');
  assert(manifest.background_color === '#1a1a2e', 'background_colorが正しい');

  assert(manifest.icons && manifest.icons.length >= 2, 'アイコンが2つ以上');
  const sizes = manifest.icons.map(i => i.sizes);
  assert(sizes.includes('192x192'), '192x192アイコンあり');
  assert(sizes.includes('512x512'), '512x512アイコンあり');
}

// ===== アイコンファイル =====
async function testIcons() {
  results.push('\n[アイコンファイル]');

  const res192 = await page.goto(`${APP_URL}/icons/icon-192.png`);
  assert(res192.status() === 200, 'icon-192.png が取得可能');
  const type192 = res192.headers()['content-type'];
  assert(type192 && type192.includes('png'), 'icon-192がPNG形式');

  const res512 = await page.goto(`${APP_URL}/icons/icon-512.png`);
  assert(res512.status() === 200, 'icon-512.png が取得可能');
}

// ===== Service Worker =====
async function testServiceWorker() {
  results.push('\n[Service Worker]');

  const res = await page.goto(`${APP_URL}/sw.js`, { waitUntil: 'domcontentloaded' });
  assert(res.status() === 200, 'sw.js が取得可能');

  const content = await res.text();
  assert(content.includes('install'), 'installイベントハンドラあり');
  assert(content.includes('activate'), 'activateイベントハンドラあり');
  assert(content.includes('fetch'), 'fetchイベントハンドラあり');
  assert(content.includes('caches'), 'Cache API使用あり');
  assert(content.includes('index.html'), 'index.htmlがキャッシュ対象');
  assert(content.includes('rhythm.html'), 'rhythm.htmlがキャッシュ対象');
  assert(content.includes('style.css'), 'style.cssがキャッシュ対象');
}

// ===== HTML meta/link タグ =====
async function testHTMLTags() {
  results.push('\n[HTML PWAタグ]');

  const pages = [
    { path: 'index.html', name: 'メインページ' },
    { path: 'rhythm.html', name: 'リズムエディター' },
    { path: 'guide.html', name: 'ガイド' },
    { path: 'tips.html', name: '練習のコツ' }
  ];

  for (const p of pages) {
    await page.goto(`${APP_URL}/${p.path}`, { waitUntil: 'domcontentloaded' });

    const hasManifest = await page.$('link[rel="manifest"]');
    assert(hasManifest !== null, `${p.name}: manifest linkあり`);

    const hasThemeColor = await page.$('meta[name="theme-color"]');
    assert(hasThemeColor !== null, `${p.name}: theme-color metaあり`);

    const hasAppleIcon = await page.$('link[rel="apple-touch-icon"]');
    assert(hasAppleIcon !== null, `${p.name}: apple-touch-icon linkあり`);

    const hasSW = await page.$$eval('script', scripts =>
      scripts.some(s => s.textContent.includes('serviceWorker'))
    );
    assert(hasSW, `${p.name}: SW登録スクリプトあり`);
  }
}

// ===== SW登録テスト =====
async function testSWRegistration() {
  results.push('\n[SW登録動作]');

  await page.goto(`${APP_URL}/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  assert(swRegistered, 'Service Workerが登録される');
}

// ===== JSエラーなし =====
async function testNoErrors() {
  results.push('\n[JSエラーチェック]');

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  for (const path of ['index.html', 'rhythm.html', 'guide.html', 'tips.html']) {
    await page.goto(`${APP_URL}/${path}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 300));
  }

  assert(errors.length === 0, `全ページでJSエラーなし (検出: ${errors.length}件)`);
}

// ===== メイン =====
async function main() {
  results.push('==========================================');
  results.push(' PWA対応 テスト結果');
  results.push('==========================================');

  try {
    await setup();
    await testManifest();
    await testIcons();
    await testServiceWorker();
    await testHTMLTags();
    await testSWRegistration();
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
