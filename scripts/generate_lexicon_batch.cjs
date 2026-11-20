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

const logFile = path.join(__dirname, '..', 'lexicon_generation.log');
const queueFile = path.join(__dirname, '..', 'lexicon_queue.json');
const outputDir = path.join(__dirname, '..', 'public', 'data', 'lexicon');
const androidOutputDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'data', 'lexicon');

// Gemini Free-Tier Configuration (1 worker + 4.5s delay = max ~13.3 RPM, safe within 15 RPM limit)
const CONCURRENCY = 1;
const PACING_DELAY_MS = 4500;
const PROBE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MODEL_NAME = 'gemini-3.5-flash';

for (const dir of [outputDir, androidOutputDir]) {
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

// Calculate remaining time until midnight US Pacific Time (00:00 PT / 08:00 UTC)
function getPacificMidnightWait() {
  const now = new Date();
  const ptString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const ptDate = new Date(ptString);
  const ptMidnight = new Date(ptDate);
  ptMidnight.setHours(24, 0, 0, 0); // Next 00:00 PT
  const diffMs = ptMidnight.getTime() - ptDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { diffMs: Math.max(diffMs, 1000 * 60 * 5), hours, minutes };
}

// Check if error is a quota exhaustion error
function isDailyQuotaError(err) {
  const msg = (err && (err.message || err.toString())) || '';
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Quota exceeded') ||
    msg.includes('FreeTier') ||
    msg.includes('free_tier') ||
    msg.includes('GenerateRequestsPerDay')
  );
}

// Autonomous idle loop: waits for reset and probes every 30 minutes
async function handleDailyQuotaSleep(aiClient, workerId) {
  const { hours, minutes } = getPacificMidnightWait();
  log(`[W${workerId}] [DAILY QUOTA REACHED] Sleeping until quota reset window (~${hours}h ${minutes}m until 00:00 PT / 08:00 UTC). Current progress is safely checkpointed.`);

  let probeCount = 0;
  while (true) {
    await sleep(PROBE_INTERVAL_MS);
    probeCount++;
    const currentPt = getPacificMidnightWait();
    log(`[W${workerId}] [QUOTA PROBE #${probeCount}] Probing Gemini API availability (~${currentPt.hours}h ${currentPt.minutes}m remaining to PT midnight)...`);
    
    try {
      const probeRes = await aiClient.models.generateContent({
        model: MODEL_NAME,
        contents: 'Ping. Reply with OK.',
        config: { maxOutputTokens: 10 }
      });
      if (probeRes && (probeRes.text || probeRes.candidates)) {
        log(`[W${workerId}] [QUOTA PROBE SUCCESS] Free-tier quota restored! Automatically resuming batch generation from exact checkpoint.`);
        return;
      }
    } catch (probeErr) {
      log(`[W${workerId}] [QUOTA PROBE FAILED] Free-tier quota still exhausted (${(probeErr.message || '').slice(0, 80)}). Continuing sleep loop (next probe in 30m)...`);
    }
  }
}

async function run() {
  log('================================================================');
  log(`LogosBridge Autonomous Lexicon Pipeline (Free-Tier Resilient)`);
  log(`Workers: ${CONCURRENCY} | Pacing Delay: ${PACING_DELAY_MS / 1000}s | Model: ${MODEL_NAME}`);
  log(`Auto-Recovery: Daily 00:00 PT Reset Window + 30-Min Probes`);
  log('================================================================');

  if (!fs.existsSync(queueFile)) {
    log(`ERROR: Queue file not found at ${queueFile}`);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
  const total = queue.length;
  log(`Loaded ${total} total entries from queue.`);

  // Filter out already completed checkpoints
  const pendingQueue = [];
  let alreadyCompleted = 0;

  for (const item of queue) {
    const destFile = path.join(outputDir, `${item.strongs}.json`);
    let isComplete = false;
    if (fs.existsSync(destFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(destFile, 'utf8'));
        if (existing && existing.strongs === item.strongs && existing.helpsDiscoverySummary) {
          isComplete = true;
        }
      } catch (e) {}
    }
    if (isComplete) {
      alreadyCompleted++;
    } else {
      pendingQueue.push(item);
    }
  }

  log(`Checkpoint Scan: ${alreadyCompleted} already completed. ${pendingQueue.length} pending.`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    log('[ALERT] GEMINI_API_KEY is missing. Pipeline paused.');
    return;
  }

  let GoogleGenAI;
  try {
    const genaiModule = require('@google/genai');
    GoogleGenAI = genaiModule.GoogleGenAI;
  } catch (e) {
    log(`[ERROR] Unable to load @google/genai SDK: ${e.message}`);
    process.exit(1);
  }

  const aiClient = new GoogleGenAI({ apiKey });
  log(`Starting ${CONCURRENCY} worker thread with ${PACING_DELAY_MS / 1000}s inter-request pacing.`);

  const sessionStartTime = Date.now();
  let sessionCompleted = 0;
  let currentIndex = 0;

  async function worker(workerId) {
    while (currentIndex < pendingQueue.length) {
      const item = pendingQueue[currentIndex];
      currentIndex++;

      const destFile = path.join(outputDir, `${item.strongs}.json`);
      const androidDestFile = path.join(androidOutputDir, `${item.strongs}.json`);

      // Checkpoint check before requesting
      if (fs.existsSync(destFile)) {
        try {
          const ex = JSON.parse(fs.readFileSync(destFile, 'utf8'));
          if (ex && ex.strongs === item.strongs && ex.helpsDiscoverySummary) {
            continue;
          }
        } catch (e) {}
      }

      const prompt = `You are a Senior Biblical Lexicographer and Ancient Near Eastern / Hellenistic Philologist.
Generate an authoritative, discovery-oriented lexical entry for Strong's number ${item.strongs} following the exact 6-part framework:
Word: ${item.w}
Language: ${item.language}
Gloss: ${item.t}
Representative Grammatical Parsing Tags: ${item.parsingTags.join(', ') || 'N/A'}
First Biblical Occurrence: ${item.firstOccurrence}
Total Occurrences: ${item.occurrences}

CRITICAL RULES:
1. Output MUST be valid JSON only with no conversational text or markdown code fences.
2. "root_action" RULE: MUST be STRICTLY 2 to 3 words (or hyphenated compound English phrase).
   - Captures the profound Ancient Near Eastern covenantal concept (Hebrew) or philosophical/biblical worldview (Greek).
   - BANNED: NEVER use single raw literal KJV translation words (e.g. BANNED: "created", "the", "world", "word", "mercy", "peace", "love").
   - NEVER include Hebrew or Greek script or transliterations in root_action.
   - GOLDEN BENCHMARKS:
     * G2889 (kosmos) -> "Harmonious World-Order"
     * G3056 (logos) -> "Expressed Divine Reason"
     * H1254 (bara) -> "Sovereign Divine Origination"
     * H2617 (chesed) -> "Unbreakable Covenant-Fidelity"
     * H7965 (shalom) -> "Wholeness / Restored Order"
3. Avoid Root Fallacy: Do not claim an ancient etymological root determines later contextual meaning.
4. Avoid Illegitimate Totality Transfer: Do not force all theological nuances into one verse.
5. Base definitions strictly on BDAG, HALOT, BDB, TDOT, TDNT, and Louw-Nida scholarship.

JSON Schema format:
{
  "strongs": "${item.strongs}",
  "root_word": "consonantal root or etymological base (e.g. ב-ר-א or μετά + νοῦς)",
  "root_action": "Strictly 2-3 words capturing ANE covenantal/worldview nuance (e.g. 'Sovereign Divine Origination')",
  "original": "${item.w}",
  "transliteration": "string",
  "language": "${item.language}",
  "partOfSpeech": "string",
  "parsingTag": "${item.parsingTags[0] || ''}",
  "helpsDiscoverySummary": "1-2 sentence high-impact practical/theological summary for everyday Bible study.",
  "wordForWord": ["formal gloss 1", "formal gloss 2"],
  "meaningForMeaning": [
    { "domain": "domain name", "definition": "detailed semantic domain definition" }
  ],
  "writerIntent": {
    "communicativeGoal": "author communicative purpose and rhetorical effect",
    "covenantalPayload": "theological and covenantal payload within biblical revelation"
  },
  "aneHistoricalContext": {
    "westSemiticCognates": "cognates and comparative linguistics (Ugaritic, Akkadian, Aramaic, Sabaic, or Classical Greek/LXX)",
    "culturalCustoms": "ancient Near Eastern treaty/cultural customs or Greco-Roman historical/epigraphic background"
  },
  "diachronicEvolution": {
    "stage1Etymology": "earliest origin and root etymology",
    "stage2Shift": "pre-exilic or classical/septuagintal development",
    "stage3Specialization": "canonical biblical specialization (OT or NT)",
    "stage4Trajectory": "post-biblical trajectory (Rabbinic Hebrew or Early Church Patristic Greek)"
  },
  "morphologicalApplication": {
    "primaryTag": "${item.parsingTags[0] || 'N/A'}",
    "explanation": "how this grammatical parsing tag nuances syntactic/theological function in key occurrences"
  }
}`;

      let success = false;
      let attempt = 0;
      const maxAttempts = 3;

      while (!success && attempt < maxAttempts) {
        attempt++;
        try {
          const response = await aiClient.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          const rawText = response.text || '';
          let cleaned = rawText.trim();
          if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
          if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
          if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
          cleaned = cleaned.trim();

          const entryJson = JSON.parse(cleaned);
          entryJson.strongs = item.strongs;

          // Post-generation validation for root_action and schema completeness
          const GOLDEN_BENCHMARKS = {
            'G2889': 'Harmonious World-Order',
            'G3056': 'Expressed Divine Reason',
            'H1254': 'Sovereign Divine Origination',
            'H2617': 'Unbreakable Covenant-Fidelity',
            'H7965': 'Wholeness / Restored Order'
          };

          if (GOLDEN_BENCHMARKS[item.strongs]) {
            entryJson.root_action = GOLDEN_BENCHMARKS[item.strongs];
          } else {
            let action = (entryJson.root_action || '').trim().replace(/^["']|["']$/g, '');
            // Strip any leaked ancient scripts
            action = action.replace(/[\u0590-\u05FF\u0370-\u03FF\u1F00-\u1FFF]/g, '').trim();
            const bannedTokens = ['created', 'the', 'world', 'word', 'mercy', 'peace', 'love', 'god', 'man', 'said'];
            const words = action.split(/\s+/).filter(Boolean);

            if (!action || words.length < 2 || words.length > 4 || bannedTokens.includes(action.toLowerCase())) {
              log(`[VALIDATOR] Adjusting non-conforming root_action for ${item.strongs}: "${action}"`);
              if (words.length > 4) {
                action = words.slice(0, 3).join(' ');
              } else if (words.length === 1 && item.t) {
                action = `${action} Action`;
              }
            }
            entryJson.root_action = action;
          }

          if (!entryJson.helpsDiscoverySummary) {
            throw new Error(`Invalid entry structure: missing helpsDiscoverySummary for ${item.strongs}`);
          }

          // Save immediately to disk (checkpointing & android asset mirroring)
          fs.writeFileSync(destFile, JSON.stringify(entryJson, null, 2));
          fs.writeFileSync(androidDestFile, JSON.stringify(entryJson, null, 2));

          sessionCompleted++;
          success = true;

          const elapsedSec = Math.max((Date.now() - sessionStartTime) / 1000, 1);
          const ratePerMin = ((sessionCompleted / elapsedSec) * 60).toFixed(1);
          const totalDone = alreadyCompleted + sessionCompleted;
          const totalPct = ((totalDone / total) * 100).toFixed(2);

          log(`[W${workerId}] [SUCCESS] ${item.strongs} (${item.w}) saved | Progress: ${totalDone}/${total} (${totalPct}%) | Speed: ${ratePerMin} entries/min`);

          // Free-Tier Pacing: Mandatory delay between requests
          await sleep(PACING_DELAY_MS);
        } catch (err) {
          const msg = err.message || '';
          log(`[W${workerId}] [WARN] ${item.strongs} attempt ${attempt} error: ${msg.slice(0, 120)}`);

          if (isDailyQuotaError(err)) {
            // Put worker into auto-sleep and probe loop until quota resets
            await handleDailyQuotaSleep(aiClient, workerId);
            // After successful probe, retry the current item
            attempt = 0;
          } else {
            // General network glitch or transient issue: brief backoff
            await sleep(3000);
          }
        }
      }

      if (!success) {
        log(`[W${workerId}] [ERROR] ${item.strongs} failed after ${maxAttempts} non-quota attempts. Moving to next.`);
      }
    }
  }

  // Launch worker
  const workerPromises = [];
  for (let w = 1; w <= CONCURRENCY; w++) {
    workerPromises.push(worker(w));
  }

  await Promise.all(workerPromises);

  const totalTimeMin = ((Date.now() - sessionStartTime) / 60000).toFixed(2);
  log('================================================================');
  log(`All Items Processed! Session Completed: ${sessionCompleted} entries in ${totalTimeMin} minutes.`);
  log('================================================================');
}

run().catch(err => {
  log(`[FATAL] Pipeline crashed: ${err.stack || err.message}`);
  process.exit(1);
});
