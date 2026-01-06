/**
 * Cliente API centralizado con autenticación Keycloak.
 * Todas las peticiones incluyen automáticamente el token Bearer.
 */

import keycloak from './keycloak';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    skipAuth?: boolean;
}

/**
 * Obtiene el token de acceso actualizado.
 * Refresca el token si está próximo a expirar.
 */
async function getAccessToken(): Promise<string | null> {
    if (!keycloak.authenticated) {
        return null;
    }

    try {
        // Refrescar token si expira en menos de 30 segundos
        await keycloak.updateToken(30);
        return keycloak.token || null;
    } catch (error) {
        console.error('Error al refrescar token:', error);
        return null;
    }
}

/**
 * Realiza una petición HTTP con autenticación automática.
 */
export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { skipAuth = false, headers = {}, ...fetchOptions } = options;

    const requestHeaders: Record<string, string> = {
        ...headers,
    };

    // Agregar Content-Type si no está definido y hay body
    if (fetchOptions.body && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    // Agregar token de autenticación si está disponible y no se salta auth
    if (!skipAuth) {
        const token = await getAccessToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('No hay token disponible para la peticion:', endpoint);
        }
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
    });

    // Manejar errores de autenticación
    if (response.status === 401) {
        throw new Error('No autenticado');
    }

    if (response.status === 403) {
        throw new Error('Acceso denegado: permisos insuficientes');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
    }

    // Manejar respuestas vacías
    const text = await response.text();
    if (!text) {
        return {} as T;
    }

    return JSON.parse(text) as T;
}

/**
 * Métodos de conveniencia para diferentes verbos HTTP.
 */
export const api = {
    get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

    /**
     * Subir archivo con FormData.
     */
    upload: async <T = unknown>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> => {
        const { skipAuth = false, headers = {}, ...fetchOptions } = options || {};

        const requestHeaders: Record<string, string> = { ...headers };
        // No setear Content-Type para FormData, el browser lo hace automáticamente

        if (!skipAuth) {
            const token = await getAccessToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }
        }

        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

        const response = await fetch(url, {
            ...fetchOptions,
            method: 'POST',
            headers: requestHeaders,
            body: formData,
        });

        if (response.status === 401) {
            throw new Error('No autenticado');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        return response.json() as Promise<T>;
    },
};

export default api;

