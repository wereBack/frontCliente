/**
 * Utilidad para convertir URLs de S3 a URLs del proxy del backend.
 * Esto evita problemas de CORS al cargar imagenes en el canvas.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

// Patron para detectar URLs de S3
const S3_URL_PATTERN = /^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/;

/**
 * Convierte una URL de S3 a una URL del proxy del backend.
 * Si la URL no es de S3, la retorna sin modificar.
 * 
 * @param url URL original (puede ser de S3 o cualquier otra)
 * @returns URL del proxy si es de S3, o la URL original si no
 */
export function toProxyUrl(url: string): string {
    if (!url) return url;
    
    // Si es una data URL, retornarla sin modificar
    if (url.startsWith('data:')) {
        return url;
    }
    
    // Si ya es una URL del proxy, retornarla sin modificar
    if (url.startsWith(API_BASE)) {
        return url;
    }
    
    // Verificar si es una URL de S3
    const match = url.match(S3_URL_PATTERN);
    if (match) {
        const s3Key = match[3]; // La clave del archivo en S3 (ej: "planos/uuid.svg")
        return `${API_BASE}/planos/image/${s3Key}`;
    }
    
    // No es una URL de S3, retornar sin modificar
    return url;
}

/**
 * Verifica si una URL es de S3.
 */
export function isS3Url(url: string): boolean {
    return S3_URL_PATTERN.test(url);
}

