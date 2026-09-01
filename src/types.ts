export type UserRole = 'superadmin' | 'administrador' | 'editor' | 'visualizador';

export interface UserProfile {
  id: string;
  email: string;
  rol: UserRole;
  nombre_completo?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export type DocumentStatus = 'Borrador' | 'En revisión' | 'Aprobado' | 'Obsoleto';

export interface TipoDocumento {
  id: string;
  nombre: string;
  abreviatura: string;
  periodo_revision_anos: number;
}

export interface Proceso {
  id: string;
  nombre: string;
  abreviatura: string;
}

export interface VersionDocumento {
  id: string;
  documento_id: string;
  version: number;
  fecha: string;
  subido_por: string;
  motivo: string;
  archivo_url: string;
}

export interface LogAuditoria {
  id: string;
  usuario_id: string;
  accion: string;
  tabla: string;
  registro_id?: string;
  detalles: any;
  fecha: string;
  perfiles?: {
    nombre_completo: string;
    email: string;
  };
}

export interface Documento {
  id: string;
  codigo: string;
  nombre: string;
  tipo_id: string;
  proceso_id: string;
  version: number;
  estado: DocumentStatus;
  fecha_creacion: string;
  fecha_ultima_revision: string;
  fecha_proxima_revision: string;
  responsable: string;
  revisado_por: string;
  aprobado_por: string;
  archivo_url: string;
  nombre_archivo: string;
  observaciones: string;
  historial?: VersionDocumento[];
}
