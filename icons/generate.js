const puppeteer = require('puppeteer');
const path = require('path');

const ICON_HTML = `<!DOCTYPE html>
<html><head><style>
* { margin:0; padding:0; }
body {
  width: 512px; height: 512px;
  background: #1a1a2e;
  display: flex; justify-content: center; align-items: center;
}
svg { width: 380px; height: 420px; }
</style></head>
<body>
<svg viewBox="0 0 380 420" xmlns="http://www.w3.org/2000/svg">
  <!-- メトロノーム本体（台形） -->
  <path d="M 100,370 L 280,370 L 240,100 L 140,100 Z"
        fill="#2a2a4e" stroke="#3a3a5e" stroke-width="3"
        stroke-linejoin="round" />

  <!-- 底辺ベース -->
  <rect x="90" y="365" width="200" height="14" rx="3" fill="#ff8c00" />

  <!-- 前面パネル -->
  <rect x="158" y="130" width="64" height="200" rx="4"
        fill="#232345" stroke="#3a3a5e" stroke-width="1.5" />

  <!-- 目盛り線 -->
  <line x1="170" y1="160" x2="210" y2="160" stroke="#555" stroke-width="2" />
  <line x1="175" y1="185" x2="205" y2="185" stroke="#555" stroke-width="1.5" />
  <line x1="170" y1="210" x2="210" y2="210" stroke="#555" stroke-width="2" />
  <line x1="175" y1="235" x2="205" y2="235" stroke="#555" stroke-width="1.5" />
  <line x1="170" y1="260" x2="210" y2="260" stroke="#555" stroke-width="2" />
  <line x1="175" y1="285" x2="205" y2="285" stroke="#555" stroke-width="1.5" />
  <line x1="170" y1="310" x2="210" y2="310" stroke="#555" stroke-width="2" />

  <!-- 振り子の棒（上方向に伸びる、少し斜め） -->
  <line x1="190" y1="320" x2="215" y2="115"
        stroke="#eee" stroke-width="4.5" stroke-linecap="round" />

  <!-- 振り子のおもり（上部） -->
  <rect x="201" y="162" width="24" height="18" rx="4"
        fill="#ff8c00" transform="rotate(-73, 213, 171)" />

  <!-- 振り子の支点（下部） -->
  <circle cx="190" cy="320" r="8" fill="#ff8c00" />

  <!-- 頂部の三角飾り -->
  <path d="M 170,100 L 190,78 L 210,100"
        fill="#2a2a4e" stroke="#3a3a5e" stroke-width="2.5"
        stroke-linejoin="round" />
</svg>
</body></html>`;

async function generate() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const size of [192, 512]) {
    const p = await browser.newPage();
    await p.setViewport({ width: 512, height: 512, deviceScaleFactor: size / 512 });
    await p.setContent(ICON_HTML, { waitUntil: 'domcontentloaded' });
    const outPath = path.join(__dirname, `icon-${size}.png`);
    await p.screenshot({ path: outPath, type: 'png' });
    console.log(`Generated: ${outPath}`);
    await p.close();
  }

  await browser.close();
}

generate().catch(console.error);
