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
      return 'bg-green-100 text-green-800 border-green-200';
    case 'En revisión':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Borrador':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Obsoleto':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
