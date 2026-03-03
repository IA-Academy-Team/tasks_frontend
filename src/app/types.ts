export type UserRole = 'admin' | 'trabajador';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  members: User[];
}

export interface Task {
  id: string;
  description: string;
  startDate: string;
  endDate: string;
  assignedTo: string; // userId
  columnId: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  users: User[];
  groups: Group[];
  columns: Column[];
}