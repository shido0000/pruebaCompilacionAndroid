const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const PAL = [
  { base: '#ff4d5e', light: '#ffb3ba', dark: '#c21830' },
  { base: '#ffa02e', light: '#ffd9a8', dark: '#c96a00' },
  { base: '#a0683c', light: '#dbb392', dark: '#6e421f' },
  { base: '#34d17b', light: '#a9f5c8', dark: '#149a4f' },
  { base: '#ffd23f', light: '#fff0b0', dark: '#c99500' },
  { base: '#ff7ab2', light: '#ffc6de', dark: '#e03a85' },
];

const DRAW = `
  function candyShape(ctx, id, s) {
    const h = s * 0.5;
    ctx.beginPath();
    if (id === 0) { ctx.arc(0, 0, h * 0.9, 0, Math.PI * 2); }
    else if (id === 1) { ctx.arc(0, -h * 0.1, h * 0.82, 0, Math.PI * 2); }
    else if (id === 2) { ctx.roundRect(-h * 0.8, -h * 0.8, h * 1.6, h * 1.6, h * 0.28); }
    else if (id === 3) { ctx.moveTo(0, -h); ctx.lineTo(h * 0.86, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.86, 0); ctx.closePath(); }
    else if (id === 4) {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? h : h * 0.42;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(0, h * 0.92);
      ctx.bezierCurveTo(-h * 1.0, h * 0.25, -h * 0.75, -h * 0.7, 0, -h * 0.3);
      ctx.bezierCurveTo(h * 0.75, -h * 0.7, h * 1.0, h * 0.25, 0, h * 0.92);
      ctx.closePath();
    }
  }

  function drawCandy(ctx, cx, cy, s, id) {
    const c = PAL[id];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#1d0b38';
    ctx.beginPath(); ctx.ellipse(s * 0.02, s * 0.06, s * 0.46, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (id === 1) {
      ctx.strokeStyle = '#5a2d0b'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, s * 0.2); ctx.lineTo(0, s * 0.62); ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    grad.addColorStop(0, c.light); grad.addColorStop(0.4, c.base); grad.addColorStop(1, c.dark);
    ctx.fillStyle = grad;
    candyShape(ctx, id, s);
    ctx.fill();
    ctx.lineWidth = s * 0.03; ctx.strokeStyle = c.dark; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(-s * 0.16, -s * 0.26, s * 0.16, s * 0.11, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render(size, opts) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (opts.background) {
      const g = ctx.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, '#6b3fae'); g.addColorStop(1, '#2c1466');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(size * 0.16, size * 0.14, size * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(size * 0.86, size * 0.9, size * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const dims = opts.foreground ? 0.42 : 0.5;
    const off = opts.foreground ? 0.02 : 0;
    for (let r = 0; r < 2; r++) {
      for (let cIdx = 0; cIdx < 3; cIdx++) {
        const x = size * (0.28 + cIdx * 0.22) + off * size;
        const y = size * (0.32 + r * 0.26) + off * size * 0.5;
        const s = size * dims * 0.46;
        drawCandy(ctx, x, y, s, r * 3 + cIdx);
      }
    }
    return canvas.toDataURL('image/png');
  }
`;

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c"></canvas>`);
  page.on('pageerror', (e) => { console.error('PAGEERROR:', e.message); });
  await page.evaluate(`(function (PAL) { ${DRAW} window.PAL = PAL; window.render = render; })(${JSON.stringify(PAL)})`);
  async function png(size, foreground) {
    return await page.evaluate(([sz, fg]) => render(sz, { background: !fg, foreground: fg }), [size, foreground]);
  }

  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const fgSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

  for (const [size, fg] of [[512, false], [192, false]]) {
    const buf = Buffer.from((await png(size, fg)).split(',')[1], 'base64');
    fs.writeFileSync(path.join(PUBLIC, `icon-${size}.png`), buf);
    console.log(`public/icon-${size}.png (${size}x${size})`);
  }

  for (const d of Object.keys(sizes)) {
    const buf = Buffer.from((await png(sizes[d], false)).split(',')[1], 'base64');
    fs.writeFileSync(path.join(RES, `mipmap-${d}`, 'ic_launcher.png'), buf);
    fs.writeFileSync(path.join(RES, `mipmap-${d}`, 'ic_launcher_round.png'), buf);
    const fg = Buffer.from((await png(fgSizes[d], true)).split(',')[1], 'base64');
    fs.writeFileSync(path.join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), fg);
    console.log(`mipmap-${d}: launcher ${sizes[d]}, round ${sizes[d]}, foreground ${fgSizes[d]}`);
  }

  const bgColor = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#3a1b6e</color>\n</resources>\n`;
  fs.writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'), bgColor);
  console.log('values/ic_launcher_background.xml -> #3a1b6e');

  await browser.close();
  console.log('OK');
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });