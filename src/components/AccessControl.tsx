import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, CheckCircle, XCircle, Shield, Loader2, Search, UserCheck } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';

export const AccessControl = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('estado', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, newStatus: 'aprobado' | 'rechazado', newRole?: UserRole) => {
    setProcessingId(userId);
    try {
      const updateData: any = { estado: newStatus };
      if (newRole) updateData.rol = newRole;

      const { error } = await supabase
        .from('perfiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Error al actualizar el usuario');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.nombre_completo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-eveca-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center">
            <div className="bg-eveca-primary/10 p-3 rounded-2xl mr-4">
              <Users className="w-6 h-6 text-eveca-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Control de Accesos</h2>
              <p className="text-sm text-gray-500">Gestione las aprobaciones y roles de los usuarios del sistema.</p>
            </div>
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..."
              className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase">Usuario</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase">Rol Actual</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700">{user.nombre_completo || 'Sin nombre'}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      user.estado === 'aprobado' ? "bg-green-50 text-green-700 border-green-100" :
                      user.estado === 'rechazado' ? "bg-red-50 text-red-700 border-red-100" :
                      "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                      {user.estado}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center text-xs font-medium text-gray-600">
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                      <span className="capitalize">{user.rol.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {user.estado === 'pendiente' ? (
                        <>
                          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button 
                              disabled={processingId === user.id}
                              onClick={() => handleAction(user.id, 'aprobado', 'editor')}
                              className="px-3 py-1.5 text-[10px] font-bold text-eveca-primary hover:bg-white rounded-md transition-all flex items-center"
                            >
                              Aprobar Editor
                            </button>
                            <button 
                              disabled={processingId === user.id}
                              onClick={() => handleAction(user.id, 'aprobado', 'visualizador')}
                              className="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-white rounded-md transition-all flex items-center"
                            >
                              Aprobar Lector
                            </button>
                          </div>
                          <button 
                            disabled={processingId === user.id}
                            onClick={() => handleAction(user.id, 'rechazado')}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Rechazar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <select 
                            disabled={processingId === user.id}
                            className="bg-gray-50 border-none rounded-lg py-1.5 pl-3 pr-8 text-[10px] font-bold text-gray-600 focus:ring-1 focus:ring-eveca-primary outline-none"
                            value={user.rol}
                            onChange={(e) => handleAction(user.id, 'aprobado', e.target.value as UserRole)}
                          >
                            <option value="visualizador">Visualizador</option>
                            <option value="editor">Editor</option>
                            <option value="administrador">Administrador</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                          <button 
                            disabled={processingId === user.id}
                            onClick={() => handleAction(user.id, 'rechazado')}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Revocar Acceso"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {processingId === user.id && <Loader2 className="w-4 h-4 text-eveca-primary animate-spin" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
