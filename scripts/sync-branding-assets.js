import fs from 'fs';
import path from 'path';

const sourceLogo = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_sacred_crest_1780920352594.png');
const androidResPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

const mipmapDirs = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

if (fs.existsSync(sourceLogo)) {
  console.log('Found Sacred Crest branding logo at:', sourceLogo);
  
  // 1. Overwrite public/PWA assets
  const pwaTargets = [
    path.join(process.cwd(), 'public', 'icon-192.png'),
    path.join(process.cwd(), 'public', 'icon-512.png'),
    path.join(process.cwd(), 'public', 'favicon.ico')
  ];
  
  for (const target of pwaTargets) {
    fs.copyFileSync(sourceLogo, target);
    console.log(`Updated assets target: ${target}`);
  }

  // 2. Overwrite Android Launcher mipmap assets
  if (fs.existsSync(androidResPath)) {
    for (const dirName of mipmapDirs) {
      const dirPath = path.join(androidResPath, dirName);
      if (fs.existsSync(dirPath)) {
        const filesToReplace = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];
        for (const fileName of filesToReplace) {
          const targetFile = path.join(dirPath, fileName);
          fs.copyFileSync(sourceLogo, targetFile);
          console.log(`Updated Android Launcher target: ${targetFile}`);
        }
      }
    }

    // 3. Overwrite Android Splash Screen drawable image
    const splashPath = path.join(androidResPath, 'drawable', 'splash.png');
    if (fs.existsSync(path.dirname(splashPath))) {
      fs.copyFileSync(sourceLogo, splashPath);
      console.log(`Updated Android Splash target: ${splashPath}`);
    }
  } else {
    console.log('Android resource directories do not exist, skipping android mipmap update.');
  }

  console.log('🎉 Android and PWA branding icons successfully synchronized!');
} else {
  console.error('CRITICAL: Source Sacred Crest logo does not exist in the assets directory.');
}
