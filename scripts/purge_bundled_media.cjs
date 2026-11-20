const fs = require('fs');
const path = require('path');

const MEDIA_EXTS = new Set(['.mp4', '.flv', '.mov', '.avi', '.mkv']);

function purgeDirMedia(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      purgeDirMedia(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (MEDIA_EXTS.has(ext)) {
        if (entry.name === 'let_there_be_light.mp4') {
          // Preserve startup experience video
          continue;
        }
        try {
          fs.unlinkSync(fullPath);
          console.log(`[Bundle Guard] Purged media file from bundle: ${entry.name}`);
        } catch {}
      }
    }
  }
}

// Clean dist and android assets
purgeDirMedia(path.join(process.cwd(), 'dist'));
purgeDirMedia(path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'public'));
