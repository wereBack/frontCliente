/**
 * Servicios API para el panel de administración.
 * Todas las peticiones incluyen automáticamente el token de autenticación.
 */

import { api } from '../../auth/apiClient';

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

// ==================== PLANOS API ====================

export async function fetchPlanos(): Promise<PlanoData[]> {
    return api.get<PlanoData[]>('/planos/', { skipAuth: true });
}

export async function fetchPlanosByEvento(eventoId: string): Promise<PlanoData[]> {
    return api.get<PlanoData[]>(`/planos/por-evento/${eventoId}`, { skipAuth: true });
}

export async function fetchPlano(id: string): Promise<PlanoData> {
    return api.get<PlanoData>(`/planos/${id}`, { skipAuth: true });
}

export async function createPlano(data: PlanoData): Promise<PlanoData> {
    return api.post<PlanoData>('/planos/', data);
}

export async function updatePlano(id: string, data: PlanoData): Promise<PlanoData> {
    return api.put<PlanoData>(`/planos/${id}`, data);
}

export async function deletePlano(id: string): Promise<void> {
    await api.delete(`/planos/${id}`);
}

export async function uploadPlanoImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ url: string }>('/planos/upload-image', formData);
}

// ==================== EVENTOS API ====================

export interface EventoData {
    id: string;
    nombre: string;
    fecha_reserva_desde: string;
    fecha_reserva_hasta: string;
}

export async function fetchEventos(): Promise<EventoData[]> {
    return api.get<EventoData[]>('/eventos/', { skipAuth: true });
}

export async function createEvento(data: Omit<EventoData, 'id'>): Promise<EventoData> {
    return api.post<EventoData>('/eventos/', data);
}

export async function deleteEvento(id: string): Promise<void> {
    await api.delete(`/eventos/${id}`);
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

interface PendingReservationsResponse {
    reservations: ReservationData[];
}

interface ReservationResponse {
    reservation: ReservationData;
}

export async function fetchPendingReservations(): Promise<ReservationData[]> {
    const data = await api.get<PendingReservationsResponse>('/api/reservas/pending');
    return data.reservations;
}

export async function fetchReservationStatus(id: string): Promise<ReservationStatus> {
    return api.get<ReservationStatus>(`/api/reservas/${id}/status`);
}

export async function confirmReservation(id: string): Promise<ReservationData> {
    const data = await api.post<ReservationResponse>(`/api/reservas/${id}/confirm`);
    return data.reservation;
}

export async function rejectReservation(id: string): Promise<ReservationData> {
    const data = await api.post<ReservationResponse>(`/api/reservas/${id}/reject`);
    return data.reservation;
}

// ==================== STANDS/SPACES API ====================

export interface SpaceUpdateData {
    name?: string;
    price?: number | null;
    active?: boolean;
    status?: 'AVAILABLE' | 'PENDING' | 'RESERVED' | 'BLOCKED';
}

export async function updateSpace(id: string, data: SpaceUpdateData): Promise<SpaceData> {
    return api.patch<SpaceData>(`/spaces/${id}`, data);
}

export async function deleteSpace(id: string): Promise<void> {
    await api.delete(`/spaces/${id}`);
}

export interface SpaceCreateData {
    plano_id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    price?: number | null;
    zone_id?: string;
    points?: number[];
}

export async function createSpace(data: SpaceCreateData): Promise<SpaceData> {
    return api.post<SpaceData>('/spaces/', data);
}

// ==================== ZONES API ====================

export interface ZoneUpdateData {
    name?: string;
    price?: number | null;
    color?: string;
    active?: boolean;
}

export async function updateZone(id: string, data: ZoneUpdateData): Promise<ZoneData> {
    return api.patch<ZoneData>(`/zones/${id}`, data);
}

export async function deleteZone(id: string): Promise<void> {
    await api.delete(`/zones/${id}`);
}

export interface ZoneCreateData {
    plano_id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name: string;
    price?: number | null;
    points?: number[];
}

export async function createZone(data: ZoneCreateData): Promise<ZoneData> {
    return api.post<ZoneData>('/zones/', data);
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
    return api.get<SpaceWithReservation[]>('/spaces/', { skipAuth: true });
}
