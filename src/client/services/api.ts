const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

export interface PlanoData {
    id: string;
    name: string;
    url: string;
    width: number;
    height: number;
    evento_id?: string;
    spaces: SpaceData[];
    zones: ZoneData[];
}

export interface SpaceData {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    active: boolean;
    price?: number;
    zone_id?: string;
    reservations?: ReservationData[];
}

export interface ZoneData {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    price?: number;
}

export interface ReservationData {
    id: string;
    estado: string;
    asignee?: string;
    user_id?: string;
    expires_at?: string;
}

export interface EventoData {
    id: string;
    nombre: string;
    fecha_reserva_desde: string;
    fecha_reserva_hasta: string;
    planos?: PlanoData[];
}

export async function fetchPlanos(): Promise<PlanoData[]> {
    const response = await fetch(`${API_BASE}/planos/`);
    if (!response.ok) {
        throw new Error('Error al obtener planos');
    }
    return response.json();
}

export async function fetchPlano(id: string): Promise<PlanoData> {
    const response = await fetch(`${API_BASE}/planos/${id}`);
    if (!response.ok) {
        throw new Error('Error al obtener plano');
    }
    return response.json();
}

export async function fetchEventos(): Promise<EventoData[]> {
    const response = await fetch(`${API_BASE}/eventos/`);
    if (!response.ok) {
        throw new Error('Error al obtener eventos');
    }
    return response.json();
}

export async function createReservation(spaceId: string, userId?: string): Promise<ReservationData> {
    const response = await fetch(`${API_BASE}/spaces/${spaceId}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al reservar');
    }
    return response.json();
}

export async function cancelReservation(spaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/spaces/${spaceId}/reserva`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cancelar reserva');
    }
}

export async function blockSpace(spaceId: string): Promise<SpaceData> {
    const response = await fetch(`${API_BASE}/spaces/${spaceId}/bloquear`, {
        method: 'PATCH',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al bloquear');
    }
    return response.json();
}

export async function unblockSpace(spaceId: string): Promise<SpaceData> {
    const response = await fetch(`${API_BASE}/spaces/${spaceId}/desbloquear`, {
        method: 'PATCH',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al desbloquear');
    }
    return response.json();
}
