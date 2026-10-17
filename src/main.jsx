import React from 'react'
import ReactDOM from 'react-dom/client'
import AudioStudio from './AudioStudio'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AudioStudio />
  </React.StrictMode>,
)

// Sin conexión: el service worker solo se registra en producción (en desarrollo estorba al recargar)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
