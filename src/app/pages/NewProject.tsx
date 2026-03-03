import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, Users as UsersIcon, UserPlus } from 'lucide-react';
import { mockUsers, getGroups, createProject } from '../store';
import { User, Group } from '../types';

export function NewProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [showResults, setShowResults] = useState(false);

  const groups = getGroups();

  // Filter users and groups based on search
  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.find(u => u.id === user.id)
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedGroups.find(g => g.id === group.id)
  );

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleAddGroup = (group: Group) => {
    setSelectedGroups([...selectedGroups, group]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups(selectedGroups.filter(g => g.id !== groupId));
  };

  const handleCreateProject = () => {
    if (projectName.trim()) {
      const project = createProject(projectName, selectedUsers, selectedGroups);
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <div className="size-full overflow-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Proyecto</h2>

          {/* Project Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa el nombre del proyecto"
            />
          </div>

          {/* Search Participants */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar participantes
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
                  placeholder="Buscar usuarios o grupos..."
                />
              </div>

              {/* Search Results */}
              {showResults && searchQuery && (filteredUsers.length > 0 || filteredGroups.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filteredUsers.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        Usuarios
                      </div>
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddUser(user)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UserPlus className="size-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredGroups.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        Grupos
                      </div>
                      {filteredGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => handleAddGroup(group)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UsersIcon className="size-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{group.name}</p>
                            <p className="text-xs text-gray-500">{group.members.length} miembros</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Usuarios seleccionados</p>
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

          {/* Selected Groups */}
          {selectedGroups.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Grupos seleccionados</p>
              <div className="flex flex-wrap gap-2">
                {selectedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm"
                  >
                    <UsersIcon className="size-3" />
                    <span>{group.name}</span>
                    <button
                      onClick={() => handleRemoveGroup(group.id)}
                      className="hover:bg-purple-100 rounded-full p-0.5"
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
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Crear Proyecto
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
