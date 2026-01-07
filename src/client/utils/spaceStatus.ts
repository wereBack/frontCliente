import type { SpaceData, ZoneData } from '../services/api'

export type SpaceStatus = 'disponible' | 'pendiente' | 'reservado' | 'bloqueado'

/**
 * Determina el estado de un espacio basado en su actividad y reservas.
 * @param space - El espacio a evaluar
 * @returns El estado del espacio
 */
export const getSpaceStatus = (
  space: { active: boolean; reservations?: { estado: string }[] }
): SpaceStatus => {
  if (!space.active) return 'bloqueado'
  if (space.reservations && space.reservations.length > 0) {
    const activeReservation = space.reservations.find(
      (r) => r.estado === 'RESERVED' || r.estado === 'PENDING'
    )
    if (activeReservation?.estado === 'PENDING') return 'pendiente'
    if (activeReservation?.estado === 'RESERVED') return 'reservado'
  }
  return 'disponible'
}

/**
 * Obtiene el precio efectivo de un espacio (propio o de su zona).
 * @param space - El espacio a evaluar
 * @param zones - Lista de zonas disponibles
 * @returns El precio efectivo o null si no hay precio definido
 */
export const getEffectivePrice = (
  space: SpaceData,
  zones: ZoneData[]
): number | null => {
  // Primero verificar si el espacio tiene su propio precio
  if (space.price != null && Number(space.price) > 0) {
    return Number(space.price)
  }
  // Si no, buscar el precio de la zona
  if (space.zone_id) {
    const zone = zones.find((z) => z.id === space.zone_id)
    if (zone?.price != null && Number(zone.price) > 0) {
      return Number(zone.price)
    }
  }
  return null
}

export const STATUS_LABELS: Record<SpaceStatus, string> = {
  disponible: 'Disponible',
  pendiente: 'Pendiente',
  reservado: 'Reservado',
  bloqueado: 'Bloqueado',
}

export const STATUS_DESCRIPTIONS: Record<SpaceStatus, string> = {
  disponible: 'Stand disponible para reserva.',
  pendiente: 'Reserva pendiente de confirmacion.',
  reservado: 'Este stand ya fue reservado.',
  bloqueado: 'Stand no disponible.',
}

