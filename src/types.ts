export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export interface Category {
  id: string;
  name: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string; // Name or ID of category
  assigneeName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TaskStatus;
  progress?: number; // 0-100
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  taskId: string;
  taskTitle: string;
  updatedBy: string; // Full name of updater
  updatedByUsername: string; // Username of updater
  changeType: 'created' | 'updated' | 'deleted';
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  username: string;
  createdAt: string;
}
