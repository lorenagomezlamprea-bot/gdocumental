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
        console.error('Error al registrar log de auditoría:', error.message);
      }
    }
  } catch (err: any) {
    // Manejo de errores de red como "Failed to fetch"
    if (err.message === 'Failed to fetch') {
      console.warn('No se pudo conectar con Supabase para registrar la auditoría (Error de red).');
    } else {
      console.error('Excepción al registrar log de auditoría:', err);
    }
  }
};
