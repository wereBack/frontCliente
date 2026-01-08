import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { fetchEventos, createEvento, fetchPlanosByEvento, deletePlano, deleteEvento, type EventoData, type PlanoData } from '../services/api';
import { useStandStore } from '../store/standStore';

const EventSelector = () => {
    const { 
        eventoId, setEventoId, loadPlano, clearAll, planoId, 
        newlyCreatedPlanoId, clearNewlyCreatedPlanoId,
        planoName, setPlanoName,
        savePlano, isSaving
    } = useStandStore();
    
    const [eventos, setEventos] = useState<EventoData[]>([]);
    const [planos, setPlanos] = useState<PlanoData[]>([]);
    const [isLoadingPlanos, setIsLoadingPlanos] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [highlightedPlanoId, setHighlightedPlanoId] = useState<string | null>(null);
    const [isCreatingNewArea, setIsCreatingNewArea] = useState(false);
    const [hasUnsavedNewArea, setHasUnsavedNewArea] = useState(false);
    const [newAreaName, setNewAreaName] = useState('Nueva Área');
    const newAreaInputRef = useRef<HTMLInputElement>(null);
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

    useEffect(() => {
        const selectNewPlano = async () => {
            if (newlyCreatedPlanoId && eventoId) {
                setIsLoadingPlanos(true);
                setHasUnsavedNewArea(false); // Limpiar estado de área sin guardar
                try {
                    const data = await fetchPlanosByEvento(eventoId);
                    setPlanos(data);
                    const newPlano = data.find(p => p.id === newlyCreatedPlanoId);
                    if (newPlano?.id) {
                        await loadPlano(newPlano.id);
                        setHighlightedPlanoId(newPlano.id);
                        setTimeout(() => setHighlightedPlanoId(null), 1500);
                    }
                } catch (error) {
                    console.error('Error cargando planos', error);
                } finally {
                    setIsLoadingPlanos(false);
                    clearNewlyCreatedPlanoId();
                }
            }
        };
        selectNewPlano();
    }, [newlyCreatedPlanoId, eventoId, clearNewlyCreatedPlanoId, loadPlano]);

    useEffect(() => {
        if (isCreatingNewArea && newAreaInputRef.current) {
            newAreaInputRef.current.focus();
            newAreaInputRef.current.select();
        }
    }, [isCreatingNewArea]);

    const loadEventos = async () => {
        try {
            const data = await fetchEventos();
            setEventos(data);
            if (data.length > 0 && !eventoId) {
                setEventoId(data[0].id);
            }
        } catch (error) {
            console.error('Error cargando eventos', error);
        }
    };

    const loadPlanosForEvent = async (eventId: string) => {
        setIsLoadingPlanos(true);
        try {
            const data = await fetchPlanosByEvento(eventId);
            setPlanos(data);
            if (data.length > 0 && data[0].id) {
                loadPlano(data[0].id);
            }
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
        setIsCreatingNewArea(false);
        setHasUnsavedNewArea(false);
    };

    const handleLoadPlano = async (planoIdToLoad: string) => {
        setIsCreatingNewArea(false);
        setHasUnsavedNewArea(false);
        await loadPlano(planoIdToLoad);
    };

    const handleNewPlano = () => {
        clearAll();
        if (eventoId) {
            setEventoId(eventoId);
        }
        setIsCreatingNewArea(false);
        setHasUnsavedNewArea(true); // Mostrar directamente el chip con botones
        setNewAreaName('Nueva Área');
        setPlanoName('Nueva Área');
    };

    const handleNewAreaKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (newAreaName.trim()) {
                setPlanoName(newAreaName);
                setIsCreatingNewArea(false);
                setHasUnsavedNewArea(true); // Área confirmada pero sin guardar
            }
        } else if (e.key === 'Escape') {
            setIsCreatingNewArea(false);
            setHasUnsavedNewArea(false);
            if (planos.length > 0 && planos[0].id) {
                loadPlano(planos[0].id);
            }
        }
    };

    const handleNewAreaBlur = () => {
        // Pequeño delay para permitir que clicks en otros elementos se procesen primero
        setTimeout(() => {
            if (newAreaName.trim()) {
                setPlanoName(newAreaName);
                setIsCreatingNewArea(false);
                setHasUnsavedNewArea(true); // Área confirmada pero sin guardar
            } else {
                setIsCreatingNewArea(false);
                setHasUnsavedNewArea(false);
            }
        }, 150);
    };

    const handleDeletePlano = async (planoIdToDelete: string) => {
        if (!confirm('¿Eliminar esta área?')) return;
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
        if (!confirm('¿Eliminar este evento y todas sus áreas?')) return;
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
        } catch {
            alert('Error al crear evento');
        }
    };

    const selectedEvento = eventos.find(e => e.id === eventoId);

    return (
        <div className="header-selector">
            {/* Fila principal: Evento + Áreas */}
            <div className="header-selector__row">
                {/* Evento */}
                <div className="header-selector__group">
                    <span className="header-selector__label">Evento</span>
                    {!isCreating ? (
                        <div className="header-selector__dropdown">
                            <select
                                value={eventoId || ''}
                                onChange={(e) => handleEventChange(e.target.value || null)}
                            >
                                <option value="">Seleccionar...</option>
                                {eventos.map(e => (
                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                ))}
                            </select>
                            <button
                                className="header-selector__add-btn"
                                onClick={() => setIsCreating(true)}
                                title="Crear evento"
                            >
                                +
                            </button>
                        </div>
                    ) : (
                        <div className="header-selector__form">
                            <input
                                type="text"
                                placeholder="Nombre"
                                value={newEventData.nombre}
                                onChange={e => setNewEventData({ ...newEventData, nombre: e.target.value })}
                            />
                            <input
                                type="datetime-local"
                                value={newEventData.fecha_reserva_desde}
                                onChange={e => setNewEventData({ ...newEventData, fecha_reserva_desde: e.target.value })}
                            />
                            <input
                                type="datetime-local"
                                value={newEventData.fecha_reserva_hasta}
                                onChange={e => setNewEventData({ ...newEventData, fecha_reserva_hasta: e.target.value })}
                            />
                            <button className="header-selector__btn header-selector__btn--primary" onClick={handleCreateEvento}>
                                Crear
                            </button>
                            <button className="header-selector__btn" onClick={() => setIsCreating(false)}>
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Áreas */}
                {eventoId && !isCreating && (
                    <>
                        <div className="header-selector__divider" />
                        <div className="header-selector__group header-selector__group--areas">
                            <span className="header-selector__label">
                                Áreas <span className="header-selector__count">{planos.length}</span>
                            </span>
                            <div className="header-selector__chips">
                                {isLoadingPlanos ? (
                                    <span className="header-selector__loading">...</span>
                                ) : (
                                    <>
                                        {planos.map(p => (
                                            <div
                                                key={p.id}
                                                className={`area-chip ${planoId === p.id && !isCreatingNewArea ? 'area-chip--active' : ''} ${highlightedPlanoId === p.id ? 'area-chip--highlight' : ''}`}
                                            >
                                                <button
                                                    className="area-chip__name"
                                                    onClick={() => handleLoadPlano(p.id!)}
                                                >
                                                    {p.name}
                                                </button>
                                                <button
                                                    className="area-chip__delete"
                                                    onClick={() => handleDeletePlano(p.id!)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {isCreatingNewArea ? (
                                            // Editando nombre de nueva área
                                            <div className="area-chip area-chip--active area-chip--editing">
                                                <input
                                                    ref={newAreaInputRef}
                                                    type="text"
                                                    className="area-chip__input"
                                                    value={newAreaName}
                                                    onChange={(e) => {
                                                        setNewAreaName(e.target.value);
                                                        setPlanoName(e.target.value);
                                                    }}
                                                    onKeyDown={handleNewAreaKeyDown}
                                                    onBlur={handleNewAreaBlur}
                                                    placeholder="Nombre"
                                                />
                                            </div>
                                        ) : hasUnsavedNewArea ? (
                                            // Área nueva confirmada pero sin guardar
                                            <div className="area-chip-group">
                                                <div className="area-chip area-chip--active area-chip--unsaved">
                                                    <span className="area-chip__name area-chip__name--static">
                                                        {planoName}
                                                    </span>
                                                    <span className="area-chip__badge">nuevo</span>
                                                    <button
                                                        className="area-chip__edit"
                                                        onClick={() => {
                                                            setIsCreatingNewArea(true);
                                                            setNewAreaName(planoName);
                                                        }}
                                                        title="Editar nombre"
                                                    >
                                                        ✎
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={savePlano}
                                                    disabled={isSaving}
                                                    className="area-chip__save-btn"
                                                    title="Guardar nueva área"
                                                >
                                                    {isSaving ? '...' : '✓'}
                                                </button>
                                            </div>
                                        ) : (
                                            // Botón para crear nueva área
                                            <button
                                                className="area-chip area-chip--new"
                                                onClick={handleNewPlano}
                                            >
                                                +
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}


            </div>

            {/* Info del evento */}
            {selectedEvento && !isCreating && (
                <div className="header-selector__info">
                    📅 {new Date(selectedEvento.fecha_reserva_desde).toLocaleDateString()} - {new Date(selectedEvento.fecha_reserva_hasta).toLocaleDateString()}
                </div>
            )}
        </div>
    );
};

export default EventSelector;
