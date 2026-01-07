import { http, HttpResponse } from 'msw'

// Usar la misma URL base que el apiClient
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

// Datos mock para tests
export const mockPlanos = [
  {
    id: 'plano-1',
    name: 'Plano Principal',
    url: '/floors/piso-1.jpg',
    width: 800,
    height: 600,
    evento_id: 'evento-1',
    spaces: [
      {
        id: 'space-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
        name: 'A1',
        active: true,
        price: 1000,
        reservations: [],
      },
      {
        id: 'space-2',
        kind: 'rect',
        x: 200,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
        name: 'A2',
        active: true,
        reservations: [{ id: 'res-1', estado: 'PENDING', asignee: 'user1' }],
      },
      {
        id: 'space-3',
        kind: 'rect',
        x: 300,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
        name: 'A3',
        active: true,
        reservations: [{ id: 'res-2', estado: 'RESERVED', asignee: 'user2' }],
      },
      {
        id: 'space-4',
        kind: 'rect',
        x: 400,
        y: 100,
        width: 50,
        height: 50,
        color: '#cccccc',
        name: 'A4',
        active: false,
        reservations: [],
      },
    ],
    zones: [
      {
        id: 'zone-1',
        kind: 'rect',
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        color: '#e0e0e0',
        name: 'Zona A',
        price: 500,
      },
    ],
  },
]

export const mockEventos = [
  {
    id: 'evento-1',
    nombre: 'Feria de Empleo 2026',
    fecha_reserva_desde: '2026-01-01',
    fecha_reserva_hasta: '2026-12-31',
  },
]

export const handlers = [
  // GET /planos/
  http.get(`${API_BASE}/planos/`, () => {
    return HttpResponse.json(mockPlanos)
  }),

  // GET /planos/:id
  http.get(`${API_BASE}/planos/:id`, ({ params }) => {
    const plano = mockPlanos.find((p) => p.id === params.id)
    if (!plano) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(plano)
  }),

  // GET /eventos/
  http.get(`${API_BASE}/eventos/`, () => {
    return HttpResponse.json(mockEventos)
  }),

  // POST /spaces/:id/reservar
  http.post(`${API_BASE}/spaces/:spaceId/reservar`, async ({ params }) => {
    return HttpResponse.json({
      id: 'new-reservation',
      estado: 'PENDING',
      space_id: params.spaceId,
    })
  }),

  // DELETE /spaces/:id/reserva
  http.delete(`${API_BASE}/spaces/:spaceId/reserva`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

