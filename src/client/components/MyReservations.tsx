import { useState, useEffect, useCallback } from 'react'
import { fetchMyReservations, requestCancellation } from '../services/api'
import type { MyReservationData } from '../services/api'

const STATUS_CONFIG: Record<string, { label: string; className: string; description: string }> = {
    PENDING: {
        label: 'Pendiente',
        className: 'my-reservation--pending',
        description: 'Esperando confirmación del administrador'
    },
    RESERVED: {
        label: 'Confirmada',
        className: 'my-reservation--reserved',
        description: 'Reserva confirmada'
    },
    CANCELLATION_REQUESTED: {
        label: 'Cancelación solicitada',
        className: 'my-reservation--cancellation-requested',
        description: 'Esperando aprobación del administrador'
    },
    CANCELLED: {
        label: 'Cancelada',
        className: 'my-reservation--cancelled',
        description: 'Reserva cancelada'
    },
    EXPIRED: {
        label: 'Expirada',
        className: 'my-reservation--expired',
        description: 'Reserva expirada'
    }
}

interface MyReservationsProps {
    onRefresh?: () => void
}

const MyReservations = ({ onRefresh }: MyReservationsProps) => {
    const [reservations, setReservations] = useState<MyReservationData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const loadReservations = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await fetchMyReservations()
            setReservations(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar reservas')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadReservations()
    }, [loadReservations])

    const handleCancelRequest = async (reservation: MyReservationData) => {
        const confirmMessage = reservation.estado === 'PENDING'
            ? '¿Estás seguro de que deseas cancelar esta reserva?'
            : '¿Estás seguro de que deseas solicitar la cancelación? El administrador deberá aprobarla.'

        if (!window.confirm(confirmMessage)) return

        try {
            setProcessingId(reservation.id)
            await requestCancellation(reservation.id)
            await loadReservations()
            onRefresh?.()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Error al procesar la solicitud')
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Separar reservas activas de historial
    const activeReservations = reservations.filter(r => 
        ['PENDING', 'RESERVED', 'CANCELLATION_REQUESTED'].includes(r.estado)
    )
    const historyReservations = reservations.filter(r => 
        ['CANCELLED', 'EXPIRED'].includes(r.estado)
    )

    if (isLoading) {
        return (
            <div className="my-reservations-card">
                <div className="my-reservations-header">
                    <h3>📋 Mis Reservas</h3>
                </div>
                <div className="my-reservations-loading">
                    <p>Cargando reservas...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="my-reservations-card">
                <div className="my-reservations-header">
                    <h3>📋 Mis Reservas</h3>
                </div>
                <div className="my-reservations-error">
                    <p>{error}</p>
                    <button className="ghost-btn" onClick={loadReservations}>Reintentar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="my-reservations-card">
            <div className="my-reservations-header">
                <h3>
                    📋 Mis Reservas
                    {activeReservations.length > 0 && (
                        <span className="reservation-count">{activeReservations.length}</span>
                    )}
                </h3>
            </div>

            <div className="my-reservations-content">
                    {reservations.length === 0 ? (
                        <div className="my-reservations-empty">
                            <div className="empty-icon">📋</div>
                            <p>No tenés reservas aún.</p>
                            <span>Seleccioná un stand disponible para solicitar una reserva.</span>
                        </div>
                    ) : (
                        <>
                            {/* Reservas Activas */}
                            {activeReservations.length > 0 && (
                                <div className="reservations-section">
                                    <h4 className="section-title">Reservas Activas</h4>
                                    <ul className="my-reservations-list">
                                        {activeReservations.map((reservation) => {
                                            const config = STATUS_CONFIG[reservation.estado] || STATUS_CONFIG.PENDING
                                            const canCancel = ['PENDING', 'RESERVED'].includes(reservation.estado)
                                            
                                            return (
                                                <li key={reservation.id} className={`my-reservation-item ${config.className}`}>
                                                    <div className="reservation-main">
                                                        <div className="reservation-info">
                                                            <span className="reservation-space">{reservation.space_name || 'Stand'}</span>
                                                            <span className="reservation-date">
                                                                Solicitada: {formatDate(reservation.created_at)}
                                                            </span>
                                                        </div>
                                                        <div className="reservation-status-wrapper">
                                                            <span className={`reservation-status ${config.className}`}>
                                                                {config.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="reservation-footer">
                                                        <span className="reservation-description">{config.description}</span>
                                                        {canCancel && (
                                                            <button
                                                                className="cancel-btn"
                                                                onClick={() => handleCancelRequest(reservation)}
                                                                disabled={processingId === reservation.id}
                                                            >
                                                                {processingId === reservation.id
                                                                    ? 'Procesando...'
                                                                    : reservation.estado === 'PENDING'
                                                                        ? 'Cancelar'
                                                                        : 'Solicitar cancelación'
                                                                }
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )}

                            {/* Historial */}
                            {historyReservations.length > 0 && (
                                <div className="reservations-section">
                                    <h4 className="section-title section-title--muted">Historial</h4>
                                    <ul className="my-reservations-list my-reservations-list--history">
                                        {historyReservations.slice(0, 5).map((reservation) => {
                                            const config = STATUS_CONFIG[reservation.estado] || STATUS_CONFIG.CANCELLED
                                            
                                            return (
                                                <li key={reservation.id} className={`my-reservation-item my-reservation-item--history ${config.className}`}>
                                                    <div className="reservation-main">
                                                        <div className="reservation-info">
                                                            <span className="reservation-space">{reservation.space_name || 'Stand'}</span>
                                                            <span className="reservation-date">
                                                                {formatDate(reservation.updated_at)}
                                                            </span>
                                                        </div>
                                                        <span className={`reservation-status reservation-status--small ${config.className}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
        </div>
    )
}

export default MyReservations

