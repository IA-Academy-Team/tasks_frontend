import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, X, Plus, Trash2 } from 'lucide-react';
import { mockUsers, getGroups, createGroup, deleteGroup } from '../store';
import { User, Group } from '../types';

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setGroups(getGroups());
  }, []);

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.find(u => u.id === user.id)
  );

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      createGroup(groupName, selectedUsers);
      setGroups(getGroups());
      setGroupName('');
      setSelectedUsers([]);
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('¿Estás seguro de eliminar este grupo?')) {
      deleteGroup(groupId);
      setGroups(getGroups());
    }
  };

  return (
    <div className="size-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Create Group Form */}
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Crear Grupo
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Grupo</h3>

            {/* Group Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del grupo *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Equipo de Desarrollo"
              />
            </div>

            {/* Search Users */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar personas *
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar personas..."
                  />
                </div>

                {/* Search Results */}
                {showResults && searchQuery && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <div className="size-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Personas seleccionadas ({selectedUsers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{user.name}</span>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="hover:bg-blue-100 rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Grupo
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setGroupName('');
                  setSelectedUsers([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Groups List */}
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <UsersIcon className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay grupos creados</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <UsersIcon className="size-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.members.length} miembros</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full text-sm"
                    >
                      <div className="size-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-gray-700">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}