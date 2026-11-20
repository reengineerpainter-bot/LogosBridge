/**
 * Device & System User Identity Utility
 * Manages persistent hardware/system user IDs, handles, and Christian Fellowship Covenant state.
 */

const STORAGE_KEY_USER_ID = 'logosbridge_system_user_id';
const STORAGE_KEY_USER_HANDLE = 'logosbridge_system_user_handle';
const STORAGE_KEY_COVENANT = 'logosbridge_fellowship_covenant_v1';

/**
 * Retrieves the persistent system device/user ID or generates a unique one on first installation.
 */
export function getOrGenerateSystemUserId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (!id || id.trim().length === 0) {
      const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timeHex = Date.now().toString(36).slice(-4).toUpperCase();
      id = `LB-${randHex}-${timeHex}`;
      localStorage.setItem(STORAGE_KEY_USER_ID, id);
    }
    return id;
  } catch {
    return 'LB-LOCAL-USER';
  }
}

/**
 * Retrieves the display handle for the user or assigns a respectful default.
 */
export function getSystemUserHandle(): string {
  try {
    const handle = localStorage.getItem(STORAGE_KEY_USER_HANDLE);
    if (handle && handle.trim().length > 0) {
      return handle.trim();
    }
    const id = getOrGenerateSystemUserId();
    const suffix = id.split('-').pop() || '777';
    return `Disciple-${suffix}`;
  } catch {
    return 'Fellow Believer';
  }
}

/**
 * Saves a custom display handle for fellowship communion.
 */
export function setSystemUserHandle(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER_HANDLE, name.trim());
  } catch {}
}

/**
 * Checks if the user has read and accepted the Christian Fellowship Covenant.
 */
export function isFellowshipCovenantAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_COVENANT) === 'accepted';
  } catch {
    return false;
  }
}

/**
 * Records covenant acceptance with timestamp.
 */
export function acceptFellowshipCovenant(): void {
  try {
    localStorage.setItem(STORAGE_KEY_COVENANT, 'accepted');
    localStorage.setItem(`${STORAGE_KEY_COVENANT}_timestamp`, Date.now().toString());
  } catch {}
}

/**
 * Reset covenant acceptance if needed.
 */
export function resetFellowshipCovenant(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_COVENANT);
  } catch {}
}

/**
 * Christian Fellowship Covenant Guidelines & Terms
 */
export const FELLOWSHIP_COVENANT_TERMS = [
  {
    pillar: 'Unity in Christ',
    scripture: 'Ephesians 4:1-3',
    description: 'We gather in humility, meekness, and patience, bearing with one another in divine love and eager to maintain the unity of the Spirit.'
  },
  {
    pillar: 'Edifying Confession & Speech',
    scripture: '1 Thessalonians 5:11',
    description: 'All comments, prayers, and declarations must build up, encourage, and edify the body of Christ. No discordant, profane, or abusive communication is permitted.'
  },
  {
    pillar: 'Prayer Band Agreement',
    scripture: 'Matthew 18:19',
    description: 'When two or three agree on earth concerning anything asked in Jesus\' name, our Father in heaven hears. We join in sincere prayer agreement for breakthrough and healing.'
  },
  {
    pillar: 'Reverent Broadcast Order',
    scripture: '1 Corinthians 14:40',
    description: 'Let all things be done decently and in holy order. Broadcasting, recording, and moderation permissions rest with the appointed room host.'
  }
];
