import type { StandStatus } from '../types/stands'

export const STATUS_META: Record<
  StandStatus,
  { label: string; color: string; bg: string }
> = {
  disponible: { label: 'Disponible', color: '#0f9d58', bg: 'rgba(16, 157, 88, 0.15)' },
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
  reservado: { label: 'Reservado', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.18)' },
  bloqueado: { label: 'Bloqueado', color: '#475569', bg: 'rgba(71, 85, 105, 0.18)' },
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export const formatDatetime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))


