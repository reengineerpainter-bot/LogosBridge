# Bible Scholar - Chapter Preload Compiler Engine

This directory contains the automated scripture alignment and compilation pipeline. It allows you to pre-package and bundle **complete, multi-version chapters** for any Bible book so that they are instantly available offline (or without external API calls) within the application.

---

## 🚀 How It Works

The compile engine (`scripts/compile_offline.ts`) performs the following tasks:
1. **Scripture Alignment**: Fetches accurate verses for both the **King James Version (KJV)** and **World English Bible (WEB)** in parallel from the high-speed Public Domain Bible API.
2. **Translation Modernization**: Transforms standard texts into readable, flowy contemporary English for native readers.
3. **Linguistic Deep Study (Greek & Hebrew Roots)**: Automatically identifies key theological terms inside each verse and maps them to original manuscript words, active roots with transliterations (e.g. *Logos*, *Elohim*, *Agape*, *Ruach*), and student-friendly meanings.
4. **Interactive Non-Native English**: Formulates direct, active sentences explaining archaic idioms, and maps third-person divine elements to interactive personal study pronouns ("You", "Your").
5. **Output Writing**: Writes individual `.ts` module files inside `src/chapters/` and automatically consolidates the entire static Bible collection under `src/staticChapters.ts`.

---

## 🛠️ How to Preload New Chapters

To preload additional chapters of any of the 66 Books:

### Step 1: Add targets to the script
Open `/scripts/compile_offline.ts`, locate the `run()` function (around line 395), and edit or expand the `books` array to include your desired target:

```typescript
const books = [
  // Existing preloaded chapters
  { book: 'Genesis', chapter: 1, isOldTestament: true, filename: 'genesis1.ts', varName: 'GENESIS_1' },
  { book: 'John', chapter: 1, isOldTestament: false, filename: 'john1.ts', varName: 'JOHN_1' },
  
  // ADD YOUR NEW CHAPTERS HERE (Example: John 4)
  { book: 'John', chapter: 4, isOldTestament: false, filename: 'john4.ts', varName: 'JOHN_4' }
];
```

### Step 2: Run the compiler script
Run this command from the root of the project to fetch, align, and construct the typescript chapter modules:
```bash
npx tsx scripts/compile_offline.ts
```

### Step 3: Verify and Build
The script will fetch the scripture, align the verses, map Greek/Hebrew morphological keys, save the module files inside `src/chapters/john4.ts`, and automatically update your global preloaded state file (`src/staticChapters.ts`).

Build or start the app developer server to ensure the application builds successfully:
```bash
npm run build
```

The new preloaded chapters will now be integrated! Users can browse, search, and bookmark them completely offline.
