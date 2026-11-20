const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function syncAndroidMipmaps() {
  const masterTile = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_logosbridge.png');
  const resDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

  // Pre-trim the raw Bible emblem so there is 0% wasted margin
  const trimmedEmblemBuffer = await sharp(masterTile)
    .trim()
    .toBuffer();

  const sizes = {
    'mipmap-ldpi': 36,
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };

  for (const [folder, size] of Object.entries(sizes)) {
    const targetDir = path.join(resDir, folder);
    if (!fs.existsSync(targetDir)) continue;

    const icSquare = path.join(targetDir, 'ic_launcher.png');
    const icRound = path.join(targetDir, 'ic_launcher_round.png');
    const icBg = path.join(targetDir, 'ic_launcher_background.png');
    const icFg = path.join(targetDir, 'ic_launcher_foreground.png');

    // 1. ic_launcher_background.png (Deep Pure Black #000000)
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    }).png().toFile(icBg);

    // 2. ic_launcher_foreground.png (Trimmed Bible Emblem filling Android adaptive safe area ~72%)
    const innerSize = Math.max(16, Math.round(size * 0.72));
    const innerBuffer = await sharp(trimmedEmblemBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const pad = Math.floor((size - innerSize) / 2);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: innerBuffer, top: pad, left: pad }])
      .png()
      .toFile(icFg);

    // 3. ic_launcher.png (Full Tile with black background and centered Bible emblem)
    const squareInnerSize = Math.max(16, Math.round(size * 0.82));
    const squareInnerBuffer = await sharp(trimmedEmblemBuffer)
      .resize(squareInnerSize, squareInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const squarePad = Math.floor((size - squareInnerSize) / 2);

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{ input: squareInnerBuffer, top: squarePad, left: squarePad }])
      .png()
      .toFile(icSquare);

    // 4. ic_launcher_round.png (Circular Mask of Tile)
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/></svg>`
    );
    await sharp(icSquare)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(icRound);

    console.log(`Generated all icons in ${folder} (${size}x${size})`);
  }

  // Also synchronize assets/ folder if present
  const assetsIcon = path.join(process.cwd(), 'assets', 'icon.png');
  const assetsIconFg = path.join(process.cwd(), 'assets', 'icon-foreground.png');
  const assetsIconBg = path.join(process.cwd(), 'assets', 'icon-background.png');
  if (fs.existsSync(path.dirname(assetsIcon))) {
    await sharp(masterTile).resize(1024, 1024).png().toFile(assetsIcon);
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    }).png().toFile(assetsIconBg);
    const fgInner = await sharp(trimmedEmblemBuffer)
      .resize(720, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: fgInner, top: 152, left: 152 }])
      .png().toFile(assetsIconFg);
    console.log('Synchronized Capacitor root assets/ icon files');
  }

  console.log('All Android native launcher icons synchronized successfully with refactored Bible logo!');
}

syncAndroidMipmaps().catch(console.error);

