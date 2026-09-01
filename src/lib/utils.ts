import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'Aprobado':
      return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20';
    case 'En revisión':
      return 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20';
    case 'Borrador':
      return 'bg-slate-800 text-slate-400 border-slate-700';
    case 'Obsoleto':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}
