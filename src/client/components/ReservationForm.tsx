import { useState, type FormEvent } from 'react'
import { useClientStore } from '../../store/clientStore'

const ReservationForm = () => {
  const [feedback, setFeedback] = useState<string | null>(null)
  const selectedStandId = useClientStore((state) => state.selectedStandId)
  const form = useClientStore((state) => state.form)
  const isSubmitting = useClientStore((state) => state.isSubmitting)
  const updateForm = useClientStore((state) => state.updateForm)
  const reserveSelected = useClientStore((state) => state.reserveSelected)
  const lastAction = useClientStore((state) => state.lastAction)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await reserveSelected()
    setFeedback(result.message)
  }

  return (
    <form className="panel-card" onSubmit={handleSubmit}>
      <header className="panel-card__header">
        <div>
          <p className="stand-label">Reservar</p>
          <p className="stand-title">Datos de tu empresa</p>
        </div>
        {selectedStandId ? <span className="stand-pill">Stand {selectedStandId}</span> : null}
      </header>

      <div className="form-grid">
        <label>
          Empresa*
          <input
            name="companyName"
            value={form.companyName}
            onChange={(event) => updateForm('companyName', event.target.value)}
            placeholder="Nombre legal o comercial"
          />
        </label>

        <label>
          Contacto principal*
          <input
            name="contactName"
            value={form.contactName}
            onChange={(event) => updateForm('contactName', event.target.value)}
            placeholder="Nombre y apellido"
          />
        </label>

        <label>
          Email corporativo*
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => updateForm('email', event.target.value)}
            placeholder="contacto@empresa.com"
          />
        </label>

        <label>
          Teléfono*
          <input
            name="phone"
            value={form.phone}
            onChange={(event) => updateForm('phone', event.target.value)}
            placeholder="+54 11 ..."
          />
        </label>

        <label className="full">
          Comentarios
          <textarea
            name="notes"
            rows={3}
            value={form.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            placeholder="¿Necesitás algo especial para el stand?"
          />
        </label>
      </div>

      {feedback ? <p className="form-feedback">{feedback}</p> : null}
      {lastAction?.type === 'reserved' && lastAction.standId === selectedStandId ? (
        <p className="form-success">✔ {lastAction.companyName} reservado</p>
      ) : null}

      <button type="submit" className="primary-btn" disabled={!selectedStandId || isSubmitting}>
        {isSubmitting ? 'Confirmando...' : 'Confirmar reserva mock'}
      </button>
    </form>
  )
}

export default ReservationForm


