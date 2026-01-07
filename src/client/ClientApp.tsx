import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { usePlanos } from './hooks/usePlanos'
import { useReservationSocket } from './hooks/useReservationSocket'
import { createReservation } from './services/api'
import PlanoMap from './components/PlanoMap'
import Legend from './components/Legend'
import EventSelector from './components/EventSelector'
import {
    getSpaceStatus,
    getEffectivePrice,
    STATUS_LABELS,
    STATUS_DESCRIPTIONS,
} from './utils/spaceStatus'
import './client.css'

const ClientApp = () => {
    const { isAuthenticated, user, login, logout } = useAuth()
    const { planos, isLoading, error, refetch } = usePlanos()
    const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null)
    const [selectedPlanoIndex, setSelectedPlanoIndex] = useState(0)
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('todos')

    // WebSocket para actualización en tiempo real
    const handleSocketChange = useCallback(() => {
        console.log('🔄 Recargando planos por evento WebSocket...')
        refetch()
    }, [refetch])

    useReservationSocket({
        onAnyChange: handleSocketChange,
    })

    // Filter planos by selected event
    const filteredPlanos = useMemo(() => {
        if (!selectedEventoId) return planos
        return planos.filter((p) => p.evento_id === selectedEventoId)
    }, [planos, selectedEventoId])

    const activePlano = filteredPlanos[selectedPlanoIndex]
    const selectedSpace = activePlano?.spaces.find((s) => s.id === selectedSpaceId)
    const selectedSpaceStatus = selectedSpace ? getSpaceStatus(selectedSpace) : null

    // Filtered spaces for the list
    const filteredSpaces = useMemo(() => {
        if (!activePlano) return []
        return activePlano.spaces.filter((space) => {
            const matchesSearch = space.name.toLowerCase().includes(searchTerm.toLowerCase())
            const status = getSpaceStatus(space)
            const matchesStatus = statusFilter === 'todos' || status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [activePlano, searchTerm, statusFilter])

    // Reset plano index when event changes
    const handleEventChange = (eventoId: string | null) => {
        setSelectedEventoId(eventoId)
        setSelectedPlanoIndex(0)
        setSelectedSpaceId(null)
    }

    // Handle reservation
    const [isReserving, setIsReserving] = useState(false)
    const handleReserve = async () => {
        if (!selectedSpaceId || !user) return
        setIsReserving(true)
        try {
            await createReservation(selectedSpaceId, user.username)
            await refetch()
            alert('¡Solicitud enviada! Tu reserva está pendiente de confirmación por el administrador.')
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al reservar')
        } finally {
            setIsReserving(false)
        }
    }

    const formatPrice = (price: number | undefined) => {
        if (price == null) return null
        return `US$ ${price.toLocaleString('es-AR')} + IVA`
    }

    return (
        <div className="client-app">
            {/* Top bar */}
            <header className="client-topbar">
                <EventSelector
                    selectedEventoId={selectedEventoId}
                    onSelectEvento={handleEventChange}
                />
                <div className="session-actions">
                    {isAuthenticated ? (
                        <>
                            <span className="user-badge">Hola, {user?.name || 'Usuario'}</span>
                            <button type="button" className="ghost-btn" onClick={logout}>
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <button type="button" className="ghost-btn ghost-btn--accent" onClick={login}>
                            Iniciar sesión
                        </button>
                    )}
                </div>
            </header>

            {/* Plano selector tabs */}
            {filteredPlanos.length > 1 && (
                <div className="floor-tabs">
                    {filteredPlanos.map((plano, index) => (
                        <button
                            key={plano.id}
                            className={`floor-tab ${selectedPlanoIndex === index ? 'floor-tab--active' : ''}`}
                            onClick={() => {
                                setSelectedPlanoIndex(index)
                                setSelectedSpaceId(null)
                            }}
                        >
                            {plano.name}
                        </button>
                    ))}
                </div>
            )}

            <main className="client-main">
                {isLoading && (
                    <div className="loading-message">
                        <p>Cargando planos...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={refetch} className="ghost-btn">
                            Reintentar
                        </button>
                    </div>
                )}

                {!isLoading && !error && planos.length === 0 && (
                    <div className="empty-message">
                        <p>No hay planos disponibles todavía.</p>
                    </div>
                )}

                {!isLoading && !error && activePlano && (
                    <>
                        {/* Map Section */}
                        <section className="map-section">
                            <div className="map-container">
                                <PlanoMap
                                    plano={activePlano}
                                    selectedSpaceId={selectedSpaceId}
                                    onSelectSpace={setSelectedSpaceId}
                                />
                            </div>
                            <Legend zones={activePlano.zones} />
                        </section>

                        {/* Details Section - Two columns */}
                        <section className="details-section">
                            {/* Left Column - Stand Details */}
                            <div className="stand-detail-card">
                                {selectedSpace ? (
                                    <>
                                        <div className="stand-detail-header">
                                            <div className="stand-detail-title">
                                                <span className="stand-code">{selectedSpace.name}</span>
                                                <h2>{STATUS_DESCRIPTIONS[selectedSpaceStatus || 'disponible']}</h2>
                                            </div>
                                            <span className={`status-badge status-badge--${selectedSpaceStatus}`}>
                                                {STATUS_LABELS[selectedSpaceStatus || 'disponible']}
                                            </span>
                                        </div>

                                        <div className="stand-detail-meta">
                                            <div className="meta-item">
                                                <span className="meta-label">Dimensiones</span>
                                                <span className="meta-value">{selectedSpace.width} x {selectedSpace.height} m</span>
                                            </div>
                                            <div className="meta-item">
                                                <span className="meta-label">Precio</span>
                                                <span className="meta-value meta-value--price">
                                                    {(() => {
                                                        const effectivePrice = getEffectivePrice(selectedSpace, activePlano.zones)
                                                        return effectivePrice ? formatPrice(effectivePrice) : 'Consultar'
                                                    })()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="stand-detail-actions">
                                            {isAuthenticated && selectedSpaceStatus === 'disponible' && (
                                                <button
                                                    className="reserve-btn"
                                                    onClick={handleReserve}
                                                    disabled={isReserving}
                                                >
                                                    {isReserving ? 'Solicitando...' : 'Solicitar reserva'}
                                                </button>
                                            )}
                                            {!isAuthenticated && selectedSpaceStatus === 'disponible' && (
                                                <button
                                                    className="reserve-btn reserve-btn--outline"
                                                    onClick={login}
                                                >
                                                    Iniciar sesión para reservar
                                                </button>
                                            )}
                                            {selectedSpaceStatus === 'pendiente' && (
                                                <div className="status-message status-message--pending">
                                                    ⏳ Reserva pendiente de confirmación por el administrador
                                                </div>
                                            )}
                                            {selectedSpaceStatus === 'reservado' && (
                                                <div className="status-message status-message--reserved">
                                                    ✓ Este stand ya fue reservado
                                                </div>
                                            )}
                                            {selectedSpaceStatus === 'bloqueado' && (
                                                <div className="status-message status-message--blocked">
                                                    ✕ Este stand no está disponible
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="stand-detail-empty">
                                        <div className="empty-icon">📍</div>
                                        <p>Seleccioná un stand en el plano para ver sus detalles.</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Column - Stand List */}
                            <div className="stand-list-card">
                                <div className="stand-list-header">
                                    <span className="eyebrow">Explorar</span>
                                    <h3>Listado de stands</h3>
                                </div>

                                <div className="stand-list-filters">
                                    <input
                                        type="text"
                                        placeholder="Buscar por código o nombre..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="todos">Todos</option>
                                        <option value="disponible">Disponibles</option>
                                        <option value="pendiente">Pendientes</option>
                                        <option value="reservado">Reservados</option>
                                        <option value="bloqueado">Bloqueados</option>
                                    </select>
                                </div>

                                <ul className="stand-list">
                                    {filteredSpaces.map((space) => {
                                        const status = getSpaceStatus(space)
                                        return (
                                            <li
                                                key={space.id}
                                                className={`stand-list-item ${selectedSpaceId === space.id ? 'stand-list-item--active' : ''}`}
                                                onClick={() => setSelectedSpaceId(space.id)}
                                            >
                                                <div className="stand-list-item__info">
                                                    <span className="stand-list-item__name">{space.name}</span>
                                                    <span className="stand-list-item__size">
                                                        {space.width} x {space.height} m
                                                    </span>
                                                </div>
                                                <div className="stand-list-item__meta">
                                                    <span className="stand-list-item__price">
                                                        {(() => {
                                                            const effectivePrice = getEffectivePrice(space, activePlano.zones)
                                                            return effectivePrice ? `US$ ${effectivePrice.toLocaleString('es-AR')}` : 'Consultar'
                                                        })()}
                                                    </span>
                                                    <span className={`stand-list-item__status stand-list-item__status--${status}`}>
                                                        {STATUS_LABELS[status]}
                                                    </span>
                                                </div>
                                            </li>
                                        )
                                    })}
                                    {filteredSpaces.length === 0 && (
                                        <li className="stand-list-empty">
                                            No se encontraron stands con esos filtros.
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </section>
                    </>
                )}
            </main>

        </div>
    )
}

export default ClientApp
