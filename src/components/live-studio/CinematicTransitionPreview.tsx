/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Sliders,
  Tv,
  Smartphone,
  Eye,
  Layers,
  ArrowLeft,
  Check,
  Film,
  Zap,
  Flame,
  Feather,
  FastForward,
  Clock
} from 'lucide-react';

interface CinematicTransitionPreviewProps {
  onClose?: () => void;
  onApprove?: (presetConfig: any) => void;
}

export type MotionStylePreset = 'cinematic-spring' | 'broadcast-chyron' | 'ethereal-ambient' | 'dramatic-snap';

interface DemoVerse {
  book: string;
  chapter: number;
  verse: number;
  kjvText: string;
  manuscriptText: string;
  transliteration: string;
  language: 'Hebrew' | 'Greek';
}

const DEMO_VERSES: DemoVerse[] = [
  {
    book: 'John',
    chapter: 1,
    verse: 1,
    kjvText: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    manuscriptText: 'Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.',
    transliteration: 'En archē ēn ho Logos, kai ho Logos ēn pros ton Theon, kai Theos ēn ho Logos.',
    language: 'Greek'
  },
  {
    book: 'John',
    chapter: 1,
    verse: 2,
    kjvText: 'The same was in the beginning with God.',
    manuscriptText: 'οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν.',
    transliteration: 'Houtos ēn en archē pros ton Theon.',
    language: 'Greek'
  },
  {
    book: 'John',
    chapter: 1,
    verse: 3,
    kjvText: 'All things were made by him; and without him was not any thing made that was made.',
    manuscriptText: 'πάντα δι’ αὐτοῦ ἐγένετο, καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν ὃ γέγονεν.',
    transliteration: 'Panta di’ autou egeneto, kai chōris autou egeneto oude hen ho gegonen.',
    language: 'Greek'
  },
  {
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    kjvText: 'In the beginning God created the heaven and the earth.',
    manuscriptText: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃',
    transliteration: "B'reishit bara Elohim et hashamayim v'et ha'aretz.",
    language: 'Hebrew'
  },
  {
    book: 'Genesis',
    chapter: 1,
    verse: 3,
    kjvText: 'And God said, Let there be light: and there was light.',
    manuscriptText: 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי־אוֹר׃',
    transliteration: "Vayomer Elohim y'hi or vay'hi-or.",
    language: 'Hebrew'
  }
];

// ── Easing & Damped Spring Equations ──
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - clamp(x, 0, 1), 4);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - clamp(x, 0, 1), 3);
}

function easeInOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cinematicSpring(x: number): number {
  const t = clamp(x, 0, 1);
  if (t === 0) return 0;
  if (t === 1) return 1;
  // Natural cinematic damped harmonic spring: smooth luxurious rise, gentle crest, silky settle
  const decay = Math.exp(-5.5 * t);
  const oscillation = Math.cos(t * Math.PI * 2.1);
  return 1 - decay * oscillation;
}

export const CinematicTransitionPreview: React.FC<CinematicTransitionPreviewProps> = ({
  onClose,
  onApprove
}) => {
  // ── Preview Display Configurations ──
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [viewMode, setViewMode] = useState<'lower-third' | 'full-screen'>('lower-third');
  const [themeColor, setThemeColor] = useState<'white' | 'midnight' | 'obsidian' | 'angular-chyron' | 'royal-diamond'>('angular-chyron');
  const [displayLanguage, setDisplayLanguage] = useState<'kjv' | 'interlinear'>('kjv');
  const [motionPreset, setMotionPreset] = useState<MotionStylePreset>('cinematic-spring');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.25); // 0.25x slow-mo default
  const [bgChoice, setBgChoice] = useState<'church-sanctuary' | 'church-altar' | 'church-minister' | 'church-arena' | 'church-worship'>('church-sanctuary');

  // ── Verse Navigation State ──
  const [activeVerseIndex, setActiveVerseIndex] = useState<number>(0);
  const currentVerse = DEMO_VERSES[activeVerseIndex];

  // ── Animation Runtime State ──
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [approvedFeedback, setApprovedFeedback] = useState<boolean>(false);

  // References for Modern Church Stage Background Assets
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const churchImagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Continuous animation state refs (run at 60 FPS in requestAnimationFrame)
  const animStateRef = useRef({
    // Target vs Current Visibility (0 = fully off-canvas, 1 = fully on-canvas)
    visibility: 1.0,
    targetVisibility: 1.0,
    // Verse morph transition progress (0 -> 1 when verse changes)
    verseMorphProgress: 1.0,
    prevVerse: currentVerse,
    curVerse: currentVerse,
    // Specular sweep highlight across top edge
    specularSweepTime: 0,
    // Full screen zoom progress
    fsScale: 1.0,
    // Timestamps
    lastFrameTime: performance.now(),
    frameCount: 0,
    fpsTimer: performance.now()
  });

  // Preload Modern Church Stage Background Images
  useEffect(() => {
    const stageImages: Record<string, string> = {
      'church-sanctuary': '/church_main_sanctuary.jpg',
      'church-altar': '/church_altar.jpg',
      'church-minister': '/church_minister_stage.jpg',
      'church-arena': '/church_arena_stage.jpg',
      'church-worship': '/church_worship_stage.jpg',
    };

    const loadedMap: Record<string, HTMLImageElement> = {};
    Object.entries(stageImages).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      loadedMap[key] = img;
    });
    churchImagesRef.current = loadedMap;
  }, []);

  // Update target visibility
  useEffect(() => {
    animStateRef.current.targetVisibility = isVisible ? 1.0 : 0.0;
  }, [isVisible]);

  // Handle verse change with smooth cross-morph
  const changeVerse = useCallback((newIndex: number) => {
    const validIndex = (newIndex + DEMO_VERSES.length) % DEMO_VERSES.length;
    const s = animStateRef.current;
    s.prevVerse = DEMO_VERSES[activeVerseIndex];
    s.curVerse = DEMO_VERSES[validIndex];
    s.verseMorphProgress = 0.0; // Trigger kinetic morph from 0 -> 1
    s.specularSweepTime = 0.0;  // Trigger subtle sheen on card header
    setActiveVerseIndex(validIndex);
  }, [activeVerseIndex]);

  // Automated Sequence Loop
  useEffect(() => {
    if (!isLooping) return;
    const interval = setInterval(() => {
      setActiveVerseIndex((prev) => {
        const next = (prev + 1) % DEMO_VERSES.length;
        const s = animStateRef.current;
        s.prevVerse = DEMO_VERSES[prev];
        s.curVerse = DEMO_VERSES[next];
        s.verseMorphProgress = 0.0;
        s.specularSweepTime = 0.0;
        return next;
      });
    }, 4200);
    return () => clearInterval(interval);
  }, [isLooping]);

  // ── Main Canvas Render Loop (60 FPS Motion Graphics Engine) ──
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const s = animStateRef.current;
      const dt = Math.min(0.1, (now - s.lastFrameTime) / 1000); // delta time in seconds
      s.lastFrameTime = now;

      // Calculate Real FPS
      s.frameCount++;
      if (now - s.fpsTimer >= 1000) {
        setFps(s.frameCount);
        s.frameCount = 0;
        s.fpsTimer = now;
      }

      // Transition Speeds adjusted by user multiplier (luxurious broadcast pace)
      const speedFactor = speedMultiplier;
      const visSpeed = (motionPreset === 'broadcast-chyron' ? 2.0 : motionPreset === 'dramatic-snap' ? 2.4 : 1.35) * speedFactor;
      const morphSpeed = (motionPreset === 'ethereal-ambient' ? 1.0 : 1.35) * speedFactor;

      // 1. Step Visibility Towards Target
      if (s.visibility < s.targetVisibility) {
        s.visibility = Math.min(s.targetVisibility, s.visibility + dt * visSpeed);
      } else if (s.visibility > s.targetVisibility) {
        s.visibility = Math.max(s.targetVisibility, s.visibility - dt * visSpeed);
      }

      // 2. Step Verse Morph Progress Towards 1.0
      if (s.verseMorphProgress < 1.0) {
        s.verseMorphProgress = Math.min(1.0, s.verseMorphProgress + dt * morphSpeed);
      }

      // 3. Step Specular Sheen Progress
      s.specularSweepTime += dt * 0.9 * speedFactor;

      // ── Canvas Setup ──
      const isVert = aspectRatio === '9:16';
      const targetW = isVert ? 1080 : 1920;
      const targetH = isVert ? 1920 : 1080;

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.clearRect(0, 0, targetW, targetH);

      // ── Modern Church Stage & Altar Background Compositing ──
      const activeStageImg = churchImagesRef.current[bgChoice];
      if (activeStageImg && activeStageImg.complete && activeStageImg.naturalWidth > 0) {
        // High-fidelity cover scaling
        const imgW = activeStageImg.naturalWidth;
        const imgH = activeStageImg.naturalHeight;
        const scale = Math.max(targetW / imgW, targetH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = (targetW - drawW) / 2;
        const drawY = (targetH - drawH) / 2;

        ctx.drawImage(activeStageImg, drawX, drawY, drawW, drawH);

        // Stage lighting vignette & cinematic shadow for text readability
        const stageGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        stageGrad.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        stageGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.15)');
        stageGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = stageGrad;
        ctx.fillRect(0, 0, targetW, targetH);
      } else {
        // High-end dark auditorium fallback
        const darkGrad = ctx.createLinearGradient(0, 0, targetW, targetH);
        darkGrad.addColorStop(0, '#0c101d');
        darkGrad.addColorStop(0.5, '#070a12');
        darkGrad.addColorStop(1, '#030509');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(0, 0, targetW, targetH);
      }

      // ── Motion Graphics Calculation ──
      // Calculate Easing Curve Value
      let motionCurveVal = s.visibility;
      if (motionPreset === 'cinematic-spring') {
        motionCurveVal = cinematicSpring(s.visibility);
      } else if (motionPreset === 'broadcast-chyron') {
        motionCurveVal = easeOutQuart(s.visibility);
      } else if (motionPreset === 'ethereal-ambient') {
        motionCurveVal = easeInOutCubic(s.visibility);
      } else if (motionPreset === 'dramatic-snap') {
        motionCurveVal = easeOutCubic(s.visibility);
      }

      // Apply Global Opacity
      const masterAlpha = clamp(s.visibility, 0, 1);

      if (masterAlpha > 0.005) {
        ctx.save();
        ctx.globalAlpha = masterAlpha;

        // ════════════════════════════════════════════════════════
        // MODE A: LOWER-THIRD SCRIPTURE CHYRON (CINEMATIC MOTION)
        // ════════════════════════════════════════════════════════
        if (viewMode === 'lower-third') {
          const padX = isVert ? 48 : 72;
          const cardW = targetW;
          const minH = isVert ? 460 : 320;

          // Typography settings
          const isInterlinear = displayLanguage === 'interlinear';
          const primaryText = isInterlinear
            ? s.curVerse.transliteration
            : s.curVerse.kjvText;
          const secondaryText = isInterlinear ? s.curVerse.kjvText : '';

          const fontSize = isVert ? (primaryText.length > 150 ? 52 : 62) : (primaryText.length > 150 ? 54 : 64);
          const lineHeight = fontSize * 1.38;
          ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;

          // Inner card text padding & boundary containment
          const isSpecialCard = themeColor === 'angular-chyron' || themeColor === 'royal-diamond';
          const padTextX = themeColor === 'royal-diamond'
            ? padX + (isVert ? 120 : 140)
            : themeColor === 'angular-chyron'
            ? padX + (isVert ? 60 : 70)
            : padX;
          const safeRightPad = isSpecialCard ? (isVert ? 48 : 72) : padX;
          const maxTextW = targetW - padTextX - safeRightPad;

          const wrapText = (txt: string) => {
            const words = txt.split(/\s+/);
            const lines: string[] = [];
            let current = '';
            for (const w of words) {
              const test = current ? `${current} ${w}` : w;
              if (ctx.measureText(test).width > maxTextW && current) {
                lines.push(current);
                current = w;
              } else {
                current = test;
              }
            }
            if (current) lines.push(current);
            return lines;
          };

          const curLines = wrapText(primaryText);
          const headerH = isSpecialCard ? 85 : (isVert ? 120 : 100);
          const textBlockH = (curLines.length * lineHeight) + (secondaryText ? 70 : 0);
          const cardH = Math.max(minH, headerH + textBlockH + 60);

          // Kinetic Motion Position:
          // Fully in = targetH - cardH
          // Hidden off-canvas = targetH + 30
          const hiddenY = targetH + 40;
          const targetY = targetH - cardH;
          const currentY = hiddenY - (hiddenY - targetY) * motionCurveVal;

          ctx.translate(0, currentY);

          // 1. Draw Card Background & Badges by Selected Visual Style
          if (themeColor === 'angular-chyron') {
            // ══════════════════════════════════════════════════════════════
            // STYLE 1: ANGULAR BROADCAST CHYRON (from desktop card 1)
            // ══════════════════════════════════════════════════════════════
            // Parallelogram geometry
            const slant = isVert ? 36 : 52;
            const cardBodyH = cardH;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = -12;

            // Main Parallelogram Body Gradient: Church Broadcast Amber / Bronze
            const bodyGrad = ctx.createLinearGradient(0, 0, targetW, 0);
            bodyGrad.addColorStop(0, '#78350f');   // deep amber
            bodyGrad.addColorStop(0.35, '#b45309'); // vibrant bronze
            bodyGrad.addColorStop(0.7, '#d97706');  // warm golden bronze
            bodyGrad.addColorStop(1, '#92400e');   // rich copper

            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(slant, 0);
            ctx.lineTo(targetW, 0);
            ctx.lineTo(targetW, cardBodyH + 40);
            ctx.lineTo(0, cardBodyH + 40);
            ctx.closePath();
            ctx.fill();
            ctx.shadowColor = 'transparent';

            // Layered Bottom Silver/White Bevel Trim Bar - Stretched flush to extreme right
            const bottomTrimH = 16;
            const bottomTrimGrad = ctx.createLinearGradient(0, 0, targetW, 0);
            bottomTrimGrad.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
            bottomTrimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
            bottomTrimGrad.addColorStop(1, 'rgba(203, 213, 225, 0.95)');
            ctx.fillStyle = bottomTrimGrad;
            ctx.beginPath();
            ctx.moveTo(0, cardBodyH - bottomTrimH);
            ctx.lineTo(targetW, cardBodyH - bottomTrimH);
            ctx.lineTo(targetW, cardBodyH);
            ctx.lineTo(0, cardBodyH);
            ctx.closePath();
            ctx.fill();

            // Diagonal Ventilation Slit Accents on Left Flank
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            for (let i = 0; i < 3; i++) {
              const slitX = 42 + i * 22;
              ctx.beginPath();
              ctx.moveTo(slitX + 14, 28);
              ctx.lineTo(slitX + 22, 28);
              ctx.lineTo(slitX + 10, cardBodyH - bottomTrimH - 24);
              ctx.lineTo(slitX + 2, cardBodyH - bottomTrimH - 24);
              ctx.closePath();
              ctx.fill();
            }

            // Diagonal Ventilation Slit Accents on Right Bottom Flank
            for (let i = 0; i < 3; i++) {
              const rSlitX = targetW - 130 + i * 22;
              ctx.beginPath();
              ctx.moveTo(rSlitX + 12, cardBodyH - bottomTrimH - 32);
              ctx.lineTo(rSlitX + 20, cardBodyH - bottomTrimH - 32);
              ctx.lineTo(rSlitX + 10, cardBodyH - bottomTrimH - 10);
              ctx.lineTo(rSlitX + 2, cardBodyH - bottomTrimH - 10);
              ctx.closePath();
              ctx.fill();
            }

            // Top Floating Parallelogram Header Shelf (Enlarged Container)
            const shelfW = isVert ? 520 : 660;
            const shelfH = isVert ? 74 : 86;
            const shelfX = targetW - shelfW - 40;
            const shelfSlant = 32;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(shelfX + shelfSlant, -shelfH);
            ctx.lineTo(shelfX + shelfW, -shelfH);
            ctx.lineTo(shelfX + shelfW - shelfSlant, 0);
            ctx.lineTo(shelfX, 0);
            ctx.closePath();
            ctx.fill();

            // Large, Comfortable Reference Typography inside Top Shelf
            const refBadgeText = `${s.curVerse.book.toUpperCase()} ${s.curVerse.chapter}:${s.curVerse.verse}`;
            ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#78350f';
            ctx.textBaseline = 'middle';
            const refBadgeW = ctx.measureText(refBadgeText).width;
            ctx.fillText(refBadgeText, shelfX + shelfSlant + 28, -shelfH / 2);

            ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('• KJV', shelfX + shelfSlant + 28 + refBadgeW + 18, -shelfH / 2);
            ctx.restore();

          } else if (themeColor === 'royal-diamond') {
            // ══════════════════════════════════════════════════════════════
            // STYLE 2: ROYAL DIAMOND CAPSULE (from desktop card 2)
            // ══════════════════════════════════════════════════════════════
            const diamondSize = isVert ? 100 : 120;
            const diamondX = padX + 24;
            const diamondY = cardH * 0.48;
            const capsuleStartX = diamondX + 48;
            // Stretch right edge to the extreme right of the canvas screen with NO paddle
            const capsuleW = targetW - capsuleStartX;
            const capsuleH = cardH;

            // 1. Floating Secondary Shelf above capsule (Enlarged Container)
            const shelfW = isVert ? 540 : 680;
            const shelfH = isVert ? 74 : 86;
            const shelfX = capsuleStartX + 64;
            const shelfSlant = 30;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.beginPath();
            ctx.moveTo(shelfX + shelfSlant, -shelfH);
            ctx.lineTo(shelfX + shelfW, -shelfH);
            ctx.lineTo(shelfX + shelfW - shelfSlant, 0);
            ctx.lineTo(shelfX, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#4c1d95';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Large, Comfortable Reference Typography inside Shelf
            const refBadgeText = `${s.curVerse.book.toUpperCase()} ${s.curVerse.chapter}:${s.curVerse.verse}`;
            ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#4c1d95';
            ctx.textBaseline = 'middle';
            const royalRefW = ctx.measureText(refBadgeText).width;
            ctx.fillText(refBadgeText, shelfX + shelfSlant + 28, -shelfH / 2);

            ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#6b21a8';
            ctx.fillText('• KING JAMES', shelfX + shelfSlant + 28 + royalRefW + 20, -shelfH / 2);
            ctx.restore();

            // 2. Royal Purple/Violet Gradient Body - Flush to extreme right
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = -10;

            const purpleGrad = ctx.createLinearGradient(capsuleStartX, 0, targetW, 0);
            purpleGrad.addColorStop(0, '#581c87'); // deep purple
            purpleGrad.addColorStop(0.3, '#6b21a8'); // royal violet
            purpleGrad.addColorStop(0.7, '#7e22ce'); // vibrant violet
            purpleGrad.addColorStop(1, '#3b0764'); // dark terminal

            ctx.fillStyle = purpleGrad;
            ctx.beginPath();
            ctx.fillRect(capsuleStartX, 0, capsuleW, capsuleH + 40);
            ctx.shadowColor = 'transparent';

            // High-gloss top highlight sheen - Flush to extreme right
            const topSheenGrad = ctx.createLinearGradient(capsuleStartX, 0, capsuleStartX, (capsuleH + 40) * 0.45);
            topSheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
            topSheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = topSheenGrad;
            ctx.fillRect(capsuleStartX, 0, capsuleW, (capsuleH + 40) * 0.45);
            ctx.fill();

            // 3. Anchored Left Rotated Diamond Badge (45 deg)
            ctx.save();
            ctx.translate(diamondX, diamondY);
            ctx.rotate(Math.PI / 4);

            // Diamond Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 4;

            // Outer metallic silver/white border
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-diamondSize / 2 - 4, -diamondSize / 2 - 4, diamondSize + 8, diamondSize + 8);

            // Diamond Royal Violet Core
            ctx.shadowColor = 'transparent';
            const diaGrad = ctx.createLinearGradient(-diamondSize / 2, -diamondSize / 2, diamondSize / 2, diamondSize / 2);
            diaGrad.addColorStop(0, '#7e22ce');
            diaGrad.addColorStop(1, '#4c1d95');
            ctx.fillStyle = diaGrad;
            ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);

            // Inner thin silver frame
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-diamondSize / 2 + 5, -diamondSize / 2 + 5, diamondSize - 10, diamondSize - 10);

            // Text inside diamond (unrotated)
            ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`v.${s.curVerse.verse}`, 0, 0);

            ctx.restore();
            ctx.restore();

          } else {
            // ══════════════════════════════════════════════════════════════
            // STANDARD MINIMALIST CARD (Clean White / Midnight / Dark)
            // ══════════════════════════════════════════════════════════════
            const bgFill = themeColor === 'white'
              ? '#ffffff'
              : themeColor === 'midnight'
              ? '#0c1427'
              : '#121217';

            // Card Shadow with Ambient Bloom
            ctx.shadowColor = themeColor === 'white' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = -15;

            ctx.fillStyle = bgFill;
            ctx.beginPath();
            ctx.roundRect(0, 0, cardW, cardH + 100, [isVert ? 24 : 32, isVert ? 24 : 32, 0, 0]);
            ctx.fill();
            ctx.shadowColor = 'transparent';

            // Specular Top Sheen Sweep
            if (s.specularSweepTime < 1.4) {
              const sweepX = (s.specularSweepTime / 1.4) * (cardW + 400) - 200;
              const sheenGrad = ctx.createLinearGradient(sweepX - 220, 0, sweepX + 220, 0);
              sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
              sheenGrad.addColorStop(0.5, themeColor === 'white' ? 'rgba(217, 119, 6, 0.45)' : 'rgba(255, 255, 255, 0.55)');
              sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
              ctx.fillStyle = sheenGrad;
              ctx.fillRect(0, 0, cardW, 4);
            } else {
              ctx.fillStyle = themeColor === 'white' ? 'rgba(217, 119, 6, 0.4)' : 'rgba(255, 255, 255, 0.12)';
              ctx.fillRect(0, 0, cardW, 3);
            }

            // Staggered Scripture Reference Pill Entrance
            const pillProgress = clamp(motionCurveVal * 1.15, 0, 1);
            const pillAlpha = clamp(pillProgress, 0, 1);
            const pillScale = 0.94 + 0.06 * pillProgress;

            ctx.save();
            ctx.globalAlpha = pillAlpha;
            ctx.translate(padX, isVert ? 34 : 28);
            ctx.scale(pillScale, pillScale);

            const refBadgeText = `${s.curVerse.book.toUpperCase()} ${s.curVerse.chapter}:${s.curVerse.verse}`;
            ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const badgeTextW = ctx.measureText(refBadgeText).width;
            const badgeW = badgeTextW + 36;
            const badgeH = 46;

            const badgeBg = themeColor === 'white'
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(245, 158, 11, 0.22)';
            ctx.fillStyle = badgeBg;
            ctx.beginPath();
            ctx.roundRect(0, 0, badgeW, badgeH, 12);
            ctx.fill();

            ctx.strokeStyle = themeColor === 'white' ? 'rgba(217, 119, 6, 0.45)' : 'rgba(245, 158, 11, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = themeColor === 'white' ? '#b45309' : '#fbbf24';
            ctx.fillText(refBadgeText, 18, 32);

            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = themeColor === 'white' ? '#64748b' : '#94a3b8';
            const transLabel = isInterlinear ? `${s.curVerse.language.toUpperCase()} INTERLINEAR` : 'KING JAMES VERSION';
            ctx.fillText(transLabel, badgeW + 18, 31);
            ctx.restore();
          }

          // 4. Kinetic In-Place Verse Cross-Morph
          const morphP = easeOutQuart(s.verseMorphProgress);
          const isMorphing = s.verseMorphProgress < 1.0;

          const textStartY = isSpecialCard
            ? (isVert ? 85 : 80)
            : headerH + 30;
          const textColor = themeColor === 'white' ? '#0f172a' : '#ffffff';

          ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;

          // If morphing, render outgoing previous verse gliding upward
          if (isMorphing && s.prevVerse) {
            ctx.save();
            const outAlpha = 1 - morphP;
            const outOffsetY = -24 * morphP;
            ctx.globalAlpha = clamp(outAlpha, 0, 1);
            ctx.translate(0, outOffsetY);
            ctx.fillStyle = textColor;

            const prevLines = wrapText(
              isInterlinear ? s.prevVerse.transliteration : s.prevVerse.kjvText
            );
            prevLines.forEach((line, idx) => {
              ctx.fillText(line, padTextX, textStartY + (idx * lineHeight));
            });
            ctx.restore();
          }

          // Render incoming new verse gliding into resting place
          ctx.save();
          const inAlpha = isMorphing ? morphP : 1.0;
          const inOffsetY = isMorphing ? (26 * (1 - morphP)) : 0;
          ctx.globalAlpha = clamp(inAlpha, 0, 1);
          ctx.translate(0, inOffsetY);
          ctx.fillStyle = textColor;

          curLines.forEach((line, idx) => {
            // Subtle per-line staggered entrance
            const lineLag = clamp((s.verseMorphProgress - (idx * 0.05)) / 0.8, 0, 1);
            const lineEase = easeOutCubic(lineLag);
            ctx.save();
            ctx.globalAlpha = inAlpha * lineEase;
            ctx.fillText(line, padTextX, textStartY + (idx * lineHeight));
            ctx.restore();
          });

          // Secondary Sub-text (Interlinear Translation if active)
          if (isInterlinear && secondaryText) {
            const subY = textStartY + (curLines.length * lineHeight) + 24;
            ctx.font = 'italic 500 36px "Georgia", serif';
            ctx.fillStyle = themeColor === 'white' ? '#475569' : '#cbd5e1';
            const subLines = wrapText(secondaryText);
            subLines.forEach((line, sIdx) => {
              ctx.fillText(`“${line}”`, padTextX, subY + (sIdx * 48));
            });
          }
          ctx.restore();
        }

        // ════════════════════════════════════════════════════════
        // MODE B: FULL-SCREEN SCRIPTURE CODEX (CINEMATIC MOTION)
        // ════════════════════════════════════════════════════════
        else {
          // Camera Zoom-Settle Effect: Starts slightly scaled up (1.025x) and settles to 1.0x
          const scaleProg = easeOutQuart(s.visibility);
          const currentScale = 1.03 - (0.03 * scaleProg);

          ctx.translate(targetW / 2, targetH / 2);
          ctx.scale(currentScale, currentScale);
          ctx.translate(-targetW / 2, -targetH / 2);

          // Solid Background with soft vignette
          const bgSolid = themeColor === 'white' ? '#ffffff' : '#080c16';
          ctx.fillStyle = bgSolid;
          ctx.fillRect(0, 0, targetW, targetH);

          const padX = isVert ? 56 : 96;
          const headerH = isVert ? 160 : 130;

          // 1. Sliding Top Header Bar
          const headerProgress = easeOutQuart(s.visibility);
          const headerOffsetY = -50 * (1 - headerProgress);

          ctx.save();
          ctx.translate(0, headerOffsetY);
          ctx.fillStyle = themeColor === 'white' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
          ctx.fillRect(0, 0, targetW, headerH);
          ctx.fillStyle = themeColor === 'white' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
          ctx.fillRect(0, headerH - 2, targetW, 2);

          // Book Title & Chapter
          ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = themeColor === 'white' ? '#0f172a' : '#f8fafc';
          ctx.fillText(`${s.curVerse.book.toUpperCase()} ${s.curVerse.chapter}`, padX, headerH * 0.62);

          // Translation Indicator
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#f59e0b';
          const headerBadge = displayLanguage === 'interlinear' ? 'ORIGINAL SCRIPT & TRANSLITERATION' : 'KING JAMES VERSION';
          const badgeRightW = ctx.measureText(headerBadge).width;
          ctx.fillText(headerBadge, targetW - padX - badgeRightW, headerH * 0.62);
          ctx.restore();

          // 2. Focused Center Verse Display with Ambient Radiance
          const contentY = headerH + (isVert ? 180 : 130);
          const morphP = easeOutQuart(s.verseMorphProgress);
          const isMorphing = s.verseMorphProgress < 1.0;

          ctx.save();
          const inOffsetY = isMorphing ? (30 * (1 - morphP)) : 0;
          ctx.translate(0, inOffsetY);

          // Verse Number Badge
          ctx.font = '900 32px monospace';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`VERSE ${s.curVerse.verse}`, padX, contentY - 30);

          // Primary Verse Text
          const fsFontSize = isVert ? 64 : 76;
          const fsLineHeight = fsFontSize * 1.45;
          ctx.font = `bold ${fsFontSize}px "Georgia", serif`;
          ctx.fillStyle = themeColor === 'white' ? '#0f172a' : '#faf6f0';

          const maxW = targetW - (padX * 2);
          const words = s.curVerse.kjvText.split(/\s+/);
          const lines: string[] = [];
          let cur = '';
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(test).width > maxW && cur) {
              lines.push(cur);
              cur = w;
            } else {
              cur = test;
            }
          }
          if (cur) lines.push(cur);

          lines.forEach((line, idx) => {
            const lineLag = clamp((s.verseMorphProgress - (idx * 0.06)) / 0.8, 0, 1);
            const lineEase = easeOutCubic(lineLag);
            ctx.save();
            ctx.globalAlpha = clamp(morphP * lineEase, 0, 1);
            ctx.fillText(line, padX, contentY + (idx * fsLineHeight));
            ctx.restore();
          });

          // Original Manuscript Line (Hebrew / Greek)
          if (s.curVerse.manuscriptText) {
            const msY = contentY + (lines.length * fsLineHeight) + 60;
            ctx.font = `500 ${isVert ? 44 : 54}px "Times New Roman", serif`;
            ctx.fillStyle = themeColor === 'white' ? '#475569' : '#cbd5e1';
            ctx.fillText(s.curVerse.manuscriptText, padX, msY);

            ctx.font = 'italic 34px "Georgia", serif';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(s.curVerse.transliteration, padX, msY + 54);
          }
          ctx.restore();
        }

        ctx.restore();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    aspectRatio,
    viewMode,
    themeColor,
    displayLanguage,
    motionPreset,
    speedMultiplier,
    bgChoice,
    activeVerseIndex
  ]);

  return (
    <div className="fixed inset-0 z-[3000] w-full h-full bg-[#0a0d14] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── Top Navigation & Diagnostic Bar ── */}
      <div className="shrink-0 h-14 sm:h-16 px-4 sm:px-6 border-b border-white/10 bg-[#0d121c]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Exit Preview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h1 className="text-sm sm:text-base font-black tracking-wide uppercase">
              Cinematic Motion Graphics Studio Preview
            </h1>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Isolated Sandbox
          </span>
        </div>

        {/* Live Metrics: FPS & Easing Curve */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/60">FPS:</span>
            <span className="font-bold text-white">{fps}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setApprovedFeedback(true);
              onApprove?.({
                motionPreset,
                speedMultiplier,
                themeColor,
                viewMode,
                aspectRatio
              });
              setTimeout(() => setApprovedFeedback(false), 2400);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {approvedFeedback ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Preset Approved!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Approve Motion Curve</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Work Area: Canvas Preview Display (Left) + Interactive Deck Controls (Right) ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Viewport Stage */}
        <div className="flex-1 bg-[#05070a] p-3 sm:p-6 flex flex-col items-center justify-center overflow-hidden relative">
          <div
            className={`relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 transition-all duration-300 flex items-center justify-center bg-black ${
              aspectRatio === '16:9'
                ? 'w-full max-w-4xl aspect-video max-h-[70vh]'
                : 'h-full max-h-[74vh] aspect-[9/16]'
            }`}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block select-none"
            />

            {/* Quick Canvas Overlay Pill */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold flex items-center gap-2">
              <span className="text-amber-400">{aspectRatio}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">{viewMode.toUpperCase()}</span>
              <span className="text-white/40">•</span>
              <span className="text-emerald-400">{motionPreset.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right: Tactile Control Deck & Motion Tuning Panels */}
        <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0e1320] p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* 1. Playback & Trigger Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
              <span>Trigger Actions</span>
              <span>Motion In/Out</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsVisible((prev) => !prev)}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                  isVisible
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isVisible ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isVisible ? 'Trigger Out (Exit)' : 'Trigger In (Enter)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLooping((prev) => !prev)}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                  isLooping
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{isLooping ? 'Stop Auto-Loop' : 'Auto-Loop Cycle'}</span>
              </button>
            </div>
          </div>

          {/* 2. Verse Cross-Morph Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
              <span>Kinetic Verse Morph</span>
              <span className="text-amber-400 font-bold">
                {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeVerse(activeVerseIndex - 1)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95 cursor-pointer"
                title="Previous Verse"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 grid grid-cols-5 gap-1">
                {DEMO_VERSES.map((v, i) => (
                  <button
                    key={`${v.book}-${v.verse}`}
                    type="button"
                    onClick={() => changeVerse(i)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeVerseIndex === i
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    v.{v.verse}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => changeVerse(activeVerseIndex + 1)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95 cursor-pointer"
                title="Next Verse"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. Motion Curves & Physical Models */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
              <span>Physics / Easing Curve</span>
              <span className="text-emerald-400 font-bold">{motionPreset}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMotionPreset('cinematic-spring')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  motionPreset === 'cinematic-spring'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cinematic Spring</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Damped natural harmonic overshoot</p>
              </button>

              <button
                type="button"
                onClick={() => setMotionPreset('broadcast-chyron')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  motionPreset === 'broadcast-chyron'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Broadcast Chyron</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Rapid 300ms Quart deceleration</p>
              </button>

              <button
                type="button"
                onClick={() => setMotionPreset('ethereal-ambient')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  motionPreset === 'ethereal-ambient'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                  <Feather className="w-3.5 h-3.5" />
                  <span>Ethereal Ambient</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Floating cross-fade & soft glide</p>
              </button>

              <button
                type="button"
                onClick={() => setMotionPreset('dramatic-snap')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  motionPreset === 'dramatic-snap'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Dramatic Snap</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Firm impactful stop & settle</p>
              </button>
            </div>
          </div>

          {/* 4. Speed & Slow-Motion Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
              <span>Inspection Speed</span>
              <span className="text-white font-bold">{speedMultiplier}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] font-bold">
              {[
                { label: '1.0x Real', val: 1.0 },
                { label: '0.5x Half', val: 0.5 },
                { label: '0.25x Slow', val: 0.25 },
                { label: '0.1x Micro', val: 0.1 }
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setSpeedMultiplier(s.val)}
                  className={`py-2 rounded-xl border transition-all cursor-pointer text-center ${
                    speedMultiplier === s.val
                      ? 'bg-white text-slate-950 font-black border-white'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Aspect Ratio & Mode Configuration */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-white/50 font-bold">
                Orientation
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    aspectRatio === '16:9'
                      ? 'bg-white text-slate-950 border-white font-black'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>16:9</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-white text-slate-950 border-white font-black'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-white/50 font-bold">
                Scripture Mode
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('lower-third')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    viewMode === 'lower-third'
                      ? 'bg-white text-slate-950 border-white font-black'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Lower 3rd</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('full-screen')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    viewMode === 'full-screen'
                      ? 'bg-white text-slate-950 border-white font-black'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Codex</span>
                </button>
              </div>
            </div>
          </div>

          {/* 6. Theme & Live Background Feed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-white/50 font-bold">
                Card Theme
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'angular-chyron', bg: '#f59e0b', label: 'Chyron' },
                  { id: 'royal-diamond', bg: '#8b5cf6', label: 'Royal' },
                  { id: 'white', bg: '#ffffff', label: 'Clean' },
                  { id: 'midnight', bg: '#0c1427', label: 'Navy' },
                  { id: 'obsidian', bg: '#121217', label: 'Dark' }
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setThemeColor(th.id as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      themeColor === th.id
                        ? 'border-amber-400 bg-white/20 text-white font-black'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-black/20"
                      style={{ backgroundColor: th.bg }}
                    />
                    <span>{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-white/50 font-bold">
                Background Feed
              </span>
              <select
                value={bgChoice}
                onChange={(e) => setBgChoice(e.target.value as any)}
                className="w-full py-2 px-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="church-sanctuary" className="bg-[#0e1320]">Megachurch Sanctuary & Altar</option>
                <option value="church-altar" className="bg-[#0e1320]">Modern Illuminated Altar & Cross</option>
                <option value="church-minister" className="bg-[#0e1320]">Minister at Pulpit Stage</option>
                <option value="church-arena" className="bg-[#0e1320]">Arena Stage with LED Walls</option>
                <option value="church-worship" className="bg-[#0e1320]">Contemporary Worship Stage</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
