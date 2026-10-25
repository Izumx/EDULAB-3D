import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled (with Cyrillic) so the app looks right without internet access
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/unbounded/500.css'
import '@fontsource/unbounded/600.css'
import '@fontsource/unbounded/700.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
