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
}

export interface ReservationData {
    id: string;
    estado: string;
    asignee?: string;
    user_id?: string;
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

