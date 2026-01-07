import { describe, it, expect, beforeEach } from 'vitest'
import { useStandStore, type Stand, type Zone } from '../../admin/store/standStore'

describe('standStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStandStore.setState({
      planoId: null,
      planoName: 'Nuevo Plano',
      eventoId: null,
      backgroundUrl: '',
      backgroundFile: null,
      canvasWidth: 800,
      canvasHeight: 600,
      isSaving: false,
      lastSaved: null,
      newlyCreatedPlanoId: null,
      stands: [],
      zones: [],
      history: [],
      selectedStandId: null,
      mode: 'stand-rect',
      color: '#ffb703',
      rectPresetId: 'medium',
    })
  })

  describe('setPlanoName', () => {
    it('actualiza el nombre del plano', () => {
      const { setPlanoName } = useStandStore.getState()
      setPlanoName('Mi Plano')
      expect(useStandStore.getState().planoName).toBe('Mi Plano')
    })
  })

  describe('setEventoId', () => {
    it('establece el evento asociado', () => {
      const { setEventoId } = useStandStore.getState()
      setEventoId('evento-123')
      expect(useStandStore.getState().eventoId).toBe('evento-123')
    })

    it('permite null para desasociar evento', () => {
      useStandStore.setState({ eventoId: 'evento-123' })
      const { setEventoId } = useStandStore.getState()
      setEventoId(null)
      expect(useStandStore.getState().eventoId).toBeNull()
    })
  })

  describe('setBackgroundUrl', () => {
    it('establece la URL del fondo', () => {
      const { setBackgroundUrl } = useStandStore.getState()
      setBackgroundUrl('/images/plano.jpg')
      expect(useStandStore.getState().backgroundUrl).toBe('/images/plano.jpg')
    })
  })

  describe('setCanvasSize', () => {
    it('establece las dimensiones del canvas', () => {
      const { setCanvasSize } = useStandStore.getState()
      setCanvasSize(1200, 900)
      expect(useStandStore.getState().canvasWidth).toBe(1200)
      expect(useStandStore.getState().canvasHeight).toBe(900)
    })
  })

  describe('setMode', () => {
    it('cambia el modo de dibujo', () => {
      const { setMode } = useStandStore.getState()
      setMode('zone-rect')
      expect(useStandStore.getState().mode).toBe('zone-rect')
    })
  })

  describe('setColor', () => {
    it('cambia el color actual', () => {
      const { setColor } = useStandStore.getState()
      setColor('#ff0000')
      expect(useStandStore.getState().color).toBe('#ff0000')
    })
  })

  describe('addStand', () => {
    it('agrega un stand', () => {
      const stand: Stand = {
        id: 'stand-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
        label: 'A1',
      }
      const { addStand } = useStandStore.getState()
      addStand(stand)
      expect(useStandStore.getState().stands).toHaveLength(1)
      expect(useStandStore.getState().stands[0].id).toBe('stand-1')
    })

    it('agrega el stand al historial', () => {
      const stand: Stand = {
        id: 'stand-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
      }
      const { addStand } = useStandStore.getState()
      addStand(stand)
      expect(useStandStore.getState().history).toHaveLength(1)
      expect(useStandStore.getState().history[0]).toEqual({
        type: 'stand',
        id: 'stand-1',
      })
    })

    it('selecciona el stand recien agregado', () => {
      const stand: Stand = {
        id: 'stand-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
      }
      const { addStand } = useStandStore.getState()
      addStand(stand)
      expect(useStandStore.getState().selectedStandId).toBe('stand-1')
    })
  })

  describe('addZone', () => {
    it('agrega una zona', () => {
      const zone: Zone = {
        id: 'zone-1',
        kind: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        color: '#e0e0e0',
        label: 'Zona A',
      }
      const { addZone } = useStandStore.getState()
      addZone(zone)
      expect(useStandStore.getState().zones).toHaveLength(1)
      expect(useStandStore.getState().zones[0].id).toBe('zone-1')
    })

    it('agrega la zona al historial', () => {
      const zone: Zone = {
        id: 'zone-1',
        kind: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        color: '#e0e0e0',
      }
      const { addZone } = useStandStore.getState()
      addZone(zone)
      expect(useStandStore.getState().history).toHaveLength(1)
      expect(useStandStore.getState().history[0]).toEqual({
        type: 'zone',
        id: 'zone-1',
      })
    })
  })

  describe('updateStand', () => {
    it('actualiza propiedades de un stand', () => {
      const stand: Stand = {
        id: 'stand-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
      }
      useStandStore.setState({ stands: [stand] })
      const { updateStand } = useStandStore.getState()
      updateStand('stand-1', { label: 'Stand Actualizado', price: 1500 })
      const updated = useStandStore.getState().stands[0]
      expect(updated.label).toBe('Stand Actualizado')
      expect(updated.price).toBe(1500)
      expect(updated.x).toBe(100) // mantiene otras propiedades
    })
  })

  describe('updateZone', () => {
    it('actualiza propiedades de una zona', () => {
      const zone: Zone = {
        id: 'zone-1',
        kind: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        color: '#e0e0e0',
      }
      useStandStore.setState({ zones: [zone] })
      const { updateZone } = useStandStore.getState()
      updateZone('zone-1', { label: 'Zona Premium', price: 2000 })
      const updated = useStandStore.getState().zones[0]
      expect(updated.label).toBe('Zona Premium')
      expect(updated.price).toBe(2000)
    })
  })

  describe('selectStand', () => {
    it('selecciona un stand', () => {
      const { selectStand } = useStandStore.getState()
      selectStand('stand-123')
      expect(useStandStore.getState().selectedStandId).toBe('stand-123')
    })

    it('deselecciona con null', () => {
      useStandStore.setState({ selectedStandId: 'stand-123' })
      const { selectStand } = useStandStore.getState()
      selectStand(null)
      expect(useStandStore.getState().selectedStandId).toBeNull()
    })
  })

  describe('removeStand', () => {
    it('elimina un stand', () => {
      const stands: Stand[] = [
        { id: 'stand-1', kind: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#fff' },
        { id: 'stand-2', kind: 'rect', x: 100, y: 0, width: 50, height: 50, color: '#fff' },
      ]
      useStandStore.setState({ stands })
      const { removeStand } = useStandStore.getState()
      removeStand('stand-1')
      expect(useStandStore.getState().stands).toHaveLength(1)
      expect(useStandStore.getState().stands[0].id).toBe('stand-2')
    })

    it('deselecciona si el stand eliminado estaba seleccionado', () => {
      const stands: Stand[] = [
        { id: 'stand-1', kind: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#fff' },
      ]
      useStandStore.setState({ stands, selectedStandId: 'stand-1' })
      const { removeStand } = useStandStore.getState()
      removeStand('stand-1')
      expect(useStandStore.getState().selectedStandId).toBeNull()
    })
  })

  describe('removeZone', () => {
    it('elimina una zona', () => {
      const zones: Zone[] = [
        { id: 'zone-1', kind: 'rect', x: 0, y: 0, width: 200, height: 200, color: '#eee' },
        { id: 'zone-2', kind: 'rect', x: 200, y: 0, width: 200, height: 200, color: '#eee' },
      ]
      useStandStore.setState({ zones })
      const { removeZone } = useStandStore.getState()
      removeZone('zone-1')
      expect(useStandStore.getState().zones).toHaveLength(1)
      expect(useStandStore.getState().zones[0].id).toBe('zone-2')
    })
  })

  describe('undoLast', () => {
    it('deshace el ultimo stand agregado', () => {
      const stand: Stand = {
        id: 'stand-1',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
      }
      useStandStore.setState({
        stands: [stand],
        history: [{ type: 'stand', id: 'stand-1' }],
      })
      const { undoLast } = useStandStore.getState()
      undoLast()
      expect(useStandStore.getState().stands).toHaveLength(0)
      expect(useStandStore.getState().history).toHaveLength(0)
    })

    it('deshace la ultima zona agregada', () => {
      const zone: Zone = {
        id: 'zone-1',
        kind: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        color: '#e0e0e0',
      }
      useStandStore.setState({
        zones: [zone],
        history: [{ type: 'zone', id: 'zone-1' }],
      })
      const { undoLast } = useStandStore.getState()
      undoLast()
      expect(useStandStore.getState().zones).toHaveLength(0)
      expect(useStandStore.getState().history).toHaveLength(0)
    })

    it('no hace nada si el historial esta vacio', () => {
      useStandStore.setState({ history: [] })
      const { undoLast } = useStandStore.getState()
      undoLast()
      expect(useStandStore.getState().history).toHaveLength(0)
    })
  })

  describe('clearAll', () => {
    it('limpia todos los stands, zonas e historial', () => {
      useStandStore.setState({
        stands: [{ id: 's1', kind: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#fff' }],
        zones: [{ id: 'z1', kind: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#eee' }],
        history: [{ type: 'stand', id: 's1' }, { type: 'zone', id: 'z1' }],
        selectedStandId: 's1',
        planoId: 'plano-123',
        planoName: 'Plano Test',
        backgroundUrl: '/test.jpg',
      })
      const { clearAll } = useStandStore.getState()
      clearAll()
      const state = useStandStore.getState()
      expect(state.stands).toHaveLength(0)
      expect(state.zones).toHaveLength(0)
      expect(state.history).toHaveLength(0)
      expect(state.selectedStandId).toBeNull()
      expect(state.planoId).toBeNull()
      expect(state.planoName).toBe('Nuevo Plano')
      expect(state.backgroundUrl).toBe('')
    })
  })

  describe('replaceStandId', () => {
    it('reemplaza el ID de un stand', () => {
      const stand: Stand = {
        id: 'temp-id',
        kind: 'rect',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ffb703',
      }
      useStandStore.setState({
        stands: [stand],
        selectedStandId: 'temp-id',
        history: [{ type: 'stand', id: 'temp-id' }],
      })
      const { replaceStandId } = useStandStore.getState()
      replaceStandId('temp-id', 'real-id')
      const state = useStandStore.getState()
      expect(state.stands[0].id).toBe('real-id')
      expect(state.selectedStandId).toBe('real-id')
      expect(state.history[0].id).toBe('real-id')
    })
  })

  describe('replaceZoneId', () => {
    it('reemplaza el ID de una zona', () => {
      const zone: Zone = {
        id: 'temp-zone',
        kind: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        color: '#e0e0e0',
      }
      useStandStore.setState({
        zones: [zone],
        history: [{ type: 'zone', id: 'temp-zone' }],
      })
      const { replaceZoneId } = useStandStore.getState()
      replaceZoneId('temp-zone', 'real-zone-id')
      const state = useStandStore.getState()
      expect(state.zones[0].id).toBe('real-zone-id')
      expect(state.history[0].id).toBe('real-zone-id')
    })
  })

  describe('setRectPreset / getRectPreset', () => {
    it('establece y obtiene un preset de rectangulo', () => {
      const { setRectPreset, getRectPreset } = useStandStore.getState()
      setRectPreset('small')
      const preset = getRectPreset()
      expect(preset).not.toBeNull()
      expect(preset?.id).toBe('small')
      expect(preset?.width).toBe(160)
      expect(preset?.height).toBe(160)
    })

    it('retorna null si no hay preset seleccionado', () => {
      const { setRectPreset, getRectPreset } = useStandStore.getState()
      setRectPreset(null)
      expect(getRectPreset()).toBeNull()
    })
  })
})

