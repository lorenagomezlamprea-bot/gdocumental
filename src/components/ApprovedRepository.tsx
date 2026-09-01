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
import { cn, formatDate } from '../lib/utils';
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
          .createSignedUrl(path, 60);
        
        if (error) throw error;
        url = data.signedUrl;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
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

        {/* Results Grid */}
        <div className="flex-1 space-y-10">
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
                <div key={doc.id} className="bg-dark-card p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl hover:border-accent-cyan/30 transition-all group flex flex-col relative overflow-hidden">
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
                        onClick={() => handlePreview(doc.archivo_url)}
                        className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all" 
                        title="Vista rápida"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
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
      </div>
    </div>
  );
};
