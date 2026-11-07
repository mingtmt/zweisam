import type { Timestamp } from "firebase/firestore";

export type Locale = "vi" | "en";

export interface User {
  id?: string;
  displayName: string;
  email: string;
  photoURL: string;
  partnerId: string | null;
  coupleId?: string | null;
  nickname?: string;
  inviteCode: string;
  points: number;
  locale?: Locale;
  createdAt: Timestamp;
}

export interface Couple {
  members: [string, string];
  createdAt: Timestamp;
}

export type QuestSchedule = "daily" | "weekly" | "special";
export type QuestStatus = "pending" | "active" | "completed";

export interface Quest {
  id?: string;
  title: string;
  description: string;
  schedule: QuestSchedule;
  status: QuestStatus;
  points: number;
  createdBy: string;
  active: boolean;
  target?: string;
  completedBy?: string;
  completions?: Record<string, Timestamp>;
  /** Points credited to each user for their current completion (refunded on untick). */
  awarded?: Record<string, number>;
  icon?: string;
  scheduledAt?: string;
  completedAt?: Timestamp | Date;
  createdAt: Timestamp;
}

export interface Reward {
  id?: string;
  title: string;
  description: string;
  pointCost: number;
  createdBy: string;
  /** null = can be claimed any number of times until deleted. */
  maxClaims: number | null;
  claimCount: number;
  /** Set together with a claimCount decrement when a claim is cancelled. */
  lastCancelledClaim?: string;
  createdAt: Timestamp;
}

export interface Claim {
  id?: string;
  rewardId: string;
  rewardTitle: string;
  pointCost: number;
  claimedBy: string;
  /** The reward's creator — the partner who owes the reward. */
  rewardOwner: string;
  claimedAt: Timestamp;
  fulfilledAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
}
