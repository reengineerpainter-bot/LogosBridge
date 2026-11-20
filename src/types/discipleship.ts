/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DiagnosticKey =
  | 'REST_AND_RENEWAL'
  | 'RIGHTEOUSNESS_AND_GRACE'
  | 'FOCUS_AND_STILLNESS'
  | 'LIVING_WATER'
  | 'FAITH_AND_ASSURANCE'
  | 'PRAISE_AND_INTIMACY'
  | 'FATIGUE_AND_BURNOUT'
  | 'CONDEMNATION_AND_SHAME'
  | 'DIVIDED_ATTENTION'
  | 'DESERT_SEASON'
  | 'COVENANT_MOMENTUM'
  | string;

export interface CompanionCard {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export const companionCards: CompanionCard[] = [
  {
    id: "wearied",
    title: "Wearied and Heavy-Laden",
    description: "Experiencing physical fatigue or emotional exhaustion from the demands of the day, seeking a sanctuary of peace.",
    tag: "REST & RENEWAL"
  },
  {
    id: "burdened",
    title: "Burdened and Distant",
    description: "Feeling separated from God's presence or carrying the weight of recent shortcomings, desiring a return to His embrace.",
    tag: "RIGHTEOUSNESS & GRACE"
  },
  {
    id: "anxious",
    title: "Anxious and Overwhelmed",
    description: "Navigating worldly distractions and a divided schedule; seeking a quieted mind and divine alignment.",
    tag: "FOCUS & STILLNESS"
  },
  {
    id: "thirsting",
    title: "Thirsting for Renewal",
    description: "Traversing a season of spiritual quietness, desiring a deeper encounter and fresh revelation from the Word.",
    tag: "LIVING WATER"
  },
  {
    id: "expectant",
    title: "Expectant and Transforming",
    description: "Standing at a threshold of change, trusting the Father for guidance, clear vision, and a renewed path forward.",
    tag: "FAITH & ASSURANCE"
  },
  {
    id: "joyful",
    title: "Joyful and Abounding",
    description: "Experiencing the fullness of God's peace and victory; a heart prepared for gratitude and deeper fellowship.",
    tag: "PRAISE & INTIMACY"
  }
];

export interface DiscipleshipCard {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  tag?: string;
  badgeText?: string;
  diagnosticKey?: DiagnosticKey;
  icon?: string;
  defaultPrompt?: string;
}

export interface UserStudyState {
  lastStudiedVerse: string;
  lastStudiedTimestamp: string;
  consecutiveDays: number;
  recentStrongNumbers: string[];
  recentKeyWords: string[];
}

export interface UserPulseResponse {
  interactionType: 'CARD_SELECTION' | 'FREE_TEXT';
  selectedCardId?: string;
  diagnosticKey: DiagnosticKey;
  userInputText?: string;
  userStateSnapshot: UserStudyState;
}

// ─────────────────────────────────────────────────────────────
// EDITORIAL & SHEPHERD COUNSEL READING CANVAS TYPES
// ─────────────────────────────────────────────────────────────

export interface ScriptureAnchor {
  reference: string;
  text: string;
}

export interface BiblicalNarrative {
  title: string;
  /** 2-3 narrative paragraphs; one paragraph must isolate and unpack a key Greek or Hebrew root word etymology */
  paragraphs: string[];
}

export interface ShepherdCounsel {
  reflection: string;
  practicalStep: string;
  timeCommitmentMinutes?: number;
  /** A short, reverent 1-2 sentence scriptural prayer tailored to their condition */
  prayerPoint?: string;
}

// Deprecated legacy sub-structures preserved for deserialization compatibility
export interface ScripturalPrecedentOvercomer {
  biblicalFigure: string;
  scriptureReference: string;
  historicalContext: string;
  covenantAction: string;
}

export interface ScripturalPrecedentWarning {
  biblicalFigure: string;
  scriptureReference: string;
  historicalContext: string;
  criticalMisstep: string;
}

export interface DiscipleshipDiagnosisPayload {
  sessionStatus: 'PROCEED_TO_STUDY' | 'DIAGNOSTIC_INTERVENTION';
  
  // Editorial Canvas Primary Fields
  scriptureAnchor: ScriptureAnchor;
  biblicalNarrative: BiblicalNarrative;
  shepherdCounsel: ShepherdCounsel;
  
  nextAuditRoute: {
    verseReference: string;
    actionLabel: string;
  };

  // Backward-compatibility aliases
  diagnosis?: {
    headline: string;
    rootCauseDescription: string;
    biblicalEquivalentTerm: string;
  };
  scripturalPrecedents?: {
    overcomerPrototype?: ScripturalPrecedentOvercomer;
    warningPrototype?: ScripturalPrecedentWarning;
  };
  covenantStrategy?: {
    protocolName?: string;
    principleExplanation?: string;
  };
  actionableHabit?: {
    title?: string;
    timeCommitmentMinutes?: number;
    practicalStep?: string;
    scripturalAnchor?: string;
  };
}
