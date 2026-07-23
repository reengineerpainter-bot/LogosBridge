# Agent Development Guidelines

This file outlines project-specific rules, design requirements, and constraints for AI coding agents working on this application.

## 🚨 Critical Interaction Rule
- **Always describe proposed logic and state changes clearly to the user, and wait for their explicit approval or go-ahead before implementing the changes.** Do not auto-implement logic, refactors, or visual updates without prior verification from the user.

## 🎨 Layout and UI Guidelines
- Avoid cluttered or high-density overlay panels that might obstruct scripture text (such as popovers, slide-outs, or hover drawers near the top or bottom boundaries of lists).
- Keep lists clean, legible, and lightweight. Use micro-indicators rather than heavy menus.
- Ensure all responsive viewport ranges are optimized, particularly ensuring that interactive badges are easy to trigger on mobile/touch interfaces without obscuring adjacent text.
- **Verse Indicators**: Keep the verse number indicators simple, clean, and stationary. Do not use them as clickable badges or flash them aggressively, as it detracts from the professional typographic aesthetic.
- **Thematic Reflection Icons**: Place distinct study action buttons (such as the custom Starry List & Cradling Hand diary icon) directly underneath the stationary verse indicator, keeping interaction clear.
- **Vocal Speed Control**: Ensure audio playback speed controls (ranging from 0.5x to 1.5x) are integrated neatly as standard, lightweight inputs within the note-composing or theological diary study panels.
