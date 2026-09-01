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
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center mb-8">
          <div className="bg-eveca-accent/10 p-3 rounded-2xl mr-4">
            <Settings className="w-6 h-6 text-eveca-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Administración del Sistema</h2>
            <p className="text-sm text-gray-500">Gestione los parámetros maestros y usuarios del gestor documental.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Processes Management */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center">
                <Network className="w-5 h-5 text-eveca-primary mr-2" />
                <h3 className="font-bold text-gray-700">Procesos</h3>
              </div>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
                  setIsAddingProcess(true);
                }}
                className="text-eveca-primary hover:bg-eveca-primary/5 p-1 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {isAddingProcess && (
              <form onSubmit={handleSaveProcess} className="bg-gray-50 p-4 rounded-2xl border border-eveca-primary/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                    <input 
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Abrev.</label>
                    <input 
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
                      value={formData.abreviatura}
                      onChange={e => setFormData({...formData, abreviatura: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsAddingProcess(false)} className="px-3 py-1.5 text-xs font-bold text-gray-400">Cancelar</button>
                  <button disabled={isSubmitting} type="submit" className="bg-eveca-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center">
                    {isSubmitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              <div className="divide-y divide-gray-100">
                {processes.length > 0 ? processes.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors group">
                    <div className="flex items-center">
                      <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-xs font-bold text-eveca-primary shadow-sm border border-gray-100 mr-3">
                        {p.abreviatura}
                      </span>
                      <span className="text-sm font-bold text-gray-600">{p.nombre}</span>
                    </div>
                    <button onClick={() => startEdit('proceso', p)} className="p-2 text-gray-300 hover:text-eveca-primary opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )) : (
                  <p className="p-8 text-center text-xs text-gray-400 font-bold uppercase italic">No hay procesos registrados</p>
                )}
              </div>
            </div>
          </div>

          {/* Document Types Management */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center">
                <Layers className="w-5 h-5 text-eveca-primary mr-2" />
                <h3 className="font-bold text-gray-700">Tipos de Documento</h3>
              </div>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ nombre: '', abreviatura: '', periodo_revision_anos: 1 });
                  setIsAddingType(true);
                }}
                className="text-eveca-primary hover:bg-eveca-primary/5 p-1 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {isAddingType && (
              <form onSubmit={handleSaveType} className="bg-gray-50 p-4 rounded-2xl border border-eveca-primary/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                    <input 
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Abrev.</label>
                    <input 
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
                      value={formData.abreviatura}
                      onChange={e => setFormData({...formData, abreviatura: e.target.value})}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Período de Revisión (Años)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
                      value={formData.periodo_revision_anos}
                      onChange={e => setFormData({...formData, periodo_revision_anos: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsAddingType(false)} className="px-3 py-1.5 text-xs font-bold text-gray-400">Cancelar</button>
                  <button disabled={isSubmitting} type="submit" className="bg-eveca-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center">
                    {isSubmitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              <div className="divide-y divide-gray-100">
                {types.length > 0 ? types.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors group">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm font-bold text-gray-600 group-hover:text-eveca-primary transition-colors">{t.nombre}</span>
                        <span className="ml-2 px-1.5 py-0.5 bg-eveca-primary/10 text-eveca-primary text-[10px] font-bold rounded uppercase tracking-wider">
                          {t.abreviatura}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Revisión cada {t.periodo_revision_anos} años</span>
                    </div>
                    <button onClick={() => startEdit('tipo', t)} className="p-2 text-gray-300 hover:text-eveca-primary opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )) : (
                  <p className="p-8 text-center text-xs text-gray-400 font-bold uppercase italic">No hay tipos registrados</p>
                )}
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center px-2">
              <Users className="w-5 h-5 text-eveca-primary mr-2" />
              <h3 className="font-bold text-gray-700">Control de Usuarios</h3>
            </div>
            <div className="bg-eveca-primary/5 border border-eveca-primary/10 p-6 rounded-2xl flex flex-col items-start justify-between gap-4 h-full">
              <div>
                <p className="font-bold text-eveca-primary">Gestión de Accesos</p>
                <p className="text-xs text-gray-500 mt-1">Configure los roles y apruebe nuevas solicitudes de personal.</p>
              </div>
              <button 
                onClick={() => onViewChange('access_control')}
                className="w-full bg-white text-eveca-primary font-bold px-6 py-2.5 rounded-xl border border-eveca-primary/20 hover:bg-eveca-primary hover:text-white transition-all shadow-sm"
              >
                Gestionar Perfiles
              </button>
            </div>
          </div>

          {/* Audit Log Entry */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center px-2">
              <ListOrdered className="w-5 h-5 text-eveca-primary mr-2" />
              <h3 className="font-bold text-gray-700">Trazabilidad</h3>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl flex flex-col items-start justify-between gap-4 h-full">
              <div>
                <p className="font-bold text-amber-700">Auditoría del Sistema</p>
                <p className="text-xs text-gray-500 mt-1">Consulte el historial de acciones, modificaciones y eliminaciones de registros.</p>
              </div>
              <button 
                onClick={() => onViewChange('audit_log')}
                className="w-full bg-white text-amber-700 font-bold px-6 py-2.5 rounded-xl border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
              >
                Ver Bitácora de Logs
              </button>
            </div>
          </div>

          {/* Histórico de Consecutivos */}
          <div className="col-span-1 lg:col-span-2 space-y-4 pt-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center">
                <ListOrdered className="w-5 h-5 text-eveca-primary mr-2" />
                <h3 className="font-bold text-gray-700">Histórico de Últimos Consecutivos</h3>
              </div>
              <div className="flex items-center space-x-4">
                {currentUserProfile?.rol === 'superadmin' && (
                  <button 
                    onClick={async () => {
                      if (window.confirm('¿Está seguro de que desea vaciar el historial de consecutivos? Esto reiniciará todos los contadores a cero.')) {
                        try {
                          // Usamos un filtro más estándar para asegurar que Supabase acepte la eliminación masiva
                          const { error } = await supabase
                            .from('consecutivos')
                            .delete()
                            .gte('ultimo_numero', 0);
                          
                          if (error) throw error;
                          
                          // Registramos la acción solo si el borrado fue exitoso
                          if (currentUserProfile) {
                            logAccion(currentUserProfile.id, 'DELETE', 'consecutivos', 'TODO', { 
                              accion: 'vaciar_historial',
                              resultado: 'exito'
                            });
                          }
                          
                          await fetchConsecutivos();
                          alert('Historial de consecutivos vaciado correctamente. Los contadores han vuelto a cero.');
                        } catch (err: any) {
                          console.error('Error detallado al vaciar:', err);
                          alert(`No se pudo vaciar el historial: ${err.message || 'Error de conexión'}. Verifique los permisos en Supabase.`);
                        }
                      }
                    }}
                    className="text-[10px] font-bold text-red-600 hover:underline uppercase"
                  >
                    Vaciar Historial
                  </button>
                )}
                <button 
                  onClick={fetchConsecutivos}
                  className="text-[10px] font-bold text-eveca-primary hover:underline uppercase"
                >
                  Actualizar Vista
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Proceso</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Último Número</th>
                    <th className="px-6 py-3">Último Código Generado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingConsecutivos ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        <Loader2 className="w-5 h-5 text-eveca-primary animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : consecutivos.length > 0 ? consecutivos.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{item.proceso}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.tipo}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">
                          #{item.ultimo_consecutivo.toString().padStart(3, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-eveca-primary">
                        {item.ultimo_codigo}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400 font-bold uppercase italic">
                        No hay consecutivos registrados en la base de datos
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

