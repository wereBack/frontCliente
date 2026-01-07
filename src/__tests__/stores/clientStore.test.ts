import { describe, it, expect, beforeEach } from 'vitest'
import { useClientStore } from '../../store/clientStore'

describe('clientStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useClientStore.setState({
      floorId: 'piso-1',
      selectedStandId: null,
      form: {
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        notes: '',
      },
      isSubmitting: false,
      isLoggedIn: false,
      lastAction: undefined,
    })
  })

  describe('selectFloor', () => {
    it('cambia el piso seleccionado', () => {
      const { selectFloor } = useClientStore.getState()
      selectFloor('piso-2')
      expect(useClientStore.getState().floorId).toBe('piso-2')
    })
  })

  describe('selectStand', () => {
    it('selecciona un stand', () => {
      const { selectStand } = useClientStore.getState()
      selectStand('stand-123')
      expect(useClientStore.getState().selectedStandId).toBe('stand-123')
    })

    it('deselecciona un stand con null', () => {
      useClientStore.setState({ selectedStandId: 'stand-123' })
      const { selectStand } = useClientStore.getState()
      selectStand(null)
      expect(useClientStore.getState().selectedStandId).toBeNull()
    })
  })

  describe('updateForm', () => {
    it('actualiza un campo del formulario', () => {
      const { updateForm } = useClientStore.getState()
      updateForm('companyName', 'Mi Empresa')
      expect(useClientStore.getState().form.companyName).toBe('Mi Empresa')
    })

    it('mantiene los otros campos al actualizar uno', () => {
      useClientStore.setState({
        form: {
          companyName: 'Empresa Original',
          contactName: 'Juan',
          email: 'juan@test.com',
          phone: '123456',
          notes: 'Nota',
        },
      })
      const { updateForm } = useClientStore.getState()
      updateForm('email', 'nuevo@test.com')
      const form = useClientStore.getState().form
      expect(form.companyName).toBe('Empresa Original')
      expect(form.contactName).toBe('Juan')
      expect(form.email).toBe('nuevo@test.com')
    })
  })

  describe('resetForm', () => {
    it('resetea el formulario a valores vacios', () => {
      useClientStore.setState({
        form: {
          companyName: 'Mi Empresa',
          contactName: 'Juan',
          email: 'juan@test.com',
          phone: '123456',
          notes: 'Nota importante',
        },
      })
      const { resetForm } = useClientStore.getState()
      resetForm()
      const form = useClientStore.getState().form
      expect(form.companyName).toBe('')
      expect(form.contactName).toBe('')
      expect(form.email).toBe('')
      expect(form.phone).toBe('')
      expect(form.notes).toBe('')
    })
  })

  describe('login / logout', () => {
    it('login cambia isLoggedIn a true', () => {
      const { login } = useClientStore.getState()
      login()
      expect(useClientStore.getState().isLoggedIn).toBe(true)
    })

    it('logout cambia isLoggedIn a false', () => {
      useClientStore.setState({ isLoggedIn: true })
      const { logout } = useClientStore.getState()
      logout()
      expect(useClientStore.getState().isLoggedIn).toBe(false)
    })
  })

  describe('reserveSelected', () => {
    it('retorna error si no hay stand seleccionado', async () => {
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('Seleccion')
    })

    it('retorna error si el stand ya esta reservado', async () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'reservado' },
      })
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('reservado')
    })

    it('retorna error si el stand esta bloqueado', async () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'bloqueado' },
      })
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('bloqueado')
    })

    it('requiere formulario completo si no esta logueado', async () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'disponible' },
        isLoggedIn: false,
        form: {
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          notes: '',
        },
      })
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('obligatorios')
    })

    it('reserva exitosamente con usuario logueado', async () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'disponible' },
        isLoggedIn: true,
      })
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(true)
      expect(useClientStore.getState().statuses['stand-1']).toBe('reservado')
      expect(useClientStore.getState().lastAction?.type).toBe('reserved')
    })

    it('reserva exitosamente con formulario completo', async () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'disponible' },
        isLoggedIn: false,
        form: {
          companyName: 'Mi Empresa',
          contactName: 'Juan',
          email: 'juan@test.com',
          phone: '123456',
          notes: '',
        },
      })
      const { reserveSelected } = useClientStore.getState()
      const result = await reserveSelected()
      expect(result.ok).toBe(true)
      expect(useClientStore.getState().statuses['stand-1']).toBe('reservado')
    })
  })

  describe('releaseStand', () => {
    it('retorna error si no hay stand seleccionado', () => {
      const { releaseStand } = useClientStore.getState()
      const result = releaseStand()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('Seleccion')
    })

    it('retorna error si el stand no esta reservado', () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'disponible' },
      })
      const { releaseStand } = useClientStore.getState()
      const result = releaseStand()
      expect(result.ok).toBe(false)
      expect(result.message).toContain('no est')
    })

    it('libera un stand reservado correctamente', () => {
      useClientStore.setState({
        selectedStandId: 'stand-1',
        statuses: { 'stand-1': 'reservado' },
        reservations: {
          'stand-1': {
            standId: 'stand-1',
            companyName: 'Empresa',
            contactName: 'Juan',
            email: 'j@test.com',
            phone: '123',
            notes: '',
            timestamp: new Date().toISOString(),
          },
        },
      })
      const { releaseStand } = useClientStore.getState()
      const result = releaseStand()
      expect(result.ok).toBe(true)
      expect(useClientStore.getState().statuses['stand-1']).toBe('disponible')
      expect(useClientStore.getState().reservations['stand-1']).toBeUndefined()
      expect(useClientStore.getState().lastAction?.type).toBe('released')
    })

    it('puede liberar un stand especifico por parametro', () => {
      useClientStore.setState({
        selectedStandId: 'stand-2',
        statuses: { 'stand-1': 'reservado', 'stand-2': 'disponible' },
        reservations: {
          'stand-1': {
            standId: 'stand-1',
            companyName: 'Empresa',
            contactName: 'Juan',
            email: 'j@test.com',
            phone: '123',
            notes: '',
            timestamp: new Date().toISOString(),
          },
        },
      })
      const { releaseStand } = useClientStore.getState()
      const result = releaseStand('stand-1')
      expect(result.ok).toBe(true)
      expect(useClientStore.getState().statuses['stand-1']).toBe('disponible')
    })
  })
})

