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
        <div className="event-plano-selector">
            {/* Event Card */}
            <div className="selector-card">
                <div className="selector-card__header">
                    <span className="selector-card__label">Evento</span>
                    {eventoId && (
                        <button
                            className="selector-card__action selector-card__action--danger"
                            onClick={handleDeleteEvento}
                            title="Eliminar evento"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {!isCreating ? (
                    <div className="selector-card__body">
                        <div className="selector-dropdown">
                            <select
                                value={eventoId || ''}
                                onChange={(e) => handleEventChange(e.target.value || null)}
                            >
                                <option value="">Seleccionar evento...</option>
                                {eventos.map(e => (
                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                ))}
                            </select>
                            <button
                                className="selector-dropdown__btn"
                                onClick={() => setIsCreating(true)}
                                title="Crear evento"
                            >
                                +
                            </button>
                        </div>
                        {selectedEvento && (
                            <div className="selector-card__info">
                                📅 {new Date(selectedEvento.fecha_reserva_desde).toLocaleDateString()} - {new Date(selectedEvento.fecha_reserva_hasta).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="selector-card__form">
                        <input
                            type="text"
                            placeholder="Nombre del evento"
                            value={newEventData.nombre}
                            onChange={e => setNewEventData({ ...newEventData, nombre: e.target.value })}
                        />
                        <div className="selector-card__dates">
                            <div className="selector-card__date">
                                <label>Desde</label>
                                <input
                                    type="datetime-local"
                                    value={newEventData.fecha_reserva_desde}
                                    onChange={e => setNewEventData({ ...newEventData, fecha_reserva_desde: e.target.value })}
                                />
                            </div>
                            <div className="selector-card__date">
                                <label>Hasta</label>
                                <input
                                    type="datetime-local"
                                    value={newEventData.fecha_reserva_hasta}
                                    onChange={e => setNewEventData({ ...newEventData, fecha_reserva_hasta: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="selector-card__form-actions">
                            <button className="selector-btn selector-btn--primary" onClick={handleCreateEvento}>
                                Crear evento
                            </button>
                            <button className="selector-btn" onClick={() => setIsCreating(false)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Divider */}
            {eventoId && !isCreating && <div className="selector-divider" />}

            {/* Planos Card */}
            {eventoId && !isCreating && (
                <div className="selector-card selector-card--planos">
                    <div className="selector-card__header">
                        <span className="selector-card__label">Planos</span>
                        <span className="selector-card__count">{planos.length}</span>
                    </div>

                    <div className="selector-card__body">
                        {isLoadingPlanos ? (
                            <div className="selector-card__loading">Cargando...</div>
                        ) : (
                            <>
                                <div className="plano-chips">
                                    {planos.map(p => (
                                        <div
                                            key={p.id}
                                            className={`plano-chip ${planoId === p.id ? 'plano-chip--active' : ''}`}
                                        >
                                            <button
                                                className="plano-chip__name"
                                                onClick={() => handleLoadPlano(p.id!)}
                                            >
                                                {p.name}
                                            </button>
                                            <button
                                                className="plano-chip__delete"
                                                onClick={() => handleDeletePlano(p.id!)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="plano-chip plano-chip--new"
                                        onClick={handleNewPlano}
                                    >
                                        + Nuevo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventSelector;
