/**
 * Dock & Reader Pill Architecture Integrity Verifier
 * Ensures UnifiedReaderDock remains isolated, imported, and strictly active in Scripture Read & Study views
 * (Clean Homepage per explicit user requirement: no dock/readerpill on Home tab)
 */

const fs = require('fs');
const path = require('path');

const dockPath = path.join(__dirname, '..', 'src', 'components', 'navigation', 'UnifiedReaderDock.tsx');
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');

let passed = true;

// 1. Verify UnifiedReaderDock.tsx exists and is isolated
if (!fs.existsSync(dockPath)) {
  console.error('❌ FAIL: src/components/navigation/UnifiedReaderDock.tsx does not exist!');
  passed = false;
} else {
  const content = fs.readFileSync(dockPath, 'utf8');
  if (!content.includes('export const UnifiedReaderDock')) {
    console.error('❌ FAIL: UnifiedReaderDock component export missing in UnifiedReaderDock.tsx');
    passed = false;
  } else if (!content.includes("mainView === 'home' || mainView === 'live'")) {
    console.error("❌ FAIL: UnifiedReaderDock must return null for 'home' and 'live' views!");
    passed = false;
  } else {
    console.log('✅ PASS: UnifiedReaderDock is intact and excludes Homepage/Live as specified.');
  }
}

// 2. Verify App.tsx imports and renders UnifiedReaderDock
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  if (!appContent.includes("from './components/navigation/UnifiedReaderDock'")) {
    console.error('❌ FAIL: App.tsx does not import UnifiedReaderDock');
    passed = false;
  } else if (!appContent.includes('<UnifiedReaderDock')) {
    console.error('❌ FAIL: App.tsx does not render <UnifiedReaderDock />');
    passed = false;
  } else {
    console.log('✅ PASS: App.tsx properly imports and renders <UnifiedReaderDock />');
  }

  // 3. Verify Homepage keeps dock hidden
  const hiddenMatch = appContent.match(/const isBottomControlsHidden = Boolean\(([\s\S]*?)\);/);
  if (hiddenMatch && !hiddenMatch[1].includes("mainView === 'home'")) {
    console.error("❌ FAIL: isBottomControlsHidden must contain \"mainView === 'home'\" to keep Homepage clean!");
    passed = false;
  } else {
    console.log('✅ PASS: isBottomControlsHidden cleanly excludes dock from Homepage tab.');
  }
}

if (!passed) {
  process.exit(1);
} else {
  console.log('🚀 ALL DOCK INTEGRITY CHECKS PASSED.');
}
