import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import {
    fetchPendingReservations,
    confirmReservation,
    rejectReservation,
    type ReservationData,
} from '../services/api'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

const PendingReservations = () => {
    const [reservations, setReservations] = useState<ReservationData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Cargar reservas pendientes
    const loadReservations = useCallback(async () => {
        try {
            setError(null)
            const pending = await fetchPendingReservations()
            setReservations(pending)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar reservas')
        } finally {
            setLoading(false)
        }
    }, [])

    // Conectar WebSocket
    useEffect(() => {
        const newSocket = io(`${API_BASE}/reservas`, {
            transports: ['websocket', 'polling'],
        })

        newSocket.on('connect', () => {
            console.log('WebSocket conectado al namespace /reservas')
        })

        newSocket.on('disconnect', () => {
            console.log('WebSocket desconectado')
        })

        // Escuchar eventos de reservas
        newSocket.on('reservation_created', (data) => {
            console.log('Nueva reserva creada:', data)
            if (data.reservation?.estado === 'PENDING') {
                setReservations((prev) => [...prev, data.reservation])
            }
        })

        newSocket.on('reservation_updated', (data) => {
            console.log('Reserva actualizada:', data)
            if (data.reservation?.estado === 'RESERVED') {
                setReservations((prev) =>
                    prev.filter((r) => r.id !== data.reservation.id)
                )
            }
        })

        newSocket.on('reservation_expired', (data) => {
            console.log('Reserva expirada:', data)
            setReservations((prev) =>
                prev.filter((r) => r.id !== data.reservation?.id)
            )
        })

        newSocket.on('reservation_cancelled', (data) => {
            console.log('Reserva cancelada:', data)
            setReservations((prev) =>
                prev.filter((r) => r.id !== data.reservation?.id)
            )
        })

        return () => {
            newSocket.disconnect()
        }
    }, [])

    // Cargar reservas al inicio
    useEffect(() => {
        loadReservations()
    }, [loadReservations])

    // Confirmar reserva
    const handleConfirm = async (id: string) => {
        try {
            await confirmReservation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al confirmar')
        }
    }

    // Rechazar reserva
    const handleReject = async (id: string) => {
        try {
            await rejectReservation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))
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

