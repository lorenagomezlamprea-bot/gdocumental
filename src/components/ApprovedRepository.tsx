import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  Search, 
  Eye, 
  Folder,
  BookOpen,
  Download,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { cn, formatDate, getStatusColor } from '../lib/utils';
import { Documento, Proceso, TipoDocumento, UserProfile } from '../types';
import { downloadWithWatermark } from '../lib/watermark';
import { supabase } from '../lib/supabase';

export const ApprovedRepository = ({ 
  documents, 
  processes, 
  types,
  currentUserProfile
}: { 
  documents: Documento[], 
  processes: Proceso[], 
  types: TipoDocumento[],
  currentUserProfile: UserProfile | null
}) => {
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async (doc: Documento) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('version_documentos')
        .select(`
          *,
          perfiles:subido_por (nombre_completo)
        `)
        .eq('documento_id', doc.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDownload = async (doc: Documento) => {
    setIsDownloading(doc.id);
    setErrorMessage(null);
    try {
      await downloadWithWatermark(doc, currentUserProfile?.id);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(`No se pudo generar la copia controlada: ${err.message || 'Error desconocido'}. Puede intentar abrirlo para vista previa.`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handlePreview = async (path: string | null) => {
    if (!path) {
      setErrorMessage('La ruta del archivo no está disponible.');
      return;
    }
    try {
      let url = path;
      if (!path.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('documentos-sostenibilidad')
          .createSignedUrl(path, 300); // Aumentar tiempo a 5 minutos
        
        if (error) throw error;
        url = data.signedUrl;
      }
      
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMessage(`No se pudo generar la vista previa: ${err.message}.`);
    }
  };

  const approvedDocs = useMemo(() => {
    return documents.filter(doc => {
      const isApproved = doc.estado === 'Aprobado';
      const matchesProcess = selectedProcess === 'all' || doc.proceso_id === selectedProcess;
      const matchesSearch = (doc.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           (doc.codigo?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return isApproved && matchesProcess && matchesSearch;
    });
  }, [documents, selectedProcess, searchTerm]);

  return (
    <div className="space-y-10">
      {/* Header Info */}
      <div className="bg-dark-card p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-accent-cyan/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center mb-6">
            <div className="bg-accent-cyan/10 p-5 rounded-3xl mr-6 border border-accent-cyan/20 shadow-inner">
              <BookOpen className="w-8 h-8 text-accent-cyan" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Repositorio Maestro</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold max-w-2xl uppercase tracking-widest leading-loose">
            Consulte únicamente los documentos aprobados y vigentes. 
            Este módulo es de solo lectura para asegurar la integridad normativa de la organización.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Error Message Toast-like */}
        {errorMessage && (
          <div className="fixed top-24 right-10 z-[60] bg-dark-card border border-rose-500/30 shadow-2xl rounded-[2rem] p-6 flex items-start animate-in slide-in-from-right-10 max-w-sm">
            <AlertCircle className="w-6 h-6 text-rose-500 mr-4 shrink-0" />
            <div className="flex-1 mr-6">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Atención</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2 leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-600 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Sidebar (Processes) */}
        <div className="lg:w-72 space-y-3">
          <p className="px-6 mb-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Navegar Procesos</p>
          <button 
            onClick={() => setSelectedProcess('all')}
            className={cn(
              "w-full flex items-center p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border",
              selectedProcess === 'all' 
                ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20 shadow-xl shadow-accent-cyan/5" 
                : "text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300"
            )}
          >
            <Folder className={cn("w-4 h-4 mr-4", selectedProcess === 'all' ? "text-accent-cyan" : "text-slate-700")} />
            Todos los procesos
          </button>
          {processes.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedProcess(p.id)}
              className={cn(
                "w-full flex items-center p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border",
                selectedProcess === p.id 
                  ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20 shadow-xl shadow-accent-cyan/5" 
                  : "text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-4 transition-all",
                selectedProcess === p.id ? "bg-accent-cyan scale-150 shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "bg-slate-800"
              )} />
              <span className="truncate flex-1 text-left">{p.nombre}</span>
              <span className={cn(
                "ml-3 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all",
                selectedProcess === p.id ? "bg-accent-cyan text-dark-bg" : "bg-slate-800 text-slate-600"
              )}>
                {documents.filter(d => d.proceso_id === p.id && d.estado === 'Aprobado').length}
              </span>
            </button>
          ))}
        </div>

          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
              className="w-full bg-dark-card border border-slate-800/50 rounded-[2rem] py-5 pl-14 pr-8 text-white placeholder:text-slate-600 shadow-2xl focus:ring-2 focus:ring-accent-cyan/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approvedDocs.length > 0 ? (
              approvedDocs.map(doc => (
                <div key={doc.id} onClick={() => { setSelectedDoc(doc); setIsViewModalOpen(true); fetchHistory(doc); }} className="bg-dark-card p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl hover:border-accent-cyan/30 transition-all group flex flex-col relative overflow-hidden cursor-pointer">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-2xl group-hover:bg-accent-cyan/10 group-hover:scale-110 transition-all border border-slate-800">
                      <FileUp className="w-7 h-7 text-accent-cyan" />
                    </div>
                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-700">
                      {types.find(t => t.id === doc.tipo_id)?.abreviatura}
                    </span>
                  </div>
                  
                  <h4 className="text-base font-black text-white tracking-tight mb-2 group-hover:text-accent-cyan transition-colors">{doc.nombre}</h4>
                  <p className="text-[10px] font-black text-accent-cyan tracking-[0.2em] uppercase mb-6">{doc.codigo}</p>
                  
                  <div className="mt-auto pt-6 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Vigencia</span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">v{doc.version}.0</span>
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleDownload(doc)}
                        disabled={isDownloading === doc.id}
                        className="p-3 text-white bg-accent-cyan hover:bg-white hover:text-dark-bg rounded-xl transition-all shadow-lg shadow-accent-cyan/10 disabled:opacity-30 group-hover:scale-110"
                        title="Descargar copia controlada"
                      >
                        {isDownloading === doc.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-600 bg-slate-800/10 rounded-[3rem] border border-dashed border-slate-800">
                <Search className="w-16 h-16 mb-6 opacity-10" />
                <p className="font-black text-xs uppercase tracking-[0.2em]">No se encontraron documentos</p>
                <p className="text-[10px] mt-2 font-bold opacity-50">Intente ajustar los términos de búsqueda</p>
              </div>
            )}
          </div>
        </div>

        {/* View Details Modal */}
        {isViewModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-accent-cyan text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Detalles del Documento</h3>
                  <p className="text-white/60 text-xs mt-1">{selectedDoc.codigo}</p>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre del Documento</p>
                    <p className="text-lg font-bold text-gray-800">{selectedDoc.nombre}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Proceso</p>
                      <p className="text-sm font-bold text-gray-700">{processes.find(p => p.id === selectedDoc.proceso_id)?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tipo</p>
                      <p className="text-sm font-bold text-gray-700">{types.find(t => t.id === selectedDoc.tipo_id)?.nombre}</p>
                    </div>
                  </div>
  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                      <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getStatusColor(selectedDoc.estado))}>
                        {selectedDoc.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Versión Actual</p>
                      <p className="text-sm font-bold text-gray-700">v{selectedDoc.version}.0</p>
                    </div>
                  </div>
  
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Historial de Versiones</p>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {isLoadingHistory ? (
                        <div className="text-center py-4 text-xs text-gray-400">Cargando versiones...</div>
                      ) : versionHistory.length > 0 ? (
                        versionHistory.map((v) => (
                          <div key={v.id} className="flex items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mr-3 text-[10px] font-bold">
                              v{v.numero_version}
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-800 uppercase">{formatDate(v.created_at)}</p>
                              <p className="text-[10px] text-gray-600 italic">"{v.motivo || 'Sin motivo'}"</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">No hay historial disponible.</p>
                      )}
                    </div>
                  </div>
                </div>
  
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Responsable</p>
                    <p className="text-sm font-bold text-gray-700">{selectedDoc.responsable}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Observaciones</p>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">{selectedDoc.observaciones || 'Sin observaciones'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Creación</p>
                      <p className="text-xs font-bold text-gray-700">{formatDate(selectedDoc.fecha_creacion)}</p>
                     </div>
                     <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Próxima Revisión</p>
                      <p className="text-xs font-bold text-amber-600">{formatDate(selectedDoc.fecha_proxima_revision)}</p>
                     </div>
                  </div>
                  {/* Botón Ver Documento eliminado */}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
