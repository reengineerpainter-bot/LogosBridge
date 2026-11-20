/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPulseResponse, DiscipleshipDiagnosisPayload } from '../types/discipleship';

export const DISCIPLESHIP_SYSTEM_PROMPT = `You are the Shepherd Guide for LogosBridge, a premium digital Bible study application.
Your role is to meet a believer in their present spiritual, mental, or emotional season with deep pastoral tenderness, academic scriptural elegance, and actionable counsel.

RULES:
1. Strip out all clinical, mechanical, or psychological jargon. Never use words like "Diagnosis", "Somatic", "Prototypes", "Protocol", "Intervention", or "Misstep".
2. Write with rich, warm, and timeless editorial elegance (reminiscent of C.S. Lewis, A.W. Tozer, or Henri Nouwen).
3. The response MUST strictly follow this JSON schema:
{
  "sessionStatus": "PROCEED_TO_STUDY" | "DIAGNOSTIC_INTERVENTION",
  "scriptureAnchor": {
    "reference": "Book Chapter:Verse",
    "text": "Full text of the scripture passage"
  },
  "biblicalNarrative": {
    "title": "A poetic, reverent title for this reflection",
    "paragraphs": [
      "Paragraph 1: Tenderly acknowledge the user's condition and connect it directly to a biblical precedent (e.g. Elijah under the broom tree, David in the wilderness of Judah, Peter by the sea of Galilee, Martha troubled about many things).",
      "Paragraph 2: Isolate a key Greek or Hebrew root word from the scriptureAnchor. Unpack its etymology (original script, transliteration italicized with asterisks like *shālôm* or *anapauō*, and original root meaning) and weave it directly into the user's emotional and spiritual condition within the flowing narrative.",
      "Paragraph 3: Offer theological reassurance showing how this covenant reality applies to the believer today in Christ."
    ]
  },
  "shepherdCounsel": {
    "reflection": "A single, deeply comforting sentence of shepherdly guidance.",
    "practicalStep": "A realistic, unhurried 5-15 minute spiritual action step for the next 24 hours.",
    "timeCommitmentMinutes": 5 to 15,
    "prayerPoint": "A short, 1-2 sentence scriptural prayer in the Homologeo Architecture."
  },
  "nextAuditRoute": {
    "verseReference": "The anchor scripture or next study verse",
    "actionLabel": "Understated continuation label, e.g., 'Resume Scripture Study in Genesis 1:7'"
  }
}

PRAYER POINT RULES (HOMOLOGEO ARCHITECTURE):
- Tone of Declaration (Homologeo): The prayerPoint MUST NOT be a passive plea, wishing, or begging (e.g., absolutely avoid "Lord, please help me..." or "Lord, please give me..."). It must be a bold, faith-filled declaration of agreement with God's Word.
- Present Reality: The prayer must pull hope into a present reality. Use present-tense verbs of possession and alignment (e.g., "I declare," "I step into," "I receive," "I am").
- The Perfect Will: Frame the prayer strictly within the boundaries of the scriptureAnchor, confessing scriptural truth over the user's peculiar situation.
- Example of the Shift:
  * Prohibited (Passive): "Lord, I am so tired, please give me rest today."
  * Mandatory (Homologeo): "Father, I declare that Your yoke is easy. I step out of my own striving and into Your divine Sabbath, for my strength is perfectly renewed in Christ right now."

Do not include any markdown fences or conversational text outside the JSON.`;

/**
 * Calculates the next sequential verse (e.g., "Genesis 1:6" -> "Genesis 1:7").
 */
export function getNextVerseReference(verseRef: string): string {
  if (!verseRef) return 'Genesis 1:7';
  const match = verseRef.trim().match(/^(.*?\b\w+)\s+(\d+):(\d+)$/);
  if (!match) return 'Genesis 1:7';

  const book = match[1];
  const chapter = match[2];
  const verse = parseInt(match[3], 10);
  if (isNaN(verse)) return 'Genesis 1:7';

  return `${book} ${chapter}:${verse + 1}`;
}

/**
 * Deterministic baseline archetype generator used when offline or as network fallback.
 */
export function getFallbackDiagnosisPayload(
  response: UserPulseResponse
): DiscipleshipDiagnosisPayload {
  const lastVerse = response.userStateSnapshot?.lastStudiedVerse || 'Genesis 1:6';
  const nextVerse = getNextVerseReference(lastVerse);
  const cardId = response.selectedCardId || '';
  const key = (response.diagnosticKey || '').toUpperCase();

  // 1. JOYFUL / PRAISE & INTIMACY
  if (cardId === 'joyful' || cardId === 'card_steady' || key.includes('PRAISE') || key.includes('MOMENTUM')) {
    return {
      sessionStatus: 'PROCEED_TO_STUDY',
      scriptureAnchor: {
        reference: 'Nehemiah 8:10',
        text: 'The joy of the LORD is your strength.',
      },
      biblicalNarrative: {
        title: 'The Wellspring of Covenant Strength',
        paragraphs: [
          'When the people of Jerusalem gathered at the Water Gate after long years in exile, their first hearing of the rediscovered Torah brought deep tears. Yet Nehemiah and Ezra gently bid them to weep no more, reminding them that true rejoicing in God’s covenant mercy is the very bedrock of spiritual resilience.',
          'In the sacred text, the word rendered "strength" is the Hebrew *mā‘ôz* (מָעוֹז), denoting not mere physical stamina, but an impregnable rock fortress or refuge into which the weary run and are safe. Paired with *chedwāh* (חֶדְוָה)—divine gladness imparted directly from God’s countenance—biblical joy becomes an unassailable stronghold. When our hearts are anchored in this fortress, praise is no longer a fragile human effort, but an abiding atmosphere wherein divine truth is absorbed without friction.',
          'In this season of gratitude and spiritual clarity, your heart is uniquely poised to receive deep revelation from the sacred text. Let this quiet victory anchor your spirit as you open the Word today.',
        ],
      },
      shepherdCounsel: {
        reflection: 'Consecrate this season of rejoicing, allowing gratitude to prepare the soil of your heart.',
        practicalStep: 'Offer a silent prayer of thanksgiving for three specific mercies before reading your next passage.',
        timeCommitmentMinutes: 5,
        prayerPoint: 'Father, I declare that Your joy is my impenetrable fortress right now. I receive Your gladness as my strength and align my heart with Your unshakeable peace.',
      },
      nextAuditRoute: {
        verseReference: nextVerse,
        actionLabel: `Resume Scripture Study in ${nextVerse}`,
      },
      // Backward-compatibility aliases
      diagnosis: {
        headline: 'Peaceful & Aligned Heart',
        rootCauseDescription: 'Spiritual rhythm is intact and your heart is calm and receptive to divine revelation.',
        biblicalEquivalentTerm: 'Shalom / Whole & Unbroken Covenant Peace',
      },
    };
  }

  // 2. WEARIED / REST & RENEWAL
  if (cardId === 'wearied' || cardId === 'card_exhausted' || key.includes('REST') || key.includes('FATIGUE')) {
    return {
      sessionStatus: 'DIAGNOSTIC_INTERVENTION',
      scriptureAnchor: {
        reference: '1 Kings 19:7',
        text: 'Arise and eat, because the journey is too great for thee.',
      },
      biblicalNarrative: {
        title: 'Bread on Coals in the Solitary Wilderness',
        paragraphs: [
          'After the fire had fallen on Mount Carmel and the rain clouds had gathered over Jezreel, Elijah found himself completely depleted under a solitary broom tree in the wilderness. Exhausted in body and soul, the great prophet asked that he might die, confessing that he was no better than his fathers.',
          'The scriptural heartbeat of renewal is rooted in the Hebrew *shābat* (שָׁבַת), the holy cessation wherein God ceased from His labors, and the Greek *anapauō* (ἀναπαύω), which signifies causing the soul to pause and be thoroughly refreshed from fatigue. When the angel commanded Elijah to eat and rest under the broom tree, heaven honored the frailty of human flesh. True covenant rest is never a moral failure; it is the sacred acknowledgement that our strength is received as a gift, never manufactured by relentless striving.',
          'The Father knows your frame, and remembers that you are dust. He does not expect you to run in your own might today. Cease the labor, partake of His bread, and allow His presence to quietly restore your soul.',
        ],
      },
      shepherdCounsel: {
        reflection: 'Cease the striving for today. Rest is an act of holy surrender, not retreat.',
        practicalStep: 'Spend ten minutes in unhurried stillness with your eyes closed, letting the peace of Psalm 23 quiet your thoughts.',
        timeCommitmentMinutes: 10,
        prayerPoint: 'Father, I declare that Your yoke is easy and Your burden is light. I step out of all striving and enter into Your holy rest, for my strength is renewed in Christ right now.',
      },
      nextAuditRoute: {
        verseReference: 'Psalm 23:2',
        actionLabel: 'Read Psalm 23:2 in Stillness',
      },
      diagnosis: {
        headline: 'Physical Exhaustion & Depleted Reserves',
        rootCauseDescription: 'Physical depletion and prolonged emotional demands have temporarily drained your reserves.',
        biblicalEquivalentTerm: 'Khaval / Heavy Yoke Lifted',
      },
    };
  }

  // 3. BURDENED / RIGHTEOUSNESS & GRACE
  if (cardId === 'burdened' || cardId === 'card_condemned' || key.includes('RIGHTEOUSNESS') || key.includes('CONDEMNATION')) {
    return {
      sessionStatus: 'DIAGNOSTIC_INTERVENTION',
      scriptureAnchor: {
        reference: 'Romans 8:1',
        text: 'There is therefore now no condemnation to them which are in Christ Jesus.',
      },
      biblicalNarrative: {
        title: 'The Robe of Grace on the Road Home',
        paragraphs: [
          'Walking the long, dusty road back toward his father’s house, the younger son rehearsed his carefully structured plea, seeking merely the status of a hired laborer. He was burdened by the memory of squandered inheritance and felt entirely unworthy of being called a son.',
          'When the apostle Paul writes that there is now no condemnation, he chooses the precise Greek legal term *katakrima* (κατάκριμα)—the punitive sentence handed down against a guilty offender. In the courts of heaven, this judicial penalty has been completely blotted out by Christ’s finished cross. Grace does not negotiate temporary probation; it clothes the returning child in *dikaiosynē* (δικαιοσύνη), the flawless, unmerited righteousness of the Son.',
          'In Christ, your standing before the Father is never determined by yesterday’s failures or today’s perceived inadequacy. The veil remains permanently torn, and you are welcomed into the Holy of Holies as an beloved heir.',
        ],
      },
      shepherdCounsel: {
        reflection: 'Breathe deeply of the Father’s unconditional acceptance. The veil remains permanently torn.',
        practicalStep: 'Quietly whisper Romans 8:1 three times, consciously releasing any lingering self-accusation into His mercy.',
        timeCommitmentMinutes: 5,
        prayerPoint: 'Father, I declare that there is now no condemnation over my life in Christ Jesus. I stand fully robed in Your flawless righteousness and walk in complete sonship today.',
      },
      nextAuditRoute: {
        verseReference: 'Romans 8:1',
        actionLabel: 'Anchor in Romans 8:1',
      },
      diagnosis: {
        headline: 'Condemnation & Distant Heart',
        rootCauseDescription: "Measuring covenant standing by personal performance rather than Christ's finished righteousness.",
        biblicalEquivalentTerm: 'Katakrima / Judicial Condemnation Overturned',
      },
    };
  }

  // 4. ANXIOUS / FOCUS & STILLNESS
  if (cardId === 'anxious' || cardId === 'card_scattered' || key.includes('FOCUS') || key.includes('ATTENTION')) {
    return {
      sessionStatus: 'DIAGNOSTIC_INTERVENTION',
      scriptureAnchor: {
        reference: 'Philippians 4:6–7',
        text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
      },
      biblicalNarrative: {
        title: 'The Quieted Heart in a Hurried World',
        paragraphs: [
          'In the home at Bethany, Martha was weighed down by the manifold necessities of hospitality, her mind pulling in a dozen directions as she sought to serve the Master. In her agitation, she asked the Lord to compel Mary to join her bustling labor.',
          'The Greek term translated "careful" or "anxious" is *merimnaō* (μεριμνάω), derived from *merizō* ("to divide") and *nous* ("the mind"). Anxiety literally describes an inward tearing or fracture of the thoughts, pulling the soul between tomorrow’s imagined dread and today’s duties. In contrast, the apostle promises God’s *eirēnē* (εἰρήνη)—the divine tranquility that binds what was scattered back into harmonious wholeness—standing like a Roman garrison over the mind.',
          'Surrendering anxiety is not neglect of duty, but the gentle re-ordering of our primary devotion. When we lay our chaotic schedule at His feet, His peace stands sentinel over our hearts and minds like a quiet fortress.',
        ],
      },
      shepherdCounsel: {
        reflection: 'Stillness is not empty passivity; it is holy attentiveness to the One who holds all your hours.',
        practicalStep: 'Take three measured, deep breaths. Name your three most demanding tasks today, and release each into God’s care.',
        timeCommitmentMinutes: 5,
        prayerPoint: 'Father, I cast all anxiety upon You and declare that Your transcendent peace garrisons my heart and mind right now. My thoughts are steady, quieted, and anchored in You.',
      },
      nextAuditRoute: {
        verseReference: 'Luke 10:41-42',
        actionLabel: 'Contemplate Luke 10:41–42',
      },
      diagnosis: {
        headline: 'Scattered Focus & Hurried Pace',
        rootCauseDescription: 'Mental fragmentation and competing demands have clouded the stillness required for contemplation.',
        biblicalEquivalentTerm: 'Merimna / Divided Mind Quieted',
      },
    };
  }

  // 5. THIRSTING / LIVING WATER
  if (cardId === 'thirsting' || cardId === 'card_dry' || key.includes('WATER') || key.includes('DESERT')) {
    return {
      sessionStatus: 'DIAGNOSTIC_INTERVENTION',
      scriptureAnchor: {
        reference: 'Psalm 63:1',
        text: 'O God, thou art my God; early will I seek thee: my soul thirsteth for thee, my flesh longeth for thee in a dry and thirsty land.',
      },
      biblicalNarrative: {
        title: 'Streams in the Dry Places of Judah',
        paragraphs: [
          'Seeking refuge in the arid canyons of the Judean wilderness, David found himself far from the tabernacle in Jerusalem. The barren rocks and scorched ravines around him mirrored the parchedness of his own spirit.',
          'In David’s wilderness prayer, the Hebrew word for "thirsteth" is *tsāmē’* (צָמֵא), depicting a parched throat yearning for living water, coupled with *kāmah* (כָּמַהּ)—an intense, fainting longing of the inner being. Far from signaling spiritual absence, holy thirst is the deepest evidence of spiritual life. The desert removes the bitter cisterns of human self-sufficiency so that the soul may drink directly from *māqôr chayyim* (מְקוֹר חַיִּים), the unceasing fountain of the living God.',
          'Spiritual thirst is an open vessel waiting for His rain. He who promised to pour water on him that is thirsty will not leave you unvisited today.',
        ],
      },
      shepherdCounsel: {
        reflection: 'Your thirst is not an absence of God, but an open vessel waiting for His fresh rain.',
        practicalStep: 'Read Isaiah 55:1 out loud slowly, receiving the timeless invitation to drink freely without money and without price.',
        timeCommitmentMinutes: 8,
        prayerPoint: 'Father, I declare that You are the fountain of living waters within me. I step into Your abundance and drink freely of Your Spirit, knowing my soul is completely satisfied in You.',
      },
      nextAuditRoute: {
        verseReference: 'Isaiah 55:1',
        actionLabel: 'Drink from Isaiah 55:1',
      },
      diagnosis: {
        headline: 'Spiritual Dryness & Thirsting Soul',
        rootCauseDescription: 'Sensory quietness and lack of emotional stimulation have caused temporary spiritual dryness.',
        biblicalEquivalentTerm: 'Tsimmaon / Thirsting for the Spring',
      },
    };
  }

  // 6. EXPECTANT / FAITH & ASSURANCE (Default fallback)
  return {
    sessionStatus: 'DIAGNOSTIC_INTERVENTION',
    scriptureAnchor: {
      reference: 'Hebrews 11:1',
      text: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    },
    biblicalNarrative: {
      title: 'Stepping into the Promised Horizon',
      paragraphs: [
        'When Abraham received the divine call in Ur of the Chaldees, he was commanded to step out toward a land he had never seen, accompanied only by the voice of promise. Day after day he journeyed, dwelling in tents as an heir of the eternal city whose builder and maker is God.',
        'The epistle to the Hebrews anchors faith in the profound Greek term *hypostasis* (ὑπόστασις)—compounded from *hypo* ("under") and *histēmi* ("to stand"). It denotes the solid bedrock, title deed, or underlying reality beneath what is not yet visible to physical sight. Biblical expectation is therefore neither wishful thinking nor human optimism; it is the soul standing firmly upon the immovable bedrock of divine promises already guaranteed in heaven.',
        'As you stand at the beginning of this new study chapter, trust that the same Holy Spirit who inspired the ancient words is actively preparing revelation tailored for your path today.',
      ],
    },
    shepherdCounsel: {
      reflection: 'Fix your gaze on the faithful Promiser; He who began the good work will faithfully complete it.',
      practicalStep: 'Write down one promise of God that anchors your current season, placing it inside your study notes as an altar of remembrance.',
      timeCommitmentMinutes: 5,
      prayerPoint: 'Father, I declare that my faith stands firmly on the title deed of Your covenant promises. I possess the assurance of what is hoped for, stepping forward in boldness and clarity today.',
    },
    nextAuditRoute: {
      verseReference: 'Hebrews 11:1',
      actionLabel: 'Examine Hebrews 11:1 in Detail',
    },
    diagnosis: {
      headline: 'Expectant Heart at the Threshold',
      rootCauseDescription: 'Standing at a transitional moment of spiritual renewal and active faith.',
      biblicalEquivalentTerm: 'Hupostasis / Substantial Assurance',
    },
  };
}

/**
 * Validates and sanitizes raw JSON into a guaranteed DiscipleshipDiagnosisPayload.
 */
export function validateDiagnosisPayload(
  raw: any,
  response: UserPulseResponse
): DiscipleshipDiagnosisPayload {
  const fallback = getFallbackDiagnosisPayload(response);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const sessionStatus = raw.sessionStatus === 'PROCEED_TO_STUDY' || raw.sessionStatus === 'DIAGNOSTIC_INTERVENTION'
    ? raw.sessionStatus
    : fallback.sessionStatus;

  // Editorial Scripture Anchor
  const scriptureAnchor = {
    reference: typeof raw.scriptureAnchor?.reference === 'string' && raw.scriptureAnchor.reference
      ? raw.scriptureAnchor.reference
      : fallback.scriptureAnchor.reference,
    text: typeof raw.scriptureAnchor?.text === 'string' && raw.scriptureAnchor.text
      ? raw.scriptureAnchor.text
      : fallback.scriptureAnchor.text,
  };

  // Editorial Biblical Narrative
  const rawNarrative = raw.biblicalNarrative;
  const paragraphs = Array.isArray(rawNarrative?.paragraphs) && rawNarrative.paragraphs.length > 0
    ? rawNarrative.paragraphs.map((p: any) => String(p).trim()).filter(Boolean)
    : fallback.biblicalNarrative.paragraphs;

  const biblicalNarrative = {
    title: typeof rawNarrative?.title === 'string' && rawNarrative.title
      ? rawNarrative.title
      : fallback.biblicalNarrative.title,
    paragraphs: paragraphs.length > 0 ? paragraphs : fallback.biblicalNarrative.paragraphs,
  };

  // Editorial Shepherd Counsel
  const rawCounsel = raw.shepherdCounsel;
  const shepherdCounsel = {
    reflection: typeof rawCounsel?.reflection === 'string' && rawCounsel.reflection
      ? rawCounsel.reflection
      : fallback.shepherdCounsel.reflection,
    practicalStep: typeof rawCounsel?.practicalStep === 'string' && rawCounsel.practicalStep
      ? rawCounsel.practicalStep
      : fallback.shepherdCounsel.practicalStep,
    timeCommitmentMinutes: typeof rawCounsel?.timeCommitmentMinutes === 'number' && rawCounsel.timeCommitmentMinutes > 0
      ? rawCounsel.timeCommitmentMinutes
      : fallback.shepherdCounsel.timeCommitmentMinutes,
    prayerPoint: typeof rawCounsel?.prayerPoint === 'string' && rawCounsel.prayerPoint.trim()
      ? rawCounsel.prayerPoint.trim()
      : fallback.shepherdCounsel.prayerPoint,
  };

  // Study Navigation Route
  const nextAuditRoute = {
    verseReference: typeof raw.nextAuditRoute?.verseReference === 'string' && raw.nextAuditRoute.verseReference
      ? raw.nextAuditRoute.verseReference
      : fallback.nextAuditRoute.verseReference,
    actionLabel: typeof raw.nextAuditRoute?.actionLabel === 'string' && raw.nextAuditRoute.actionLabel
      ? raw.nextAuditRoute.actionLabel
      : fallback.nextAuditRoute.actionLabel,
  };

  return {
    sessionStatus,
    scriptureAnchor,
    biblicalNarrative,
    shepherdCounsel,
    nextAuditRoute,
    // Preserve legacy fields if present or fallback
    diagnosis: raw.diagnosis || fallback.diagnosis,
    scripturalPrecedents: raw.scripturalPrecedents || fallback.scripturalPrecedents,
    covenantStrategy: raw.covenantStrategy || fallback.covenantStrategy,
    actionableHabit: raw.actionableHabit || fallback.actionableHabit,
  };
}

/**
 * Sends the user pulse response to the LLM diagnostic engine and returns
 * a strictly validated DiscipleshipDiagnosisPayload.
 */
export async function sendPulseCheck(
  response: UserPulseResponse
): Promise<DiscipleshipDiagnosisPayload> {
  // If the user selected 'joyful' or 'card_steady', immediately return the PROCEED_TO_STUDY payload
  if ((response.selectedCardId === 'joyful' || response.selectedCardId === 'card_steady') && !response.userInputText) {
    return getFallbackDiagnosisPayload(response);
  }

  try {
    const res = await fetch('/api/discipleship-pulse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    });

    if (res.ok) {
      const data = await res.json();
      return validateDiagnosisPayload(data, response);
    }
  } catch (err) {
    console.warn('[DiscipleshipAgentService] Server request failed, activating resilient fallback:', err);
  }

  // Resilient fallback (offline, mobile disconnected, or server error)
  return getFallbackDiagnosisPayload(response);
}
