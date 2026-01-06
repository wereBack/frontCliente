/**
 * Servicios API para la aplicación cliente.
 * Las peticiones de lectura son públicas, las de escritura requieren autenticación.
 */

import { api } from '../../auth/apiClient';

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

// ==================== PLANOS API (Públicos) ====================

export async function fetchPlanos(): Promise<PlanoData[]> {
    return api.get<PlanoData[]>('/planos/', { skipAuth: true });
}

export async function fetchPlano(id: string): Promise<PlanoData> {
    return api.get<PlanoData>(`/planos/${id}`, { skipAuth: true });
}

// ==================== EVENTOS API (Públicos) ====================

export async function fetchEventos(): Promise<EventoData[]> {
    return api.get<EventoData[]>('/eventos/', { skipAuth: true });
}

// ==================== RESERVACIONES API (Requieren Auth) ====================

export async function createReservation(spaceId: string, asignee?: string): Promise<ReservationData> {
    return api.post<ReservationData>(`/spaces/${spaceId}/reservar`, { asignee });
}

export async function cancelReservation(spaceId: string): Promise<void> {
    await api.delete(`/spaces/${spaceId}/reserva`);
}

// ==================== BLOQUEO DE ESPACIOS (Requieren Auth + Admin) ====================

export async function blockSpace(spaceId: string): Promise<SpaceData> {
    return api.patch<SpaceData>(`/spaces/${spaceId}/bloquear`);
}

export async function unblockSpace(spaceId: string): Promise<SpaceData> {
    return api.patch<SpaceData>(`/spaces/${spaceId}/desbloquear`);
}
