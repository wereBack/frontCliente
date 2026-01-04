import { useState, useEffect } from 'react';
import { fetchEventos, createEvento, fetchPlanosByEvento, deletePlano, deleteEvento, type EventoData, type PlanoData } from '../services/api';
import { useStandStore } from '../store/standStore';

const EventSelector = () => {
    const { eventoId, setEventoId, loadPlano, clearAll, planoId } = useStandStore();
    const [eventos, setEventos] = useState<EventoData[]>([]);
    const [planos, setPlanos] = useState<PlanoData[]>([]);
    const [isLoadingPlanos, setIsLoadingPlanos] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newEventData, setNewEventData] = useState({
        nombre: '',
        fecha_reserva_desde: '',
        fecha_reserva_hasta: ''
    });

    useEffect(() => {
        loadEventos();
    }, []);

    useEffect(() => {
        if (eventoId) {
            loadPlanosForEvent(eventoId);
        } else {
            setPlanos([]);
        }
    }, [eventoId]);

    const loadEventos = async () => {
        try {
            const data = await fetchEventos();
            setEventos(data);
        } catch (error) {
            console.error('Error cargando eventos', error);
        }
    };

    const loadPlanosForEvent = async (eventId: string) => {
        setIsLoadingPlanos(true);
        try {
            const data = await fetchPlanosByEvento(eventId);
            setPlanos(data);
        } catch (error) {
            console.error('Error cargando planos', error);
            setPlanos([]);
        } finally {
            setIsLoadingPlanos(false);
        }
    };

    const handleEventChange = (newEventoId: string | null) => {
        setEventoId(newEventoId);
        clearAll();
    };

    const handleLoadPlano = async (planoIdToLoad: string) => {
        await loadPlano(planoIdToLoad);
    };

    const handleNewPlano = () => {
        clearAll();
        if (eventoId) {
            setEventoId(eventoId);
        }
    };

    const handleDeletePlano = async (planoIdToDelete: string) => {
        if (!confirm('¿Eliminar este plano?')) return;
        try {
            await deletePlano(planoIdToDelete);
            setPlanos(planos.filter(p => p.id !== planoIdToDelete));
            if (planoId === planoIdToDelete) {
                clearAll();
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error');
        }
    };

    const handleDeleteEvento = async () => {
        if (!eventoId) return;
        if (!confirm('¿Eliminar este evento y todos sus planos?')) return;
        try {
            await deleteEvento(eventoId);
            setEventos(eventos.filter(e => e.id !== eventoId));
            setEventoId(null);
            clearAll();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error');
        }
    };

    const handleCreateEvento = async () => {
        if (!newEventData.nombre || !newEventData.fecha_reserva_desde || !newEventData.fecha_reserva_hasta) {
            alert('Completa todos los campos');
            return;
        }
        try {
            const newEvent = await createEvento({
                nombre: newEventData.nombre,
                fecha_reserva_desde: new Date(newEventData.fecha_reserva_desde).toISOString(),
                fecha_reserva_hasta: new Date(newEventData.fecha_reserva_hasta).toISOString(),
            });
            setEventos([...eventos, newEvent]);
            setEventoId(newEvent.id);
            setIsCreating(false);
            setNewEventData({ nombre: '', fecha_reserva_desde: '', fecha_reserva_hasta: '' });
        } catch (error) {
            alert('Error al crear evento');
        }
    };

    const selectedEvento = eventos.find(e => e.id === eventoId);

    return (
        <div className="event-selector">
            {/* Event Selection */}
            <div className="event-selector__section">
                <div className="event-selector__header">
                    <span className="event-selector__icon">📅</span>
                    <h3>Evento</h3>
                </div>

                {!isCreating ? (
                    <div className="event-selector__content">
                        <select
                            className="event-selector__select"
                            value={eventoId || ''}
                            onChange={(e) => handleEventChange(e.target.value || null)}
                        >
                            <option value="">Seleccionar evento...</option>
                            {eventos.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                        
                        <div className="event-selector__buttons">
                            <button
                                className="event-selector__btn event-selector__btn--primary"
                                onClick={() => setIsCreating(true)}
                            >
                                + Nuevo
                            </button>
                            {eventoId && (
                                <button
                                    className="event-selector__btn event-selector__btn--danger"
                                    onClick={handleDeleteEvento}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="event-selector__form">
                        <input
                            type="text"
                            placeholder="Nombre del evento"
                            className="event-selector__input"
                            value={newEventData.nombre}
                            onChange={e => setNewEventData({ ...newEventData, nombre: e.target.value })}
                        />
                        <div className="event-selector__dates">
                            <div className="event-selector__date-field">
                                <label>Desde</label>
                                <input
                                    type="datetime-local"
                                    className="event-selector__input"
                                    value={newEventData.fecha_reserva_desde}
                                    onChange={e => setNewEventData({ ...newEventData, fecha_reserva_desde: e.target.value })}
                                />
                            </div>
                            <div className="event-selector__date-field">
                                <label>Hasta</label>
                                <input
                                    type="datetime-local"
                                    className="event-selector__input"
                                    value={newEventData.fecha_reserva_hasta}
                                    onChange={e => setNewEventData({ ...newEventData, fecha_reserva_hasta: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="event-selector__form-actions">
                            <button 
                                className="event-selector__btn event-selector__btn--primary"
                                onClick={handleCreateEvento}
                            >
                                Crear
                            </button>
                            <button 
                                className="event-selector__btn"
                                onClick={() => setIsCreating(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Planos Section */}
            {eventoId && !isCreating && (
                <div className="event-selector__section">
                    <div className="event-selector__header">
                        <span className="event-selector__icon">🗺️</span>
                        <h3>Planos</h3>
                    </div>

                    <div className="event-selector__planos">
                        {isLoadingPlanos ? (
                            <p className="event-selector__loading">Cargando...</p>
                        ) : planos.length === 0 ? (
                            <p className="event-selector__empty">Sin planos guardados</p>
                        ) : (
                            <ul className="event-selector__plano-list">
                                {planos.map(p => (
                                    <li 
                                        key={p.id} 
                                        className={`event-selector__plano-item ${planoId === p.id ? 'event-selector__plano-item--active' : ''}`}
                                    >
                                        <button
                                            className="event-selector__plano-btn"
                                            onClick={() => handleLoadPlano(p.id!)}
                                        >
                                            <span className="event-selector__plano-name">{p.name}</span>
                                            <span className="event-selector__plano-meta">
                                                {p.spaces?.length || 0} stands
                                            </span>
                                        </button>
                                        <button
                                            className="event-selector__plano-delete"
                                            onClick={() => handleDeletePlano(p.id!)}
                                            title="Eliminar plano"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <button
                            className="event-selector__btn event-selector__btn--ghost"
                            onClick={handleNewPlano}
                        >
                            + Nuevo plano
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventSelector;
