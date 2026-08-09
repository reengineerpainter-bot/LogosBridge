import fs from 'fs';
import path from 'path';

const sourceLogo = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_logosbridge.png');

if (fs.existsSync(sourceLogo)) {
  console.log('Found Sacred Crest branding logo at:', sourceLogo);
  console.log('Note: Android and PWA assets are now generated securely via @capacitor/assets');
} else {
  console.error('CRITICAL: Source Sacred Crest logo does not exist in the assets directory.');
}
