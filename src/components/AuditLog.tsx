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
      case 'CREATE': return 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20';
      case 'UPDATE': return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20';
      case 'DELETE': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'LOGIN': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20';
      case 'DOWNLOAD': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dark-card p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="flex items-center relative z-10">
          <div className="bg-accent-purple/10 p-5 rounded-3xl mr-6 border border-accent-purple/20 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Bitácora de Auditoría</h2>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Trazabilidad completa de acciones críticas</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="text-[10px] font-black text-accent-purple hover:text-white uppercase tracking-[0.2em] transition-all relative z-10"
        >
          Actualizar Registro
        </button>
      </div>

      <div className="bg-dark-card p-6 rounded-[2rem] border border-slate-800/50 shadow-2xl flex flex-wrap gap-6 items-center">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por usuario, tabla o acción..." 
            className="w-full bg-slate-800/30 border border-slate-800/50 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="bg-slate-800/30 border border-slate-800/50 rounded-xl py-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400 focus:ring-2 focus:ring-accent-purple/50 outline-none transition-all"
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
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-xl shadow-amber-500/5">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Trazabilidad Desactivada</h3>
          <p className="text-xs text-slate-500 font-bold max-w-md mx-auto uppercase tracking-widest leading-loose">
            La tabla de bitácora no se encuentra en la base de datos.
            Para activar la trazabilidad, ejecute <code className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded">SUPABASE_SETUP.sql</code> en el editor SQL.
          </p>
          <div className="pt-6">
            <button 
              onClick={fetchLogs}
              className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
            >
              Reintentar conexión
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-card rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/20 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Fecha y Hora</th>
                  <th className="px-10 py-6">Usuario</th>
                  <th className="px-10 py-6">Acción</th>
                  <th className="px-10 py-6">Entidad</th>
                  <th className="px-10 py-6">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-24 text-center">
                      <Loader2 className="w-10 h-10 text-accent-purple animate-spin mx-auto mb-6" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronizando registros...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-all group">
                    <td className="px-10 py-8 whitespace-nowrap">
                      <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Calendar className="w-4 h-4 mr-3 text-slate-700" />
                        {new Date(log.fecha).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mr-4 text-slate-400 group-hover:bg-accent-purple/10 group-hover:text-accent-purple transition-all border border-slate-800">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white tracking-tight group-hover:text-accent-purple transition-colors">{log.perfiles?.nombre_completo || 'Sistema'}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{log.perfiles?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={cn(
                        "inline-flex items-center px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg shadow-black/20",
                        getAccionBadgeColor(log.accion)
                      )}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Activity className="w-4 h-4 mr-3 text-slate-700" />
                        {log.tabla}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="max-w-xs overflow-hidden">
                        <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-widest" title={JSON.stringify(log.detalles)}>
                          {typeof log.detalles === 'string' ? log.detalles : JSON.stringify(log.detalles)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-24 text-center">
                      <p className="text-[10px] text-slate-600 font-black uppercase italic tracking-[0.2em]">Sin registros que coincidan</p>
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
