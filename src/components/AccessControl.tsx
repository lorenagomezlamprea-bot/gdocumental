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
    <div className="space-y-10">
      <div className="bg-dark-card p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center">
            <div className="bg-accent-blue/10 p-5 rounded-3xl mr-6 border border-accent-blue/20 shadow-inner">
              <Users className="w-8 h-8 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Control de Accesos</h2>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Gestión de permisos y validación de personal</p>
            </div>
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..."
              className="w-full bg-slate-800/30 border border-slate-800/50 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-blue/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-12 overflow-x-auto relative z-10">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-800/50">
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rol Actual</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white tracking-tight group-hover:text-accent-blue transition-colors">{user.nombre_completo || 'Sin nombre'}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <span className={cn(
                      "px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg shadow-black/20",
                      user.estado === 'aprobado' ? "bg-accent-purple/10 text-accent-purple border-accent-purple/20" :
                      user.estado === 'rechazado' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {user.estado}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Shield className="w-4 h-4 mr-3 text-slate-700" />
                      <span className="capitalize">{user.rol.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      {user.estado === 'pendiente' ? (
                        <>
                          <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                            <button 
                              disabled={processingId === user.id}
                              onClick={() => handleAction(user.id, 'aprobado', 'editor')}
                              className="px-4 py-2 text-[10px] font-black text-accent-blue hover:bg-dark-card rounded-xl transition-all uppercase tracking-widest"
                            >
                              Editor
                            </button>
                            <button 
                              disabled={processingId === user.id}
                              onClick={() => handleAction(user.id, 'aprobado', 'visualizador')}
                              className="px-4 py-2 text-[10px] font-black text-slate-500 hover:bg-dark-card hover:text-white rounded-xl transition-all uppercase tracking-widest"
                            >
                              Lector
                            </button>
                          </div>
                          <button 
                            disabled={processingId === user.id}
                            onClick={() => handleAction(user.id, 'rechazado')}
                            className="p-3 text-rose-500 hover:text-white hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Rechazar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <select 
                            disabled={processingId === user.id}
                            className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest focus:ring-1 focus:ring-accent-blue outline-none transition-all"
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
                            className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Revocar Acceso"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {processingId === user.id && <Loader2 className="w-5 h-5 text-accent-blue animate-spin ml-2" />}
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
