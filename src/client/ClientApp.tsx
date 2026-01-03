import { useState, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { usePlanos } from './hooks/usePlanos'
import PlanoMap from './components/PlanoMap'
import Legend from './components/Legend'
import EventSelector from './components/EventSelector'
import './client.css'

const ClientApp = () => {
    const { isAuthenticated, user, login, logout } = useAuth()
    const { planos, isLoading, error, refetch } = usePlanos()
    const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null)
    const [selectedPlanoIndex, setSelectedPlanoIndex] = useState(0)
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)

    // Filter planos by selected event
    const filteredPlanos = useMemo(() => {
        if (!selectedEventoId) return planos
        return planos.filter((p) => p.evento_id === selectedEventoId)
    }, [planos, selectedEventoId])

    const activePlano = filteredPlanos[selectedPlanoIndex]
    const selectedSpace = activePlano?.spaces.find((s) => s.id === selectedSpaceId)

    const availableCount = activePlano
        ? activePlano.spaces.filter((s) => s.active && (!s.reservations || s.reservations.length === 0)).length
        : 0
    const reservedCount = activePlano
        ? activePlano.spaces.filter((s) => s.reservations && s.reservations.length > 0).length
        : 0

    // Reset plano index when event changes
    const handleEventChange = (eventoId: string | null) => {
        setSelectedEventoId(eventoId)
        setSelectedPlanoIndex(0)
        setSelectedSpaceId(null)
    }

    return (
        <div className="client-app">
            <header className="client-hero">
                <div className="hero-row hero-row--top">
                    <EventSelector
                        selectedEventoId={selectedEventoId}
                        onSelectEvento={handleEventChange}
                    />
                    <div className="session-actions">
                        {isAuthenticated ? (
                            <>
                                <span className="badge">Hola, {user?.name || 'Usuario'}</span>
                                <button type="button" className="ghost-btn" onClick={logout}>
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" className="ghost-btn" onClick={login}>
                                    Iniciar sesión
                                </button>
                                <button type="button" className="ghost-btn ghost-btn--accent" onClick={login}>
                                    Registrarse
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="hero-row hero-row--main">
                    <div>
                        <p className="eyebrow">Mapa interactivo</p>
                        <h1>Elegí el stand ideal para tu empresa</h1>
                        <p className="subtitle">
                            Visualizá el plano del edificio, seleccioná un stand y confirmá tu reserva para la feria de empleo.
                        </p>
                    </div>

                    <div className="hero-stats">
                        <div className="stat-card">
                            <p>Stands disponibles</p>
                            <strong>{availableCount}</strong>
                        </div>
                        <div className="stat-card">
                            <p>Reservados</p>
                            <strong className="accent">{reservedCount}</strong>
                        </div>
                    </div>
                </div>
            </header>

            {/* Plano selector */}
            {filteredPlanos.length > 1 && (
                <div className="floor-switcher">
                    {filteredPlanos.map((plano, index) => (
                        <button
                            key={plano.id}
                            className={`floor-switcher__btn ${selectedPlanoIndex === index ? 'floor-switcher__btn--active' : ''}`}
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

            <main className="client-flow">
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
                        <p>No hay mapas disponibles todavía.</p>
                        <p>El administrador debe crear y guardar un mapa primero.</p>
                    </div>
                )}

                {!isLoading && !error && activePlano && (
                    <>
                        <section className="map-section">
                            <div className="map-card">
                                <PlanoMap
                                    plano={activePlano}
                                    selectedSpaceId={selectedSpaceId}
                                    onSelectSpace={setSelectedSpaceId}
                                />
                            </div>
                            <Legend />
                        </section>

                        <section className="details-grid">
                            <div className="details-column">
                                <div className="stand-details">
                                    <h3 className="stand-details__title">Detalle del stand</h3>
                                    {selectedSpace ? (
                                        <div className="stand-details__content">
                                            <p><strong>Nombre:</strong> {selectedSpace.name}</p>
                                            <p><strong>Dimensiones:</strong> {selectedSpace.width}×{selectedSpace.height} px</p>
                                            <p><strong>Estado:</strong> {selectedSpace.active ? 'Disponible' : 'No disponible'}</p>
                                            {isAuthenticated && selectedSpace.active && (
                                                <button className="reserve-btn">Reservar este stand</button>
                                            )}
                                            {!isAuthenticated && selectedSpace.active && (
                                                <p className="hint">Iniciá sesión para reservar</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="stand-details__empty">Seleccioná un stand en el mapa para ver sus detalles.</p>
                                    )}
                                </div>
                            </div>

                            <div className="details-column">
                                <div className="stand-list">
                                    <h3 className="stand-list__title">Lista de stands</h3>
                                    <ul className="stand-list__items">
                                        {activePlano.spaces.map((space) => (
                                            <li
                                                key={space.id}
                                                className={`stand-list__item ${selectedSpaceId === space.id ? 'stand-list__item--active' : ''}`}
                                                onClick={() => setSelectedSpaceId(space.id)}
                                            >
                                                <span className="stand-list__name">{space.name}</span>
                                                <span className={`stand-list__status stand-list__status--${space.active ? 'available' : 'blocked'}`}>
                                                    {space.active ? 'Disponible' : 'No disponible'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>

            <footer className="contact-footer">
                <div className="contact-card">
                    <h3>¿Tenés dudas?</h3>
                    <p>Contactanos a <a href="mailto:contacto@feria.com">contacto@feria.com</a></p>
                </div>
            </footer>
        </div>
    )
}

export default ClientApp
