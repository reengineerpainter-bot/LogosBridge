#!/usr/bin/env node
/**
 * scripts/ingest_web_gemini_lexicon.cjs
 * 
 * LogosBridge Web Gemini Lexicon Ingestion & Dual-Target Synchronizer.
 * Ingests, normalizes, validates, and mirrors lexicon entries generated via Gemini on the Web
 * (Google AI Studio, Gemini Web chat, or batch exports) directly into:
 *   - public/data/lexicon/${strongs}.json
 *   - android/app/src/main/assets/public/data/lexicon/${strongs}.json
 * 
 * Usage:
 *   node scripts/ingest_web_gemini_lexicon.cjs                    # Ingests from default staging_lexicon.json
 *   node scripts/ingest_web_gemini_lexicon.cjs --file=batch.json # Ingests from specific file
 *   node scripts/ingest_web_gemini_lexicon.cjs --dir=staging/    # Ingests all .json/.txt files in directory
 *   node scripts/ingest_web_gemini_lexicon.cjs --prompt [count]  # Generates copy-paste prompt for top unenriched words
 *   node scripts/ingest_web_gemini_lexicon.cjs --dry-run         # Validates without writing to disk
 */

const fs = require('fs');
const path = require('path');

const webLexiconDir = path.join(__dirname, '..', 'public', 'data', 'lexicon');
const androidLexiconDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'data', 'lexicon');
const interlinearDir = path.join(__dirname, '..', 'public', 'data', 'interlinear');
const defaultStagingFile = path.join(__dirname, '..', 'staging_lexicon.json');

// Ensure destination directories exist
for (const dir of [webLexiconDir, androidLexiconDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
let targetFile = null;
let targetDir = null;
let isDryRun = false;
let isPromptMode = false;
let promptCount = 10;
let isStdin = false;

for (const arg of args) {
  if (arg === '--dry-run') {
    isDryRun = true;
  } else if (arg === '--stdin' || arg === '-') {
    isStdin = true;
  } else if (arg.startsWith('--file=')) {
    targetFile = path.resolve(arg.slice(7).trim());
  } else if (arg.startsWith('--dir=')) {
    targetDir = path.resolve(arg.slice(6).trim());
  } else if (arg.startsWith('--prompt')) {
    isPromptMode = true;
    const countPart = arg.split('=')[1] || args[args.indexOf(arg) + 1];
    if (countPart && !isNaN(parseInt(countPart, 10))) {
      promptCount = parseInt(countPart, 10);
    }
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

function printHelp() {
  console.log(`
========================================================================
LogosBridge Web Gemini Lexicon Ingestion Utility
========================================================================
Usage:
  node scripts/ingest_web_gemini_lexicon.cjs [options]

Options:
  --file=<path>       Path to JSON, TXT, or Markdown file containing entries.
  --dir=<path>        Path to directory containing files to ingest.
  --stdin             Read JSON or Markdown text piped from standard input.
  --prompt [N]        Generate a copy-paste prompt for Web Gemini for the top N
                      most frequent words currently needing enrichment (default: 10).
  --dry-run           Validate and preview entries without modifying disk files.
  --help, -h          Show this help message.

Default behavior:
  If no options are given, the script checks for 'staging_lexicon.json' in the
  workspace root. If found, it ingests and mirrors all valid entries.
========================================================================
`);
}

/**
 * Normalizes root_action into the canonical 3-synonym format:
 * "Synonym 1 • Synonym 2 • Synonym 3"
 */
function normalizeRootAction(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw.map(s => String(s).trim()).filter(Boolean).join(' • ');
  }
  let str = String(raw).trim();
  // Standardize bullet variants
  str = str.replace(/[·*•\u2022]/g, '•');
  
  // If already separated by bullets
  if (str.includes('•')) {
    const parts = str.split('•').map(s => s.trim()).filter(Boolean);
    return parts.join(' • ');
  }
  
  // If separated by semicolons or commas into exactly 3 parts
  if (str.includes(';')) {
    const parts = str.split(';').map(s => s.trim()).filter(Boolean);
    if (parts.length === 3) return parts.join(' • ');
  }
  if (str.includes(',')) {
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 3) return parts.join(' • ');
  }

  return str;
}

/**
 * Strict validation rule set (byte-for-byte aligned with scripts/validate_enriched_lexicon.cjs)
 */
function validateEntry(data) {
  const errors = [];

  // Strong's key validation
  if (!data.strongs || !/^[GH]\d+$/i.test(String(data.strongs).trim())) {
    errors.push(`Invalid Strong's ID "${data.strongs}". Expected format: G1234 or H1234.`);
  }

  // 3-synonym root_action
  if (!data.root_action) {
    errors.push(`root_action is missing.`);
  } else {
    const parts = data.root_action.split('•').map(s => s.trim()).filter(Boolean);
    if (parts.length !== 3) {
      errors.push(`root_action must contain exactly 3 synonyms separated by '•' (got ${parts.length}: "${data.root_action}").`);
    }
  }

  // ANE context depth
  if (!data.ane_historical_context || data.ane_historical_context.trim().length < 60) {
    errors.push(`ane_historical_context is too short (< 60 chars) or missing.`);
  }

  // Writer intent contrast
  if (!data.writer_intent || data.writer_intent.trim().length < 60) {
    errors.push(`writer_intent is too short (< 60 chars) or missing.`);
  }

  // 4 Diachronic evolution stages
  const evo = data.diachronic_evolution;
  if (!evo || typeof evo !== 'object') {
    errors.push(`diachronic_evolution is missing or not an object.`);
  } else {
    const stages = [
      'stage_1_root_etymology',
      'stage_2_ot_ane_usage',
      'stage_3_second_temple_lxx',
      'stage_4_nt_apostolic_fulfillment'
    ];
    for (const stage of stages) {
      if (!evo[stage] || String(evo[stage]).trim().length < 20) {
        errors.push(`diachronic_evolution.${stage} is missing or too short (< 20 chars).`);
      }
    }
  }

  return errors;
}

/**
 * Extracts and parses JSON entities from raw text, supporting Markdown code fences,
 * single objects, arrays, keyed dictionaries, or JSONL lines.
 */
function extractJsonEntries(rawText) {
  if (!rawText || !rawText.trim()) return [];

  let text = rawText.trim();

  // Strip Markdown code blocks if present
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let codeBlockMatches = [];
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match[1] && match[1].trim()) {
      codeBlockMatches.push(match[1].trim());
    }
  }

  const chunksToParse = codeBlockMatches.length > 0 ? codeBlockMatches : [text];
  const results = [];

  for (const chunk of chunksToParse) {
    // 1. Try direct JSON.parse
    try {
      const parsed = JSON.parse(chunk);
      flattenAndPush(parsed, results);
      continue;
    } catch (e) {}

    // 2. Try slicing from first '[' to last ']'
    const firstBracket = chunk.indexOf('[');
    const lastBracket = chunk.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const sub = chunk.slice(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(sub);
        flattenAndPush(parsed, results);
        continue;
      } catch (e) {}
    }

    // 3. Try slicing from first '{' to last '}'
    const firstBrace = chunk.indexOf('{');
    const lastBrace = chunk.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sub = chunk.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(sub);
        flattenAndPush(parsed, results);
        continue;
      } catch (e) {}
    }

    // 4. Try JSON Lines (JSONL)
    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
      try {
        const parsed = JSON.parse(trimmed);
        flattenAndPush(parsed, results);
      } catch (e) {}
    }
  }

  return results;
}

function flattenAndPush(item, output) {
  if (Array.isArray(item)) {
    for (const sub of item) {
      flattenAndPush(sub, output);
    }
  } else if (item && typeof item === 'object') {
    // Check if it's a map keyed by Strong's number, e.g. { "G2889": { ... }, "G3056": { ... } }
    const keys = Object.keys(item);
    const looksLikeMap = keys.length > 0 && keys.every(k => /^[GH]\d+$/i.test(k));
    if (looksLikeMap && !item.strongs && !item.root_action) {
      for (const [key, val] of Object.entries(item)) {
        if (val && typeof val === 'object') {
          val.strongs = val.strongs || key;
          output.push(val);
        }
      }
    } else {
      output.push(item);
    }
  }
}

/**
 * Reads interlinear corpus to compute corpus frequencies and lookup lexical metadata.
 */
let corpusMetadataCache = null;
function getCorpusMetadata() {
  if (corpusMetadataCache) return corpusMetadataCache;

  const frequencies = {};
  const metadata = {}; // strongs -> { lemma, gloss, pos }

  if (fs.existsSync(interlinearDir)) {
    const files = fs.readdirSync(interlinearDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(interlinearDir, file), 'utf8'));
        if (!content.chapters) continue;
        for (const chKey of Object.keys(content.chapters)) {
          const ch = content.chapters[chKey];
          for (const vKey of Object.keys(ch)) {
            const verse = ch[vKey];
            if (!verse || !verse.words || !Array.isArray(verse.words)) continue;
            for (const w of verse.words) {
              const strongs = w.n || w.strongs;
              if (!strongs) continue;
              const sKey = String(strongs).trim().toUpperCase();
              frequencies[sKey] = (frequencies[sKey] || 0) + 1;
              if (!metadata[sKey]) {
                metadata[sKey] = {
                  lemma: w.w || '',
                  transliteration: w.t || '',
                  part_of_speech: w.p || ''
                };
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  corpusMetadataCache = { frequencies, metadata };
  return corpusMetadataCache;
}

/**
 * Generates an optimized, ready-to-paste prompt for Web Gemini / AI Studio
 * targeting the top N unenriched biblical words.
 */
function handlePromptMode(count) {
  console.log(`Analyzing interlinear corpus to find top ${count} unenriched words...`);
  const { frequencies, metadata } = getCorpusMetadata();

  // Find all Strong's numbers currently in public/data/lexicon/ that are already enriched
  const existingFiles = fs.existsSync(webLexiconDir)
    ? fs.readdirSync(webLexiconDir).filter(f => f.endsWith('.json'))
    : [];

  const enrichedSet = new Set();
  for (const file of existingFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(webLexiconDir, file), 'utf8'));
      if (data.needs_enrichment === false && data.ane_historical_context) {
        enrichedSet.add(data.strongs.toUpperCase());
      }
    } catch (e) {}
  }

  // Sort candidate Strong's numbers by frequency descending (ignoring H0/G0 untagged markers)
  const candidates = Object.keys(frequencies)
    .filter(s => /^[GH][1-9]\d*$/i.test(s) && !enrichedSet.has(s.toUpperCase()))
    .sort((a, b) => frequencies[b] - frequencies[a])
    .slice(0, count);

  if (candidates.length === 0) {
    console.log(`All candidates in the corpus are already enriched! (${enrichedSet.size} total entries).`);
    return;
  }

  console.log(`\n========================================================================`);
  console.log(`COPY AND PASTE THE FOLLOWING PROMPT INTO GEMINI WEB / GOOGLE AI STUDIO`);
  console.log(`========================================================================\n`);

  const wordsList = candidates.map(s => {
    const meta = metadata[s] || {};
    return `- Strong's: ${s} | Lemma: ${meta.lemma || 'N/A'} | Gloss: ${meta.transliteration || 'N/A'} | Occurrences: ${frequencies[s]}`;
  }).join('\n');

  const promptText = `You are a world-class historical-grammatical and biblical theologian, textual linguist, and Ancient Near Eastern (ANE) / Greco-Roman scholar.
Please generate authoritative, deeply researched academic lexicon enrichment entries for the following ${candidates.length} high-frequency biblical terms:

${wordsList}

================================================================================
CRITICAL SCHOLARLY RULES:
================================================================================
1. "root_action":
   MUST strictly consist of 3 DISTINCT, COMPLEMENTARY NUANCE SYNONYMS that triangulate the ancient author's intent and bridge the gap to modern English.
   Provide as an array of 3 strings: ["Synonym 1", "Synonym 2", "Synonym 3"] or bullet-separated: "Synonym 1 • Synonym 2 • Synonym 3".
   Each synonym must capture a different legitimate dimension of the lemma/root in biblical discourse.
   Benchmarks:
   - G2889 (kosmos) ➔ "Structured Order • World-System • Adornment"
   - G3056 (logos) ➔ "Expressed Reason • Divine Disclosure • Living Discourse"
   - H1254 (bara) ➔ "Sovereign Origination • Divine Functional Allocation • Unprecedented Generation"
   - H2617 (chesed) ➔ "Covenant-Fidelity • Relational Loyalty • Enduring Steadfastness"
   - G3004 (lego) ➔ "Authoritative Declaration • Deliberate Affirmation • Systematic Discourse"

2. "ane_historical_context":
   2-3 dense sentences.
   - For Hebrew (H): Contrast against Ancient Near Eastern pagan culture (Ugaritic, Akkadian, or Egyptian vassal treaties/rituals) and describe how biblical authors subverted or sanctified the concept.
   - For Greek (G): Contrast classical Hellenistic/Stoic philosophical usage with early Christian apostolic revelation.

3. "writer_intent":
   Exactly 2 sentences answering: Why did the biblical author deliberately choose this specific lemma over its synonyms, and what cognitive or covenantal response was demanded of the original listener?

4. "diachronic_evolution":
   Contains all 4 stages:
   - "stage_1_root_etymology": 1-2 sentences on original root derivation, proto-Semitic or ancient Greek base.
   - "stage_2_ot_ane_usage": 1-2 sentences on Old Testament and Bronze/Iron Age usage.
   - "stage_3_second_temple_lxx": 1-2 sentences on Septuagint (LXX) translation shifts and Second Temple Jewish literature.
   - "stage_4_nt_apostolic_fulfillment": 1-2 sentences on New Testament apostolic climax and the nuance gap compared to standard English/KJV translations.

================================================================================
MANDATORY OUTPUT FORMAT:
Return strictly a valid JSON array of objects (one object per Strong's word) with NO conversational text:
================================================================================
[
  {
    "strongs": "...",
    "lemma": "...",
    "transliteration": "...",
    "root_word": "...",
    "root_action": ["Synonym 1", "Synonym 2", "Synonym 3"],
    "part_of_speech": "...",
    "semantic_domain": "...",
    "lexical_definition": "...",
    "ane_historical_context": "...",
    "writer_intent": "...",
    "diachronic_evolution": {
      "stage_1_root_etymology": "...",
      "stage_2_ot_ane_usage": "...",
      "stage_3_second_temple_lxx": "...",
      "stage_4_nt_apostolic_fulfillment": "..."
    }
  }
]`;

  console.log(promptText);
  console.log(`\n========================================================================`);
  console.log(`Once Gemini responds, paste the JSON into 'staging_lexicon.json' and run:`);
  console.log(`node scripts/ingest_web_gemini_lexicon.cjs`);
  console.log(`========================================================================\n`);
}

/**
 * Merges new enrichment data into existing or default record.
 */
function prepareFinalRecord(entry) {
  const strongs = String(entry.strongs).trim().toUpperCase();
  const filePath = path.join(webLexiconDir, `${strongs}.json`);
  let existing = {};

  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {}
  }

  // Retrieve corpus metadata as fallback if lemma/transliteration missing
  const { metadata } = getCorpusMetadata();
  const corpusMeta = metadata[strongs] || {};

  const record = {
    strongs: strongs,
    lemma: entry.lemma || existing.lemma || corpusMeta.lemma || '',
    transliteration: entry.transliteration || existing.transliteration || corpusMeta.transliteration || '',
    root_word: entry.root_word || existing.root_word || '',
    root_action: normalizeRootAction(entry.root_action || existing.root_action),
    part_of_speech: entry.part_of_speech || existing.part_of_speech || corpusMeta.part_of_speech || '',
    semantic_domain: entry.semantic_domain || existing.semantic_domain || '',
    lexical_definition: entry.lexical_definition || existing.lexical_definition || existing.definition || '',
    needs_enrichment: false,
    ane_historical_context: (entry.ane_historical_context || existing.ane_historical_context || '').trim(),
    writer_intent: (entry.writer_intent || existing.writer_intent || '').trim(),
    diachronic_evolution: {
      stage_1_root_etymology: (entry.diachronic_evolution?.stage_1_root_etymology || existing.diachronic_evolution?.stage_1_root_etymology || '').trim(),
      stage_2_ot_ane_usage: (entry.diachronic_evolution?.stage_2_ot_ane_usage || existing.diachronic_evolution?.stage_2_ot_ane_usage || '').trim(),
      stage_3_second_temple_lxx: (entry.diachronic_evolution?.stage_3_second_temple_lxx || existing.diachronic_evolution?.stage_3_second_temple_lxx || '').trim(),
      stage_4_nt_apostolic_fulfillment: (entry.diachronic_evolution?.stage_4_nt_apostolic_fulfillment || existing.diachronic_evolution?.stage_4_nt_apostolic_fulfillment || '').trim(),
    }
  };

  return record;
}

/**
 * Ingests a list of candidate entries.
 */
function ingestEntries(entries) {
  if (!entries || entries.length === 0) {
    console.log('[WARN] No entries found to ingest.');
    return;
  }

  console.log(`\nProcessing ${entries.length} candidate entries...`);
  let passedCount = 0;
  let failedCount = 0;

  for (const rawEntry of entries) {
    const record = prepareFinalRecord(rawEntry);
    const errors = validateEntry(record);

    if (errors.length > 0) {
      console.error(`\n[REJECTED] ${record.strongs || 'UNKNOWN'}:`);
      for (const err of errors) {
        console.error(`  ❌ ${err}`);
      }
      failedCount++;
      continue;
    }

    if (!isDryRun) {
      const jsonContent = JSON.stringify(record, null, 2) + '\n';
      const webPath = path.join(webLexiconDir, `${record.strongs}.json`);
      const androidPath = path.join(androidLexiconDir, `${record.strongs}.json`);

      fs.writeFileSync(webPath, jsonContent, 'utf8');
      fs.writeFileSync(androidPath, jsonContent, 'utf8');
      console.log(`[INGESTED] ${record.strongs} (${record.lemma}): "${record.root_action}" ➔ Web & Android`);
    } else {
      console.log(`[DRY-RUN VALID] ${record.strongs} (${record.lemma}): "${record.root_action}"`);
    }

    passedCount++;
  }

  console.log(`\n========================================================================`);
  console.log(`Batch Summary: ${passedCount} ingested successfully, ${failedCount} rejected.`);
  if (isDryRun) {
    console.log(`[DRY-RUN MODE] No files were written to disk.`);
  } else {
    const totalFiles = fs.readdirSync(webLexiconDir).filter(f => f.endsWith('.json')).length;
    console.log(`Total enriched lexicon files in project: ${totalFiles}`);
  }
  console.log(`========================================================================\n`);
}

/**
 * Main Execution Flow
 */
function main() {
  if (isPromptMode) {
    handlePromptMode(promptCount);
    return;
  }

  let textToProcess = '';

  if (isStdin) {
    console.log('Reading from standard input (Ctrl+D / EOF to finish)...');
    textToProcess = fs.readFileSync(0, 'utf8');
  } else if (targetFile) {
    if (!fs.existsSync(targetFile)) {
      console.error(`[ERROR] Specified file does not exist: ${targetFile}`);
      process.exit(1);
    }
    console.log(`Reading input from file: ${targetFile}`);
    textToProcess = fs.readFileSync(targetFile, 'utf8');
  } else if (targetDir) {
    if (!fs.existsSync(targetDir)) {
      console.error(`[ERROR] Specified directory does not exist: ${targetDir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json') || f.endsWith('.txt') || f.endsWith('.md'));
    console.log(`Found ${files.length} file(s) in directory: ${targetDir}`);
    let allEntries = [];
    for (const f of files) {
      const content = fs.readFileSync(path.join(targetDir, f), 'utf8');
      allEntries = allEntries.concat(extractJsonEntries(content));
    }
    ingestEntries(allEntries);
    return;
  } else {
    // Default check for staging_lexicon.json
    if (fs.existsSync(defaultStagingFile)) {
      console.log(`Using default staging file: ${defaultStagingFile}`);
      textToProcess = fs.readFileSync(defaultStagingFile, 'utf8');
    } else {
      console.log(`\n[INFO] No input file specified and 'staging_lexicon.json' not found.`);
      printHelp();
      
      // Write sample template staging_lexicon.json for immediate use
      const sampleTemplate = [
        {
          "strongs": "G1234",
          "lemma": "παράδειγμα",
          "transliteration": "paradeigma",
          "root_word": "δείκνυμι",
          "root_action": ["Architectural Archetype", "Pattern Demonstration", "Normative Precedent"],
          "part_of_speech": "Noun",
          "lexical_definition": "A pattern, example, or model set forth for imitation or warning.",
          "ane_historical_context": "In Classical Greek philosophical literature, paradeigma served as Plato's term for the eternal celestial forms according to which the physical cosmos was constructed. In the Septuagint, it translates the Hebrew tavnit (pattern) revealed to Moses for the Tabernacle architecture. Apostolic writers transformed this philosophical archetype into the living incarnation of Christ as the definitive covenantal model.",
          "writer_intent": "The author selected paradeigma rather than typos to emphasize the authoritative, divine blueprint demanding exact ethical alignment. The covenantal hearer is thus summoned to conform their practical community life to this transcendent pattern.",
          "diachronic_evolution": {
            "stage_1_root_etymology": "Derived from para (beside) and deiknymi (to show), literally designating an object placed alongside for direct comparison and measurement.",
            "stage_2_ot_ane_usage": "In the Hebrew Bible context, equivalent concepts focused on the precise royal and cultic blueprints delivered through prophetic revelation for temple construction.",
            "stage_3_second_temple_lxx": "The Septuagint and Philo employed paradeigma to articulate the heavenly sanctuary model shown on Sinai, bridging Semitic covenantal history with Hellenistic metaphysics.",
            "stage_4_nt_apostolic_fulfillment": "In apostolic discourse, Christ Himself is the ultimate archetype who fulfills and supersedes shadowy ritual precedents, calling disciples to participatory conformity rather than mere external imitation."
          }
        }
      ];

      fs.writeFileSync(defaultStagingFile, JSON.stringify(sampleTemplate, null, 2) + '\n', 'utf8');
      console.log(`Created sample template at: ${defaultStagingFile}`);
      console.log(`Paste your Web Gemini JSON output into 'staging_lexicon.json' and run this script again.`);
      return;
    }
  }

  const entries = extractJsonEntries(textToProcess);
  ingestEntries(entries);
}

main();
