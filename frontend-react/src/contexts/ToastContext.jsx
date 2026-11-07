import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TYPE_COLOR = { success: '#68d391', error: '#fc8181', warning: '#f6c35a' }
const TYPE_PREFIX = { success: '✓ ', error: '✗ ', warning: '⚠ ' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{ background: 'rgba(8,18,42,0.95)', border: `1px solid ${TYPE_COLOR[t.type]}44`, color: TYPE_COLOR[t.type] }}
          >
            {TYPE_PREFIX[t.type]}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Returns the toast(message, type) function — same call signature as the old app.js.
export function useToast() {
  return useContext(ToastContext)
}
