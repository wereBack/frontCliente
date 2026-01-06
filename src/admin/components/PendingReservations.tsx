import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import {
    fetchPendingReservations,
    confirmReservation,
    rejectReservation,
    type ReservationData,
} from '../services/api'
import { useStandStore } from '../store/standStore'
import { useAuth } from '../../auth/AuthContext'
import keycloak from '../../auth/keycloak'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

// Tipo para eventos de espacio
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

const PendingReservations = () => {
    const [reservations, setReservations] = useState<ReservationData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Auth context para verificar autenticación
    const { isAuthenticated, hasRole } = useAuth()
    
    // Acceso al store para actualizar stands
    const updateStand = useStandStore((state) => state.updateStand)

    // Cargar reservas pendientes
    const loadReservations = useCallback(async () => {
        // Solo cargar si está autenticado y tiene rol Admin
        if (!isAuthenticated || !hasRole('Admin')) {
            setLoading(false)
            return
        }
        
        try {
            setError(null)
            const pending = await fetchPendingReservations()
            setReservations(pending)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar reservas')
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated, hasRole])

    // Helper para calcular el estado del stand basado en los datos
    const getReservationStatus = (space: SpaceEvent['space']) => {
        if (!space.active) return 'BLOCKED'
        const activeReservation = space.reservations?.find(
            r => r.estado === 'RESERVED' || r.estado === 'PENDING'
        )
        if (activeReservation) {
            return activeReservation.estado === 'RESERVED' ? 'RESERVED' : 'PENDING'
        }
        return 'AVAILABLE'
    }

    // Conectar WebSocket con autenticación
    useEffect(() => {
        // Solo conectar si está autenticado
        if (!isAuthenticated) return
        
        // Obtener token para autenticar WebSocket
        const token = keycloak.token
        
        const newSocket = io(`${API_BASE}/reservas`, {
            transports: ['websocket', 'polling'],
            auth: { token },
            query: { token },
        })

        newSocket.on('connect', () => {
            console.log('Admin WebSocket conectado')
        })

        newSocket.on('disconnect', () => {
            console.log('Admin WebSocket desconectado')
        })
        
        newSocket.on('auth_error', (data) => {
            console.error('Error de autenticacion WebSocket:', data.error)
        })

        // Escuchar eventos de reservas
        newSocket.on('reservation_created', (data) => {
            console.log('📥 Nueva reserva creada:', data)
            if (data.reservation?.estado === 'PENDING') {
                setReservations((prev) => {
                    // Evitar duplicados
                    if (prev.find(r => r.id === data.reservation.id)) return prev
                    return [...prev, data.reservation]
                })
                // Actualizar el stand en el canvas
                const spaceId = data.reservation.space_id
                if (spaceId) {
                    updateStand(spaceId, { reservationStatus: 'PENDING' })
                }
            }
        })

        newSocket.on('reservation_updated', (data) => {
            console.log('🔄 Reserva actualizada:', data)
            if (data.reservation?.estado === 'RESERVED') {
                setReservations((prev) =>
                    prev.filter((r) => r.id !== data.reservation.id)
                )
                // Actualizar el stand en el canvas
                const spaceId = data.reservation.space_id
                if (spaceId) {
                    updateStand(spaceId, { reservationStatus: 'RESERVED' })
                }
            }
        })

        newSocket.on('reservation_expired', (data) => {
            console.log('⏰ Reserva expirada:', data)
            setReservations((prev) =>
                prev.filter((r) => r.id !== data.reservation?.id)
            )
            // Actualizar el stand en el canvas
            const spaceId = data.reservation?.space_id
            if (spaceId) {
                updateStand(spaceId, { reservationStatus: 'AVAILABLE' })
            }
        })

        newSocket.on('reservation_cancelled', (data) => {
            console.log('🚫 Reserva cancelada:', data)
            setReservations((prev) =>
                prev.filter((r) => r.id !== data.reservation?.id)
            )
            // Actualizar el stand en el canvas
            const spaceId = data.reservation?.space_id
            if (spaceId) {
                updateStand(spaceId, { reservationStatus: 'AVAILABLE' })
            }
        })

        // Escuchar actualizaciones de espacios (nuevo evento)
        newSocket.on('space_updated', (data: SpaceEvent) => {
            console.log('🏢 Espacio actualizado:', data)
            const spaceId = data.space?.id
            if (spaceId) {
                const newStatus = getReservationStatus(data.space)
                updateStand(spaceId, { reservationStatus: newStatus as 'AVAILABLE' | 'PENDING' | 'RESERVED' | 'BLOCKED' })
            }
        })

        return () => {
            newSocket.disconnect()
        }
    }, [updateStand, isAuthenticated])

    // Cargar reservas al inicio
    useEffect(() => {
        loadReservations()
    }, [loadReservations])

    // Confirmar reserva
    const handleConfirm = async (id: string) => {
        try {
            // Encontrar la reserva para obtener el space_id
            const reservation = reservations.find(r => r.id === id)
            const spaceId = reservation?.space_id
            
            const confirmedReservation = await confirmReservation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))
            
            // Actualizar el estado del stand en el canvas a RESERVED
            if (spaceId) {
                updateStand(spaceId, { reservationStatus: 'RESERVED' })
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al confirmar')
        }
    }

    // Rechazar reserva
    const handleReject = async (id: string) => {
        try {
            // Encontrar la reserva para obtener el space_id
            const reservation = reservations.find(r => r.id === id)
            const spaceId = reservation?.space_id
            
            await rejectReservation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))
            
            // Actualizar el estado del stand en el canvas a AVAILABLE
            if (spaceId) {
                updateStand(spaceId, { reservationStatus: 'AVAILABLE' })
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al rechazar')
        }
    }

    if (loading) {
        return <div className="pending-reservations pending-reservations--loading">Cargando...</div>
    }

    if (error) {
        return (
            <div className="pending-reservations pending-reservations--error">
                <p>Error: {error}</p>
                <button onClick={loadReservations}>Reintentar</button>
            </div>
        )
    }

    return (
        <div className="pending-reservations">
            <h3>
                Reservas Pendientes
                {reservations.length > 0 && (
                    <span className="pending-reservations__badge">{reservations.length}</span>
                )}
            </h3>

            {reservations.length === 0 ? (
                <p className="pending-reservations__empty">No hay reservas pendientes</p>
            ) : (
                <ul className="pending-reservations__list">
                    {reservations.map((reservation) => (
                        <li key={reservation.id} className="pending-reservations__item">
                            <div className="pending-reservations__info">
                                <span className="pending-reservations__space">
                                    {reservation.space_name || `Stand ${reservation.space_id.slice(0, 8)}`}
                                </span>
                                {reservation.asignee && (
                                    <span className="pending-reservations__asignee">
                                        Solicitado por: {reservation.asignee}
                                    </span>
                                )}
                            </div>
                            <div className="pending-reservations__actions">
                                <button
                                    className="pending-reservations__btn pending-reservations__btn--confirm"
                                    onClick={() => handleConfirm(reservation.id)}
                                    title="Confirmar reserva"
                                >
                                    ✓
                                </button>
                                <button
                                    className="pending-reservations__btn pending-reservations__btn--reject"
                                    onClick={() => handleReject(reservation.id)}
                                    title="Rechazar reserva"
                                >
                                    ✕
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default PendingReservations

