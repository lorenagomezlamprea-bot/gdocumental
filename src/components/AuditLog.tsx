import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Loader2, Calendar, User, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LogAuditoria } from '../types';
import { formatDate, cn } from '../lib/utils';

export const AuditLog = () => {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccion, setFilterAccion] = useState('');

  const [tableExists, setTableExists] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    setTableExists(true);
    try {
      const { data, error } = await supabase
        .from('auditoria')
        .select(`
          *,
          perfiles:usuario_id (nombre_completo, email)
        `)
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === 'PGRST205') {
          setTableExists(false);
          return;
        }
        throw error;
      }
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.perfiles?.nombre_completo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.tabla?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.accion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesAccion = !filterAccion || log.accion === filterAccion;
    
    return matchesSearch && matchesAccion;
  });

  const getAccionBadgeColor = (accion: string) => {
    switch (accion.toUpperCase()) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DOWNLOAD': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center">
          <div className="bg-eveca-primary/10 p-3 rounded-2xl mr-4">
            <ShieldCheck className="w-6 h-6 text-eveca-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Auditoría y Trazabilidad</h2>
            <p className="text-sm text-gray-500">Registro histórico de acciones críticas del sistema.</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="text-xs font-bold text-eveca-primary hover:underline uppercase tracking-wider"
        >
          Actualizar Registro
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por usuario, tabla o acción..." 
            className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-eveca-primary outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="bg-gray-50 border-none rounded-xl py-2.5 pl-3 pr-8 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
          value={filterAccion}
          onChange={(e) => setFilterAccion(e.target.value)}
        >
          <option value="">Todas las Acciones</option>
          <option value="CREATE">CREACIÓN</option>
          <option value="UPDATE">MODIFICACIÓN</option>
          <option value="DELETE">ELIMINACIÓN</option>
          <option value="DOWNLOAD">DESCARGA</option>
          <option value="LOGIN">INICIO SESIÓN</option>
        </select>
      </div>

      {!tableExists ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-amber-800">Configuración de Auditoría Pendiente</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            La tabla de bitácora aún no ha sido creada en su base de datos de Supabase. 
            Para activar la trazabilidad, por favor ejecute el contenido del archivo <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono text-xs">SUPABASE_SETUP.sql</code> en su panel de Supabase.
          </p>
          <div className="pt-4">
            <button 
              onClick={fetchLogs}
              className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-sm"
            >
              Reintentar conexión
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Acción</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Entidad</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Loader2 className="w-8 h-8 text-eveca-primary animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando bitácora...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-xs font-medium text-gray-500">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-gray-300" />
                        {new Date(log.fecha).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-eveca-primary/10 rounded-full flex items-center justify-center mr-3 text-eveca-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700">{log.perfiles?.nombre_completo || 'Usuario Desconocido'}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{log.perfiles?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        getAccionBadgeColor(log.accion)
                      )}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs font-bold text-gray-600">
                        <Activity className="w-3.5 h-3.5 mr-2 text-gray-300" />
                        {log.tabla.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden">
                        <p className="text-[10px] text-gray-500 truncate" title={JSON.stringify(log.detalles)}>
                          {typeof log.detalles === 'string' ? log.detalles : JSON.stringify(log.detalles)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <p className="text-xs text-gray-400 font-bold uppercase italic tracking-widest">No hay registros que coincidan con la búsqueda</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
