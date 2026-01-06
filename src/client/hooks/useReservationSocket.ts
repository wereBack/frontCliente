import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import keycloak from '../../auth/keycloak'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

interface ReservationEvent {
    event: string
    reservation: {
        id: string
        estado: string
        space_id: string
        user_id?: string
        asignee?: string
        expires_at?: string
    }
    plano_id?: string
}

interface SpaceEvent {
    event: string
    space: {
        id: string
        name: string
        active: boolean
        reservations: {
            id: string
            estado: string
            asignee: string | null
        }[]
    }
    plano_id?: string
}

interface UseReservationSocketOptions {
    onReservationCreated?: (data: ReservationEvent) => void
    onReservationUpdated?: (data: ReservationEvent) => void
    onReservationExpired?: (data: ReservationEvent) => void
    onReservationCancelled?: (data: ReservationEvent) => void
    onSpaceUpdated?: (data: SpaceEvent) => void
    onAnyChange?: () => void
}

export function useReservationSocket(options: UseReservationSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null)
    const optionsRef = useRef(options)
    
    // Keep options ref updated
    optionsRef.current = options

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return

        // Enviar token si el usuario está autenticado
        const token = keycloak.authenticated ? keycloak.token : undefined
        
        const socket = io(`${API_BASE}/reservas`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            ...(token && { auth: { token }, query: { token } }),
        })

        socket.on('connect_error', (error) => {
            console.warn('Error de conexion WebSocket:', error.message)
        })
        
        socket.on('auth_error', (data: { error: string }) => {
            console.error('Error de autenticacion WebSocket:', data.error)
        })

        // Eventos de reservas
        socket.on('reservation_created', (data: ReservationEvent) => {
            optionsRef.current.onReservationCreated?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_updated', (data: ReservationEvent) => {
            optionsRef.current.onReservationUpdated?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_expired', (data: ReservationEvent) => {
            optionsRef.current.onReservationExpired?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_cancelled', (data: ReservationEvent) => {
            optionsRef.current.onReservationCancelled?.(data)
            optionsRef.current.onAnyChange?.()
        })

        // Evento cuando un admin cambia el estado de un espacio manualmente
        socket.on('space_updated', (data: SpaceEvent) => {
            optionsRef.current.onSpaceUpdated?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socketRef.current = socket
    }, [])

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }
    }, [])

    // Conectar al montar, desconectar al desmontar
    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    return {
        isConnected: socketRef.current?.connected ?? false,
        connect,
        disconnect,
    }
}


