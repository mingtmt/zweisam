import type { Timestamp } from "firebase/firestore";

export interface User {
  displayName: string;
  email: string;
  photoURL: string;
  partnerId: string | null;
  inviteCode: string;
  points: number;
  createdAt: Timestamp;
}

export type QuestSchedule = "daily" | "weekly" | "special";
export type QuestStatus = "pending" | "active" | "completed";

export interface Quest {
  id?: string;
  userId: string;
  title: string;
  description: string;
  schedule: QuestSchedule;
  status: QuestStatus;
  points: number;
  createdBy: string;
  active: boolean;
  icon?: string;
  scheduledAt?: string;
  completedAt?: Timestamp | Date;
  createdAt: Timestamp;
}

export interface Reward {
  id?: string;
  userId: string;
  title: string;
  description: string;
  pointCost: number;
  createdBy: string;
  createdAt: Timestamp;
}