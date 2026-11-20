const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'store_assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const masterLogo = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_logosbridge.png');

async function createStoreAssets() {
  console.log('Generating Google Play Store assets...');

  // 1. Google Play Store App Icon (512x512, opaque dark background #120e0b, centered emblem ~78% size)
  const iconSize = 512;
  const emblemSize = 400;
  const emblemBuf = await sharp(masterLogo)
    .trim()
    .resize(emblemSize, emblemSize, { fit: 'contain' })
    .toBuffer();
  const pad = Math.floor((iconSize - emblemSize) / 2);

  await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 18, g: 14, b: 11, alpha: 1 }
    }
  })
    .composite([{ input: emblemBuf, top: pad, left: pad }])
    .png()
    .toFile(path.join(outDir, 'google_play_icon_512x512.png'));

  console.log('Created: store_assets/google_play_icon_512x512.png');

  // 2. Google Play Feature Graphic (1024x500, no alpha)
  const fgWidth = 1024;
  const fgHeight = 500;
  const fgEmblemSize = 300;
  const fgEmblemBuf = await sharp(masterLogo)
    .trim()
    .resize(fgEmblemSize, fgEmblemSize, { fit: 'contain' })
    .toBuffer();

  const svgBanner = Buffer.from(`
    <svg width="${fgWidth}" height="${fgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#2c221a" />
          <stop offset="65%" stop-color="#16120f" />
          <stop offset="100%" stop-color="#0b0806" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <text x="470" y="215" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="#f8f4ee" letter-spacing="1">LogosBridge</text>
      <text x="470" y="260" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#d4af37" letter-spacing="2">BIBLE STUDY &amp; LIVE BROADCAST</text>
      <text x="470" y="305" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#b0a294">Greek &amp; Hebrew Interlinear • Live Lower Thirds • Discipleship</text>
    </svg>
  `);

  await sharp(svgBanner)
    .composite([{ input: fgEmblemBuf, top: 100, left: 110 }])
    .png()
    .toFile(path.join(outDir, 'google_play_feature_graphic_1024x500.png'));

  console.log('Created: store_assets/google_play_feature_graphic_1024x500.png');
}

createStoreAssets().catch((err) => {
  console.error('Asset creation error:', err);
  process.exit(1);
});
