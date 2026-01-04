import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

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

interface UseReservationSocketOptions {
    onReservationCreated?: (data: ReservationEvent) => void
    onReservationUpdated?: (data: ReservationEvent) => void
    onReservationExpired?: (data: ReservationEvent) => void
    onReservationCancelled?: (data: ReservationEvent) => void
    onAnyChange?: () => void
}

export function useReservationSocket(options: UseReservationSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null)
    const optionsRef = useRef(options)
    
    // Keep options ref updated
    optionsRef.current = options

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return

        console.log('🔌 Conectando WebSocket a', `${API_BASE}/reservas`)
        
        const socket = io(`${API_BASE}/reservas`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        socket.on('connect', () => {
            console.log('✅ WebSocket conectado al namespace /reservas')
        })

        socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket desconectado:', reason)
        })

        socket.on('connect_error', (error) => {
            console.log('⚠️ Error de conexión WebSocket:', error.message)
        })

        // Eventos de reservas
        socket.on('reservation_created', (data: ReservationEvent) => {
            console.log('📥 Nueva reserva creada:', data)
            optionsRef.current.onReservationCreated?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_updated', (data: ReservationEvent) => {
            console.log('🔄 Reserva actualizada:', data)
            optionsRef.current.onReservationUpdated?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_expired', (data: ReservationEvent) => {
            console.log('⏰ Reserva expirada:', data)
            optionsRef.current.onReservationExpired?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socket.on('reservation_cancelled', (data: ReservationEvent) => {
            console.log('🚫 Reserva cancelada:', data)
            optionsRef.current.onReservationCancelled?.(data)
            optionsRef.current.onAnyChange?.()
        })

        socketRef.current = socket
    }, [])

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('🔌 Desconectando WebSocket...')
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


