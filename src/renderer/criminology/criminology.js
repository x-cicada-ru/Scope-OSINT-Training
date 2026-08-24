import { criminologyData } from './data.js'
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

export function renderCriminology (content, prevCleanupRef) {
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;width:100%;contain:layout;">
      <div class="cve-header" style="flex-shrink:0;padding:16px 24px;">
        <div class="cve-search" id="crimSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="crimSearchInput" placeholder="Search criminology...">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="crim-filter" data-cat="technique" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">Technique</button>
          <button class="crim-filter" data-cat="tactics" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">Tactics</button>
          <button class="crim-filter" data-cat="methodology" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">Methodology</button>
          <button class="crim-filter" data-cat="theory" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">Theory</button>
        </div>
      </div>
      <div class="crim-grid" id="crimGrid"></div>
    </div>
    <div class="crim-modal" id="crimModal">
      <div class="crim-modal-backdrop"></div>
      <div class="crim-modal-content" id="crimModalContent"></div>
    </div>`

  const grid = document.getElementById('crimGrid')
  const searchInput = document.getElementById('crimSearchInput')
  const modal = document.getElementById('crimModal')
  const modalContent = document.getElementById('crimModalContent')
  let currentFilter = 'all'
  let currentData = criminologyData
  let displayedCount = 0

  const PAGE_SIZE = 50

  function renderGrid (data) {
    const slice = data.slice(0, PAGE_SIZE)
    displayedCount = slice.length
    grid.innerHTML = slice.map(d => {
      const tags = []
      if (d.obj) tags.push(d.obj)
      if (d.methods) tags.push(d.methods)
      return `<div class="crim-card" data-id="${d.id}" style="border-top:3px solid var(--text-primary);">
        <div style="padding:16px;">
          <div class="crim-card-cat">${escapeHtml(d.cat)}</div>
          <div class="crim-card-title">${escapeHtml(d.title)}</div>
          <div class="crim-card-desc">${escapeHtml(cleanMarkdown(d.desc).slice(0, 120))}...</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">
            ${tags.slice(0, 3).map(t => `<span class="crim-card-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </div>`
    }).join('')
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.crim-card')
    if (!card) return
    const id = card.dataset.id
    const item = currentData.find(d => d.id === id)
    if (item) openModal(item)
  })

  function formatDesc (text) {
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
        <button class="crim-modal-close" id="crimModalClose" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;flex-shrink:0;">&times;</button>
      </div>
      <div class="crim-modal-body" style="padding:20px 24px 24px;overflow-y:auto;max-height:70vh;">
        ${formatDesc(item.desc)}
        ${item.obj || item.methods ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);">' : ''}
          ${item.obj ? '<span style="font-size:10px;padding:3px 10px;background:var(--bg-hover);color:var(--text-muted);border-radius:6px;">' + escapeHtml(item.obj) + '</span>' : ''}
          ${item.methods ? '<span style="font-size:10px;padding:3px 10px;background:var(--bg-hover);color:var(--text-muted);border-radius:6px;">' + escapeHtml(item.methods) + '</span>' : ''}
        ${item.obj || item.methods ? '</div>' : ''}
      </div>`
    enhanceCodeBlocks(modalContent)
    modalContent.querySelector('#crimModalClose').addEventListener('click', () => modal.classList.remove('active'))
  }

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('crim-modal-backdrop')) modal.classList.remove('active')
  })

  function filterData () {
    const q = searchInput.value.toLowerCase().trim()
    let filtered = criminologyData
    if (currentFilter !== 'all') filtered = filtered.filter(d => d.cat === currentFilter)
    if (q) filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q) || (d.obj && d.obj.toLowerCase().includes(q)) || (d.methods && d.methods.toLowerCase().includes(q)))
    currentData = filtered
    renderGrid(filtered)
  }

  let searchTimer
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(filterData, 80)
  })

  document.querySelectorAll('.crim-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentFilter === btn.dataset.cat) {
        currentFilter = 'all'
        document.querySelectorAll('.crim-filter').forEach(b => { b.style.color = 'var(--text-muted)'; b.style.fontWeight = '400' })
      } else {
        document.querySelectorAll('.crim-filter').forEach(b => { b.style.color = 'var(--text-muted)'; b.style.fontWeight = '400' })
        btn.style.color = 'var(--text-primary)'; btn.style.fontWeight = '500'
        currentFilter = btn.dataset.cat
      }
      filterData()
    })
  })

  renderGrid(criminologyData)
}
