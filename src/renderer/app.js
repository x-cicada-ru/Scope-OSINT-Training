import { applyTheme } from './theme.js'
import { renderDashboard } from './dashboard.js'
import { renderAgent, renderChatHistory, renderSettings, renderSupport, renderProfile } from './sections.js'
import { renderCriminology } from './criminology/criminology.js'
import { renderOSINT } from './OSINT/renderOSINT.js'

document.addEventListener('DOMContentLoaded', () => {
  if (typeof anime !== 'undefined') {
    try {
      const logoFilter = document.querySelector('#logoFilter feTurbulence')
      const logoDispl = document.querySelector('#logoFilter feDisplacementMap')
      const logoPoly = document.getElementById('logoHexagon')
      if (logoFilter && logoDispl && logoPoly) {
        anime.animate([logoFilter, logoDispl], { baseFrequency: [0, 0.05], scale: [1, 15], alternate: true, loop: true, duration: 2000, ease: 'easeInOut' })
        anime.animate(logoPoly, { points: ['64 128 8.574 96 8.574 32 64 0 119.426 32 119.426 96', '64 68.64 8.574 100 63.446 67.68 64 4 64.554 67.68 119.426 100'], alternate: true, loop: true, duration: 1800, ease: 'easeInOut' })
      }
    } catch (e) {
      console.error('AnimateJS error:', e)
    }
  }

  const minBtn = document.querySelector('.titlebar-btn.minimize')
  const closeBtn = document.querySelector('.titlebar-btn.close')

  if (window.electronAPI) {
    minBtn.addEventListener('click', () => window.electronAPI.minimize())
    closeBtn.addEventListener('click', () => window.electronAPI.close())
  }

  const navItems = document.querySelectorAll('.nav-item')
  const userProfile = document.querySelector('.user-profile')
  let prevCleanupRef = { current: null }

  function hidePrevSection () {
    if (prevCleanupRef.current) { prevCleanupRef.current(); prevCleanupRef.current = null }
  }

  function navigateTo (label) {
    navItems.forEach(i => i.classList.remove('active'))
    hidePrevSection()

    const content = document.getElementById('content')
    content.style.cssText = ''

switch (label) {
      case 'Home':
        renderDashboard(content, prevCleanupRef)
        break
      case 'AI Agent':
        renderAgent(content, prevCleanupRef)
        break
      case 'Chat history':
        renderChatHistory(content, prevCleanupRef)
        break
      case 'Documents of Criminology':
        renderCriminology(content, prevCleanupRef)
        break
      case 'Documents of OSINT':
        renderOSINT(content, prevCleanupRef)
        break
      case 'Settings':
        renderSettings(content, prevCleanupRef)
        break
      case 'Support':
        renderSupport(content, prevCleanupRef)
        break
      case 'Profile':
        renderProfile(content, prevCleanupRef)
        break
      default:
        content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;letter-spacing:1px;">${label} — loading...</div>`
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', function () {
      navItems.forEach(i => i.classList.remove('active'))
      this.classList.add('active')
      navigateTo(this.getAttribute('data-label'))
    })
  })

  if (userProfile) {
    userProfile.addEventListener('click', () => navigateTo('Profile'))
  }

  async function loadProfile () {
    if (!window.electronAPI) return
    try {
      const user = await window.electronAPI.userRead()
      const sidebarUsername = document.getElementById('sidebarUsername')
      const sidebarEmail = document.getElementById('sidebarEmail')
      const sidebarAvatar = document.getElementById('sidebarAvatar')
      if (sidebarUsername) sidebarUsername.textContent = user.username
      if (sidebarEmail) sidebarEmail.textContent = user.email
      if (sidebarAvatar && user.avatar) {
        const img = document.createElement('img')
        img.setAttribute('src', user.avatar)
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;'
        sidebarAvatar.innerHTML = ''
        sidebarAvatar.appendChild(img)
      }
      // Cache avatar for chat bubbles
      window.__userAvatar = user.avatar || ''
    } catch (e) { console.error(e) }
  }

  loadProfile()

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]')
    if (!link) return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('?')) return
    if (e.target.closest('.browser-wrap')) return
    e.preventDefault()
    window.__pendingBrowserUrl = href
    const homeNav = document.querySelector('.nav-item[data-label="Home"]')
    if (homeNav) homeNav.click()
  })

  setTimeout(() => {
    const home = document.querySelector('.nav-item[data-label="Home"]')
    if (home) home.click()
  }, 100)
})
