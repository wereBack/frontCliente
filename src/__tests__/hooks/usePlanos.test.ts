import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePlanos } from '../../client/hooks/usePlanos'
import { server } from '../../__mocks__/server'
import { http, HttpResponse } from 'msw'

// Mock keycloak para evitar problemas de autenticacion en tests
vi.mock('../../auth/keycloak', () => ({
  default: {
    authenticated: false,
    token: null,
    updateToken: vi.fn().mockResolvedValue(true),
  },
}))

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

describe('usePlanos', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('inicia en estado de carga', () => {
    const { result } = renderHook(() => usePlanos())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.planos).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('carga los planos exitosamente', async () => {
    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.planos).toHaveLength(1)
    expect(result.current.planos[0].id).toBe('plano-1')
    expect(result.current.planos[0].name).toBe('Plano Principal')
    expect(result.current.error).toBeNull()
  })

  it('carga los espacios del plano', async () => {
    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const plano = result.current.planos[0]
    expect(plano.spaces).toHaveLength(4)
    expect(plano.spaces[0].name).toBe('A1')
    expect(plano.spaces[0].active).toBe(true)
  })

  it('carga las zonas del plano', async () => {
    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const plano = result.current.planos[0]
    expect(plano.zones).toHaveLength(1)
    expect(plano.zones[0].name).toBe('Zona A')
    expect(plano.zones[0].price).toBe(500)
  })

  it('maneja errores de red', async () => {
    // Override handler para simular error
    server.use(
      http.get(`${API_BASE}/planos/`, () => {
        return HttpResponse.error()
      })
    )

    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.planos).toEqual([])
  })

  it('maneja errores HTTP', async () => {
    server.use(
      http.get(`${API_BASE}/planos/`, () => {
        return HttpResponse.json(
          { error: 'Error del servidor' },
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.planos).toEqual([])
  })

  it('refetch recarga los datos', async () => {
    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Cambiar el handler para devolver datos diferentes
    server.use(
      http.get(`${API_BASE}/planos/`, () => {
        return HttpResponse.json([
          {
            id: 'plano-2',
            name: 'Plano Actualizado',
            url: '/floors/piso-2.jpg',
            width: 1000,
            height: 800,
            spaces: [],
            zones: [],
          },
        ])
      })
    )

    // Ejecutar refetch
    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.planos[0].id).toBe('plano-2')
    })

    expect(result.current.planos[0].name).toBe('Plano Actualizado')
    expect(result.current.error).toBeNull()
  })

  it('refetch maneja errores correctamente', async () => {
    const { result } = renderHook(() => usePlanos())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Los datos se cargaron correctamente
    expect(result.current.planos).toHaveLength(1)

    // Cambiar handler para que falle
    server.use(
      http.get(`${API_BASE}/planos/`, () => {
        return HttpResponse.json({ error: 'Error al refrescar' }, { status: 500 })
      })
    )

    // Ejecutar refetch
    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
  })
})

