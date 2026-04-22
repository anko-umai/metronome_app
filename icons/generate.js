const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ICON_HTML = `<!DOCTYPE html>
<html><head><style>
* { margin:0; padding:0; }
body {
  width: 512px; height: 512px;
  background: #1a1a2e;
  display: flex; justify-content: center; align-items: center;
}
.icon {
  position: relative; width: 360px; height: 420px;
}
/* メトロノーム本体（三角形） */
.body-shape {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 140px solid transparent;
  border-right: 140px solid transparent;
  border-bottom: 340px solid #2a2a4e;
}
/* 底辺の太いライン */
.base {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 280px; height: 12px;
  background: #ff8c00; border-radius: 2px;
}
/* 振り子の軸（中心） */
.pivot {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  width: 16px; height: 16px;
  background: #ff8c00; border-radius: 50%;
}
/* 振り子の棒（斜め） */
.pendulum {
  position: absolute; top: 68px; left: 50%;
  width: 4px; height: 220px;
  background: #eee;
  transform-origin: top center;
  transform: translateX(-50%) rotate(20deg);
  border-radius: 2px;
}
/* 振り子のおもり */
.weight {
  position: absolute; top: 230px; left: 50%;
  width: 28px; height: 20px;
  background: #ff8c00;
  transform: translateX(-50%) rotate(20deg);
  border-radius: 3px;
  transform-origin: -130px -162px;
}
/* 目盛り */
.tick { position:absolute; background:#555; border-radius:1px; }
.t1 { top:130px; left:50%; width:2px; height:16px; transform:translateX(-50%); }
.t2 { top:140px; left:calc(50% - 30px); width:2px; height:12px; }
.t3 { top:140px; left:calc(50% + 30px); width:2px; height:12px; }
.t4 { top:155px; left:calc(50% - 55px); width:2px; height:12px; }
.t5 { top:155px; left:calc(50% + 55px); width:2px; height:12px; }
</style></head>
<body>
  <div class="icon">
    <div class="body-shape"></div>
    <div class="base"></div>
    <div class="tick t1"></div>
    <div class="tick t2"></div>
    <div class="tick t3"></div>
    <div class="tick t4"></div>
    <div class="tick t5"></div>
    <div class="pendulum"></div>
    <div class="pivot"></div>
    <div class="weight"></div>
  </div>
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
