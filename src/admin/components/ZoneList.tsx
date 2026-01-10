import { useState } from 'react'
import { useStandStore, type Zone } from '../store/standStore'
import { updateZone as apiUpdateZone, deleteZone as apiDeleteZone, createZone as apiCreateZone } from '../services/api'

const ZoneList = () => {
    const zones = useStandStore((state) => state.zones)
    const planoId = useStandStore((state) => state.planoId)
    const updateZone = useStandStore((state) => state.updateZone)
    const removeZone = useStandStore((state) => state.removeZone)
    const replaceZoneId = useStandStore((state) => state.replaceZoneId)
    const isZoneNameDuplicate = useStandStore((state) => state.isZoneNameDuplicate)

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<{ name: string; price: string; color: string }>({ name: '', price: '', color: '#ffb703' })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Get zone type label
    const getTypeLabel = (kind: string) => {
        switch (kind) {
            case 'rect':
                return 'RECT'
            case 'polygon':
                return 'POLY'
            case 'free':
                return 'FREE'
            default:
                return kind.toUpperCase()
        }
    }

    // Get dimensions for rect zones
    const getDimensions = (zone: Zone) => {
        if (zone.kind === 'rect') {
            return `${Math.round(zone.width)}×${Math.round(zone.height)} px`
        }
        // For polygon/free, calculate bounding box
        if ('points' in zone && zone.points.length >= 4) {
            const xs = zone.points.filter((_, i) => i % 2 === 0)
            const ys = zone.points.filter((_, i) => i % 2 === 1)
            const width = Math.max(...xs) - Math.min(...xs)
            const height = Math.max(...ys) - Math.min(...ys)
            return `${Math.round(width)}×${Math.round(height)} px`
        }
        return ''
    }

    // Toggle expand/collapse
    const handleToggle = (zone: Zone) => {
        if (expandedId === zone.id) {
            setExpandedId(null)
        } else {
            setExpandedId(zone.id)
            setEditValues({
                name: zone.label || '',
                price: zone.price?.toString() || '',
                color: zone.color || '#ffb703',
            })
        }
    }

    // Save changes
    const handleSave = async (zone: Zone) => {
        // Check for duplicate name
        if (editValues.name && isZoneNameDuplicate(editValues.name, zone.id)) {
            alert(`¡El nombre "${editValues.name}" ya está en uso por otra zona!`)
            return
        }

        const updates = {
            label: editValues.name,
            price: editValues.price ? parseFloat(editValues.price) : undefined,
            color: editValues.color,
        }
        updateZone(zone.id, updates)

        // Check if UUID (saved in DB)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zone.id)
        setIsSaving(true)

        try {
            if (isUUID) {
                // Update existing zone
                await apiUpdateZone(zone.id, {
                    name: editValues.name,
                    price: editValues.price ? parseFloat(editValues.price) : null,
                    color: editValues.color,
                })
            } else {
                // Create new zone
                if (!planoId) {
                    alert('Primero debes guardar el área antes de guardar zonas individuales')
                    setIsSaving(false)
                    return
                }

                // Build create data based on zone type
                const createData: Parameters<typeof apiCreateZone>[0] = {
                    plano_id: planoId,
                    kind: zone.kind,
                    x: zone.kind === 'rect' ? zone.x : 0,
                    y: zone.kind === 'rect' ? zone.y : 0,
                    width: zone.kind === 'rect' ? zone.width : 100,
                    height: zone.kind === 'rect' ? zone.height : 100,
                    color: editValues.color,
                    name: editValues.name || 'Nueva Zona',
                    price: editValues.price ? parseFloat(editValues.price) : null,
                }

                // Add points for polygon/free shapes
                if ('points' in zone) {
                    createData.points = zone.points
                    // Calculate bounding box for x, y, width, height
                    const xs = zone.points.filter((_, i) => i % 2 === 0)
                    const ys = zone.points.filter((_, i) => i % 2 === 1)
                    createData.x = Math.min(...xs)
                    createData.y = Math.min(...ys)
                    createData.width = Math.max(...xs) - createData.x
                    createData.height = Math.max(...ys) - createData.y
                }

                const created = await apiCreateZone(createData)
                // Replace local ID with backend UUID
                if (created.id) {
                    replaceZoneId(zone.id, created.id)
                    setExpandedId(created.id)
                }
            }
        } catch (e) {
            console.error('Error saving zone:', e)
            alert('Error al guardar la zona')
        } finally {
            setIsSaving(false)
        }
    }

    // Delete zone
    const handleDelete = async (zoneId: string) => {
        if (!confirm('¿Eliminar esta zona?')) return

        // Check if UUID (saved in DB)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zoneId)

        if (isUUID) {
            setIsDeleting(zoneId)
            try {
                await apiDeleteZone(zoneId)
            } catch (e) {
                console.error('Error deleting zone:', e)
                alert('Error al eliminar la zona')
                setIsDeleting(null)
                return
            }
            setIsDeleting(null)
        }

        // Remove from local store
        removeZone(zoneId)
        if (expandedId === zoneId) {
            setExpandedId(null)
        }
    }

    if (zones.length === 0) {
        return (
            <div className="zone-list-panel zone-list-panel--empty">
                <p>No hay zonas creadas</p>
            </div>
        )
    }

    return (
        <div className="zone-list-panel">
            <div className="zone-list-header">
                <h3>🎨 Zonas</h3>
                <span className="zone-list-count">{zones.length}</span>
            </div>

            <ul className="zone-list">
                {zones.map((zone) => {
                    const isExpanded = expandedId === zone.id

                    return (
                        <li
                            key={zone.id}
                            className={`zone-list-item ${isExpanded ? 'zone-list-item--expanded' : ''}`}
                        >
                            <button
                                className="zone-list-item__header"
                                onClick={() => handleToggle(zone)}
                            >
                                <span
                                    className="zone-list-item__color"
                                    style={{ backgroundColor: zone.color }}
                                />
                                <span className="zone-list-item__name">
                                    {zone.label || `Zona ${zone.id.slice(0, 6)}`}
                                </span>
                                {zone.price && (
                                    <span className="zone-list-item__price">
                                        ${zone.price}
                                    </span>
                                )}
                                <span className="zone-list-item__type">
                                    {getTypeLabel(zone.kind)}
                                </span>
                                <span className={`zone-list-item__arrow ${isExpanded ? 'zone-list-item__arrow--up' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="zone-list-item__body">
                                    <div className="zone-list-item__field">
                                        <label>NOMBRE</label>
                                        <input
                                            type="text"
                                            value={editValues.name}
                                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                            placeholder="Nombre de la zona"
                                        />
                                    </div>

                                    <div className="zone-list-item__row">
                                        <div className="zone-list-item__field zone-list-item__field--half">
                                            <label>PRECIO ($)</label>
                                            <input
                                                type="number"
                                                value={editValues.price}
                                                onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="zone-list-item__field zone-list-item__field--half">
                                            <label>COLOR</label>
                                            <input
                                                type="color"
                                                value={editValues.color}
                                                onChange={(e) => setEditValues({ ...editValues, color: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="zone-list-item__dimensions">
                                        Tamaño: {getDimensions(zone)}
                                    </div>

                                    <div className="zone-list-item__actions">
                                        <button
                                            className="zone-list-item__btn zone-list-item__btn--save"
                                            onClick={() => handleSave(zone)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '...' : 'Guardar'}
                                        </button>
                                        <button
                                            className="zone-list-item__btn zone-list-item__btn--delete"
                                            onClick={() => handleDelete(zone.id)}
                                            disabled={isDeleting === zone.id}
                                        >
                                            {isDeleting === zone.id ? '...' : 'Eliminar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default ZoneList
