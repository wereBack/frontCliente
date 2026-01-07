import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './__mocks__/server'

// Iniciar MSW antes de todos los tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Resetear handlers despues de cada test
afterEach(() => server.resetHandlers())

// Cerrar server despues de todos los tests
afterAll(() => server.close())

