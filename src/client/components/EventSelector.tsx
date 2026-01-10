import { useState, useEffect } from 'react';
import { fetchEventos, type EventoData } from '../services/api';

interface EventSelectorProps {
    selectedEventoId: string | null;
    onSelectEvento: (eventoId: string | null) => void;
}

const EventSelector = ({ selectedEventoId, onSelectEvento }: EventSelectorProps) => {
    const [eventos, setEventos] = useState<EventoData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadEventos();
    }, []);

    const loadEventos = async () => {
        setIsLoading(true);
        try {
            const data = await fetchEventos();
            setEventos(data);
            // Auto-select first event if none selected and events exist
            if (data.length > 0 && !selectedEventoId) {
                onSelectEvento(data[0].id);
            }
        } catch (error) {
            console.error('Error cargando eventos', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="event-selector-loading">Cargando eventos...</div>;
    }

    if (eventos.length === 0) {
        return (
            <div className="event-selector event-selector--empty">
                <span className="event-selector__empty-message">No hay eventos disponibles</span>
            </div>
        );
    }

    return (
        <div className="event-selector">
            <label htmlFor="event-select" className="event-selector__label">
                Seleccionar evento:
            </label>
            <select
                id="event-select"
                className="event-selector__select"
                value={selectedEventoId || ''}
                onChange={(e) => onSelectEvento(e.target.value || null)}
            >
                {eventos.map((evento) => (
                    <option key={evento.id} value={evento.id}>
                        {evento.nombre}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default EventSelector;
