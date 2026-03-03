import { useState } from 'react';
import { Navigate } from 'react-router';
import { UserCircle, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Users } from './Users';
import { Groups } from './Groups';

export function Members() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h2 className="text-2xl font-bold text-gray-900">Miembros</h2>
        <p className="text-sm text-gray-500 mt-1">Gestiona usuarios y grupos del sistema</p>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCircle className="size-4" />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <UsersIcon className="size-4" />
            Grupos
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'users' ? <Users /> : <Groups />}
      </div>
    </div>
  );
}
