import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  Search, 
  Eye, 
  Folder,
  BookOpen,
  Download,
  AlertCircle,
  X
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { Documento, Proceso, TipoDocumento } from '../types';
import { downloadWithWatermark } from '../lib/watermark';
import { supabase } from '../lib/supabase';

export const ApprovedRepository = ({ 
  documents, 
  processes, 
  types 
}: { 
  documents: Documento[], 
  processes: Proceso[], 
  types: TipoDocumento[] 
}) => {
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (doc: Documento) => {
    setIsDownloading(doc.id);
    setErrorMessage(null);
    try {
      await downloadWithWatermark(doc);
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
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-eveca-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-lg border-b-4 border-eveca-oil">
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <div className="bg-white/20 p-2 rounded-lg mr-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Repositorio de Documentación Aprobada</h2>
          </div>
          <p className="text-eveca-bg/80 max-w-2xl text-sm leading-relaxed">
            Consulte aquí únicamente los documentos aprobados por la Jefatura de Sostenibilidad. 
            Este módulo es de solo lectura para asegurar la integridad de la información.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute right-10 top-10 w-20 h-20 bg-eveca-oil/10 rounded-full blur-xl"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Error Message Toast-like */}
        {errorMessage && (
          <div className="fixed top-24 right-8 z-[60] bg-white border-l-4 border-red-500 shadow-2xl rounded-xl p-4 flex items-start animate-in slide-in-from-right-8 max-w-sm">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />
            <div className="flex-1 mr-4">
              <p className="text-xs font-bold text-gray-800">Atención</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Sidebar (Processes) */}
        <div className="lg:w-64 space-y-2">
          <p className="px-4 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navegar por Proceso</p>
          <button 
            onClick={() => setSelectedProcess('all')}
            className={cn(
              "w-full flex items-center p-3 rounded-xl transition-all font-bold text-sm",
              selectedProcess === 'all' 
                ? "bg-white text-eveca-primary shadow-sm ring-1 ring-gray-100" 
                : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Folder className={cn("w-4 h-4 mr-3", selectedProcess === 'all' ? "text-eveca-primary" : "text-gray-400")} />
            Todos los procesos
          </button>
          {processes.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedProcess(p.id)}
              className={cn(
                "w-full flex items-center p-3 rounded-xl transition-all font-bold text-sm",
                selectedProcess === p.id 
                  ? "bg-white text-eveca-primary shadow-sm ring-1 ring-gray-100" 
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-3 transition-all",
                selectedProcess === p.id ? "bg-eveca-primary scale-125" : "bg-gray-300"
              )} />
              {p.nombre}
              <span className="ml-auto text-[10px] text-gray-400 font-bold">
                {documents.filter(d => d.proceso_id === p.id && d.estado === 'Aprobado').length}
              </span>
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="flex-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar documento aprobado por nombre o código..." 
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-6 shadow-sm focus:ring-2 focus:ring-eveca-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedDocs.length > 0 ? (
              approvedDocs.map(doc => (
                <div key={doc.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-eveca-primary/5 transition-colors">
                      <FileUp className="w-6 h-6 text-eveca-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider">
                      {types.find(t => t.id === doc.tipo_id)?.abreviatura}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-eveca-primary transition-colors">{doc.nombre}</h4>
                  <p className="text-xs font-bold text-eveca-primary mb-4">{doc.codigo}</p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Estado Actual</span>
                      <span className="text-xs font-bold text-gray-600">v{doc.version} - {doc.estado}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handlePreview(doc.archivo_url)}
                        className="p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-lg transition-all" 
                        title="Vista previa rápida"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownload(doc)}
                        disabled={isDownloading === doc.id}
                        className="p-2 text-white bg-eveca-primary hover:bg-eveca-green-light rounded-lg transition-all shadow-sm disabled:opacity-50"
                        title="Descargar copia controlada"
                      >
                        {isDownloading === doc.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold">No se encontraron documentos vigentes</p>
                <p className="text-xs mt-1">Intente con otros términos o filtros de proceso</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
