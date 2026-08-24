// ─────────────────────────────────────────────────────────────
//  NetMind OSINT — Documents of OSINT section
//  Mirrors criminology UI: search + category filters + cards
//  Data: real markdown manuals from src/renderer/OSINT/
// ─────────────────────────────────────────────────────────────

import { osintData } from './osintData.js'
import { escapeHtml, enhanceCodeBlocks } from '../utils.js'

function cleanMarkdown (text) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*{1,3}|_{1,3}|~~|`{1,3})(.*?)\1/g, '$2')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
}

const CATEGORIES = [...new Set(osintData.map(d => d.cat))]

export function renderOSINT (content) {
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;width:100%;contain:layout;">
      <div class="cve-header" style="flex-shrink:0;padding:16px 24px;">
        <div class="cve-search" id="osintSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="osintSearchInput" placeholder="Search OSINT manuals...">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${CATEGORIES.map(cat => `<button class="crim-filter" data-cat="${escapeHtml(cat)}" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">${escapeHtml(cat)}</button>`).join('')}
        </div>
      </div>
      <div class="crim-grid" id="osintGrid"></div>
    </div>
    <div class="crim-modal" id="osintModal">
      <div class="crim-modal-backdrop"></div>
      <div class="crim-modal-content" id="osintModalContent"></div>
    </div>`

  const grid = document.getElementById('osintGrid')
  const searchInput = document.getElementById('osintSearchInput')
  const modal = document.getElementById('osintModal')
  const modalContent = document.getElementById('osintModalContent')
  let currentFilter = 'all'
  let currentData = osintData

  const PAGE_SIZE = 50

  function renderGrid (data) {
    const slice = data.slice(0, PAGE_SIZE)
    grid.innerHTML = slice.map(d => `<div class="crim-card" data-id="${escapeHtml(d.id)}" style="border-top:3px solid var(--text-primary);">
      <div style="padding:16px;">
        <div class="crim-card-cat">${escapeHtml(d.cat)}</div>
        <div class="crim-card-title">${escapeHtml(d.title)}</div>
        <div class="crim-card-desc">${escapeHtml(cleanMarkdown(d.desc).slice(0, 120))}...</div>
      </div>
    </div>`).join('')
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.crim-card')
    if (!card) return
    const item = currentData.find(d => d.id === card.dataset.id)
    if (item) openModal(item)
  })

  function formatContent (text) {
    if (typeof marked === 'undefined') {
      return text.split('\n\n').filter(Boolean).map(p => `<p style="margin:0 0 12px;font-size:13px;color:var(--text-secondary);line-height:1.8;">${escapeHtml(p)}</p>`).join('')
    }
    return marked.parse(text)
  }

  function openModal (item) {
    modal.classList.add('active')
    modalContent.innerHTML = `
      <div class="crim-modal-header" style="border-left:4px solid var(--text-primary);">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">${item.cat}</span>
            <span style="font-size:9px;padding:1px 8px;border-radius:4px;background:var(--bg-hover);color:var(--text-primary);font-family:'Cascadia Code','Fira Code',monospace;font-weight:600;letter-spacing:0.3px;">${escapeHtml(item.id)}</span>
          </div>
          <h2 class="crim-modal-title" style="margin:0;font-size:16px;font-weight:500;color:var(--text-primary);">${escapeHtml(item.title)}</h2>
        </div>
        <button class="crim-modal-close" id="osintModalClose" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;flex-shrink:0;">&times;</button>
      </div>
      <div class="crim-modal-body" style="padding:20px 24px 24px;overflow-y:auto;">
        ${formatContent(item.content)}
      </div>`
    enhanceCodeBlocks(modalContent)
    modalContent.querySelector('#osintModalClose').addEventListener('click', () => modal.classList.remove('active'))
    modalContent.scrollTop = 0
  }

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('crim-modal-backdrop')) modal.classList.remove('active')
  })

  function filterData () {
    const q = searchInput.value.toLowerCase().trim()
    let filtered = osintData
    if (currentFilter !== 'all') filtered = filtered.filter(d => d.cat === currentFilter)
    if (q) filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q) || d.cat.toLowerCase().includes(q))
    currentData = filtered
    renderGrid(filtered)
  }

  let searchTimer
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(filterData, 80)
  })

  document.querySelectorAll('#content .crim-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentFilter === btn.dataset.cat) {
        currentFilter = 'all'
        document.querySelectorAll('#content .crim-filter').forEach(b => { b.style.color = 'var(--text-muted)'; b.style.fontWeight = '400' })
      } else {
        document.querySelectorAll('#content .crim-filter').forEach(b => { b.style.color = 'var(--text-muted)'; b.style.fontWeight = '400' })
        btn.style.color = 'var(--text-primary)'; btn.style.fontWeight = '500'
        currentFilter = btn.dataset.cat
      }
      filterData()
    })
  })

  renderGrid(osintData)
}
