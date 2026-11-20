const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  if (fs.existsSync('.env')) {
    require('dotenv').config({ path: '.env' });
  } else if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
  }
} catch (e) {}

const { GoogleGenAI } = require('@google/genai');

const logFile = path.join(__dirname, '..', 'lexicon_enrichment_tier2.log');
const publicDir = path.join(__dirname, '..', 'public', 'data', 'lexicon');
const androidDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'data', 'lexicon');
const interlinearDir = path.join(__dirname, '..', 'public', 'data', 'interlinear');

// CLI Arguments
const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');

// Batch flag parsing: --batch=500 or --batch 500 or --batch (default: 500)
let batchSize = null;
const batchEq = args.find(a => a.startsWith('--batch='));
if (batchEq) {
  batchSize = parseInt(batchEq.split('=')[1], 10) || 500;
} else {
  const batchIdx = args.indexOf('--batch');
  if (batchIdx !== -1) {
    if (batchIdx + 1 < args.length && !args[batchIdx + 1].startsWith('--')) {
      batchSize = parseInt(args[batchIdx + 1], 10) || 500;
    } else {
      batchSize = 500;
    }
  }
}

// Concurrency flag parsing
const concurrencyArgIdx = args.indexOf('--concurrency');
const concurrencyEq = args.find(a => a.startsWith('--concurrency='));
let CONCURRENCY = 8;
if (concurrencyEq) {
  CONCURRENCY = parseInt(concurrencyEq.split('=')[1], 10) || 8;
} else if (concurrencyArgIdx !== -1 && args[concurrencyArgIdx + 1]) {
  CONCURRENCY = parseInt(args[concurrencyArgIdx + 1], 10) || 8;
} else if (isPilot) {
  CONCURRENCY = 4;
}

// Model flag parsing
const modelArgIdx = args.indexOf('--model');
const modelEq = args.find(a => a.startsWith('--model='));
let MODEL_NAME = 'gemini-3.6-flash';
if (modelEq) {
  MODEL_NAME = modelEq.split('=')[1];
} else if (modelArgIdx !== -1 && args[modelArgIdx + 1]) {
  MODEL_NAME = args[modelArgIdx + 1];
}

// Benchmark entries for pilot run
const GOLD_STANDARDS = ['H1254', 'H2617', 'G2889', 'G3004'];

for (const dir of [publicDir, androidDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + '\n');
  } catch (e) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reads all 66 canonical books from public/data/interlinear/*.json
 * and computes the total occurrence frequency for each Strong's number.
 */
function computeCorpusFrequencies() {
  log(`Scanning interlinear corpus in ${interlinearDir} to compute Strong's biblical frequencies...`);
  if (!fs.existsSync(interlinearDir)) {
    log(`[WARN] Interlinear directory ${interlinearDir} not found. Frequency ranking will be skipped.`);
    return {};
  }

  const files = fs.readdirSync(interlinearDir).filter(f => f.endsWith('.json'));
  const frequencies = {};
  const processedBooks = new Set();
  let totalWordCount = 0;

  for (const file of files) {
    try {
      const fullPath = path.join(interlinearDir, file);
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const bookName = (content.book || file).toLowerCase();

      // De-duplicate canonical books if both OSIS and long-name files exist
      if (processedBooks.has(bookName)) continue;
      processedBooks.add(bookName);

      if (!content.chapters) continue;
      for (const chKey of Object.keys(content.chapters)) {
        const ch = content.chapters[chKey];
        for (const vKey of Object.keys(ch)) {
          const verse = ch[vKey];
          if (!verse || !verse.words || !Array.isArray(verse.words)) continue;
          for (const w of verse.words) {
            totalWordCount++;
            let strongs = w.n || w.strongs;
            if (!strongs) continue;
            strongs = String(strongs).trim();
            frequencies[strongs] = (frequencies[strongs] || 0) + 1;
          }
        }
      }
    } catch (e) {}
  }

  log(`Frequencies computed across ${processedBooks.size} canonical books (${totalWordCount.toLocaleString()} total tokens, ${Object.keys(frequencies).length.toLocaleString()} unique Strong's numbers).`);
  return frequencies;
}

function buildPrompt(entry) {
  const isHebrew = entry.strongs.startsWith('H');
  const langContext = isHebrew
    ? 'For Hebrew: Contrast the word against Ancient Near Eastern pagan culture (Ugaritic, Akkadian, or Egyptian vassal treaties/rituals) and describe how biblical authors subverted or sanctified the concept.'
    : 'For Greek: Contrast classical Hellenistic/Stoic philosophical usage with early Christian apostolic revelation.';

  return `You are a world-class historical-grammatical and biblical theologian, textual linguist, and Ancient Near Eastern (ANE) / Greco-Roman scholar.
You are enriching an authoritative academic lexicon entry based on verified Tyndale House STEPBible data.

VERIFIED TYNDALE BASELINE ENTRY:
- Strong's: ${entry.strongs}
- Lemma: ${entry.lemma} (${entry.transliteration || ''})
- Root Word: ${entry.root_word || ''}
- Current Root Action: ${entry.root_action || ''}
- Part of Speech: ${entry.part_of_speech || ''}
- Lexical Definition: ${entry.lexical_definition || ''}

CRITICAL REQUIREMENT FOR "root_action":
Do NOT generate a single monolithic sentence or descriptive phrase.
"root_action" MUST strictly consist of 3 DISTINCT, COMPLEMENTARY NUANCE SYNONYMS that triangulate the ancient author's intent and bridge the gap to modern English.
Each synonym must capture a different legitimate dimension of the lemma/root in biblical discourse.
Separate the 3 synonyms with bullets (e.g. "Synonym 1 • Synonym 2 • Synonym 3") or provide as an array of 3 strings: ["Synonym 1", "Synonym 2", "Synonym 3"].

BENCHMARK EXAMPLES:
- G2889 (kosmos) ➔ "Structured Order • World-System • Adornment"
- G3056 (logos) ➔ "Expressed Reason • Divine Disclosure • Living Discourse"
- H1254 (bara) ➔ "Sovereign Origination • Divine Shaping • Unprecedented Generation"
- H2617 (chesed) ➔ "Covenant-Fidelity • Relational Loyalty • Unfailing Love"
- G3004 (lego) ➔ "Authoritative Declaration • Deliberate Affirmation • Systematic Speech"

BANNED: Never use raw transliterations, and never output a single flat KJV word like "the", "word", or "created".

MANDATORY OUTPUT JSON SCHEMA:
Return strictly valid JSON with no conversational text, preface, or markdown code fences:
{
  "root_action": ["Synonym 1", "Synonym 2", "Synonym 3"],
  "ane_historical_context": "2-3 dense sentences. ${langContext}",
  "writer_intent": "Exactly 2 sentences answering: Why did the biblical author deliberately choose this specific lemma over its synonyms, and what cognitive or covenantal response was demanded of the original listener?",
  "diachronic_evolution": {
    "stage_1_root_etymology": "1-2 sentences on original root derivation, proto-Semitic or ancient Greek base.",
    "stage_2_ot_ane_usage": "1-2 sentences on Old Testament and Bronze/Iron Age usage.",
    "stage_3_second_temple_lxx": "1-2 sentences on Septuagint (LXX) translation shifts and Second Temple Jewish literature.",
    "stage_4_nt_apostolic_fulfillment": "1-2 sentences on New Testament apostolic climax and the nuance gap compared to standard English/KJV translations."
  }
}`;
}

async function processEntry(ai, entry, workerId, progressInfo, maxRetries = 4) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const t0 = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: buildPrompt(entry),
        config: {
          responseMimeType: 'application/json'
        }
      });

      let raw = (response.text || '').trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      const enriched = JSON.parse(raw);

      // Validate required schema
      if (
        !enriched.ane_historical_context ||
        !enriched.writer_intent ||
        !enriched.diachronic_evolution ||
        !enriched.diachronic_evolution.stage_1_root_etymology ||
        !enriched.diachronic_evolution.stage_2_ot_ane_usage ||
        !enriched.diachronic_evolution.stage_3_second_temple_lxx ||
        !enriched.diachronic_evolution.stage_4_nt_apostolic_fulfillment
      ) {
        throw new Error('Incomplete schema returned by model');
      }

      // Parse & normalize 3-synonym root_action
      const BANNED_FLAT = ['the', 'word', 'created', 'say', 'speech', 'mercy', 'love', 'peace'];
      let refinedRootAction = entry.root_action;

      if (enriched.root_action) {
        let synonyms = [];
        if (Array.isArray(enriched.root_action)) {
          synonyms = enriched.root_action
            .map(s => String(s).trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else if (typeof enriched.root_action === 'string') {
          const delimiter = enriched.root_action.includes('•') ? '•' : (enriched.root_action.includes(';') ? ';' : ',');
          synonyms = enriched.root_action
            .split(delimiter)
            .map(s => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        }

        // Filter out banned single words
        synonyms = synonyms.filter(s => {
          const words = s.split(/\s+/);
          return !(words.length === 1 && BANNED_FLAT.includes(words[0].toLowerCase()));
        });

        if (synonyms.length >= 2) {
          refinedRootAction = synonyms.slice(0, 3).join(' • ');
        } else if (synonyms.length === 1 && !BANNED_FLAT.includes(synonyms[0].toLowerCase())) {
          refinedRootAction = synonyms[0];
        }
      }

      // Merge fields non-destructively, preserving all baseline data
      const merged = {
        strongs: entry.strongs,
        lemma: entry.lemma,
        transliteration: entry.transliteration,
        root_word: entry.root_word,
        root_action: refinedRootAction,
        part_of_speech: entry.part_of_speech,
        semantic_domain: entry.semantic_domain,
        lexical_definition: entry.lexical_definition,
        needs_enrichment: false,
        ane_historical_context: enriched.ane_historical_context,
        writer_intent: enriched.writer_intent,
        diachronic_evolution: enriched.diachronic_evolution
      };

      const filename = `${entry.strongs}.json`;
      const publicPath = path.join(publicDir, filename);
      const androidPath = path.join(androidDir, filename);

      fs.writeFileSync(publicPath, JSON.stringify(merged, null, 2), 'utf8');
      fs.writeFileSync(androidPath, JSON.stringify(merged, null, 2), 'utf8');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      const wordLabel = `${entry.strongs} ${entry.transliteration || entry.lemma || ''}`.trim();
      const occ = entry.frequency !== undefined ? entry.frequency : 0;
      log(`[Batch Progress: ${progressInfo.current}/${progressInfo.total}] (Word: ${wordLabel}, Occurrences: ${occ}) [Worker ${workerId}] Enriched in ${elapsed}s: "${merged.root_action}"`);
      return { success: true, strongs: entry.strongs, merged };

    } catch (err) {
      const errMsg = (err && (err.message || err.toString())) || '';
      const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
      const isTransient = errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('ECONNRESET') || errMsg.includes('ETIMEDOUT');

      if (attempt <= maxRetries && (isRateLimit || isTransient || errMsg.includes('Incomplete schema'))) {
        const backoffMs = Math.min(60000, Math.pow(2, attempt) * 2000 + Math.floor(Math.random() * 1000));
        log(`[Worker ${workerId}] [${entry.strongs}] Attempt ${attempt} failed (${errMsg.slice(0, 100)}). Backing off ${backoffMs / 1000}s...`);
        await sleep(backoffMs);
      } else {
        log(`[Batch Progress: ${progressInfo.current}/${progressInfo.total}] (Word: ${entry.strongs}) [Worker ${workerId}] FAILED permanently after ${attempt} attempts: ${errMsg}`);
        return { success: false, strongs: entry.strongs, error: errMsg };
      }
    }
  }
}

async function main() {
  log(`=== Tier 2 Semantic Enrichment Pipeline Starting ===`);
  log(`Target Model: ${MODEL_NAME} | Concurrency: ${CONCURRENCY} | Mode: ${isPilot ? 'PILOT (4 Benchmark Entries)' : (batchSize ? `BATCH (${batchSize} entries)` : 'FULL CORPUS')}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    log(`[FATAL] GEMINI_API_KEY is not defined in .env or .env.local.`);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Scan public/data/lexicon/
  const allFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.json'));
  log(`Total files in public/data/lexicon/: ${allFiles.length}`);

  let queue = [];
  let candidateList = [];

  if (isPilot) {
    for (const filename of allFiles) {
      const strongs = filename.replace('.json', '');
      if (GOLD_STANDARDS.includes(strongs)) {
        const fullPath = path.join(publicDir, filename);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          queue.push(content);
        } catch (e) {}
      }
    }
    queue.sort((a, b) => GOLD_STANDARDS.indexOf(a.strongs) - GOLD_STANDARDS.indexOf(b.strongs));
    log(`Pilot Queue initialized with ${queue.length} benchmark standards: ${queue.map(q => q.strongs).join(', ')}`);
  } else {
    // 1. Calculate biblical frequencies from all 66 books
    const frequencies = computeCorpusFrequencies();

    // 2. Collect all candidate files where needs_enrichment === true
    log(`Scanning lexicon entries for needs_enrichment === true...`);
    for (const filename of allFiles) {
      const fullPath = path.join(publicDir, filename);
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content && content.needs_enrichment === true) {
          content.frequency = frequencies[content.strongs] || 0;
          candidateList.push(content);
        }
      } catch (e) {}
    }

    log(`Total candidate files flagged with needs_enrichment === true: ${candidateList.length}`);

    // 3. Sort candidates descending by biblical frequency (highest occurrence first)
    candidateList.sort((a, b) => b.frequency - a.frequency);

    // 4. Slice batch if requested
    if (batchSize && batchSize > 0) {
      queue = candidateList.slice(0, batchSize);
      log(`Priority batch created with top ${queue.length} highest-frequency words (Top: [${queue[0].strongs}] ${queue[0].transliteration || queue[0].lemma} with ${queue[0].frequency} occurrences).`);
    } else {
      queue = candidateList;
      log(`Full priority queue initialized with ${queue.length} words sorted by biblical frequency.`);
    }
  }

  if (queue.length === 0) {
    log(`No candidate files to process. All done!`);
    return;
  }

  let currentIndex = 0;
  let completedCount = 0;
  let successCount = 0;
  let failCount = 0;
  const total = queue.length;
  const startTime = Date.now();

  async function worker(workerId) {
    while (true) {
      let item = null;
      let progressIndex = 0;
      if (currentIndex < queue.length) {
        progressIndex = ++currentIndex;
        item = queue[progressIndex - 1];
      }
      if (!item) break;

      const progressInfo = {
        current: progressIndex,
        total: total
      };

      const res = await processEntry(ai, item, workerId, progressInfo);
      if (res && res.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  const effectiveConcurrency = Math.min(CONCURRENCY, queue.length);
  log(`Spawning ${effectiveConcurrency} worker threads...`);

  const workers = [];
  for (let i = 1; i <= effectiveConcurrency; i++) {
    workers.push(worker(i));
  }

  await Promise.all(workers);

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`=== Batch Execution Finished in ${totalElapsed}s ===`);
  log(`Batch Processed: ${total} | Success: ${successCount} | Failed: ${failCount}`);

  // Re-scan remaining count
  let finalRemaining = 0;
  for (const filename of allFiles) {
    const fullPath = path.join(publicDir, filename);
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (content && content.needs_enrichment === true) {
        finalRemaining++;
      }
    } catch (e) {}
  }
  log(`Remaining candidate files awaiting enrichment across entire corpus: ${finalRemaining}`);
}

main().catch(err => {
  log(`[FATAL] Pipeline crashed: ${err.stack || err.message}`);
  process.exit(1);
});
