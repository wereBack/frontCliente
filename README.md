# Front cliente – Feria de Empleo

Interfaz independiente pensada para las empresas que necesitan revisar el plano del evento, elegir un stand y simular la reserva antes del contacto comercial real. Este proyecto consume datos mockeados del plano del edificio 2 (piso principal) y persiste el estado en memoria mediante Zustand.

## Requisitos

- Node.js 20.x
- pnpm / npm 10+ (el proyecto incluye `package-lock.json`, por lo que podés usar `npm install`)

## Scripts disponibles

| Comando          | Descripción                                                |
| ---------------- | ---------------------------------------------------------- |
| `npm install`    | Instala las dependencias                                   |
| `npm run dev`    | Inicia la app en modo desarrollo (`http://localhost:5173`) |
| `npm run build`  | Genera la build de producción                              |
| `npm run preview`| Sirve la build generada para validación rápida             |

## Estructura relevante

- `src/data/floors.ts`: Metadata del plano, dimensiones de la imagen y stands mock (coordenadas, precios, amenities y estado).
- `src/store/clientStore.ts`: Estado global con piso activo, selección de stand, formulario de reserva mock y feedback.
- `src/client`: Componentes UI del flujo del cliente (`ClientApp`, mapa interactivo con React Konva, panel de detalles, formulario y listados).
- `public/floors/piso-1.jpg`: Imagen del plano utilizada como fondo del mapa.

## Flujo de uso

1. El visitante navega el plano principal y puede alternar pisos (la estructura está lista para más niveles en el futuro).
2. Selecciona un stand desde el mapa o la lista; el panel muestra precio, categoría, amenities y estado actual.
3. Completa el formulario con datos básicos de la empresa y confirma la reserva mock (se marca el stand como “Reservado” y se muestra un toast de confirmación).
4. Es posible liberar la reserva mock para volver a marcar el espacio como disponible.

> **Notas**  
> - Toda la información vive en memoria; al refrescar la página se restablecen los valores mock iniciales.  
> - Para llevar este front a producción sólo habría que reemplazar el store mock por llamadas reales al backend y sumar autenticación si el flujo lo requiere.


//Comentario para molestar a coru
