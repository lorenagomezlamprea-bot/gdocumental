import React, { useState, useEffect } from 'react';
import { Settings, Users, Network, Layers, ChevronRight, Plus, Save, X, Edit2, Loader2, ListOrdered } from 'lucide-react';
import { Proceso, TipoDocumento, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { logAccion } from '../lib/audit';

export const AdminModule = ({ 
  processes, 
  types,
  onRefresh,
  onViewChange,
  currentUserProfile
}: { 
  processes: Proceso[], 
  types: TipoDocumento[],
  onRefresh: () => void,
  onViewChange: (view: string) => void,
  currentUserProfile: UserProfile | null
}) => {
  const [isAddingProcess, setIsAddingProcess] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'proceso' | 'tipo', data: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consecutivos, setConsecutivos] = useState<any[]>([]);
  const [loadingConsecutivos, setLoadingConsecutivos] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    abreviatura: '',
    periodo_revision_anos: 1
  });

  const fetchConsecutivos = async () => {
    setLoadingConsecutivos(true);
    try {
      const { data, error } = await supabase.from('vista_ultimos_consecutivos').select('*');
      if (error) throw error;
      setConsecutivos(data || []);
    } catch (err) {
      console.error('Error fetching consecutivos:', err);
    } finally {
      setLoadingConsecutivos(false);
    }
  };

  useEffect(() => {
    fetchConsecutivos();
  }, []);

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('procesos')
          .update({ nombre: formData.nombre, abreviatura: formData.abreviatura })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        
        if (currentUserProfile) {
          logAccion(currentUserProfile.id, 'UPDATE', 'procesos', editingItem.data.id, { nombre: formData.nombre });
        }
      } else {
        const { error, data } = await supabase
          .from('procesos')
          .insert([{ nombre: formData.nombre, abreviatura: formData.abreviatura }])
          .select()
          .single();
        if (error) throw error;
        
        if (currentUserProfile && data) {
          logAccion(currentUserProfile.id, 'CREATE', 'procesos', data.id, { nombre: formData.nombre });
        }
      }
      onRefresh();
      setIsAddingProcess(false);
      setEditingItem(null);
      setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('tipos_documento')
          .update({ 
            nombre: formData.nombre, 
            abreviatura: formData.abreviatura,
            periodo_revision_anos: formData.periodo_revision_anos 
          })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        
        if (currentUserProfile) {
          logAccion(currentUserProfile.id, 'UPDATE', 'tipos_documento', editingItem.data.id, { nombre: formData.nombre });
        }
      } else {
        const { error, data } = await supabase
          .from('tipos_documento')
          .insert([{ 
            nombre: formData.nombre, 
            abreviatura: formData.abreviatura,
            periodo_revision_anos: formData.periodo_revision_anos 
          }])
          .select()
          .single();
        if (error) throw error;
        
        if (currentUserProfile && data) {
          logAccion(currentUserProfile.id, 'CREATE', 'tipos_documento', data.id, { nombre: formData.nombre });
        }
      }
      onRefresh();
      setIsAddingType(false);
      setEditingItem(null);
      setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (type: 'proceso' | 'tipo', item: any) => {
    setEditingItem({ type, data: item });
    setFormData({
      nombre: item.nombre,
      abreviatura: item.abreviatura,
      periodo_revision_anos: item.periodo_revision_anos || 1
    });
    if (type === 'proceso') setIsAddingProcess(true);
    else setIsAddingType(true);
  };

  return (
    <div className="space-y-10">
      <div className="bg-dark-card p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-accent-purple/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex items-center mb-12 relative z-10">
          <div className="bg-accent-purple/10 p-5 rounded-3xl mr-6 border border-accent-purple/20 shadow-inner">
            <Settings className="w-8 h-8 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Panel de Control</h2>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Administración de procesos y parámetros maestros</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
          {/* Processes Management */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center">
                <Network className="w-5 h-5 text-accent-purple mr-3" />
                <h3 className="font-black text-white text-xs uppercase tracking-[0.25em]">Procesos</h3>
              </div>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
                  setIsAddingProcess(true);
                }}
                className="bg-accent-purple/10 text-accent-purple hover:bg-accent-purple hover:text-white p-2 rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {isAddingProcess && (
              <form onSubmit={handleSaveProcess} className="bg-slate-800/30 p-6 rounded-[2rem] border border-accent-purple/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre</label>
                    <input 
                      required
                      className="w-full bg-dark-bg border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-accent-purple outline-none"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Abrev.</label>
                    <input 
                      required
                      className="w-full bg-dark-bg border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-accent-purple outline-none"
                      value={formData.abreviatura}
                      onChange={e => setFormData({...formData, abreviatura: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsAddingProcess(false)} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancelar</button>
                  <button disabled={isSubmitting} type="submit" className="bg-accent-purple text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-accent-purple/20 transition-all hover:scale-105">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-800/20 rounded-[2rem] overflow-hidden border border-slate-800/50">
              <div className="divide-y divide-slate-800/50">
                {processes.length > 0 ? processes.map(p => (
                  <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-800/40 transition-all group">
                    <div className="flex items-center">
                      <span className="w-12 h-12 flex items-center justify-center bg-dark-card rounded-2xl text-xs font-black text-accent-purple shadow-xl border border-slate-800 mr-4 group-hover:scale-110 transition-transform">
                        {p.abreviatura}
                      </span>
                      <span className="text-sm font-black text-white tracking-tight">{p.nombre}</span>
                    </div>
                    <button onClick={() => startEdit('proceso', p)} className="p-3 text-slate-600 hover:text-accent-purple transition-all opacity-0 group-hover:opacity-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )) : (
                  <p className="p-12 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest italic">No hay procesos</p>
                )}
              </div>
            </div>
          </div>

          {/* Document Types Management */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center">
                <Layers className="w-5 h-5 text-accent-cyan mr-3" />
                <h3 className="font-black text-white text-xs uppercase tracking-[0.25em]">Tipos</h3>
              </div>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
                  setIsAddingType(true);
                }}
                className="bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan hover:text-white p-2 rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {isAddingType && (
              <form onSubmit={handleSaveType} className="bg-slate-800/30 p-6 rounded-[2rem] border border-accent-cyan/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre</label>
                    <input 
                      required
                      className="w-full bg-dark-bg border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-accent-cyan outline-none"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Abrev.</label>
                    <input 
                      required
                      className="w-full bg-dark-bg border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-accent-cyan outline-none"
                      value={formData.abreviatura}
                      onChange={e => setFormData({...formData, abreviatura: e.target.value})}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Revisión (Años)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      className="w-full bg-dark-bg border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-accent-cyan outline-none"
                      value={formData.periodo_revision_anos}
                      onChange={e => setFormData({...formData, periodo_revision_anos: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsAddingType(false)} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancelar</button>
                  <button disabled={isSubmitting} type="submit" className="bg-accent-cyan text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-accent-cyan/20 transition-all hover:scale-105">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-800/20 rounded-[2rem] overflow-hidden border border-slate-800/50">
              <div className="divide-y divide-slate-800/50">
                {types.length > 0 ? types.map(t => (
                  <div key={t.id} className="p-6 flex items-center justify-between hover:bg-slate-800/40 transition-all group">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm font-black text-white tracking-tight group-hover:text-accent-cyan transition-colors">{t.nombre}</span>
                        <span className="ml-3 px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan text-[10px] font-black rounded-lg uppercase tracking-widest border border-accent-cyan/20">
                          {t.abreviatura}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-widest italic">Rev: {t.periodo_revision_anos} {t.periodo_revision_anos === 1 ? 'año' : 'años'}</span>
                    </div>
                    <button onClick={() => startEdit('tipo', t)} className="p-3 text-slate-600 hover:text-accent-cyan transition-all opacity-0 group-hover:opacity-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )) : (
                  <p className="p-12 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest italic">No hay tipos</p>
                )}
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center px-2">
              <Users className="w-5 h-5 text-accent-blue mr-3" />
              <h3 className="font-black text-white text-xs uppercase tracking-[0.25em]">Accesos</h3>
            </div>
            <div className="bg-accent-blue/5 border border-accent-blue/10 p-8 rounded-[2rem] flex flex-col items-start justify-between gap-6 h-full shadow-inner">
              <div>
                <p className="font-black text-white text-sm uppercase tracking-widest">Gestión de Perfiles</p>
                <p className="text-[10px] text-slate-500 font-bold mt-2 leading-relaxed">Administre los permisos y aprobación de nuevos usuarios en la plataforma.</p>
              </div>
              <button 
                onClick={() => onViewChange('access_control')}
                className="w-full bg-dark-card text-accent-blue font-black py-4 rounded-2xl border border-accent-blue/20 hover:bg-accent-blue hover:text-white transition-all shadow-xl shadow-black/20 text-[10px] uppercase tracking-widest"
              >
                Ir a Control de Usuarios
              </button>
            </div>
          </div>

          {/* Audit Log Entry */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center px-2">
              <ListOrdered className="w-5 h-5 text-accent-cyan mr-3" />
              <h3 className="font-black text-white text-xs uppercase tracking-[0.25em]">Sistema</h3>
            </div>
            <div className="bg-slate-800/10 border border-slate-800 p-8 rounded-[2rem] flex flex-col items-start justify-between gap-6 h-full shadow-inner">
              <div>
                <p className="font-black text-white text-sm uppercase tracking-widest">Logs de Actividad</p>
                <p className="text-[10px] text-slate-500 font-bold mt-2 leading-relaxed">Bitácora completa de todas las acciones ejecutadas en el gestor documental.</p>
              </div>
              <button 
                onClick={() => onViewChange('audit_log')}
                className="w-full bg-dark-card text-slate-400 font-black py-4 rounded-2xl border border-slate-800 hover:bg-slate-800 hover:text-white transition-all shadow-xl shadow-black/20 text-[10px] uppercase tracking-widest"
              >
                Ver Bitácora de Logs
              </button>
            </div>
          </div>

          {/* Histórico de Consecutivos */}
          <div className="col-span-1 lg:col-span-2 space-y-6 pt-12">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center">
                <ListOrdered className="w-5 h-5 text-accent-purple mr-3" />
                <h3 className="font-black text-white text-xs uppercase tracking-[0.25em]">Últimos Consecutivos</h3>
              </div>
              <div className="flex items-center space-x-6">
                {currentUserProfile?.rol === 'superadmin' && (
                  <button 
                    onClick={async () => {
                      if (window.confirm('¿Está seguro de que desea vaciar el historial?')) {
                        try {
                          const { error } = await supabase.rpc('vaciar_consecutivos');
                          if (error) throw error;
                          if (currentUserProfile) {
                            logAccion(currentUserProfile.id, 'DELETE', 'consecutivos', 'TODO', { accion: 'vaciar_historial' });
                          }
                          await fetchConsecutivos();
                          alert('Historial vaciado.');
                        } catch (err: any) {
                          alert(`Error: ${err.message}`);
                        }
                      }
                    }}
                    className="text-[10px] font-black text-rose-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
                  >
                    Vaciar Historial
                  </button>
                )}
                <button 
                  onClick={fetchConsecutivos}
                  className="text-[10px] font-black text-accent-purple hover:text-white uppercase tracking-widest transition-colors"
                >
                  Actualizar Vista
                </button>
              </div>
            </div>
            
            <div className="bg-dark-card rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/20 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <th className="px-10 py-6">Proceso</th>
                    <th className="px-10 py-6">Tipo</th>
                    <th className="px-10 py-6">Contador</th>
                    <th className="px-10 py-6 text-right">Último Código</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loadingConsecutivos ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-12 text-center">
                        <Loader2 className="w-6 h-6 text-accent-purple animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : consecutivos.length > 0 ? consecutivos.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-all">
                      <td className="px-10 py-8 text-sm font-black text-white tracking-tight">{item.proceso}</td>
                      <td className="px-10 py-8 text-xs font-bold text-slate-500">{item.tipo}</td>
                      <td className="px-10 py-8">
                        <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-widest">
                          #{item.ultimo_consecutivo.toString().padStart(3, '0')}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-xs font-black text-accent-purple tracking-widest text-right">
                        {item.ultimo_codigo}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-10 py-12 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest italic">
                        Sin registros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

