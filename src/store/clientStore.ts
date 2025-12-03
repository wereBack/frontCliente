import { create } from 'zustand'
import { floors } from '../data/floors'
import type { FloorMeta, FloorStand, StandStatus } from '../types/stands'

const DEFAULT_FLOOR_ID = floors[0]?.id ?? 'default'

const buildStandMap = (
  items: FloorMeta[],
  pick: (stand: FloorStand) => StandStatus,
): Record<string, StandStatus> => {
  return items.reduce<Record<string, StandStatus>>((acc, floor) => {
    floor.stands.forEach((stand) => {
      acc[stand.id] = pick(stand)
    })
    return acc
  }, {})
}

const initialStatuses = buildStandMap(floors, (stand) => stand.status)

const initialReservations = floors.reduce<Record<string, ReservationRecord>>(
  (acc, floor) => {
    floor.stands.forEach((stand) => {
      if (stand.status === 'reservado' && stand.company) {
        acc[stand.id] = {
          standId: stand.id,
          companyName: stand.company,
          contactName: 'Confirmado',
          email: 'contacto@feria.com',
          phone: '+54 11 5555-0000',
          notes: stand.highlight ?? '',
          timestamp: new Date().toISOString(),
        }
      }
    })
    return acc
  },
  {},
)

type ReservationForm = {
  companyName: string
  contactName: string
  email: string
  phone: string
  notes: string
}

type ReservationRecord = ReservationForm & {
  standId: string
  timestamp: string
}

type LastAction =
  | {
      type: 'reserved'
      standId: string
      companyName: string
      timestamp: string
    }
  | {
      type: 'released'
      standId: string
      timestamp: string
    }

type ClientStore = {
  floorId: string
  selectedStandId: string | null
  statuses: Record<string, StandStatus>
  reservations: Record<string, ReservationRecord>
  form: ReservationForm
  isSubmitting: boolean
  lastAction?: LastAction
  selectFloor: (id: string) => void
  selectStand: (id: string | null) => void
  updateForm: (field: keyof ReservationForm, value: string) => void
  resetForm: () => void
  reserveSelected: () => Promise<ActionResult>
  releaseStand: (standId?: string) => ActionResult
}

type ActionResult = {
  ok: boolean
  message: string
}

const emptyForm: ReservationForm = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useClientStore = create<ClientStore>((set, get) => ({
  floorId: DEFAULT_FLOOR_ID,
  selectedStandId: null,
  statuses: initialStatuses,
  reservations: initialReservations,
  form: emptyForm,
  isSubmitting: false,
  lastAction: undefined,
  selectFloor: (id) =>
    set((state) => {
      const floor = floors.find((item) => item.id === id)
      let nextSelected = state.selectedStandId
      if (floor && nextSelected && !floor.stands.some((s) => s.id === nextSelected)) {
        nextSelected = null
      }
      return { floorId: id, selectedStandId: nextSelected }
    }),
  selectStand: (id) => set({ selectedStandId: id }),
  updateForm: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
    })),
  resetForm: () => set({ form: emptyForm }),
  reserveSelected: async () => {
    const { selectedStandId, statuses, form } = get()
    if (!selectedStandId) {
      return { ok: false, message: 'Seleccioná un stand para reservar.' }
    }

    const currentStatus = statuses[selectedStandId]
    if (currentStatus === 'reservado') {
      return { ok: false, message: 'Ese stand ya está reservado.' }
    }
    if (currentStatus === 'bloqueado') {
      return { ok: false, message: 'Ese stand está bloqueado por la organización.' }
    }

    if (!form.companyName || !form.contactName || !form.email || !form.phone) {
      return { ok: false, message: 'Completá los campos obligatorios del formulario.' }
    }

    set({ isSubmitting: true })
    await wait(800)

    const timestamp = new Date().toISOString()

    set((state) => ({
      isSubmitting: false,
      statuses: { ...state.statuses, [selectedStandId]: 'reservado' },
      reservations: {
        ...state.reservations,
        [selectedStandId]: { ...state.form, standId: selectedStandId, timestamp },
      },
      lastAction: {
        type: 'reserved',
        standId: selectedStandId,
        companyName: state.form.companyName,
        timestamp,
      },
      form: emptyForm,
    }))

    return { ok: true, message: `Reserva confirmada para el stand ${selectedStandId}.` }
  },
  releaseStand: (standIdParam) => {
    const standId = standIdParam ?? get().selectedStandId
    if (!standId) {
      return { ok: false, message: 'Seleccioná un stand para liberarlo.' }
    }
    const status = get().statuses[standId]
    if (status !== 'reservado') {
      return { ok: false, message: 'Ese stand no está reservado actualmente.' }
    }

    set((state) => {
      const nextStatuses: Record<string, StandStatus> = {
        ...state.statuses,
        [standId]: 'disponible',
      }
      const { [standId]: _removed, ...rest } = state.reservations
      return {
        statuses: nextStatuses,
        reservations: rest,
        lastAction: {
          type: 'released',
          standId,
          timestamp: new Date().toISOString(),
        },
      }
    })

    return { ok: true, message: `El stand ${standId} volvió a estar disponible.` }
  },
}))

