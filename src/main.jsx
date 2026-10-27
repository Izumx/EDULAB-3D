import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled (with Cyrillic) so the app looks right without internet access
import '@fontsource/nunito/500.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/nunito/900.css'
import './styles/global.css'
import App from './App.jsx'

// Hand emulation for development and automated tests (no camera needed)
if (import.meta.env.DEV) import('./hand/devHand.js')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
