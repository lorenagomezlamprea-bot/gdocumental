import { supabase } from './supabase';

export const logAccion = async (
  usuario_id: string,
  accion: string,
  tabla: string,
  registro_id?: string,
  detalles: any = {}
) => {
  try {
    const { error } = await supabase.from('auditoria').insert([{
      usuario_id,
      accion,
      tabla,
      registro_id,
      detalles,
      fecha: new Date().toISOString()
    }]);

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Bitácora de auditoría desactivada: La tabla "auditoria" no existe en Supabase.');
      } else {
        console.warn('Error al registrar log de auditoría:', error.message);
      }
    }
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      console.warn('Conexión con Supabase fallida al registrar auditoría (Error de red).');
    } else {
      console.warn('No se pudo registrar la auditoría:', err.message || err);
    }
  }
};
