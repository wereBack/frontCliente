# Desarrollo de mapa para feria de empleo
_Exported on 3/12/2025 at 17:16:24 GMT-3 from Cursor (2.1.46)_

---

**User**

@Descripción y alcance del proyecto.pdf 

quiero encontrar alguna libreria para poder hacer la parte del mapa con react, ayudame a hacer un POC



Resumen del problema



La feria de empleo ha sido históricamente un problema en cuanto a logística y administración en la asignación de stands. Hasta el año pasado, se enviaba a las empresas un canva para que eligieran su lugar y se producían conflictos de concurrencia (dos empresas intentando reservar el mismo stand al mismo tiempo).

Este año se contrató temporalmente (hasta septiembre) el sitio: https://feriadeempleoum.expofp.com/ para gestionar reservas. Como referencia de experiencia de uso y claridad visual se quiere tomar el sitio de la ORT: https://empleo.ort.edu.uy/mes/ingenieria/plano-de-ubicacion, destacando su facilidad de uso y lo intuitivo que es, tambien se hablo de que a diferencia del sitio actual de la UM, que muestra stands separados aunque en la realidad estén juntos, el de la ORT lo muestra juntos.

Hoy el proceso de facturación es manual. Será necesario analizar con el Departamento de Facturación la integración (posiblemente con SAP) para automatizar la emisión de comprobantes y conciliaciones además de una integración con pasarela de pagos.

Distintas necesidades y funciones de las que se hablaron:

Precios y zonas

Stands con precios diferenciados según ubicación (p. ej., frente a la entrada).

Posibilidad de asignación manual por parte de Desarrollo Profesional.

Precio automático por zona (coloreado visual del plano, al estilo ORT).





vamos a enfocarnos en la parte del mapa/ plano





la pagina tiene q ser capaz de 

- cargar una foto

- poder dibujarle arriba los 'stands' con formas predefinidas 

- poder dibujar stands de forma libre ( con formas geometricas)

- poder 'pintar areas' para dsp poder asignar distintos precios por ejemplo



vamos de a poco, no hay apuro 

---

**Cursor**

1. ¿Prefieres un enfoque tipo lienzo 2D (Konva/Fabric) o mapa geográfico (Mapbox/Leaflet) para dibujar el plano?  
   - a) Lienzo 2D (similar a ORT)  
   - b) Mapa geográfico  

2. ¿El POC debe guardar/recargar la definición de stands desde JSON local o basta con que sea sólo interacción visual?

---

**User**

prefiero un enfoque tipo lienzo 2d, habia visto algo de konva y me parecio q estaba bueno si. 

por ahora basta con la interaccion visual

---

**Cursor**

1. ¿Armamos un nuevo proyecto React (Vite + TS) dentro de `front2` para el POC?  
   - a) Sí, crear uno nuevo con Vite  
   - b) No, ya existe una app en este repo

---

**User**

a

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

```typescript
import { create } from 'zustand'

export type ToolMode = 'select' | 'rect' | 'polygon' | 'free' | 'paint'

export type BaseStand = {
  id: string
  color: string
  label?: string
}

export type RectStand = BaseStand & {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonStand = BaseStand & {
  type: 'polygon'
  points: number[]
}

export type FreeStand = BaseStand & {
  type: 'free'
  points: number[]
}

export type Stand = RectStand | PolygonStand | FreeStand

type StandStore = {
  stands: Stand[]
  selectedStandId: string | null
  mode: ToolMode
  zoneColor: string
  addStand: (stand: Stand) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  setMode: (mode: ToolMode) => void
  setZoneColor: (color: string) => void
  selectStand: (id: string | null) => void
  removeStand: (id: string) => void
  clearAll: () => void
  undoLast: () => void
}

export const useStandStore = create<StandStore>((set) => ({
  stands: [],
  selectedStandId: null,
  mode: 'rect',
  zoneColor: '#ffb703',
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      selectedStandId: stand.id,
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? { ...stand, ...updates } : stand,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setZoneColor: (color) => set({ zoneColor: color }),
  selectStand: (id) => set({ selectedStandId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  clearAll: () => set({ stands: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => ({
      stands: state.stands.slice(0, -1),
      selectedStandId:
        state.selectedStandId === state.stands[state.stands.length - 1]?.id
          ? null
          : state.selectedStandId,
    })),
}))


```

```typescript
import { RefObject, useLayoutEffect, useState } from 'react'

const MIN_WIDTH = 320
const MIN_HEIGHT = 320

export function useElementSize<T extends HTMLElement>(
  ref: RefObject<T>,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const updateSize = () => {
      setSize({
        width: Math.max(element.clientWidth, MIN_WIDTH),
        height: Math.max(element.clientHeight, MIN_HEIGHT),
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return size
}


```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import {
  FreeStand,
  PolygonStand,
  RectStand,
  Stand,
  ToolMode,
  useStandStore,
} from '../store/standStore'

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const mode = useStandStore((state) => state.mode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)

  const [rectDraft, setRectDraft] = useState<RectStand | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    // reset temp drawings when switching tools
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitStand = (stand: Stand) => {
    addStand(stand)
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (mode === 'rect') {
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: zoneColor,
      })
      return
    }

    if (mode === 'polygon') {
      if (event.evt.detail === 2 && polygonPoints.length >= 6) {
        commitStand({
          id: crypto.randomUUID(),
          type: 'polygon',
          points: polygonPoints,
          color: zoneColor,
        })
        return
      }
      setPolygonPoints((points) => [...points, pos.x, pos.y])
      return
    }

    if (mode === 'free') {
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (mode === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && mode === 'rect') {
      const nextRect = buildRectDraft(rectStart, pos, zoneColor)
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && mode === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (mode === 'rect' && rectDraft) {
      if (
        rectDraft.width >= MIN_SHAPE_SIZE &&
        rectDraft.height >= MIN_SHAPE_SIZE
      ) {
        commitStand({
          ...rectDraft,
          id: crypto.randomUUID(),
        })
      } else {
        resetDrafts()
      }
    }

    if (mode === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeStand: FreeStand = {
          id: crypto.randomUUID(),
          type: 'free',
          points: freePoints,
          color: zoneColor,
        }
        commitStand(freeStand)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandClick = (
    event: KonvaEventObject<MouseEvent>,
    stand: Stand,
  ) => {
    event.cancelBubble = true

    if (mode === 'paint') {
      updateStand(stand.id, { color: zoneColor })
      return
    }

    selectStand(stand.id)
  }

  const renderStand = (stand: Stand) => {
    const isSelected = stand.id === selectedStandId
    const stroke = isSelected ? '#1d3557' : '#2b2d42'
    const strokeWidth = isSelected ? 3 : 1.5

    if (stand.type === 'rect') {
      return (
        <Rect
          key={stand.id}
          x={stand.x}
          y={stand.y}
          width={stand.width}
          height={stand.height}
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    if (stand.type === 'polygon') {
      return (
        <Line
          key={stand.id}
          points={stand.points}
          closed
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    return (
      <Line
        key={stand.id}
        points={stand.points}
        stroke={stand.color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleStandClick(event, stand)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    const cursorMap: Record<ToolMode, string> = {
      select: 'default',
      rect: 'crosshair',
      polygon: 'crosshair',
      free: 'crosshair',
      paint: 'pointer',
    }
    return cursorMap[mode] ?? 'default'
  }, [mode])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
      ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          {stands.map((stand) => renderStand(stand))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={zoneColor}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={zoneColor}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
): Omit<RectStand, 'id'> => {
  const width = current.x - start.x
  const height = current.y - start.y

  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    type: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas


```

```typescriptreact
import { ToolMode, useStandStore } from '../store/standStore'

const TOOL_OPTIONS: Array<{ id: ToolMode; label: string }> = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'rect', label: 'Rectángulo' },
  { id: 'polygon', label: 'Polígono' },
  { id: 'free', label: 'Trazo libre' },
  { id: 'paint', label: 'Pintar zona' },
]

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const setZoneColor = useStandStore((state) => state.setZoneColor)
  const stands = useStandStore((state) => state.stands)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas</p>
        <div className="toolbar__grid">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color / Zona</p>
        <input
          type="color"
          value={zoneColor}
          onChange={(event) => setZoneColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="toolbar__swatch"
              style={{ backgroundColor: color }}
              onClick={() => setZoneColor(color)}
              aria-label={`Usar color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar


```

```typescriptreact
import type { ChangeEvent } from 'react'
import { ToolMode, useStandStore } from '../store/standStore'

const TOOL_OPTIONS: Array<{ id: ToolMode; label: string }> = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'rect', label: 'Rectángulo' },
  { id: 'polygon', label: 'Polígono' },
  { id: 'free', label: 'Trazo libre' },
  { id: 'paint', label: 'Pintar zona' },
]

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const setZoneColor = useStandStore((state) => state.setZoneColor)
  const stands = useStandStore((state) => state.stands)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas</p>
        <div className="toolbar__grid">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color / Zona</p>
        <input
          type="color"
          value={zoneColor}
          onChange={(event) => setZoneColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="toolbar__swatch"
              style={{ backgroundColor: color }}
              onClick={() => setZoneColor(color)}
              aria-label={`Usar color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar



```

```typescriptreact
import { Stand, useStandStore } from '../store/standStore'

const StandInspector = () => {
  const stands = useStandStore((state) => state.stands)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const removeStand = useStandStore((state) => state.removeStand)

  const handleColorChange = (stand: Stand, color: string) => {
    updateStand(stand.id, { color })
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <div>
          <p className="inspector__title">Stands</p>
          <small>{stands.length} creados</small>
        </div>
      </div>

      {stands.length === 0 ? (
        <p className="inspector__empty">
          Dibujá tus primeros stands ☝️ con las herramientas de la izquierda.
        </p>
      ) : (
        <ul className="inspector__list">
          {stands.map((stand, index) => (
            <li
              key={stand.id}
              className={`inspector__item ${
                selectedStandId === stand.id ? 'inspector__item--active' : ''
              }`}
            >
              <button
                className="inspector__item-main"
                onClick={() => selectStand(stand.id)}
              >
                <span className="inspector__item-name">
                  {stand.label ?? `Stand ${index + 1}`}
                </span>
                <span className="inspector__badge">{stand.type}</span>
              </button>

              <div className="inspector__item-body">
                <div className="inspector__meta">
                  <span>{formatStandMeta(stand)}</span>
                </div>
                <label className="inspector__color">
                  Color
                  <input
                    type="color"
                    value={stand.color}
                    onChange={(event) =>
                      handleColorChange(stand, event.target.value)
                    }
                  />
                </label>
                <button
                  className="inspector__delete"
                  onClick={() => removeStand(stand.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

const formatStandMeta = (stand: Stand) => {
  if (stand.type === 'rect') {
    return `${Math.round(stand.width)}×${Math.round(stand.height)} px`
  }
  if (stand.type === 'free') {
    return `${Math.round(stand.points.length / 2)} pts`
  }
  return `${Math.round(stand.points.length / 2)} vértices`
}

export default StandInspector


```

```typescriptreact
import { useState } from 'react'
import StandCanvas from './components/StandCanvas'
import StandInspector from './components/StandInspector'
import Toolbar from './components/Toolbar'
import './App.css'

function App() {
  const [backgroundSrc, setBackgroundSrc] = useState<string>()

  return (
    <div className="app-shell">
      <Toolbar onBackgroundChange={setBackgroundSrc} />

      <main className="workspace">
        <header className="workspace__header">
          <div>
            <h1>Plano interactivo – Feria de Empleo</h1>
            <p>
              Cargá la imagen del predio, elegí una herramienta y dibujá los
              stands. Usá el modo pintar para etiquetar zonas con colores según
              el pricing que necesites.
            </p>
          </div>
        </header>

        <section className="workspace__canvas">
          <StandCanvas backgroundSrc={backgroundSrc} />
        </section>
      </main>

      <StandInspector />
    </div>
  )
}

export default App

```

```css
:root {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  line-height: 1.4;
  font-weight: 400;
  color: #1c1f24;
  background-color: #f5f6f8;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: #f5f6f8;
}

#root {
  min-height: 100vh;
}

button {
  font-family: inherit;
}

```

```css
.app-shell {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 1.5rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace__header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.45);
}

.workspace__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.workspace__header p {
  margin: 0;
  color: #475467;
}

.workspace__canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf0f5;
  display: flex;
}

.canvas-shell {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 540px;
}

.canvas-stage {
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #e6e8ec;
  background: repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    );
}

.toolbar,
.inspector {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.toolbar__section,
.inspector__header,
.inspector__list,
.inspector__empty {
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.toolbar__title {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #1d2939;
}

.toolbar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.toolbar__button {
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #1f2937;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__button--ghost {
  background: #ffffff;
}

.toolbar__button--danger {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar__button--active {
  background: #1d4ed8;
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.toolbar__color-picker {
  width: 100%;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
}

.toolbar__swatches {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toolbar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toolbar__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475467;
}

.toolbar__upload input {
  margin-top: 0.35rem;
}

.toolbar__stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.inspector__empty {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.inspector__list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector__item {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__item--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.inspector__item-main {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
}

.inspector__badge {
  text-transform: uppercase;
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.inspector__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__meta {
  color: #475467;
  font-size: 0.85rem;
}

.inspector__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__color input {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.inspector__delete {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

@media (max-width: 1200px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .inspector {
    position: static;
  }

  .canvas-shell {
    height: 480px;
  }
}

```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import {
  FreeStand,
  PolygonStand,
  RectStand,
  Stand,
  ToolMode,
  useStandStore,
} from '../store/standStore'

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const mode = useStandStore((state) => state.mode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)

  const [rectDraft, setRectDraft] = useState<RectStand | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    // reset temp drawings when switching tools
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitStand = (stand: Stand) => {
    addStand(stand)
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (mode === 'rect') {
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: zoneColor,
      })
      return
    }

    if (mode === 'polygon') {
      if (event.evt.detail === 2 && polygonPoints.length >= 6) {
        commitStand({
          id: crypto.randomUUID(),
          type: 'polygon',
          points: polygonPoints,
          color: zoneColor,
        })
        return
      }
      setPolygonPoints((points) => [...points, pos.x, pos.y])
      return
    }

    if (mode === 'free') {
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (mode === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && mode === 'rect') {
      const nextRect = buildRectDraft(rectStart, pos, zoneColor)
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && mode === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (mode === 'rect' && rectDraft) {
      if (
        rectDraft.width >= MIN_SHAPE_SIZE &&
        rectDraft.height >= MIN_SHAPE_SIZE
      ) {
        commitStand({
          ...rectDraft,
          id: crypto.randomUUID(),
        })
      } else {
        resetDrafts()
      }
    }

    if (mode === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeStand: FreeStand = {
          id: crypto.randomUUID(),
          type: 'free',
          points: freePoints,
          color: zoneColor,
        }
        commitStand(freeStand)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandClick = (
    event: KonvaEventObject<MouseEvent>,
    stand: Stand,
  ) => {
    event.cancelBubble = true

    if (mode === 'paint') {
      updateStand(stand.id, { color: zoneColor })
      return
    }

    selectStand(stand.id)
  }

  const renderStand = (stand: Stand) => {
    const isSelected = stand.id === selectedStandId
    const stroke = isSelected ? '#1d3557' : '#2b2d42'
    const strokeWidth = isSelected ? 3 : 1.5

    if (stand.type === 'rect') {
      return (
        <Rect
          key={stand.id}
          x={stand.x}
          y={stand.y}
          width={stand.width}
          height={stand.height}
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    if (stand.type === 'polygon') {
      return (
        <Line
          key={stand.id}
          points={stand.points}
          closed
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    return (
      <Line
        key={stand.id}
        points={stand.points}
        stroke={stand.color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleStandClick(event, stand)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    const cursorMap: Record<ToolMode, string> = {
      select: 'default',
      rect: 'crosshair',
      polygon: 'crosshair',
      free: 'crosshair',
      paint: 'pointer',
    }
    return cursorMap[mode] ?? 'default'
  }, [mode])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          {stands.map((stand) => renderStand(stand))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={zoneColor}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={zoneColor}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
): Omit<RectStand, 'id'> => {
  const width = current.x - start.x
  const height = current.y - start.y

  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    type: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas



```

```typescriptreact
import type { ChangeEvent } from 'react'
import { ToolMode, useStandStore } from '../store/standStore'

const TOOL_OPTIONS: Array<{ id: ToolMode; label: string }> = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'rect', label: 'Rectángulo' },
  { id: 'polygon', label: 'Polígono' },
  { id: 'free', label: 'Trazo libre' },
  { id: 'paint', label: 'Pintar zona' },
]

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const setZoneColor = useStandStore((state) => state.setZoneColor)
  const stands = useStandStore((state) => state.stands)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas</p>
        <div className="toolbar__grid">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color / Zona</p>
        <input
          type="color"
          value={zoneColor}
          onChange={(event) => setZoneColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="toolbar__swatch"
              style={{ backgroundColor: color }}
              onClick={() => setZoneColor(color)}
              aria-label={`Usar color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={() => onBackgroundChange(undefined)}
        >
          Quitar imagen
        </button>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar



```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import {
  FreeStand,
  RectStand,
  Stand,
  ToolMode,
  useStandStore,
} from '../store/standStore'

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const mode = useStandStore((state) => state.mode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)

  const [rectDraft, setRectDraft] = useState<RectStand | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    // reset temp drawings when switching tools
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitStand = (stand: Stand) => {
    addStand(stand)
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (mode === 'rect') {
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: zoneColor,
      })
      return
    }

    if (mode === 'polygon') {
      if (event.evt.detail === 2 && polygonPoints.length >= 6) {
        commitStand({
          id: crypto.randomUUID(),
          type: 'polygon',
          points: polygonPoints,
          color: zoneColor,
        })
        return
      }
      setPolygonPoints((points) => [...points, pos.x, pos.y])
      return
    }

    if (mode === 'free') {
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (mode === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && mode === 'rect') {
      const nextRect = buildRectDraft(rectStart, pos, zoneColor)
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && mode === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (mode === 'rect' && rectDraft) {
      if (
        rectDraft.width >= MIN_SHAPE_SIZE &&
        rectDraft.height >= MIN_SHAPE_SIZE
      ) {
        commitStand({
          ...rectDraft,
          id: crypto.randomUUID(),
        })
      } else {
        resetDrafts()
      }
    }

    if (mode === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeStand: FreeStand = {
          id: crypto.randomUUID(),
          type: 'free',
          points: freePoints,
          color: zoneColor,
        }
        commitStand(freeStand)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandClick = (
    event: KonvaEventObject<MouseEvent>,
    stand: Stand,
  ) => {
    event.cancelBubble = true

    if (mode === 'paint') {
      updateStand(stand.id, { color: zoneColor })
      return
    }

    selectStand(stand.id)
  }

  const renderStand = (stand: Stand) => {
    const isSelected = stand.id === selectedStandId
    const stroke = isSelected ? '#1d3557' : '#2b2d42'
    const strokeWidth = isSelected ? 3 : 1.5

    if (stand.type === 'rect') {
      return (
        <Rect
          key={stand.id}
          x={stand.x}
          y={stand.y}
          width={stand.width}
          height={stand.height}
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    if (stand.type === 'polygon') {
      return (
        <Line
          key={stand.id}
          points={stand.points}
          closed
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    return (
      <Line
        key={stand.id}
        points={stand.points}
        stroke={stand.color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleStandClick(event, stand)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    const cursorMap: Record<ToolMode, string> = {
      select: 'default',
      rect: 'crosshair',
      polygon: 'crosshair',
      free: 'crosshair',
      paint: 'pointer',
    }
    return cursorMap[mode] ?? 'default'
  }, [mode])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          {stands.map((stand) => renderStand(stand))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={zoneColor}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={zoneColor}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
): Omit<RectStand, 'id'> => {
  const width = current.x - start.x
  const height = current.y - start.y

  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    type: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas



```

```typescriptreact
import type { ChangeEvent } from 'react'
import { ToolMode, useStandStore } from '../store/standStore'

const TOOL_OPTIONS: Array<{ id: ToolMode; label: string }> = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'rect', label: 'Rectángulo' },
  { id: 'polygon', label: 'Polígono' },
  { id: 'free', label: 'Trazo libre' },
  { id: 'paint', label: 'Pintar zona' },
]

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const setZoneColor = useStandStore((state) => state.setZoneColor)
  const stands = useStandStore((state) => state.stands)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas</p>
        <div className="toolbar__grid">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color / Zona</p>
        <input
          type="color"
          value={zoneColor}
          onChange={(event) => setZoneColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="toolbar__swatch"
              style={{ backgroundColor: color }}
              onClick={() => setZoneColor(color)}
              aria-label={`Usar color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={() => onBackgroundChange(undefined)}
        >
          Quitar imagen
        </button>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar



```

```typescript
import { create } from 'zustand'

export type ToolMode = 'select' | 'rect' | 'polygon' | 'free' | 'paint'

export type BaseStand = {
  id: string
  color: string
  label?: string
}

export type RectStand = BaseStand & {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonStand = BaseStand & {
  type: 'polygon'
  points: number[]
}

export type FreeStand = BaseStand & {
  type: 'free'
  points: number[]
}

export type Stand = RectStand | PolygonStand | FreeStand

type StandStore = {
  stands: Stand[]
  selectedStandId: string | null
  mode: ToolMode
  zoneColor: string
  addStand: (stand: Stand) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  setMode: (mode: ToolMode) => void
  setZoneColor: (color: string) => void
  selectStand: (id: string | null) => void
  removeStand: (id: string) => void
  clearAll: () => void
  undoLast: () => void
}

export const useStandStore = create<StandStore>((set) => ({
  stands: [],
  selectedStandId: null,
  mode: 'rect',
  zoneColor: '#ffb703',
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      selectedStandId: stand.id,
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? ({ ...stand, ...updates } as Stand) : stand,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setZoneColor: (color) => set({ zoneColor: color }),
  selectStand: (id) => set({ selectedStandId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  clearAll: () => set({ stands: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => {
      if (state.stands.length === 0) {
        return state
      }
      const nextStands = state.stands.slice(0, -1)
      const removed = state.stands[state.stands.length - 1]
      return {
        stands: nextStands,
        selectedStandId:
          state.selectedStandId === removed?.id ? null : state.selectedStandId,
      }
    }),
}))



```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type { FreeStand, RectStand, Stand, ToolMode } from '../store/standStore'
import { useStandStore } from '../store/standStore'

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const mode = useStandStore((state) => state.mode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)

  const [rectDraft, setRectDraft] = useState<RectStand | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    // reset temp drawings when switching tools
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitStand = (stand: Stand) => {
    addStand(stand)
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (mode === 'rect') {
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: zoneColor,
      })
      return
    }

    if (mode === 'polygon') {
      if (event.evt.detail === 2 && polygonPoints.length >= 6) {
        commitStand({
          id: crypto.randomUUID(),
          type: 'polygon',
          points: polygonPoints,
          color: zoneColor,
        })
        return
      }
      setPolygonPoints((points) => [...points, pos.x, pos.y])
      return
    }

    if (mode === 'free') {
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (mode === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && mode === 'rect') {
      const nextRect = buildRectDraft(rectStart, pos, zoneColor)
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && mode === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (mode === 'rect' && rectDraft) {
      if (
        rectDraft.width >= MIN_SHAPE_SIZE &&
        rectDraft.height >= MIN_SHAPE_SIZE
      ) {
        commitStand({
          ...rectDraft,
          id: crypto.randomUUID(),
        })
      } else {
        resetDrafts()
      }
    }

    if (mode === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeStand: FreeStand = {
          id: crypto.randomUUID(),
          type: 'free',
          points: freePoints,
          color: zoneColor,
        }
        commitStand(freeStand)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandClick = (
    event: KonvaEventObject<MouseEvent>,
    stand: Stand,
  ) => {
    event.cancelBubble = true

    if (mode === 'paint') {
      updateStand(stand.id, { color: zoneColor })
      return
    }

    selectStand(stand.id)
  }

  const renderStand = (stand: Stand) => {
    const isSelected = stand.id === selectedStandId
    const stroke = isSelected ? '#1d3557' : '#2b2d42'
    const strokeWidth = isSelected ? 3 : 1.5

    if (stand.type === 'rect') {
      return (
        <Rect
          key={stand.id}
          x={stand.x}
          y={stand.y}
          width={stand.width}
          height={stand.height}
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    if (stand.type === 'polygon') {
      return (
        <Line
          key={stand.id}
          points={stand.points}
          closed
          fill={stand.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleStandClick(event, stand)}
        />
      )
    }

    return (
      <Line
        key={stand.id}
        points={stand.points}
        stroke={stand.color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleStandClick(event, stand)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    const cursorMap: Record<ToolMode, string> = {
      select: 'default',
      rect: 'crosshair',
      polygon: 'crosshair',
      free: 'crosshair',
      paint: 'pointer',
    }
    return cursorMap[mode] ?? 'default'
  }, [mode])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          {stands.map((stand) => renderStand(stand))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={zoneColor}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={zoneColor}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
): Omit<RectStand, 'id'> => {
  const width = current.x - start.x
  const height = current.y - start.y

  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    type: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas



```

```typescript
import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'

const MIN_WIDTH = 320
const MIN_HEIGHT = 320

export function useElementSize<T extends HTMLElement>(
  ref: RefObject<T | null>,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const updateSize = () => {
      setSize({
        width: Math.max(element.clientWidth, MIN_WIDTH),
        height: Math.max(element.clientHeight, MIN_HEIGHT),
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return size
}



```

```typescriptreact
import type { Stand } from '../store/standStore'
import { useStandStore } from '../store/standStore'

const StandInspector = () => {
  const stands = useStandStore((state) => state.stands)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const removeStand = useStandStore((state) => state.removeStand)

  const handleColorChange = (stand: Stand, color: string) => {
    updateStand(stand.id, { color })
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <div>
          <p className="inspector__title">Stands</p>
          <small>{stands.length} creados</small>
        </div>
      </div>

      {stands.length === 0 ? (
        <p className="inspector__empty">
          Dibujá tus primeros stands ☝️ con las herramientas de la izquierda.
        </p>
      ) : (
        <ul className="inspector__list">
          {stands.map((stand, index) => (
            <li
              key={stand.id}
              className={`inspector__item ${
                selectedStandId === stand.id ? 'inspector__item--active' : ''
              }`}
            >
              <button
                className="inspector__item-main"
                onClick={() => selectStand(stand.id)}
              >
                <span className="inspector__item-name">
                  {stand.label ?? `Stand ${index + 1}`}
                </span>
                <span className="inspector__badge">{stand.type}</span>
              </button>

              <div className="inspector__item-body">
                <div className="inspector__meta">
                  <span>{formatStandMeta(stand)}</span>
                </div>
                <label className="inspector__color">
                  Color
                  <input
                    type="color"
                    value={stand.color}
                    onChange={(event) =>
                      handleColorChange(stand, event.target.value)
                    }
                  />
                </label>
                <button
                  className="inspector__delete"
                  onClick={() => removeStand(stand.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

const formatStandMeta = (stand: Stand) => {
  if (stand.type === 'rect') {
    return `${Math.round(stand.width)}×${Math.round(stand.height)} px`
  }
  if (stand.type === 'free') {
    return `${Math.round(stand.points.length / 2)} pts`
  }
  return `${Math.round(stand.points.length / 2)} vértices`
}

export default StandInspector



```

```typescriptreact
import type { ChangeEvent } from 'react'
import type { ToolMode } from '../store/standStore'
import { useStandStore } from '../store/standStore'

const TOOL_OPTIONS: Array<{ id: ToolMode; label: string }> = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'rect', label: 'Rectángulo' },
  { id: 'polygon', label: 'Polígono' },
  { id: 'free', label: 'Trazo libre' },
  { id: 'paint', label: 'Pintar zona' },
]

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const zoneColor = useStandStore((state) => state.zoneColor)
  const setZoneColor = useStandStore((state) => state.setZoneColor)
  const stands = useStandStore((state) => state.stands)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas</p>
        <div className="toolbar__grid">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color / Zona</p>
        <input
          type="color"
          value={zoneColor}
          onChange={(event) => setZoneColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="toolbar__swatch"
              style={{ backgroundColor: color }}
              onClick={() => setZoneColor(color)}
              aria-label={`Usar color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={() => onBackgroundChange(undefined)}
        >
          Quitar imagen
        </button>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={stands.length === 0}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar



```

```typescriptreact
import { useState } from 'react'
import StandCanvas from './components/StandCanvas'
import StandInspector from './components/StandInspector'
import Toolbar from './components/Toolbar'
import './App.css'

function App() {
  const [backgroundSrc, setBackgroundSrc] = useState<string>()

  return (
    <div className="app-shell">
      <Toolbar onBackgroundChange={setBackgroundSrc} />

      <main className="workspace">
        <header className="workspace__header">
          <div>
            <h1>Plano interactivo – Feria de Empleo</h1>
            <p>
              Cargá la imagen del predio, elegí una herramienta y dibujá los
              stands. Usá el modo pintar para etiquetar zonas con colores según
              el pricing que necesites.
            </p>
            <ul className="workspace__tips">
              <li>Rectángulo: clic y arrastrá para definir el área.</li>
              <li>Polígono: agregá vértices con clic y cerrá con doble clic.</li>
              <li>Trazo libre: mantené presionado para dibujar formas orgánicas.</li>
              <li>Pintar zona: clic sobre un stand para aplicar el color activo.</li>
            </ul>
          </div>
        </header>

        <section className="workspace__canvas">
          <StandCanvas backgroundSrc={backgroundSrc} />
        </section>
      </main>

      <StandInspector />
    </div>
  )
}

export default App

```

```css
.app-shell {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 1.5rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace__header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.45);
}

.workspace__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.workspace__header p {
  margin: 0;
  color: #475467;
}

.workspace__tips {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: #475467;
  font-size: 0.9rem;
  display: grid;
  gap: 0.3rem;
}

.workspace__canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf0f5;
  display: flex;
}

.canvas-shell {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 540px;
}

.canvas-stage {
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #e6e8ec;
  background: repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    );
}

.toolbar,
.inspector {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.toolbar__section,
.inspector__header,
.inspector__list,
.inspector__empty {
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.toolbar__title {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #1d2939;
}

.toolbar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.toolbar__button {
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #1f2937;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__button--ghost {
  background: #ffffff;
}

.toolbar__button--danger {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar__button--active {
  background: #1d4ed8;
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.toolbar__color-picker {
  width: 100%;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
}

.toolbar__swatches {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toolbar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toolbar__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475467;
}

.toolbar__upload input {
  margin-top: 0.35rem;
}

.toolbar__stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.inspector__empty {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.inspector__list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector__item {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__item--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.inspector__item-main {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
}

.inspector__badge {
  text-transform: uppercase;
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.inspector__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__meta {
  color: #475467;
  font-size: 0.85rem;
}

.inspector__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__color input {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.inspector__delete {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

@media (max-width: 1200px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .inspector {
    position: static;
  }

  .canvas-shell {
    height: 480px;
  }
}

```

## Updates
- Built a Konva-based canvas (`src/components/StandCanvas.tsx`) that reacts to the active tool: rectangles via drag, polygons with double-click to close, freehand strokes, and paint mode that recolors existing stands while honoring the uploaded background image and live stage sizing.

```95:131:src/components/StandCanvas.tsx
if (mode === 'polygon') {
  if (event.evt.detail === 2 && polygonPoints.length >= 6) {
    commitStand({
      id: crypto.randomUUID(),
      type: 'polygon',
      points: polygonPoints,
      color: zoneColor,
    })
    return
  }
  setPolygonPoints((points) => [...points, pos.x, pos.y])
  return
}
```

- Added a Zustand store plus sizing hook (`src/store/standStore.ts`, `src/hooks/useElementSize.ts`) to centralize stand state, tool/zone selection, undo/clear actions, and responsive layout.
- Delivered the UX layer: `Toolbar` handles tool toggles, color presets, background uploads and cleanup, while `StandInspector` exposes stand metadata, selection, color tweaks, and removal. `App.tsx` stitches everything with helper tips and the new layout; `App.css`/`index.css` provide the three-column shell and styling.

## Testing
- `npm run build` (passes; Vite warns that Node ≥20.19 is recommended—current runtime is 20.13.1).
- Could not run `npm run dev` for browser testing because the environment guidelines forbid starting local servers; please run it locally if you need interactive verification.

## Next Steps
- Run `npm install` (already done here) and `npm run dev` locally to interact with the POC; confirm drawing flows and background uploads in your browser.
- Consider upgrading Node to ≥20.19 to avoid the Vite engine warning.
- Future enhancements: persist stands as JSON, add snapping/rotation, and integrate pricing logic once SAP/payment requirements are defined.

```typescriptreact
if (mode === 'polygon') {
  if (event.evt.detail === 2 && polygonPoints.length >= 6) {
    commitStand({
      id: crypto.randomUUID(),
      type: 'polygon',
      points: polygonPoints,
      color: zoneColor,
    })
    return
  }
  setPolygonPoints((points) => [...points, pos.x, pos.y])
  return
}
```

---

**User**

bien. antes de hacer mas cambios, have un git ignore 

---

**Cursor**

```ignore
# Dependencies
node_modules/

# Build output
dist/

# Editor / OS
.DS_Store
*.log
*.local

# Env / tooling
.env
.env.*
*.tsbuildinfo

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

Agregué `feria-map-poc/.gitignore` con las exclusiones básicas del proyecto React (node_modules, dist, logs, .DS_Store, archivos de entorno y cachés de TypeScript). Ya no deberían aparecer en `git status`. Si necesitás ignorar algo más (ej. directorios compartidos del repo raíz), avisame y lo sumamos.

---

**User**

perfecto, ahora me gustaria agregar un par de cosas



- distinguir 'zonas' de 'stands' 

- que las zonas siempre queden por abajo de los stands cuando los dibujo

- que haya tamaños de stands predeterminados

- que a los stands, en la columna de la derecha les pueda cambiar el nombre  

---

**Cursor**

1. ¿Cómo imaginas las zonas?  
   - a) Se dibujan como figuras (rect/polígono/tra zo libre) con un modo “Zona” independiente  
   - b) Prefiero sólo pintarlas con una herramienta tipo “cubeta” sobre stands existentes  

2. ¿Qué tamaños predefinidos de stand necesitás?  
   - a) Tres tamaños (p. ej. 2x2, 3x2, 4x3 m)  
   - b) Especifico yo los valores exactos (decime cuáles)

---

**User**

1. que las zonas se dibujen como los stands, pero q no sean stands, sino zonas, digamos su propia clase 

2. si, por ahora pone 3 tamaños, mas adelante vemos 

---

**Cursor**

```css
.app-shell {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 1.5rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace__header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.45);
}

.workspace__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.workspace__header p {
  margin: 0;
  color: #475467;
}

.workspace__tips {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: #475467;
  font-size: 0.9rem;
  display: grid;
  gap: 0.3rem;
}

.workspace__canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf0f5;
  display: flex;
}

.canvas-shell {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 540px;
}

.canvas-stage {
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #e6e8ec;
  background: repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    );
}

.toolbar,
.inspector {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.toolbar__section,
.inspector__header,
.inspector__list,
.inspector__empty {
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.toolbar__title {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #1d2939;
}

.toolbar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.toolbar__button {
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #1f2937;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__button--ghost {
  background: #ffffff;
}

.toolbar__button--danger {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar__button--active {
  background: #1d4ed8;
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.toolbar__color-picker {
  width: 100%;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
}

.toolbar__swatches {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toolbar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toolbar__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475467;
}

.toolbar__upload input {
  margin-top: 0.35rem;
}

.toolbar__stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.inspector__empty {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.inspector__list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector__item {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__item--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.inspector__item-main {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
}

.inspector__badge {
  text-transform: uppercase;
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.inspector__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__meta {
  color: #475467;
  font-size: 0.85rem;
}

.inspector__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__color input {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.inspector__delete {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

@media (max-width: 1200px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .inspector {
    position: static;
  }

  .canvas-shell {
    height: 480px;
  }
}

```

```typescript
import { create } from 'zustand'

export type DrawingMode =
  | 'select'
  | 'stand-rect'
  | 'stand-polygon'
  | 'stand-free'
  | 'stand-paint'
  | 'zone-rect'
  | 'zone-polygon'
  | 'zone-free'

export type BaseShape = {
  id: string
  color: string
  label?: string
}

export type RectShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonShape = BaseShape & {
  kind: 'polygon'
  points: number[]
}

export type FreeShape = BaseShape & {
  kind: 'free'
  points: number[]
}

export type Stand = RectShape | PolygonShape | FreeShape
export type Zone = RectShape | PolygonShape | FreeShape

export type RectPreset = {
  id: string
  label: string
  width: number
  height: number
}

type StandStore = {
  stands: Stand[]
  zones: Zone[]
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]
  addStand: (stand: Stand) => void
  addZone: (zone: Zone) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  setMode: (mode: DrawingMode) => void
  setColor: (color: string) => void
  selectStand: (id: string | null) => void
  removeStand: (id: string) => void
  removeZone: (id: string) => void
  clearAll: () => void
  undoLast: () => void
  setRectPreset: (id: string | null) => void
  getRectPreset: () => RectPreset | null
}

const DEFAULT_PRESETS: RectPreset[] = [
  { id: 'small', label: '2 x 2 m', width: 160, height: 160 },
  { id: 'medium', label: '3 x 2 m', width: 240, height: 160 },
  { id: 'large', label: '4 x 3 m', width: 320, height: 240 },
]

export const useStandStore = create<StandStore>((set, get) => ({
  stands: [],
  zones: [],
  selectedStandId: null,
  mode: 'stand-rect',
  color: '#ffb703',
  rectPresetId: 'medium',
  presets: DEFAULT_PRESETS,
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      selectedStandId: stand.id,
    })),
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? ({ ...stand, ...updates } as Stand) : stand,
      ),
    })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === id ? ({ ...zone, ...updates } as Zone) : zone,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setColor: (color) => set({ color }),
  selectStand: (id) => set({ selectedStandId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
  clearAll: () => set({ stands: [], zones: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => {
      if (state.stands.length === 0 && state.zones.length === 0) {
        return state
      }
      if (state.stands.length >= state.zones.length) {
        const nextStands = state.stands.slice(0, -1)
        const removed = state.stands[state.stands.length - 1]
        return {
          stands: nextStands,
          selectedStandId:
            state.selectedStandId === removed?.id ? null : state.selectedStandId,
        }
      }
      return {
        zones: state.zones.slice(0, -1),
      }
    }),
  setRectPreset: (id) => set({ rectPresetId: id }),
  getRectPreset: () =>
    get().presets.find((preset) => preset.id === get().rectPresetId) ?? null,
}))

```

```typescript
*** Begin Patch
*** Update File: /Users/coru/Desktop/ProyectoFinal/front2/feria-map-poc/src/store/standStore.ts
@@
-export type DrawingMode =
-  | 'select'
-  | 'stand-rect'
-  | 'stand-polygon'
-  | 'stand-free'
-  | 'stand-paint'
-  | 'zone-rect'
-  | 'zone-polygon'
-  | 'zone-free'
+export type DrawingMode =
+  | 'select'
+  | 'stand-rect'
+  | 'stand-polygon'
+  | 'stand-free'
+  | 'stand-paint'
+  | 'zone-rect'
+  | 'zone-polygon'
+  | 'zone-free'
+  | 'zone-paint'
@@
 type StandStore = {
   stands: Stand[]
   zones: Zone[]
+  history: Array<{ type: 'stand' | 'zone'; id: string }>
   selectedStandId: string | null
   mode: DrawingMode
   color: string
@@
   presets: RectPreset[]
@@
   addStand: (stand: Stand) => void
   addZone: (zone: Zone) => void
@@
   clearAll: () => void
   undoLast: () => void
@@
 export const useStandStore = create<StandStore>((set, get) => ({
   stands: [],
   zones: [],
+  history: [],
   selectedStandId: null,
   mode: 'stand-rect',
@@
   addStand: (stand) =>
     set((state) => ({
       stands: [...state.stands, stand],
+      history: [...state.history, { type: 'stand', id: stand.id }],
       selectedStandId: stand.id,
     })),
   addZone: (zone) =>
     set((state) => ({
       zones: [...state.zones, zone],
+      history: [...state.history, { type: 'zone', id: zone.id }],
     })),
@@
   clearAll: () => set({ stands: [], zones: [], selectedStandId: null, history: [] }),
   undoLast: () =>
-    set((state) => {
-      if (state.stands.length === 0 && state.zones.length === 0) {
-        return state
-      }
-      if (state.stands.length >= state.zones.length) {
-        const nextStands = state.stands.slice(0, -1)
-        const removed = state.stands[state.stands.length - 1]
-        return {
-          stands: nextStands,
-          selectedStandId:
-            state.selectedStandId === removed?.id ? null : state.selectedStandId,
-        }
-      }
-      return {
-        zones: state.zones.slice(0, -1),
-      }
-    }),
+    set((state) => {
+      const history = [...state.history]
+      const last = history.pop()
+      if (!last) {
+        return state
+      }
+      if (last.type === 'stand') {
+        return {
+          history,
+          stands: state.stands.filter((stand) => stand.id !== last.id),
+          selectedStandId:
+            state.selectedStandId === last.id ? null : state.selectedStandId,
+        }
+      }
+      return {
+        history,
+        zones: state.zones.filter((zone) => zone.id !== last.id),
+      }
+    }),
*** End Patch
```

```typescript
import { create } from 'zustand'

export type DrawingMode =
  | 'select'
  | 'stand-rect'
  | 'stand-polygon'
  | 'stand-free'
  | 'stand-paint'
  | 'zone-rect'
  | 'zone-polygon'
  | 'zone-free'
  | 'zone-paint'

export type BaseShape = {
  id: string
  color: string
  label?: string
}

export type RectShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonShape = BaseShape & {
  kind: 'polygon'
  points: number[]
}

export type FreeShape = BaseShape & {
  kind: 'free'
  points: number[]
}

export type Stand = RectShape | PolygonShape | FreeShape
export type Zone = RectShape | PolygonShape | FreeShape

export type RectPreset = {
  id: string
  label: string
  width: number
  height: number
}

type StandStore = {
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]
  addStand: (stand: Stand) => void
  addZone: (zone: Zone) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  setMode: (mode: DrawingMode) => void
  setColor: (color: string) => void
  selectStand: (id: string | null) => void
  removeStand: (id: string) => void
  removeZone: (id: string) => void
  clearAll: () => void
  undoLast: () => void
  setRectPreset: (id: string | null) => void
  getRectPreset: () => RectPreset | null
}

const DEFAULT_PRESETS: RectPreset[] = [
  { id: 'small', label: '2 x 2 m', width: 160, height: 160 },
  { id: 'medium', label: '3 x 2 m', width: 240, height: 160 },
  { id: 'large', label: '4 x 3 m', width: 320, height: 240 },
]

export const useStandStore = create<StandStore>((set, get) => ({
  stands: [],
  zones: [],
  history: [],
  selectedStandId: null,
  mode: 'stand-rect',
  color: '#ffb703',
  rectPresetId: 'medium',
  presets: DEFAULT_PRESETS,
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      history: [...state.history, { type: 'stand', id: stand.id }],
      selectedStandId: stand.id,
    })),
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
      history: [...state.history, { type: 'zone', id: zone.id }],
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? ({ ...stand, ...updates } as Stand) : stand,
      ),
    })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === id ? ({ ...zone, ...updates } as Zone) : zone,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setColor: (color) => set({ color }),
  selectStand: (id) => set({ selectedStandId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
  clearAll: () => set({ stands: [], zones: [], history: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => {
      const history = [...state.history]
      const last = history.pop()
      if (!last) {
        return state
      }
      if (last.type === 'stand') {
        return {
          history,
          stands: state.stands.filter((stand) => stand.id !== last.id),
          selectedStandId:
            state.selectedStandId === last.id ? null : state.selectedStandId,
        }
      }
      return {
        history,
        zones: state.zones.filter((zone) => zone.id !== last.id),
      }
    }),
  setRectPreset: (id) => set({ rectPresetId: id }),
  getRectPreset: () =>
    get().presets.find((preset) => preset.id === get().rectPresetId) ?? null,
}))

```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(rectStart, pos, color, rectPreset)
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1

    if (shape.kind === 'rect') {
      return (
        <Rect
          key={`${subject}-${shape.id}`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleShapeClick(event, shape, subject)}
        />
      )
    }

    if (shape.kind === 'polygon') {
      return (
        <Line
          key={`${subject}-${shape.id}`}
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleShapeClick(event, shape, subject)}
        />
      )
    }

    return (
      <Line
        key={`${subject}-${shape.id}`}
        points={shape.points}
        stroke={subject === 'zone' ? '#475569' : shape.color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleShapeClick(event, shape, subject)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas


```

```typescriptreact
import type { ChangeEvent } from 'react'
import { useStandStore } from '../store/standStore'

const STAND_TOOLS = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'stand-rect', label: 'Rectángulo' },
  { id: 'stand-polygon', label: 'Polígono' },
  { id: 'stand-free', label: 'Trazo libre' },
  { id: 'stand-paint', label: 'Pintar stand' },
] as const

const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectángulo' },
  { id: 'zone-polygon', label: 'Zona polígono' },
  { id: 'zone-free', label: 'Zona libre' },
  { id: 'zone-paint', label: 'Pintar zona' },
] as const

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const color = useStandStore((state) => state.color)
  const setColor = useStandStore((state) => state.setColor)
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)
  const presets = useStandStore((state) => state.presets)
  const rectPresetId = useStandStore((state) => state.rectPresetId)
  const setRectPreset = useStandStore((state) => state.setRectPreset)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const hasShapes = stands.length + zones.length > 0

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas de stands</p>
        <div className="toolbar__grid">
          {STAND_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas de zonas</p>
        <div className="toolbar__grid">
          {ZONE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${
                mode === tool.id ? 'toolbar__button--active' : ''
              }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Tamaños de stand</p>
        <div className="toolbar__chips">
          <button
            className={`toolbar__chip ${
              rectPresetId === null ? 'toolbar__chip--active' : ''
            }`}
            onClick={() => setRectPreset(null)}
          >
            Libre
          </button>
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`toolbar__chip ${
                rectPresetId === preset.id ? 'toolbar__chip--active' : ''
              }`}
              onClick={() => setRectPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <small className="toolbar__hint">
          Con un preset activo, sólo elegís la orientación del stand al arrastrar.
        </small>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color activo</p>
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((presetColor) => (
            <button
              key={presetColor}
              className="toolbar__swatch"
              style={{ backgroundColor: presetColor }}
              onClick={() => setColor(presetColor)}
              aria-label={`Usar color ${presetColor}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={() => onBackgroundChange(undefined)}
        >
          Quitar imagen
        </button>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={undoLast}
            disabled={!hasShapes}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={!hasShapes}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar


```

```css
.app-shell {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 1.5rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace__header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.45);
}

.workspace__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.workspace__header p {
  margin: 0;
  color: #475467;
}

.workspace__tips {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: #475467;
  font-size: 0.9rem;
  display: grid;
  gap: 0.3rem;
}

.workspace__canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf0f5;
  display: flex;
}

.canvas-shell {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 540px;
}

.canvas-stage {
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #e6e8ec;
  background: repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    );
}

.toolbar,
.inspector {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.toolbar__section,
.inspector__header,
.inspector__list,
.inspector__empty {
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.toolbar__title {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #1d2939;
}

.toolbar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.toolbar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar__chip {
  border: 1px solid #d0d5dd;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__chip--active {
  border-color: #1d4ed8;
  background: rgba(29, 78, 216, 0.08);
  color: #1d4ed8;
}

.toolbar__hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #667085;
}

.toolbar__button {
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #1f2937;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__button--ghost {
  background: #ffffff;
}

.toolbar__button--danger {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar__button--active {
  background: #1d4ed8;
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.toolbar__color-picker {
  width: 100%;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
}

.toolbar__swatches {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toolbar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toolbar__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475467;
}

.toolbar__upload input {
  margin-top: 0.35rem;
}

.toolbar__stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.inspector__empty {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.inspector__list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector__item {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__item--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.inspector__item-main {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
}

.inspector__badge {
  text-transform: uppercase;
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.inspector__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__meta {
  color: #475467;
  font-size: 0.85rem;
}

.inspector__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__color input {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.inspector__delete {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

@media (max-width: 1200px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .inspector {
    position: static;
  }

  .canvas-shell {
    height: 480px;
  }
}

```

```typescriptreact
import type { Stand } from '../store/standStore'
import { useStandStore } from '../store/standStore'

const StandInspector = () => {
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const removeStand = useStandStore((state) => state.removeStand)
  const removeZone = useStandStore((state) => state.removeZone)

  const handleColorChange = (stand: Stand, color: string) => {
    updateStand(stand.id, { color })
  }

  const handleLabelChange = (stand: Stand, label: string) => {
    updateStand(stand.id, { label: label.trim() === '' ? undefined : label })
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <div>
          <p className="inspector__title">Stands</p>
          <small>{stands.length} creados</small>
        </div>
      </div>

      {stands.length === 0 ? (
        <p className="inspector__empty">
          Dibujá tus primeros stands ☝️ con las herramientas de la izquierda.
        </p>
      ) : (
        <ul className="inspector__list">
          {stands.map((stand, index) => (
            <li
              key={stand.id}
              className={`inspector__item ${
                selectedStandId === stand.id ? 'inspector__item--active' : ''
              }`}
            >
              <button
                className="inspector__item-main"
                onClick={() => selectStand(stand.id)}
              >
                <span className="inspector__item-name">
                  {stand.label ?? `Stand ${index + 1}`}
                </span>
                <span className="inspector__badge">{stand.kind}</span>
              </button>

              <div className="inspector__item-body">
                <label className="inspector__field">
                  Nombre
                  <input
                    className="inspector__input"
                    placeholder={`Stand ${index + 1}`}
                    value={stand.label ?? ''}
                    onChange={(event) =>
                      handleLabelChange(stand, event.target.value)
                    }
                  />
                </label>
                <div className="inspector__meta">
                  <span>{formatStandMeta(stand)}</span>
                </div>
                <label className="inspector__color">
                  Color
                  <input
                    type="color"
                    value={stand.color}
                    onChange={(event) =>
                      handleColorChange(stand, event.target.value)
                    }
                  />
                </label>
                <button
                  className="inspector__delete"
                  onClick={() => removeStand(stand.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="inspector__zones">
        <p className="inspector__title">Zonas ({zones.length})</p>
        {zones.length === 0 ? (
          <p className="inspector__empty inspector__empty--compact">
            Aún no marcaste zonas.
          </p>
        ) : (
          <ul className="inspector__zone-list">
            {zones.map((zone, index) => (
              <li key={zone.id} className="inspector__zone-row">
                <span
                  className="inspector__zone-dot"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="inspector__zone-label">Zona {index + 1}</span>
                <button
                  className="inspector__zone-delete"
                  onClick={() => removeZone(zone.id)}
                  aria-label="Eliminar zona"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

const formatStandMeta = (stand: Stand) => {
  if (stand.kind === 'rect') {
    return `${Math.round(stand.width)}×${Math.round(stand.height)} px`
  }
  if (stand.kind === 'free') {
    return `${Math.round(stand.points.length / 2)} pts`
  }
  return `${Math.round(stand.points.length / 2)} vértices`
}

export default StandInspector


```

```css
.app-shell {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 1.5rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace__header {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.45);
}

.workspace__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.workspace__header p {
  margin: 0;
  color: #475467;
}

.workspace__tips {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: #475467;
  font-size: 0.9rem;
  display: grid;
  gap: 0.3rem;
}

.workspace__canvas {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px #edf0f5;
  display: flex;
}

.canvas-shell {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 540px;
}

.canvas-stage {
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #e6e8ec;
  background: repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12),
      rgba(148, 163, 184, 0.12) 1px,
      transparent 1px,
      transparent 24px
    );
}

.toolbar,
.inspector {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.toolbar__section,
.inspector__header,
.inspector__list,
.inspector__empty {
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.toolbar__title {
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #1d2939;
}

.toolbar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.toolbar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar__chip {
  border: 1px solid #d0d5dd;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__chip--active {
  border-color: #1d4ed8;
  background: rgba(29, 78, 216, 0.08);
  color: #1d4ed8;
}

.toolbar__hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #667085;
}

.toolbar__button {
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #1f2937;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar__button--ghost {
  background: #ffffff;
}

.toolbar__button--danger {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar__button--active {
  background: #1d4ed8;
  color: #ffffff;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.toolbar__color-picker {
  width: 100%;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
}

.toolbar__swatches {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toolbar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.toolbar__upload {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475467;
}

.toolbar__upload input {
  margin-top: 0.35rem;
}

.toolbar__stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.inspector__empty {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.inspector__list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector__item {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__item--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.inspector__item-main {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
}

.inspector__badge {
  text-transform: uppercase;
  font-size: 0.7rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.inspector__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__input {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  font-family: inherit;
}

.inspector__meta {
  color: #475467;
  font-size: 0.85rem;
}

.inspector__color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__color input {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.inspector__delete {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.inspector__zones {
  margin-top: 1rem;
  background: #ffffff;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.8);
}

.inspector__zone-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inspector__zone-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #e7eaf0;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
}

.inspector__zone-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.2);
}

.inspector__zone-label {
  flex: 1;
  font-size: 0.85rem;
  color: #475467;
}

.inspector__zone-delete {
  border: none;
  background: transparent;
  color: #c53030;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.25rem;
}

.inspector__empty--compact {
  margin: 0;
  font-size: 0.85rem;
}

@media (max-width: 1200px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .inspector {
    position: static;
  }

  .canvas-shell {
    height: 480px;
  }
}

```

```typescriptreact
import { useState } from 'react'
import StandCanvas from './components/StandCanvas'
import StandInspector from './components/StandInspector'
import Toolbar from './components/Toolbar'
import './App.css'

function App() {
  const [backgroundSrc, setBackgroundSrc] = useState<string>()

  return (
    <div className="app-shell">
      <Toolbar onBackgroundChange={setBackgroundSrc} />

      <main className="workspace">
        <header className="workspace__header">
          <div>
            <h1>Plano interactivo – Feria de Empleo</h1>
            <p>
              Cargá la imagen del predio, elegí una herramienta y dibujá los
              stands. Usá el modo pintar para etiquetar zonas con colores según
              el pricing que necesites.
            </p>
            <ul className="workspace__tips">
              <li>Rectángulo: clic y arrastrá para definir el área.</li>
              <li>Polígono: agregá vértices con clic y cerrá con doble clic.</li>
              <li>Trazo libre: mantené presionado para dibujar formas orgánicas.</li>
              <li>Pintar zona: clic sobre un stand para aplicar el color activo.</li>
              <li>Las zonas se dibujan desde la segunda sección del panel izquierdo.</li>
            </ul>
          </div>
        </header>

        <section className="workspace__canvas">
          <StandCanvas backgroundSrc={backgroundSrc} />
        </section>
      </main>

      <StandInspector />
    </div>
  )
}

export default App

```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1

    if (shape.kind === 'rect') {
      return (
        <Rect
          key={`${subject}-${shape.id}`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleShapeClick(event, shape, subject)}
        />
      )
    }

    if (shape.kind === 'polygon') {
      return (
        <Line
          key={`${subject}-${shape.id}`}
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleShapeClick(event, shape, subject)}
        />
      )
    }

    return (
      <Line
        key={`${subject}-${shape.id}`}
        points={shape.points}
        stroke={subject === 'zone' ? '#475569' : shape.color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleShapeClick(event, shape, subject)}
      />
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas


```

## Plano Interactivo
- El estado global ahora diferencia explícitamente `stands` y `zones`, guarda un historial para `undo`, expone modos de dibujo separados y agrega presets rectangulares reutilizables para tamaños estándar. También permite seleccionar color único y renombrar stands desde el store, lo que simplifica el resto de la UI.
```48:145:src/store/standStore.ts
type StandStore = {
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]
  ...
  clearAll: () => set({ stands: [], zones: [], history: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => {
      const history = [...state.history]
      const last = history.pop()
      if (!last) {
        return state
      }
      if (last.type === 'stand') {
        return {
          history,
          stands: state.stands.filter((stand) => stand.id !== last.id),
          selectedStandId:
            state.selectedStandId === last.id ? null : state.selectedStandId,
        }
      }
      return { history, zones: state.zones.filter((zone) => zone.id !== last.id) }
    }),
```

- El lienzo de Konva interpreta cada modo (`stand-*` vs `zone-*`), aplica los presets sólo a los stands rectangulares, pinta zonas con opacidad y las renderiza en una capa independiente por debajo de los stands, manteniendo la interacción según corresponda (pintar capas, seleccionar, etc.).
```32:385:src/components/StandCanvas.tsx
const stands = useStandStore((state) => state.stands)
const zones = useStandStore((state) => state.zones)
...
if (modeMeta.tool === 'polygon') {
  if (event.evt.detail === 2) {
    const nextPoints = [...polygonPoints, pos.x, pos.y]
    if (nextPoints.length >= 6) {
      commitShape(
        { id: crypto.randomUUID(), kind: 'polygon', points: nextPoints, color },
        draftContext?.subject ?? modeMeta.subject,
      )
    }
    return
  }
  ...
}
...
<Layer>
  {zones.map((zone) => renderShape(zone, 'zone'))}
</Layer>
<Layer>
  {stands.map((stand) => renderShape(stand, 'stand'))}
  {rectDraft && <Rect ... />}
```

- La barra lateral separa herramientas de stands y zonas, incorpora chips para elegir tamaños predefinidos (o modo libre) y mantiene los selectores de color/carga de imágenes junto con acciones globales.
```4:175:src/components/Toolbar.tsx
const STAND_TOOLS = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'stand-rect', label: 'Rectángulo' },
  ...
]
const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectángulo' },
  ...
]
...
<div className="toolbar__section">
  <p className="toolbar__title">Tamaños de stand</p>
  <div className="toolbar__chips">
    <button className={`toolbar__chip ${rectPresetId === null ? 'toolbar__chip--active' : ''}`}
            onClick={() => setRectPreset(null)}>
      Libre
    </button>
    {presets.map((preset) => (
      <button key={preset.id}
              className={`toolbar__chip ${rectPresetId === preset.id ? 'toolbar__chip--active' : ''}`}
              onClick={() => setRectPreset(preset.id)}>
        {preset.label}
      </button>
    ))}
```

- El inspector permite renombrar stands in-place, seguir editando color/dimensiones, eliminar nodos y, en la misma columna, listar las zonas con un indicador de color y la opción de removerlas, reforzando la separación visual entre ambos tipos.
```4:116:src/components/StandInspector.tsx
<label className="inspector__field">
  Nombre
  <input
    className="inspector__input"
    placeholder={`Stand ${index + 1}`}
    value={stand.label ?? ''}
    onChange={(event) => handleLabelChange(stand, event.target.value)}
  />
</label>
...
<section className="inspector__zones">
  <p className="inspector__title">Zonas ({zones.length})</p>
  {zones.length === 0 ? (
    <p className="inspector__empty inspector__empty--compact">Aún no marcaste zonas.</p>
  ) : (
    <ul className="inspector__zone-list">
      {zones.map((zone, index) => (
        <li key={zone.id} className="inspector__zone-row">
          <span className="inspector__zone-dot" style={{ backgroundColor: zone.color }} />
          <span className="inspector__zone-label">Zona {index + 1}</span>
          <button className="inspector__zone-delete" onClick={() => removeZone(zone.id)}>×</button>
        </li>
      ))}
    </ul>
  )}
</section>
```

## Testing
- `npm run build` (aprobado; Vite advierte que requiere Node >= 20.19, el entorno actual usa 20.13.1).

Si volvés a clonar el repo, ejecutá `npm install` en `feria-map-poc/` antes de `npm run dev`. Considerá actualizar Node cuando puedas para eliminar la advertencia de Vite.

```typescript
type StandStore = {
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]
  ...
  clearAll: () => set({ stands: [], zones: [], history: [], selectedStandId: null }),
  undoLast: () =>
    set((state) => {
      const history = [...state.history]
      const last = history.pop()
      if (!last) {
        return state
      }
      if (last.type === 'stand') {
        return {
          history,
          stands: state.stands.filter((stand) => stand.id !== last.id),
          selectedStandId:
            state.selectedStandId === last.id ? null : state.selectedStandId,
        }
      }
      return { history, zones: state.zones.filter((zone) => zone.id !== last.id) }
    }),
```

```typescriptreact
const stands = useStandStore((state) => state.stands)
const zones = useStandStore((state) => state.zones)
...
if (modeMeta.tool === 'polygon') {
  if (event.evt.detail === 2) {
    const nextPoints = [...polygonPoints, pos.x, pos.y]
    if (nextPoints.length >= 6) {
      commitShape(
        { id: crypto.randomUUID(), kind: 'polygon', points: nextPoints, color },
        draftContext?.subject ?? modeMeta.subject,
      )
    }
    return
  }
  ...
}
...
<Layer>
  {zones.map((zone) => renderShape(zone, 'zone'))}
</Layer>
<Layer>
  {stands.map((stand) => renderShape(stand, 'stand'))}
  {rectDraft && <Rect ... />}
```

```typescriptreact
const STAND_TOOLS = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'stand-rect', label: 'Rectángulo' },
  ...
]
const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectángulo' },
  ...
]
...
<div className="toolbar__section">
  <p className="toolbar__title">Tamaños de stand</p>
  <div className="toolbar__chips">
    <button className={`toolbar__chip ${rectPresetId === null ? 'toolbar__chip--active' : ''}`}
            onClick={() => setRectPreset(null)}>
      Libre
    </button>
    {presets.map((preset) => (
      <button key={preset.id}
              className={`toolbar__chip ${rectPresetId === preset.id ? 'toolbar__chip--active' : ''}`}
              onClick={() => setRectPreset(preset.id)}>
        {preset.label}
      </button>
    ))}
```

```typescriptreact
<label className="inspector__field">
  Nombre
  <input
    className="inspector__input"
    placeholder={`Stand ${index + 1}`}
    value={stand.label ?? ''}
    onChange={(event) => handleLabelChange(stand, event.target.value)}
  />
</label>
...
<section className="inspector__zones">
  <p className="inspector__title">Zonas ({zones.length})</p>
  {zones.length === 0 ? (
    <p className="inspector__empty inspector__empty--compact">Aún no marcaste zonas.</p>
  ) : (
    <ul className="inspector__zone-list">
      {zones.map((zone, index) => (
        <li key={zone.id} className="inspector__zone-row">
          <span className="inspector__zone-dot" style={{ backgroundColor: zone.color }} />
          <span className="inspector__zone-label">Zona {index + 1}</span>
          <button className="inspector__zone-delete" onClick={() => removeZone(zone.id)}>×</button>
        </li>
      ))}
    </ul>
  )}
</section>
```

---

**User**

espectcuar!

ahora quiero q al usar la herramienta de selecion, puedas mover los stands

---

**Cursor**

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const dx = node.x()
    const dy = node.y()
    node.position({ x: 0, y: 0 })

    if (dx === 0 && dy === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + dx, y: shape.y + dy })
      return
    }

    const nextPoints = translatePoints(shape.points, dx, dy)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1

    const dragProps =
      subject === 'stand' && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    if (shape.kind === 'rect') {
      return (
        <Rect
          key={`${subject}-${shape.id}`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        />
      )
    }

    if (shape.kind === 'polygon') {
      return (
        <Line
          key={`${subject}-${shape.id}`}
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        />
      )
    }

    return (
      <Line
        key={`${subject}-${shape.id}`}
        points={shape.points}
        stroke={subject === 'zone' ? '#475569' : shape.color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleShapeClick(event, shape, subject)}
        {...dragProps}
      />
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas

const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))


```

## Stands Drag & Drop
- Activar la herramienta `Seleccionar` ahora permite arrastrar cualquier stand rect, polígono o trazo libre. Cada figura se vuelve `draggable`, selecciona el stand al comenzar el drag y, al soltar, se re-escriben `x/y` o los `points` según corresponda, manteniendo las zonas fijas y siempre debajo de los stands.
```242:318:src/components/StandCanvas.tsx
const dragProps =
  subject === 'stand' && canDragStand
    ? {
        draggable: true,
        onDragStart: () => selectStand(shape.id),
        onDragEnd: (event) => handleStandDragEnd(event, shape as Stand),
      }
    : {}
```
- El handler `handleStandDragEnd` calcula el delta del nodo de Konva, resetea la posición visual y aplica el desplazamiento a las propiedades persistidas usando `updateStand`. Para líneas/polígonos se reutiliza `translatePoints` para ajustar todos los vértices.
```200:219:src/components/StandCanvas.tsx
const handleStandDragEnd = (event, shape) => {
  const node = event.target
  const dx = node.x()
  const dy = node.y()
  node.position({ x: 0, y: 0 })
  if (shape.kind === 'rect') {
    updateStand(shape.id, { x: shape.x + dx, y: shape.y + dy })
    return
  }
  const nextPoints = translatePoints(shape.points, dx, dy)
  updateStand(shape.id, { points: nextPoints })
}
```

## Testing
- `npm run build` (OK; mismo aviso de Vite sobre Node 20.13.1 < 20.19).  
Para validar el drag visualmente, ejecutá `npm run dev`, elegí `Seleccionar` y arrastrá cualquier stand; zonas permanecen en su lugar.

```typescriptreact
const dragProps =
  subject === 'stand' && canDragStand
    ? {
        draggable: true,
        onDragStart: () => selectStand(shape.id),
        onDragEnd: (event) => handleStandDragEnd(event, shape as Stand),
      }
    : {}
```

```typescriptreact
const handleStandDragEnd = (event, shape) => {
  const node = event.target
  const dx = node.x()
  const dy = node.y()
  node.position({ x: 0, y: 0 })
  if (shape.kind === 'rect') {
    updateStand(shape.id, { x: shape.x + dx, y: shape.y + dy })
    return
  }
  const nextPoints = translatePoints(shape.points, dx, dy)
  updateStand(shape.id, { points: nextPoints })
}
```

---

**User**

cuando los agarro y los suelto, no se quedan en donde los suelto.

parecen moverse hacia abajo y a la derecha

---

**Cursor**

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const absoluteX = node.x()
    const absoluteY = node.y()

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: absoluteX, y: absoluteY })
      return
    }

    if (absoluteX === 0 && absoluteY === 0) {
      return
    }

    const nextPoints = translatePoints(shape.points, absoluteX, absoluteY)
    updateStand(shape.id, { points: nextPoints })
    node.position({ x: 0, y: 0 })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1

    const dragProps =
      subject === 'stand' && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    if (shape.kind === 'rect') {
      return (
        <Rect
          key={`${subject}-${shape.id}`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        />
      )
    }

    if (shape.kind === 'polygon') {
      return (
        <Line
          key={`${subject}-${shape.id}`}
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        />
      )
    }

    return (
      <Line
        key={`${subject}-${shape.id}`}
        points={shape.points}
        stroke={subject === 'zone' ? '#475569' : shape.color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        onClick={(event) => handleShapeClick(event, shape, subject)}
        {...dragProps}
      />
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas

const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))


```

Los stands se “corrían” porque en el `onDragEnd` estaba usando `node.x()`/`node.y()` como si fueran deltas y los sumaba al valor previo, duplicando el desplazamiento hacia abajo/derecha. Ahora:

- Para stands rectangulares guardo directamente la posición absoluta reportada por Konva y no reinicio el nodo.
- Para polígonos/trazos libres uso esos absolutos como delta, recalculo todos los puntos con `translatePoints`, y luego sí reseteo el nodo a `(0,0)` para evitar offsets acumulados.

Probado con `npm run build` (mismos avisos de versión de Node). En `Seleccionar`, arrastrar y soltar deja cada stand exactamente donde lo soltás. Si al testear notás algo raro en líneas/polígonos, avisá y ajusto la lógica de puntos.

---

**User**

bien, ahore me gustaria q el nombre q le pongo al stand en la herramienta de la derecha se vea sobre el dibujo del stand.



---

**Cursor**

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'

    const dragProps =
      isStand && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    const shapeNode =
      shape.kind === 'rect' ? (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={!isStand || !canDragStand}
        />
      ) : (
        <Line
          points={shape.points}
          closed={shape.kind === 'polygon'}
          fill={shape.kind === 'polygon' ? shape.color : undefined}
          stroke={shape.kind === 'free' && subject === 'zone' ? '#475569' : shape.color}
          opacity={opacity}
          strokeWidth={shape.kind === 'free' ? strokeWidth : strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={shape.kind === 'free' ? 0.3 : undefined}
          listening={!isStand || !canDragStand}
        />
      )

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs = shape.points.filter((_, index) => index % 2 === 0)
  const ys = shape.points.filter((_, index) => index % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}


```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'

    const dragProps =
      isStand && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    let shapeNode: JSX.Element

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={!isStand || !canDragStand}
        />
      )
    } else if (shape.kind === 'polygon') {
      shapeNode = (
        <Line
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={!isStand || !canDragStand}
        />
      )
    } else {
      shapeNode = (
        <Line
          points={shape.points}
          stroke={subject === 'zone' ? '#475569' : shape.color}
          opacity={opacity}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening={!isStand || !canDragStand}
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs = shape.points.filter((_, index) => index % 2 === 0)
  const ys = shape.points.filter((_, index) => index % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}


```

```typescriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'

    const dragProps =
      isStand && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    let shapeNode: JSX.Element

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
      )
    } else if (shape.kind === 'polygon') {
      shapeNode = (
        <Line
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening
        />
      )
    } else {
      shapeNode = (
        <Line
          points={shape.points}
          stroke={subject === 'zone' ? '#475569' : shape.color}
          opacity={opacity}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs = shape.points.filter((_, index) => index % 2 === 0)
  const ys = shape.points.filter((_, index) => index % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}


```

```typescriptreact
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  PolygonShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'

    const dragProps =
      isStand && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    let shapeNode: ReactNode

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
      )
    } else if (shape.kind === 'polygon') {
      shapeNode = (
        <Line
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening
        />
      )
    } else {
      shapeNode = (
        <Line
          points={shape.points}
          stroke={subject === 'zone' ? '#475569' : shape.color}
          opacity={opacity}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs = shape.points.filter((_, index) => index % 2 === 0)
  const ys = shape.points.filter((_, index) => index % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}


```

```typescriptreact
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '../hooks/useElementSize'
import type {
  DrawingMode,
  FreeShape,
  PolygonShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const size = useElementSize(containerRef)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    const image = new window.Image()
    image.src = backgroundSrc
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setBackgroundImage(null)
  }, [backgroundSrc])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return null
    }
    return pointer
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      addStand(shape as Stand)
    } else {
      addZone(shape as Zone)
    }
    resetDrafts()
  }

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: crypto.randomUUID(),
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: crypto.randomUUID(),
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: crypto.randomUUID(),
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#2b2d42') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'

    const dragProps =
      isStand && canDragStand
        ? {
            draggable: true,
            onDragStart: () => selectStand(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleStandDragEnd(event, shape as Stand),
          }
        : {}

    let shapeNode: ReactNode

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
      )
    } else if (shape.kind === 'polygon') {
      shapeNode = (
        <Line
          points={shape.points}
          closed
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening
        />
      )
    } else {
      shapeNode = (
        <Line
          points={shape.points}
          stroke={subject === 'zone' ? '#475569' : shape.color}
          opacity={opacity}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div ref={containerRef} className="canvas-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        className="canvas-stage"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={size.width}
              height={size.height}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#f1f3f5"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < shape.points.length; i += 2) {
    xs.push(shape.points[i])
    ys.push(shape.points[i + 1] ?? shape.points[i])
  }
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}


```

## Stand Labels & Dragging
- Cada stand ahora se renderiza dentro de un `Group` que incluye el dibujo y, si tiene nombre, un `Text` centrado sobre su bounding box. El helper `getShapeBounds()` calcula dimensiones incluso para polígonos y trazos libres, y `renderStandLabel()` posiciona la etiqueta con sombra ligera para mantener la legibilidad.
```466:515:src/components/StandCanvas.tsx
const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
  }
  ...
}
const renderStandLabel = (shape: Stand) => {
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2
  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      align="center"
      listening={false}
      ...
    />
  )
}
```

- El grupo es el que se arrastra en modo `Seleccionar`, de modo que la etiqueta acompaña al stand mientras lo movés. Al finalizar el drag se calcula el delta a partir de `node.x()/node.y()` (trasladamos el grupo en 0,0) y se actualizan las coordenadas del stand en la store para mantenerlo alineado con la vista.
```202:232:src/components/StandCanvas.tsx
const handleStandDragEnd = (event, shape) => {
  const node = event.target
  const deltaX = node.x()
  const deltaY = node.y()
  node.position({ x: 0, y: 0 })
  if (shape.kind === 'rect') {
    updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
    return
  }
  updateStand(shape.id, { points: translatePoints(shape.points, deltaX, deltaY) })
}
...
<Group
  key={`stand-${shape.id}`}
  onClick={(event) => handleShapeClick(event, shape, subject)}
  {...dragProps}
>
  {shapeNode}
  {shape.label ? renderStandLabel(shape as Stand) : null}
</Group>
```

- `renderShape()` mantiene el comportamiento previo para zonas (sin etiquetas) y conserva los strokes de selección para stands rectangulares/poligonales, mientras que los trazos libres siguen usándose en sus colores originales. Al envolver los stands en grupos también conseguimos que el nombre reaccione a los clics (pintar/seleccionar) igual que el cuerpo del stand.

## Testing
- `npm run build` (pasa; continúa el aviso de Vite sobre Node 20.13.1 < 20.19).

Abrí `npm run dev`, poné nombre desde el inspector y deberías verlo en el plano incluso mientras arrastrás con la herramienta de selección.

```typescriptreact
const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
  }
  ...
}
const renderStandLabel = (shape: Stand) => {
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2
  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      align="center"
      listening={false}
      ...
    />
  )
}
```

```typescriptreact
const handleStandDragEnd = (event, shape) => {
  const node = event.target
  const deltaX = node.x()
  const deltaY = node.y()
  node.position({ x: 0, y: 0 })
  if (shape.kind === 'rect') {
    updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
    return
  }
  updateStand(shape.id, { points: translatePoints(shape.points, deltaX, deltaY) })
}
...
<Group
  key={`stand-${shape.id}`}
  onClick={(event) => handleShapeClick(event, shape, subject)}
  {...dragProps}
>
  {shapeNode}
  {shape.label ? renderStandLabel(shape as Stand) : null}
</Group>
```

