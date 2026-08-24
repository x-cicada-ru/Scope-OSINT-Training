export function escapeHtml (s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(s))
  return div.innerHTML
}

let mermaidReady = false
function initMermaid () {
  if (mermaidReady) return true
  if (typeof window.mermaid === 'undefined') return false
  try {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: "'Segoe UI', sans-serif",
      themeVariables: {
        primaryColor: '#2a2a2e',
        primaryTextColor: '#f0f0f0',
        primaryBorderColor: '#5b5b66',
        lineColor: '#8a8a95',
        secondaryColor: '#232327',
        tertiaryColor: '#202024',
        fontSize: '14px'
      },
      flowchart: { curve: 'basis', useMaxWidth: true, htmlLabels: true }
    })
    mermaidReady = true
  } catch (e) { /* stay uninitialized */ }
  return mermaidReady
}

let mermaidSeq = 0

// LLMs often emit labels like D[Step (numbered)] which break mermaid's parser.
// Wrap any unquoted label containing risky characters in double quotes.
export function sanitizeMermaidSource (src) {
  return src.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) return line
    return line.replace(/(\[|\{)([^[\]{}\n]*)(\]|\})/g, (m, open, body, close) => {
      const label = body.trim()
      if (!label || /^["'].*['"]$/.test(label)) return m
      if (/[():;?"'|\[\]]/.test(label)) {
        return `${open}"${label.replace(/"/g, "'")}"${close}`
      }
      return m
    })
  }).join('\n')
}

// Finds <pre><code class="language-mermaid"> blocks and replaces them with
// rendered SVG charts (claude.ai style). Falls back to plain code on errors.
export function renderMermaidBlocks (root) {
  if (!root || !initMermaid()) return
  const blocks = root.querySelectorAll('pre > code.language-mermaid')
  blocks.forEach(block => {
    if (block.closest('.mermaid-chart')) return // already rendered
    const pre = block.parentElement
    if (!pre) return

    const source = sanitizeMermaidSource(block.textContent)
    const holder = document.createElement('div')
    holder.className = 'mermaid-chart'
    const id = `mmd-${Date.now()}-${++mermaidSeq}`

    window.mermaid.render(id, source).then(({ svg }) => {
      holder.innerHTML = svg
      pre.parentNode.insertBefore(holder, pre)
      pre.remove()
    }).catch(err => {
      // invalid syntax after repair — keep the original code block visible
      console.warn('[mermaid] render failed:', err && err.message)
    })
  })
}

export function enhanceCodeBlocks (root) {
  if (!root) return
  const blocks = root.querySelectorAll('pre > code')
  blocks.forEach(block => {
    if (block.classList.contains('language-mermaid')) return // handled by renderMermaidBlocks
    if (block.closest('.mermaid-chart')) return
    if (typeof hljs !== 'undefined') {
      try { hljs.highlightElement(block) } catch (e) {}
    }
    const pre = block.parentElement
    if (!pre || pre.querySelector('.code-copy-btn')) return
    const btn = document.createElement('button')
    btn.className = 'code-copy-btn'
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
    btn.title = 'Copy code'
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const text = block.textContent
      try {
        await navigator.clipboard.writeText(text)
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
        }, 1500)
      } catch (e) {}
    })
    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}
