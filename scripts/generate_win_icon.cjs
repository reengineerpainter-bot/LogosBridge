const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('[Icon Generator] sharp is not installed; skipping Windows .ico generation on cloud/Linux platform.');
  process.exit(0);
}

async function generateWinIcon() {
  const sourcePath = path.join(__dirname, '..', 'src', 'assets', 'images', 'logo_logosbridge.png');
  const buildDir = path.join(__dirname, '..', 'build');
  const targetIco = path.join(buildDir, 'icon.ico');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  console.log('[Icon Generator] Resizing Sacred Crest logo for Windows .ico...');
  
  // High-fidelity standard Windows icon sizes
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  // Construct standard multi-resolution ICO binary
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = Icon
  header.writeUInt16LE(count, 4); // Count

  const dirEntries = [];
  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height (0 means 256)
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Image offset
    dirEntries.push(entry);
    offset += buf.length;
  }

  const finalIcoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buf)
  ]);

  fs.writeFileSync(targetIco, finalIcoBuffer);
  console.log(`[Icon Generator] Successfully generated Windows icon at: ${targetIco} (${finalIcoBuffer.length} bytes)`);

  // Also save in public/icon.ico for local browser/electron fallbacks
  const publicIco = path.join(__dirname, '..', 'public', 'icon.ico');
  fs.writeFileSync(publicIco, finalIcoBuffer);
}

generateWinIcon().catch(err => {
  console.warn('[Icon Generator] Non-fatal warning:', err.message);
  process.exit(0);
});
