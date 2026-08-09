import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace left chevron
target_left = '''const modes: ('kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe')[] = ['kjv', 'bsb', 'asv', 'ylt', 'bbe'];
                      const currentIndex = modes.indexOf(translationDisplayMode as any);
                      const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
                      setTranslationDisplayMode(modes[prevIndex]);'''
repl_left = '''const modes: ('kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe')[] = ['kjv', 'bsb', 'asv', 'ylt', 'bbe'];
                      const currentMode = translationDisplayMode === 'both' ? (activeDualColumn === 'left' ? dualStreamLeft : dualStreamRight) : translationDisplayMode;
                      const currentIndex = modes.indexOf(currentMode as any);
                      const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
                      if (translationDisplayMode === 'both') {
                        if (activeDualColumn === 'left') setDualStreamLeft(modes[prevIndex] as any);
                        else setDualStreamRight(modes[prevIndex] as any);
                      } else {
                        setTranslationDisplayMode(modes[prevIndex]);
                      }'''

# Replace middle text
target_mid = '''const map: Record<string, string> = { kjv: 'King James Version', bsb: 'Berean Standard Bible', asv: 'American Standard Version', ylt: 'Youngs Literal Translation', bbe: 'Bible in Basic English', plain: 'Plain English Translation', personalized: 'Personalized Version', both: 'Dual Translations' };
                        return map[translationDisplayMode] || translationDisplayMode.toUpperCase();'''
repl_mid = '''const map: Record<string, string> = { kjv: 'King James Version', bsb: 'Berean Standard Bible', asv: 'American Standard Version', ylt: 'Youngs Literal Translation', bbe: 'Bible in Basic English' };
                        const currentMode = translationDisplayMode === 'both' ? (activeDualColumn === 'left' ? dualStreamLeft : dualStreamRight) : translationDisplayMode;
                        return map[currentMode] || currentMode.toUpperCase();'''

# Replace right chevron
target_right = '''const modes: ('kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe')[] = ['kjv', 'bsb', 'asv', 'ylt', 'bbe'];
                      const currentIndex = modes.indexOf(translationDisplayMode as any);
                      const nextIndex = (currentIndex + 1) % modes.length;
                      setTranslationDisplayMode(modes[nextIndex]);'''
repl_right = '''const modes: ('kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe')[] = ['kjv', 'bsb', 'asv', 'ylt', 'bbe'];
                      const currentMode = translationDisplayMode === 'both' ? (activeDualColumn === 'left' ? dualStreamLeft : dualStreamRight) : translationDisplayMode;
                      const currentIndex = modes.indexOf(currentMode as any);
                      const nextIndex = (currentIndex + 1) % modes.length;
                      if (translationDisplayMode === 'both') {
                        if (activeDualColumn === 'left') setDualStreamLeft(modes[nextIndex] as any);
                        else setDualStreamRight(modes[nextIndex] as any);
                      } else {
                        setTranslationDisplayMode(modes[nextIndex]);
                      }'''

code = code.replace(target_left, repl_left)
code = code.replace(target_mid, repl_mid)
code = code.replace(target_right, repl_right)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('App.tsx patched!')
