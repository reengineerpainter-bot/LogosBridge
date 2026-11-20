/**
 * LogosBridge Fellowship Center & Live Studio Viewer Types
 * Defines data structures for watch mode, room tickets, covenant agreement,
 * audience roster, and spiritual communion interactions.
 */

export type FellowshipInteractionType =
  | 'comment'           // General respectful feedback
  | 'prayer_amen'       // Prayer Band ("Amen / In Agreement")
  | 'word_confession'   // Scripture & faith confession
  | 'prophetic_word';   // Prophetic utterance / edification

export interface FellowshipMessage {
  id: string;
  senderId: string;        // System User ID (e.g. LB-xxxx-xxxx)
  senderName: string;      // Display Handle
  room: string;
  type: FellowshipInteractionType;
  text: string;
  scriptureRef?: string;   // Optional Bible verse tag
  timestamp: number;
}

export interface FellowshipParticipant {
  userId: string;          // Unique System Device ID
  displayName: string;     // Handle or user label
  role: 'host' | 'viewer';
  joinedAt: number;
  canRecord: boolean;      // Host-granted permission to record broadcast
  isFaithAligned: boolean; // Confirmed covenant acceptance
}

export interface FellowshipRoomState {
  roomKey: string;
  hostId: string;
  hostName: string;
  title: string;
  viewerCount: number;
  isChatEnabled: boolean;
  allowPublicRecording: boolean;
  participants: FellowshipParticipant[];
}

export interface FellowshipCovenant {
  accepted: boolean;
  acceptedAt?: number;
  version: string;
  userId: string;
}
