import { User, Group, Project } from './types';

// Solo dos usuarios: admin y trabajador
let users: User[] = [
  { id: '1', name: 'Administrador', email: 'admin@tasks.com', username: 'admin', password: 'admin123', role: 'admin' },
  { id: '2', name: 'Trabajador', email: 'trabajador@tasks.com', username: 'trabajador', password: 'trab123', role: 'trabajador' },
];

// Mock data for users (for backward compatibility)
export const mockUsers: User[] = users;

// Users management
export const getUsers = (): User[] => users;

export const createUser = (userData: Omit<User, 'id'>): User => {
  const newUser: User = {
    id: Date.now().toString(),
    role: 'trabajador', // los nuevos usuarios creados desde Miembros son trabajadores
    ...userData,
  };
  users = [...users, newUser];
  return newUser;
};

export const deleteUser = (userId: string): void => {
  users = users.filter(u => u.id !== userId);
};

// Store state
let groups: Group[] = [];
let projects: Project[] = [];

// Groups management
export const getGroups = (): Group[] => groups;

export const createGroup = (name: string, members: User[]): Group => {
  const newGroup: Group = {
    id: Date.now().toString(),
    name,
    members,
  };
  groups = [...groups, newGroup];
  return newGroup;
};

export const deleteGroup = (groupId: string): void => {
  groups = groups.filter(g => g.id !== groupId);
};

// Projects management
export const getProjects = (): Project[] => projects;

export const getProjectById = (projectId: string): Project | undefined => {
  return projects.find(p => p.id === projectId);
};

export const createProject = (
  name: string,
  users: User[],
  selectedGroups: Group[]
): Project => {
  const newProject: Project = {
    id: Date.now().toString(),
    name,
    users,
    groups: selectedGroups,
    columns: [
      { id: '1', title: 'Asignada', tasks: [] },
      { id: '2', title: 'En proceso', tasks: [] },
      { id: '3', title: 'En revisión', tasks: [] },
      { id: '4', title: 'Producción', tasks: [] },
    ],
  };
  projects = [...projects, newProject];
  return newProject;
};

export const updateProject = (projectId: string, updatedProject: Project): void => {
  projects = projects.map(p => p.id === projectId ? updatedProject : p);
};

export const deleteProject = (projectId: string): void => {
  projects = projects.filter(p => p.id !== projectId);
};