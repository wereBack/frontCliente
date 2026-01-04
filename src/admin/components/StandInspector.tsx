import { useState, useEffect } from 'react'
import { useStandStore, type Stand } from '../store/standStore'
import { updateSpace as apiUpdateSpace, type SpaceUpdateData } from '../services/api'

const StandInspector = () => {
    const selectedStandId = useStandStore((state) => state.selectedStandId)
    const stands = useStandStore((state) => state.stands)
    const updateStand = useStandStore((state) => state.updateStand)
    const removeStand = useStandStore((state) => state.removeStand)
    const selectStand = useStandStore((state) => state.selectStand)

    const stand = stands.find((s) => s.id === selectedStandId)

    const [label, setLabel] = useState('')
    const [price, setPrice] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Sincronizar inputs con el stand seleccionado
    useEffect(() => {
        if (stand) {
            setLabel(stand.label || '')
            setPrice(stand.price?.toString() || '')
        } else {
            setLabel('')
            setPrice('')
        }
    }, [stand])

    // Guardar cambios (local y remotamente si tiene ID válido)
    const handleSave = async () => {
        if (!stand) return

        const updates: Partial<Stand> & SpaceUpdateData = {
            label,
            name: label,
            price: price ? parseFloat(price) : undefined,
        }

        // Actualizar localmente
        updateStand(stand.id, updates)

        // Si el stand parece ser un UUID (guardado en DB), intentar actualizar remoto
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stand.id)
        if (isUUID) {
            setIsSaving(true)
            try {
                await apiUpdateSpace(stand.id, {
                    name: label,
                    price: price ? parseFloat(price) : null,
                })
            } catch {
                console.error('Error al guardar stand en servidor')
            } finally {
                setIsSaving(false)
            }
        }
    }

    // Eliminar stand
    const handleDelete = () => {
        if (!stand) return
        if (confirm('¿Eliminar este stand?')) {
            removeStand(stand.id)
            selectStand(null)
        }
    }

    if (!stand) {
        return (
            <div className="stand-inspector stand-inspector--empty">
                <div className="stand-inspector__empty-state">
                    <span className="stand-inspector__empty-icon">📍</span>
                    <h4>Ningún stand seleccionado</h4>
                    <p>Selecciona un stand en el canvas para ver y editar sus propiedades</p>
                </div>
            </div>
        )
    }

    return (
        <div className="stand-inspector">
            <div className="stand-inspector__header">
                <h3>
                    <span className="stand-inspector__icon">📍</span>
                    Propiedades del Stand
                </h3>
            </div>

            <div className="stand-inspector__content">
                {/* Nombre/Label */}
                <div className="stand-inspector__field">
                    <label htmlFor="stand-label">Nombre</label>
                    <input
                        id="stand-label"
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Ej: Stand A1"
                    />
                </div>

                {/* Precio */}
                <div className="stand-inspector__field">
                    <label htmlFor="stand-price">Precio ($)</label>
                    <input
                        id="stand-price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Ej: 1500"
                        min="0"
                        step="100"
                    />
                </div>

                {/* Dimensiones (solo lectura) */}
                {stand.kind === 'rect' && (
                    <div className="stand-inspector__dimensions">
                        <span className="stand-inspector__dimension">
                            📐 {Math.round(stand.width)} × {Math.round(stand.height)} px
                        </span>
                    </div>
                )}

                {/* ID (solo lectura) */}
                <div className="stand-inspector__id">
                    <span className="stand-inspector__id-label">ID:</span>
                    <span className="stand-inspector__id-value">{stand.id.slice(0, 8)}...</span>
                </div>
            </div>

            <div className="stand-inspector__actions">
                <button
                    className="stand-inspector__btn stand-inspector__btn--save"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Guardando...' : '💾 Guardar'}
                </button>
                <button
                    className="stand-inspector__btn stand-inspector__btn--delete"
                    onClick={handleDelete}
                >
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    )
}

export default StandInspector
