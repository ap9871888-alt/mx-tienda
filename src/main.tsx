// tipografías incluidas en el juego (no se descargan de internet)
import '@fontsource/archivo-black/latin-400.css'
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './index.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// app instalable: solo en la versión publicada (no en el archivo único)
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !document.querySelector('script[type=module]:not([src])')) navigator.serviceWorker.register('./sw.js').catch(() => {})
