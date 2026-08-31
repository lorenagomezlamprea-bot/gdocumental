import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreHorizontal,
  Clock,
  History,
  AlertCircle,
  Plus,
  X,
  Upload,
  Loader2,
  Check,
  ChevronRight,
  Trash2,
  Edit,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { cn, formatDate, getStatusColor } from '../lib/utils';
import { Documento, Proceso, TipoDocumento, UserProfile, VersionDocumento, DocumentStatus } from '../types';
import { supabase } from '../lib/supabase';

interface DocumentListProps {
  documents: Documento[];
  processes: Proceso[];
  types: TipoDocumento[];
  isReadOnly?: boolean;
  onRefresh: () => void;
  currentUserProfile: UserProfile | null;
}

export const DocumentList = ({ documents, processes, types, isReadOnly, onRefresh, currentUserProfile }: DocumentListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterProcess, setFilterProcess] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newDoc, setNewDoc] = useState({
    nombre: '',
    tipo_id: '',
    proceso_id: '',
    responsable: '',
    observaciones: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [codePreview, setCodePreview] = useState<string>('');

  const [creationError, setCreationError] = useState<string | null>(null);

  // New state for actions and modals
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setActiveDropdown(null);
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setStatusDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = (doc.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (doc.codigo?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = !filterType || doc.tipo_id === filterType;
    const matchesProcess = !filterProcess || doc.proceso_id === filterProcess;
    const matchesStatus = !filterStatus || doc.estado === filterStatus;
    
    return matchesSearch && matchesType && matchesProcess && matchesStatus;
  });

  const canChangeStatus = (doc: Documento, newStatus: DocumentStatus) => {
    if (!currentUserProfile) return false;
    const role = currentUserProfile.rol;
    
    if (role === 'superadmin' || role === 'administrador') return true;
    
    if (role === 'editor') {
      // Editor can only move from Borrador to En revisión
      if (doc.estado === 'Borrador' && newStatus === 'En revisión') return true;
    }
    
    return false;
  };

  const handleStatusChange = async (doc: Documento, newStatus: DocumentStatus) => {
    if (!canChangeStatus(doc, newStatus)) {
      alert('No tienes permisos para realizar este cambio de estado.');
      return;
    }

    try {
      const updateData: any = { 
        estado: newStatus,
        fecha_ultima_revision: new Date().toISOString()
      };

      if (newStatus === 'Aprobado') {
        updateData.aprobado_por = currentUserProfile?.id;
      }

      const { error } = await supabase
        .from('documentos')
        .update(updateData)
        .eq('id', doc.id);

      if (error) throw error;
      onRefresh();
      setStatusDropdown(null);
    } catch (err: any) {
      alert('Error al cambiar estado: ' + err.message);
    }
  };

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
        .order('fecha', { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;
    try {
      const { error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', selectedDoc.id);

      if (error) throw error;
      onRefresh();
      setIsDeleteConfirmOpen(false);
      setSelectedDoc(null);
    } catch (err: any) {
      alert('Error al eliminar documento: ' + err.message);
    }
  };

  const handleEditMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('documentos')
        .update({
          nombre: selectedDoc.nombre,
          observaciones: selectedDoc.observaciones
        })
        .eq('id', selectedDoc.id);

      if (error) throw error;
      onRefresh();
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert('Error al editar metadatos: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileUrl = async (path: string) => {
    if (path.startsWith('http')) return path; // Legacy support
    
    const { data, error } = await supabase.storage
      .from('documentos-sostenibilidad')
      .createSignedUrl(path, 60);
      
    if (error) throw error;
    return data.signedUrl;
  };

  const handlePreview = async (path: string) => {
    try {
      const url = await getFileUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert('Error al generar enlace de vista previa: ' + err.message);
    }
  };

  const handleNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !selectedFile) return;
    setIsSubmitting(true);
    try {
      // 1. Create history record for CURRENT version before updating
      const { error: histError } = await supabase
        .from('version_documentos')
        .insert([{
          documento_id: selectedDoc.id,
          version: selectedDoc.version,
          fecha: new Date().toISOString(),
          subido_por: currentUserProfile?.id,
          motivo: (e.currentTarget as any).motivo.value,
          archivo_url: selectedDoc.archivo_url
        }]);

      if (histError) throw histError;

      // 2. Upload NEW file
      const nextVersion = selectedDoc.version + 1;
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedDoc.codigo}-v${nextVersion}.${fileExt}`;
      const filePath = `revisiones/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-sostenibilidad')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 3. Update main document
      const { error: updateError } = await supabase
        .from('documentos')
        .update({
          version: nextVersion,
          archivo_url: filePath, // Store path
          nombre_archivo: selectedFile.name,
          fecha_ultima_revision: new Date().toISOString(),
          estado: 'En revisión'
        })
        .eq('id', selectedDoc.id);

      if (updateError) throw updateError;

      onRefresh();
      setIsNewVersionModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      alert('Error al subir nueva versión: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update code preview when process or type changes
  useEffect(() => {
    if (newDoc.proceso_id && newDoc.tipo_id) {
      const proc = processes.find(p => p.id === newDoc.proceso_id);
      const type = types.find(t => t.id === newDoc.tipo_id);
      if (proc && type) {
        setCodePreview(`${proc.abreviatura}-${type.abreviatura}-XXX`);
      }
    } else {
      setCodePreview('');
    }
  }, [newDoc.proceso_id, newDoc.tipo_id, processes, types]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newDoc.nombre || !newDoc.tipo_id || !newDoc.proceso_id) return;

    setIsSubmitting(true);
    setCreationError(null);
    let codigoGenerated = '';

    // PASO 1: Generar código vía RPC
    try {
      const { data: codigo, error: codeError } = await supabase.rpc('generar_codigo_documento', { 
        p_proceso_id: newDoc.proceso_id, 
        p_tipo_id: newDoc.tipo_id 
      });

      if (codeError) {
        const msg = `Error al generar el código: ${codeError.message}`;
        setCreationError(msg);
        alert(msg);
        setIsSubmitting(false);
        return;
      }
      
      if (!codigo) {
        const msg = 'Error: El sistema no pudo generar un código para este documento.';
        setCreationError(msg);
        alert(msg);
        setIsSubmitting(false);
        return;
      }

      codigoGenerated = codigo;
    } catch (err: any) {
      const msg = `Excepción al generar código: ${err.message}`;
      setCreationError(msg);
      alert(msg);
      setIsSubmitting(false);
      return;
    }

    // PASO 2: Subida de archivo a Storage
    let filePath = '';
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${codigoGenerated}-v1.${fileExt}`;
      filePath = `revisiones/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-sostenibilidad')
        .upload(filePath, selectedFile, {
          upsert: true // Allow overwrite if something went wrong before
        });

      if (uploadError) {
        const msg = `Error al subir el archivo: ${uploadError.message}`;
        setCreationError(msg);
        alert(msg);
        setIsSubmitting(false);
        return;
      }
    } catch (err: any) {
      const msg = `Excepción al subir archivo: ${err.message}`;
      setCreationError(msg);
      alert(msg);
      setIsSubmitting(false);
      return;
    }

    // PASO 3: Inserción en la tabla documentos
    try {
      const { error: dbError } = await supabase.from('documentos').insert([{
        codigo: codigoGenerated,
        nombre: newDoc.nombre,
        tipo_id: newDoc.tipo_id,
        proceso_id: newDoc.proceso_id,
        version: 1,
        estado: 'Borrador',
        responsable: newDoc.responsable,
        archivo_url: filePath, // Store path
        nombre_archivo: selectedFile.name,
        observaciones: newDoc.observaciones,
        fecha_creacion: new Date().toISOString(),
        fecha_ultima_revision: new Date().toISOString(),
        fecha_proxima_revision: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }]);

      if (dbError) {
        let msg = `Error al guardar el documento: ${dbError.message}`;
        if (dbError.code === '23505') {
          msg = 'Error de Duplicidad: El código generado ya existe en la base de datos. Por favor, intente de nuevo.';
        }
        setCreationError(msg);
        alert(msg + ` (Archivo subido en: ${filePath})`);
        setIsSubmitting(false);
        return;
      }

      // Éxito total
      setIsModalOpen(false);
      onRefresh();
      setNewDoc({ nombre: '', tipo_id: '', proceso_id: '', responsable: '', observaciones: '' });
      setSelectedFile(null);
    } catch (err: any) {
      const msg = `Excepción al guardar en base de datos: ${err.message}`;
      setCreationError(msg);
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = () => {
    setCreationError(null);
    onRefresh(); // Refresh data to ensure dropdowns are populated
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Listado Maestro de Documentos</h3>
        {!isReadOnly && (
          <button 
            onClick={openModal}
            className="bg-eveca-primary text-white px-4 py-2 rounded-xl flex items-center font-bold text-sm hover:bg-eveca-green-light transition-all shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Documento
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Filtrar por código o nombre..." 
            className="w-full bg-gray-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-eveca-primary transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="bg-gray-50 border-none rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todos los Tipos</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.abreviatura} - {t.nombre}</option>)}
        </select>

        <select 
          className="bg-gray-50 border-none rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
          value={filterProcess}
          onChange={(e) => setFilterProcess(e.target.value)}
        >
          <option value="">Todos los Procesos</option>
          {processes.map(p => <option key={p.id} value={p.id}>{p.abreviatura} - {p.nombre}</option>)}
        </select>

        {!isReadOnly && (
          <select 
            className="bg-gray-50 border-none rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-1 focus:ring-eveca-primary outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="Borrador">Borrador</option>
            <option value="En revisión">En revisión</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Obsoleto">Obsoleto</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Proceso / Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Versión</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Próxima Revisión</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map((doc) => {
                const isNearExpiry = doc.fecha_proxima_revision && new Date(doc.fecha_proxima_revision) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const isExpired = doc.fecha_proxima_revision && new Date(doc.fecha_proxima_revision) < new Date();

                return (
                  <tr key={doc.id} className="hover:bg-gray-50/30 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-eveca-primary group-hover:text-eveca-green-light transition-colors">{doc.codigo}</span>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[250px]">{doc.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {processes.find(p => p.id === doc.proceso_id)?.abreviatura}
                        </span>
                        <span className="text-xs text-gray-400">
                          {types.find(t => t.id === doc.tipo_id)?.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative" ref={statusDropdown === doc.id ? statusRef : null}>
                        <button 
                          disabled={isReadOnly}
                          onClick={() => setStatusDropdown(statusDropdown === doc.id ? null : doc.id)}
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all flex items-center",
                            getStatusColor(doc.estado),
                            !isReadOnly && "hover:shadow-md cursor-pointer"
                          )}
                        >
                          {doc.estado}
                          {!isReadOnly && <ChevronRight className={cn("w-3 h-3 ml-1 transition-transform", statusDropdown === doc.id && "rotate-90")} />}
                        </button>
                        
                        {statusDropdown === doc.id && (
                          <div className="absolute left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                            {(['Borrador', 'En revisión', 'Aprobado', 'Obsoleto'] as DocumentStatus[]).map(status => {
                              const allowed = canChangeStatus(doc, status);
                              if (!allowed && doc.estado !== status) return null;
                              
                              return (
                                <button
                                  key={status}
                                  disabled={!allowed || doc.estado === status}
                                  onClick={() => handleStatusChange(doc, status)}
                                  className={cn(
                                    "w-full text-left px-4 py-2 text-xs font-bold transition-colors",
                                    doc.estado === status ? "bg-gray-50 text-eveca-primary" : "text-gray-600 hover:bg-gray-50 hover:text-eveca-primary",
                                    !allowed && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {status}
                                  {doc.estado === status && <Check className="w-3 h-3 float-right" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                      <div className={cn(
                        "flex items-center",
                        isExpired ? "text-red-600" : isNearExpiry ? "text-amber-600" : "text-gray-500"
                      )}>
                        {isExpired ? <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
                        {formatDate(doc.fecha_proxima_revision)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={() => { setSelectedDoc(doc); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-lg transition-all" 
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedDoc(doc); setIsHistoryModalOpen(true); fetchHistory(doc); }}
                          className="p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-lg transition-all" 
                          title="Historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {!isReadOnly && (
                          <div className="relative" ref={activeDropdown === doc.id ? dropdownRef : null}>
                            <button 
                              onClick={() => setActiveDropdown(activeDropdown === doc.id ? null : doc.id)}
                              className={cn(
                                "p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-lg transition-all",
                                activeDropdown === doc.id && "text-eveca-primary bg-gray-50"
                              )}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            {activeDropdown === doc.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-200">
                                <button 
                                  onClick={() => { setSelectedDoc(doc); setIsNewVersionModalOpen(true); setActiveDropdown(null); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-eveca-primary flex items-center transition-colors"
                                >
                                  <Upload className="w-3.5 h-3.5 mr-2.5" />
                                  Subir nueva versión
                                </button>
                                <button 
                                  onClick={() => { setSelectedDoc(doc); setIsEditModalOpen(true); setActiveDropdown(null); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-eveca-primary flex items-center transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-2.5" />
                                  Editar metadatos
                                </button>
                                {(currentUserProfile?.rol === 'superadmin') && (
                                  <button 
                                    onClick={() => { setSelectedDoc(doc); setIsDeleteConfirmOpen(true); setActiveDropdown(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-50 mt-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2.5" />
                                    Eliminar documento
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-eveca-primary text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Crear Nuevo Documento</h3>
                <p className="text-white/60 text-xs mt-1">El código se generará automáticamente según el proceso y tipo.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {creationError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-start animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold">Error en la creación</p>
                    <p>{creationError}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre del Documento</label>
                  <input 
                    required
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                    value={newDoc.nombre}
                    onChange={e => setNewDoc({...newDoc, nombre: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Proceso</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                    value={newDoc.proceso_id}
                    onChange={e => setNewDoc({...newDoc, proceso_id: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {processes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tipo de Documento</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                    value={newDoc.tipo_id}
                    onChange={e => setNewDoc({...newDoc, tipo_id: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                {/* Code Preview Section */}
                <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Previsualización del Código</p>
                  <p className={cn(
                    "text-sm font-bold",
                    codePreview ? "text-eveca-primary" : "text-gray-300 italic"
                  )}>
                    {codePreview ? `Código que se asignará: ${codePreview}` : "Seleccione proceso y tipo para ver el código"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Responsable / Elaborado por</label>
                  <input 
                    required
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                    value={newDoc.responsable}
                    onChange={e => setNewDoc({...newDoc, responsable: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observaciones iniciales</label>
                  <textarea 
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                    rows={3}
                    value={newDoc.observaciones}
                    onChange={e => setNewDoc({...newDoc, observaciones: e.target.value})}
                  ></textarea>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Archivo Adjunto (PDF, Word, Excel)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <div className={cn(
                      "w-full border-2 border-dashed rounded-2xl py-8 flex flex-col items-center justify-center transition-all",
                      selectedFile ? "border-eveca-primary bg-eveca-primary/5" : "border-gray-200 group-hover:border-eveca-primary group-hover:bg-gray-50"
                    )}>
                      {selectedFile ? (
                        <>
                          <Check className="w-8 h-8 text-eveca-primary mb-2" />
                          <p className="text-sm font-bold text-gray-700">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">Haga clic o arrastre para cambiar</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-eveca-primary" />
                          <p className="text-sm font-bold text-gray-500">Seleccione el archivo</p>
                          <p className="text-xs text-gray-400 mt-1">O arrastre y suelte aquí</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-eveca-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-eveca-green-light transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-eveca-primary/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : 'Crear Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Details Modal */}
      {isViewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-eveca-primary text-white flex justify-between items-center">
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Versión</p>
                    <p className="text-sm font-bold text-gray-700">v{selectedDoc.version}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Responsable</p>
                  <p className="text-sm font-bold text-gray-700">{selectedDoc.responsable}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Fechas de Control</p>
                  <div className="space-y-3">
                    <div className="flex items-center text-xs">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 mr-2" />
                      <span className="text-gray-500 mr-2">Creación:</span>
                      <span className="font-bold text-gray-700">{formatDate(selectedDoc.fecha_creacion)}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Clock className="w-3.5 h-3.5 text-gray-400 mr-2" />
                      <span className="text-gray-500 mr-2">Última Rev:</span>
                      <span className="font-bold text-gray-700">{formatDate(selectedDoc.fecha_ultima_revision)}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mr-2" />
                      <span className="text-gray-500 mr-2">Próxima Rev:</span>
                      <span className="font-bold text-amber-600">{formatDate(selectedDoc.fecha_proxima_revision)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Observaciones</p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl min-h-[80px]">
                    {selectedDoc.observaciones || 'Sin observaciones adicionales.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => handlePreview(selectedDoc.archivo_url)}
                    className="w-full bg-eveca-primary text-white font-bold py-3 rounded-xl flex items-center justify-center hover:bg-eveca-green-light transition-all shadow-lg shadow-eveca-primary/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Archivo Original
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-eveca-primary text-white flex justify-between items-center">
              <div className="flex items-center">
                <History className="w-5 h-5 mr-3" />
                <div>
                  <h3 className="text-xl font-bold">Historial de Versiones</h3>
                  <p className="text-white/60 text-xs mt-1">{selectedDoc.codigo} - {selectedDoc.nombre}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8">
              {isLoadingHistory ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 text-eveca-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando historial...</p>
                </div>
              ) : versionHistory.length > 0 ? (
                <div className="space-y-6">
                  {versionHistory.map((v, i) => (
                    <div key={v.id} className="relative flex items-start group">
                      {i !== versionHistory.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-100 -mb-6"></div>
                      )}
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mr-4 z-10 group-hover:bg-eveca-primary group-hover:text-white transition-colors">
                        <span className="text-xs font-bold">v{v.version}</span>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100 group-hover:border-eveca-primary/20 group-hover:shadow-sm transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-800">Actualizado por {v.perfiles?.nombre_completo || 'Usuario Desconocido'}</p>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(v.fecha)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3 italic">"{v.motivo || 'Sin motivo especificado'}"</p>
                        <a 
                          onClick={(e) => { e.preventDefault(); handlePreview(v.archivo_url); }}
                          href="#"
                          className="inline-flex items-center text-[10px] font-bold text-eveca-primary hover:underline"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Ver esta versión
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {/* Current Version Indicator */}
                  <div className="relative flex items-start">
                    <div className="w-8 h-8 bg-eveca-primary text-white rounded-full flex items-center justify-center shrink-0 mr-4 z-10">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1 bg-eveca-primary/5 rounded-2xl p-4 border border-eveca-primary/20">
                      <p className="text-xs font-bold text-eveca-primary">Versión Actual (v{selectedDoc.version})</p>
                      <p className="text-[10px] text-eveca-primary/60 mt-1 uppercase font-bold tracking-wider">Publicada el {formatDate(selectedDoc.fecha_ultima_revision)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No hay versiones anteriores</p>
                  <p className="text-xs text-gray-400 mt-1 px-8">Este documento se encuentra en su versión inicial (v1).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {isEditModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-eveca-primary text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Editar Metadatos</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditMetadata} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre del Documento</label>
                <input 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                  value={selectedDoc.nombre}
                  onChange={e => setSelectedDoc({...selectedDoc, nombre: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observaciones</label>
                <textarea 
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                  rows={4}
                  value={selectedDoc.observaciones}
                  onChange={e => setSelectedDoc({...selectedDoc, observaciones: e.target.value})}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 font-bold text-gray-400">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-eveca-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-eveca-green-light transition-all flex items-center disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {isNewVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-eveca-primary text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Subir Nueva Versión</h3>
                <p className="text-white/60 text-xs mt-1">Se incrementará a la versión v{selectedDoc.version + 1}</p>
              </div>
              <button onClick={() => setIsNewVersionModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleNewVersion} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Motivo del cambio / Actualización</label>
                <textarea 
                  name="motivo"
                  required
                  placeholder="Ej: Actualización de procedimientos por nueva normativa..."
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-1 focus:ring-eveca-primary outline-none"
                  rows={3}
                ></textarea>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nuevo Archivo</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <div className={cn(
                    "w-full border-2 border-dashed rounded-2xl py-8 flex flex-col items-center justify-center transition-all",
                    selectedFile ? "border-eveca-primary bg-eveca-primary/5" : "border-gray-200 group-hover:border-eveca-primary group-hover:bg-gray-50"
                  )}>
                    {selectedFile ? (
                      <>
                        <Check className="w-8 h-8 text-eveca-primary mb-2" />
                        <p className="text-sm font-bold text-gray-700 truncate px-4">{selectedFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-eveca-primary" />
                        <p className="text-sm font-bold text-gray-500">Seleccionar nuevo archivo</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsNewVersionModalOpen(false)} className="px-6 py-3 font-bold text-gray-400">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedFile}
                  className="bg-eveca-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-eveca-green-light transition-all flex items-center disabled:opacity-50 shadow-lg shadow-eveca-primary/20"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Actualizar Versión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar documento?</h3>
              <p className="text-sm text-gray-500 mb-8">
                Esta acción es irreversible. Se eliminará el documento <span className="font-bold text-gray-700">{selectedDoc.codigo}</span> y todo su historial de versiones.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteDocument}
                  className="py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
