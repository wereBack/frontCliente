import { create } from 'zustand'
import { createPlano, updatePlano, fetchPlano, uploadPlanoImage, type PlanoData } from '../services/api'

export type DrawingMode =
  | 'select'
  | 'stand-rect'
  | 'stand-polygon'
  | 'stand-free'
  | 'stand-paint'
  | 'zone-rect'
  | 'zone-polygon'
  | 'zone-free'
  | 'zone-paint'

export type BaseShape = {
  id: string
  color: string
  label?: string
  price?: number
}

export type RectShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonShape = BaseShape & {
  kind: 'polygon'
  points: number[]
}

export type FreeShape = BaseShape & {
  kind: 'free'
  points: number[]
}

export type ReservationState = 'AVAILABLE' | 'PENDING' | 'RESERVED' | 'BLOCKED'

export type Stand = (RectShape | PolygonShape | FreeShape) & {
  reservationStatus?: ReservationState
}
export type Zone = RectShape | PolygonShape | FreeShape

export type RectPreset = {
  id: string
  label: string
  width: number
  height: number
}

type StandStore = {
  // Plano state
  planoId: string | null
  planoName: string
  eventoId: string | null
  backgroundUrl: string
  backgroundFile: File | null
  canvasWidth: number
  canvasHeight: number
  isSaving: boolean
  lastSaved: Date | null

  // Drawing state
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]

  // Plano actions
  setPlanoName: (name: string) => void
  setEventoId: (id: string | null) => void
  setBackgroundUrl: (url: string) => void
  setBackgroundFile: (file: File | null) => void
  setCanvasSize: (width: number, height: number) => void
  savePlano: () => Promise<void>
  loadPlano: (id: string) => Promise<void>

  // Drawing actions
  addStand: (stand: Stand) => void
  addZone: (zone: Zone) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  setMode: (mode: DrawingMode) => void
  setColor: (color: string) => void
  selectStand: (id: string | null) => void
  removeStand: (id: string) => void
  removeZone: (id: string) => void
  clearAll: () => void
  undoLast: () => void
  setRectPreset: (id: string | null) => void
  getRectPreset: () => RectPreset | null
}

const DEFAULT_PRESETS: RectPreset[] = [
  { id: 'small', label: '2 x 2 m', width: 160, height: 160 },
  { id: 'medium', label: '3 x 2 m', width: 240, height: 160 },
  { id: 'large', label: '4 x 3 m', width: 320, height: 240 },
]

// Helper to convert frontend shape to backend format
const shapeToApiFormat = (shape: Stand | Zone, index: number) => {
  if (shape.kind === 'rect') {
    return {
      kind: 'rect',
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      color: shape.color,
      name: shape.label || `Stand ${index + 1}`,
      price: shape.price,
    }
  }
  // For polygon/free shapes, calculate bounding box
  const points = (shape as PolygonShape | FreeShape).points
  const xs = points.filter((_, i) => i % 2 === 0)
  const ys = points.filter((_, i) => i % 2 === 1)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    kind: shape.kind,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    color: shape.color,
    name: shape.label || `Stand ${index + 1}`,
    price: shape.price,
  }
}

// Helper to convert backend format to frontend shape
const apiToShapeFormat = (data: PlanoData['spaces'][0]): Stand => {
  // Determine reservation status
  let reservationStatus: ReservationState = 'AVAILABLE'

  if (data.active === false) {
    reservationStatus = 'BLOCKED'
  } else if (data.reservations && data.reservations.length > 0) {
    // Check for active reservations
    const activeReservation = data.reservations.find(
      r => r.estado === 'RESERVED' || r.estado === 'PENDING'
    )
    if (activeReservation) {
      reservationStatus = activeReservation.estado === 'RESERVED' ? 'RESERVED' : 'PENDING'
    }
  }

  return {
    id: data.id || crypto.randomUUID(),
    kind: 'rect',
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
    color: data.color,
    label: data.name,
    price: data.price,
    reservationStatus,
  }
}

// Helper to check if stand is inside a zone
const isInsideZone = (stand: { x: number; y: number; width: number; height: number }, zone: { x: number; y: number; width: number; height: number }): boolean => {
  // Check if stand center is inside zone
  const standCenterX = stand.x + stand.width / 2
  const standCenterY = stand.y + stand.height / 2
  return (
    standCenterX >= zone.x &&
    standCenterX <= zone.x + zone.width &&
    standCenterY >= zone.y &&
    standCenterY <= zone.y + zone.height
  )
}

// Helper to find containing zone for a stand
const findContainingZone = (stand: ReturnType<typeof shapeToApiFormat>, zones: ReturnType<typeof shapeToApiFormat>[]): string | undefined => {
  for (const zone of zones) {
    if (isInsideZone(stand, zone)) {
      return (zone as { id?: string }).id
    }
  }
  return undefined
}

export const useStandStore = create<StandStore>((set, get) => ({
  // Plano state
  planoId: null,
  planoName: 'Nuevo Plano',
  eventoId: null,
  backgroundUrl: '',
  backgroundFile: null,
  canvasWidth: 800,
  canvasHeight: 600,
  isSaving: false,
  lastSaved: null,

  // Drawing state
  stands: [],
  zones: [],
  history: [],
  selectedStandId: null,
  mode: 'stand-rect',
  color: '#ffb703',
  rectPresetId: 'medium',
  presets: DEFAULT_PRESETS,

  // Plano actions
  setPlanoName: (name) => set({ planoName: name }),
  setEventoId: (id) => set({ eventoId: id }),
  setBackgroundUrl: (url) => set({ backgroundUrl: url }),
  setBackgroundFile: (file) => set({ backgroundFile: file }),
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  savePlano: async () => {
    const state = get()
    set({ isSaving: true })

    try {
      let backgroundUrl = state.backgroundUrl

      // Si hay un archivo nuevo, subirlo primero a S3
      if (state.backgroundFile) {
        const uploadResult = await uploadPlanoImage(state.backgroundFile)
        backgroundUrl = uploadResult.url
        // Limpiar el archivo despues de subir y actualizar la URL
        set({ backgroundFile: null, backgroundUrl: backgroundUrl })
      }

      // First prepare zones with temporary IDs for reference
      const zonesWithIds = state.zones.map((zone, i) => ({
        ...shapeToApiFormat(zone, i),
        id: zone.id,
        name: zone.label || `Zona ${i + 1}`,
      }))

      // Prepare stands with zone detection
      const standsWithZones = state.stands.map((stand, i) => {
        const standData = shapeToApiFormat(stand, i)
        const containingZoneId = findContainingZone(standData, zonesWithIds)
        return {
          ...standData,
          zone_id: containingZoneId,
        }
      })

      const planoData: PlanoData = {
        name: state.planoName,
        url: backgroundUrl,
        width: state.canvasWidth,
        height: state.canvasHeight,
        evento_id: state.eventoId || undefined,
        spaces: standsWithZones,
        zones: zonesWithIds,
      }

      let result: PlanoData
      if (state.planoId) {
        result = await updatePlano(state.planoId, planoData)
      } else {
        result = await createPlano(planoData)
      }

      set({
        planoId: result.id || null,
        isSaving: false,
        lastSaved: new Date()
      })

      alert('Plano guardado correctamente')
    } catch (error) {
      set({ isSaving: false })
      alert(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  },

  loadPlano: async (id: string) => {
    try {
      const plano = await fetchPlano(id)

      const stands: Stand[] = (plano.spaces || []).map(apiToShapeFormat)
      const zones: Zone[] = (plano.zones || []).map(apiToShapeFormat)

      set({
        planoId: plano.id || null,
        planoName: plano.name,
        eventoId: plano.evento_id || null,
        backgroundUrl: plano.url,
        canvasWidth: plano.width,
        canvasHeight: plano.height,
        stands,
        zones,
        history: [],
        selectedStandId: null,
      })
    } catch (error) {
      alert(`Error al cargar plano: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  },

  // Drawing actions
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      history: [...state.history, { type: 'stand', id: stand.id }],
      selectedStandId: stand.id,
    })),
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
      history: [...state.history, { type: 'zone', id: zone.id }],
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? ({ ...stand, ...updates } as Stand) : stand,
      ),
    })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === id ? ({ ...zone, ...updates } as Zone) : zone,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setColor: (color) => set({ color }),
  selectStand: (id) => set({ selectedStandId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
  clearAll: () => set({
    stands: [],
    zones: [],
    history: [],
    selectedStandId: null,
    planoId: null,
    planoName: 'Nuevo Plano',
    backgroundUrl: '',
    backgroundFile: null,
  }),
  undoLast: () =>
    set((state) => {
      const history = [...state.history]
      const last = history.pop()
      if (!last) {
        return state
      }
      if (last.type === 'stand') {
        return {
          history,
          stands: state.stands.filter((stand) => stand.id !== last.id),
          selectedStandId:
            state.selectedStandId === last.id ? null : state.selectedStandId,
        }
      }
      return {
        history,
        zones: state.zones.filter((zone) => zone.id !== last.id),
      }
    }),
  setRectPreset: (id) => set({ rectPresetId: id }),
  getRectPreset: () =>
    get().presets.find((preset) => preset.id === get().rectPresetId) ?? null,
}))
