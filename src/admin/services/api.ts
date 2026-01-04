const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

export interface PlanoData {
    id?: string;
    name: string;
    url: string;
    width: number;
    height: number;
    evento_id?: string;
    spaces: SpaceData[];
    zones: ZoneData[];
}

export interface SpaceData {
    id?: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    zone_id?: string;
    price?: number;
    active?: boolean;
    reservations?: {
        id: string;
        estado: 'PENDING' | 'RESERVED' | 'EXPIRED' | 'CANCELLED';
        asignee: string | null;
    }[];
}

export interface ZoneData {
    id?: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    price?: number;
}

export async function fetchPlanos(): Promise<PlanoData[]> {
    const response = await fetch(`${API_BASE}/planos/`);
    if (!response.ok) {
        throw new Error('Error al obtener planos');
    }
    return response.json();
}

export async function fetchPlanosByEvento(eventoId: string): Promise<PlanoData[]> {
    const response = await fetch(`${API_BASE}/planos/por-evento/${eventoId}`);
    if (!response.ok) {
        throw new Error('Error al obtener planos del evento');
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

export async function createPlano(data: PlanoData): Promise<PlanoData> {
    const response = await fetch(`${API_BASE}/planos/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear plano');
    }
    return response.json();
}

export async function updatePlano(id: string, data: PlanoData): Promise<PlanoData> {
    const response = await fetch(`${API_BASE}/planos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar plano');
    }
    return response.json();
}

export async function deletePlano(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/planos/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar plano');
    }
}

export async function uploadPlanoImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/planos/upload-image`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir imagen');
    }
    return response.json();
}

// ... (interfaces existing)

export interface EventoData {
    id: string;
    nombre: string;
    fecha_reserva_desde: string;
    fecha_reserva_hasta: string;
}

// ... (existing functions)

export async function fetchEventos(): Promise<EventoData[]> {
    const response = await fetch(`${API_BASE}/eventos/`);
    if (!response.ok) {
        throw new Error('Error al obtener eventos');
    }
    return response.json();
}

export async function createEvento(data: Omit<EventoData, 'id'>): Promise<EventoData> {
    const response = await fetch(`${API_BASE}/eventos/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear evento');
    }
    return response.json();
}

export async function deleteEvento(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/eventos/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar evento');
    }
}

// ==================== RESERVAS API ====================

export interface ReservationData {
    id: string;
    estado: 'PENDING' | 'RESERVED' | 'EXPIRED' | 'CANCELLED';
    asignee: string | null;
    user_id: string | null;
    space_id: string;
    space_name?: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReservationStatus {
    exists_in_database: boolean;
    is_active_in_redis: boolean;
    ttl_seconds: number;
    reservation: ReservationData | null;
}

export async function fetchPendingReservations(): Promise<ReservationData[]> {
    const response = await fetch(`${API_BASE}/api/reservas/pending`);
    if (!response.ok) {
        throw new Error('Error al obtener reservas pendientes');
    }
    const data = await response.json();
    return data.reservations;
}

export async function fetchReservationStatus(id: string): Promise<ReservationStatus> {
    const response = await fetch(`${API_BASE}/api/reservas/${id}/status`);
    if (!response.ok) {
        throw new Error('Error al obtener estado de reserva');
    }
    return response.json();
}

export async function confirmReservation(id: string): Promise<ReservationData> {
    const response = await fetch(`${API_BASE}/api/reservas/${id}/confirm`, {
        method: 'POST',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al confirmar reserva');
    }
    const data = await response.json();
    return data.reservation;
}

export async function rejectReservation(id: string): Promise<ReservationData> {
    const response = await fetch(`${API_BASE}/api/reservas/${id}/reject`, {
        method: 'POST',
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al rechazar reserva');
    }
    const data = await response.json();
    return data.reservation;
}

// ==================== STANDS/SPACES API ====================

export interface SpaceUpdateData {
    name?: string;
    price?: number | null;
    active?: boolean;
}

export async function updateSpace(id: string, data: SpaceUpdateData): Promise<SpaceData> {
    const response = await fetch(`${API_BASE}/spaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar stand');
    }
    return response.json();
}

// ==================== ZONES API ====================

export interface ZoneUpdateData {
    name?: string;
    price?: number | null;
    color?: string;
    active?: boolean;
}

export async function updateZone(id: string, data: ZoneUpdateData): Promise<ZoneData> {
    const response = await fetch(`${API_BASE}/zones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar zona');
    }
    return response.json();
}

// ==================== SPACES WITH RESERVATIONS ====================

export interface SpaceWithReservation {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    price?: number;
    zone_id?: string;
    active: boolean;
    reservations: {
        id: string;
        estado: ReservationData['estado'];
        asignee: string | null;
        user_id: string | null;
        expires_at: string | null;
    }[];
}

export async function fetchSpaces(): Promise<SpaceWithReservation[]> {
    const response = await fetch(`${API_BASE}/spaces/`);
    if (!response.ok) {
        throw new Error('Error al obtener espacios');
    }
    return response.json();
}