// scripts/validate_enriched_lexicon.cjs
const fs = require('fs');
const path = require('path');

function validateEntry(data, filename) {
  const errors = [];

  // Check 3-synonym root_action
  if (!data.root_action || data.root_action.split('•').length !== 3) {
    errors.push(`root_action must have exactly 3 synonyms separated by '•'`);
  }

  // Check ANE Context depth
  if (!data.ane_historical_context || data.ane_historical_context.length < 60) {
    errors.push(`ane_historical_context is too short or missing`);
  }

  // Check Writer Intent synonym contrast
  if (!data.writer_intent || data.writer_intent.length < 60) {
    errors.push(`writer_intent is too short or missing`);
  }

  // Check 4 Diachronic stages
  const evo = data.diachronic_evolution;
  if (!evo || !evo.stage_1_root_etymology || !evo.stage_2_ot_ane_usage || 
      !evo.stage_3_second_temple_lxx || !evo.stage_4_nt_apostolic_fulfillment) {
    errors.push(`diachronic_evolution must contain all 4 stages`);
  }

  return errors;
}

// Run validation across all files in public/data/lexicon
const dir = path.join(__dirname, '../public/data/lexicon');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let passed = 0, failed = 0;

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (content.needs_enrichment === false) {
    const errs = validateEntry(content, file);
    if (errs.length > 0) {
      console.error(`[FAIL] ${file}:`, errs);
      failed++;
    } else {
      passed++;
      console.log(`[PASS] ${file} (${content.strongs} ${content.lemma || ''}): "${content.root_action}"`);
    }
  }
}

console.log(`\nValidation complete: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
