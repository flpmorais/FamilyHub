export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // userId
  createdBy: string; // userId
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}
