import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const standaloneMedia = window.matchMedia('(display-mode: standalone)')
const isStandaloneMode = () => standaloneMedia.matches || window.navigator.standalone === true

const syncStandaloneClass = () => {
  const isStandalone = isStandaloneMode()
  document.documentElement.classList.toggle('standalone-mode', isStandalone)
  document.body.classList.toggle('standalone-mode', isStandalone)
}

const canUseInnerScroll = (target) => {
  if (!(target instanceof Element)) return false

  let node = target
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node)
      const allowsYScroll = /(auto|scroll)/.test(style.overflowY)
      const hasOverflowContent = node.scrollHeight > node.clientHeight + 2

      if (allowsYScroll && hasOverflowContent) {
        return true
      }
    }

    node = node.parentElement
  }

  return false
}

const onTouchMove = (event) => {
  if (!isStandaloneMode()) return
  if (canUseInnerScroll(event.target)) return

  event.preventDefault()
}

syncStandaloneClass()
if (typeof standaloneMedia.addEventListener === 'function') {
  standaloneMedia.addEventListener('change', syncStandaloneClass)
} else if (typeof standaloneMedia.addListener === 'function') {
  standaloneMedia.addListener(syncStandaloneClass)
}

document.addEventListener('touchmove', onTouchMove, { passive: false })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
