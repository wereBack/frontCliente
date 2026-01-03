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
