import { create } from 'zustand'

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

export type Stand = RectShape | PolygonShape | FreeShape
export type Zone = RectShape | PolygonShape | FreeShape

export type RectPreset = {
  id: string
  label: string
  width: number
  height: number
}

type StandStore = {
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]
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

export const useStandStore = create<StandStore>((set, get) => ({
  stands: [],
  zones: [],
  history: [],
  selectedStandId: null,
  mode: 'stand-rect',
  color: '#ffb703',
  rectPresetId: 'medium',
  presets: DEFAULT_PRESETS,
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
  clearAll: () => set({ stands: [], zones: [], history: [], selectedStandId: null }),
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
