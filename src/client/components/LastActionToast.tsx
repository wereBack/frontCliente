import { formatDatetime } from '../constants'
import { useClientStore } from '../../store/clientStore'

const LastActionToast = () => {
  const lastAction = useClientStore((state) => state.lastAction)

  if (!lastAction) {
    return null
  }

  return (
    <div className="toast">
      {lastAction.type === 'reserved' ? (
        <>
          <strong>Reserva confirmada:</strong> Stand {lastAction.standId} para {lastAction.companyName}{' '}
          · {formatDatetime(lastAction.timestamp)}
        </>
      ) : (
        <>
          <strong>Stand liberado:</strong> {lastAction.standId} volvió a estar disponible ·{' '}
          {formatDatetime(lastAction.timestamp)}
        </>
      )}
    </div>
  )
}

export default LastActionToast


