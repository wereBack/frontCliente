import { describe, it, expect } from 'vitest'
import {
  getSpaceStatus,
  getEffectivePrice,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
} from '../../client/utils/spaceStatus'
import type { SpaceData, ZoneData } from '../../client/services/api'

describe('getSpaceStatus', () => {
  it('retorna "disponible" para un espacio activo sin reservas', () => {
    const space = { active: true, reservations: [] }
    expect(getSpaceStatus(space)).toBe('disponible')
  })

  it('retorna "disponible" para un espacio activo sin array de reservas', () => {
    const space = { active: true }
    expect(getSpaceStatus(space)).toBe('disponible')
  })

  it('retorna "pendiente" para un espacio con reserva PENDING', () => {
    const space = {
      active: true,
      reservations: [{ estado: 'PENDING' }],
    }
    expect(getSpaceStatus(space)).toBe('pendiente')
  })

  it('retorna "reservado" para un espacio con reserva RESERVED', () => {
    const space = {
      active: true,
      reservations: [{ estado: 'RESERVED' }],
    }
    expect(getSpaceStatus(space)).toBe('reservado')
  })

  it('retorna "bloqueado" para un espacio inactivo', () => {
    const space = { active: false, reservations: [] }
    expect(getSpaceStatus(space)).toBe('bloqueado')
  })

  it('retorna "bloqueado" para un espacio inactivo aunque tenga reservas', () => {
    const space = {
      active: false,
      reservations: [{ estado: 'PENDING' }],
    }
    expect(getSpaceStatus(space)).toBe('bloqueado')
  })

  it('prioriza PENDING sobre otras reservas inactivas', () => {
    const space = {
      active: true,
      reservations: [
        { estado: 'CANCELLED' },
        { estado: 'PENDING' },
        { estado: 'EXPIRED' },
      ],
    }
    expect(getSpaceStatus(space)).toBe('pendiente')
  })

  it('prioriza RESERVED sobre otras reservas inactivas', () => {
    const space = {
      active: true,
      reservations: [
        { estado: 'CANCELLED' },
        { estado: 'RESERVED' },
        { estado: 'EXPIRED' },
      ],
    }
    expect(getSpaceStatus(space)).toBe('reservado')
  })

  it('retorna "disponible" si solo hay reservas canceladas/expiradas', () => {
    const space = {
      active: true,
      reservations: [{ estado: 'CANCELLED' }, { estado: 'EXPIRED' }],
    }
    expect(getSpaceStatus(space)).toBe('disponible')
  })
})

describe('getEffectivePrice', () => {
  const baseSpace: SpaceData = {
    id: 'space-1',
    kind: 'rect',
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    color: '#fff',
    name: 'A1',
    active: true,
  }

  const baseZone: ZoneData = {
    id: 'zone-1',
    kind: 'rect',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    color: '#eee',
    name: 'Zona A',
  }

  it('retorna el precio del espacio si esta definido', () => {
    const space = { ...baseSpace, price: 1500 }
    expect(getEffectivePrice(space, [])).toBe(1500)
  })

  it('retorna el precio de la zona si el espacio no tiene precio', () => {
    const space = { ...baseSpace, zone_id: 'zone-1' }
    const zones = [{ ...baseZone, price: 800 }]
    expect(getEffectivePrice(space, zones)).toBe(800)
  })

  it('prioriza el precio del espacio sobre el de la zona', () => {
    const space = { ...baseSpace, price: 1500, zone_id: 'zone-1' }
    const zones = [{ ...baseZone, price: 800 }]
    expect(getEffectivePrice(space, zones)).toBe(1500)
  })

  it('retorna null si ni el espacio ni la zona tienen precio', () => {
    const space = { ...baseSpace, zone_id: 'zone-1' }
    const zones = [baseZone]
    expect(getEffectivePrice(space, zones)).toBeNull()
  })

  it('retorna null si el espacio no tiene zona y no tiene precio', () => {
    expect(getEffectivePrice(baseSpace, [])).toBeNull()
  })

  it('ignora precios cero o negativos del espacio', () => {
    const spaceZero = { ...baseSpace, price: 0, zone_id: 'zone-1' }
    const zones = [{ ...baseZone, price: 500 }]
    expect(getEffectivePrice(spaceZero, zones)).toBe(500)
  })

  it('ignora precios cero o negativos de la zona', () => {
    const space = { ...baseSpace, zone_id: 'zone-1' }
    const zones = [{ ...baseZone, price: 0 }]
    expect(getEffectivePrice(space, zones)).toBeNull()
  })

  it('retorna null si la zona referenciada no existe', () => {
    const space = { ...baseSpace, zone_id: 'zona-inexistente' }
    const zones = [{ ...baseZone, price: 500 }]
    expect(getEffectivePrice(space, zones)).toBeNull()
  })

  it('maneja precios como string correctamente', () => {
    const space = { ...baseSpace, price: '1200' as unknown as number }
    expect(getEffectivePrice(space, [])).toBe(1200)
  })
})

describe('STATUS_LABELS', () => {
  it('tiene labels para todos los estados', () => {
    expect(STATUS_LABELS.disponible).toBe('Disponible')
    expect(STATUS_LABELS.pendiente).toBe('Pendiente')
    expect(STATUS_LABELS.reservado).toBe('Reservado')
    expect(STATUS_LABELS.bloqueado).toBe('Bloqueado')
  })
})

describe('STATUS_DESCRIPTIONS', () => {
  it('tiene descripciones para todos los estados', () => {
    expect(STATUS_DESCRIPTIONS.disponible).toContain('disponible')
    expect(STATUS_DESCRIPTIONS.pendiente).toContain('pendiente')
    expect(STATUS_DESCRIPTIONS.reservado).toContain('reservado')
    expect(STATUS_DESCRIPTIONS.bloqueado).toContain('no disponible')
  })
})

