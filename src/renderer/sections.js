import { escapeHtml, enhanceCodeBlocks, renderMermaidBlocks } from './utils.js'
import { THEMES, applyTheme } from './theme.js'

const MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron 3 Super 120B', maxTokens: 4096, provider: 'nvidia' },
  { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', maxTokens: 4096, provider: 'nvidia' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', label: 'Nemotron Super 49B v1.5', maxTokens: 4096, provider: 'nvidia' }
]

// How many recent messages are sent to the model as context
const MAX_CONVERSATION_LENGTH = 50

const SYSTEM_PROMPT = `You are SOT Academy — a senior practitioner-instructor in OSINT and offensive security (pentesting) with over 15 years of field experience. The person you are talking to is your STUDENT. Your role is TEACHER: educate, structure, demonstrate and train. You are not a casual assistant — every reply is a lesson.

════════════════════════════════════════════════════════════════
               LANGUAGE AND TONE
════════════════════════════════════════════════════════════════

- Always respond in Russian regardless of the language of these instructions.
- Tone: professional, precise, calm — an experienced practitioner mentoring a future colleague. No flattery, no filler.
- STRICTLY FORBIDDEN: any emojis, smileys, kaomoji or decorative symbols. Plain text only.
- Never condescend. Explain seriously and thoroughly.

════════════════════════════════════════════════════════════════
               LESSON STRUCTURE (MANDATORY SKELETON)
════════════════════════════════════════════════════════════════

Every substantive answer follows this skeleton:

1. TL;DR — short direct answer in 1–3 sentences.
2. Theory — definitions (every term explained at first use), mechanics, why the technique works.
3. Methodology — step-by-step numbered procedure.
4. Diagram — MANDATORY. At least ONE Mermaid diagram in a \`\`\`mermaid fenced block visualizing the topic: process flow, data sources, architecture, kill chain or decision tree. The application renders Mermaid as a real visual chart automatically. An answer without a diagram is INCOMPLETE and unacceptable.
5. Worked example — a realistic, strictly legal lab scenario walked through end-to-end, referencing the diagram nodes where possible.
6. Tools — a Markdown table: Tool | Purpose | Platform | Link/where to get.
7. Mistakes and OPSEC — common student errors, safety and legal notes.
8. Sources — links to real articles, documentation and standards.
9. Homework — 2–3 control questions or a small exercise to check understanding.

For trivial follow-up questions a shorter form is acceptable, but always stay in teacher mode.

EXAMPLE OF THE REQUIRED DIAGRAM FORMAT (imitate this style):

\`\`\`mermaid
flowchart TD
    A["Target identifier @username"] --> B["Search engines"]
    A --> C["Public posts and channels"]
    B --> D["Cross-platform username match"]
    C --> E["Linked media: EXIF / GPS"]
    D --> F["Correlation graph"]
    E --> F
    F --> G{"Confidence"}
    G -->|HIGH| H["Identity established"]
    G -->|LOW| I["Collect more data"]
\`\`\`

════════════════════════════════════════════════════════════════
               MARKDOWN REQUIREMENTS
════════════════════════════════════════════════════════════════

Use the FULL power of Markdown in every answer:

- Headings (##, ###), **bold**, *italic*, bullet and numbered lists.
- Tables for any comparison: tools, techniques, phases, differences.
- Blockquotes (>) for important warnings, legal notes and key principles.
- Inline code (\`example\`) for commands, tool names, filenames.
- Fenced code blocks for commands, payloads, configurations and logs.
- Horizontal rules (---) between major parts of the lesson.

DIAGRAMS (Mermaid — rendered as real visual charts by the app):
- Draw ALL diagrams as Mermaid code inside \`\`\`mermaid fenced blocks. Never use ASCII art for diagrams.
- Use \`flowchart TD\` (top-down) or \`flowchart LR\` (left-right). Decision points use diamond nodes: G{"Question?"}.
- Keep node labels short (2–5 words). NEVER put parentheses, pipes, colons or quotes inside node labels. Write plain words separated by spaces or hyphens: A[Step 3 - numbered methodology].
- One diagram = one idea. For complex topics draw two diagrams under separate headings.
- The diagram must be understandable without reading the surrounding text.

LINKS:
- Cite only REAL, well-known resources: official documentation, standards (MITRE ATT&CK, OWASP, NIST), recognized portals (Bellingcat, GIJN, PortSwigger Web Security Academy, HackTricks, TryHackMe, HackTheBox, OSINT Framework).
- Safe pattern: link to the project root or section (e.g. https://owasp.org, https://attack.mitre.org) rather than deep pages.
- NEVER invent or hallucinate URLs. If unsure of the exact address — name the resource and tell the student how to find it (search query).

════════════════════════════════════════════════════════════════
               DOMAIN SCOPE
════════════════════════════════════════════════════════════════

Teach within these disciplines:

- OSINT: operational OPSEC of the investigator, SOCMINT, GEOINT, IMINT, TECHINT, SIGINT basics, FININT and cryptocurrency tracing, digital footprints, source verification and fact-checking.
- Pentesting: methodology and scoping, reconnaissance, legal framework, web application vectors, network vectors, OSINT-for-redteam, password attacks theory, reporting and documentation.
- Adjacent skills: threat modeling, MITRE ATT&CK mapping, incident analysis fundamentals, privacy engineering.

LEGALITY IS PART OF THE PROFESSION:
- All examples must target labs, test environments or publicly available open data only.
- Explicitly mark what requires authorization (scope agreement, ROE) versus what is legal for anyone.
- Teach the student to document authorization before touching anything.

════════════════════════════════════════════════════════════════
               ANSWER QUALITY BAR
════════════════════════════════════════════════════════════════

- Maximum depth by default. The student asked a question — deliver a complete lesson, not a hint.
- Always explain WHY, not only HOW: underlying mechanism, limitations, detectability, countermeasures where relevant.
- Show both attacker and defender perspectives when the topic allows.
- If the question is ambiguous — fully answer the most probable interpretation, then ask exactly ONE clarifying question at the very end.
- If a topic requires data fresher than your knowledge — say so explicitly and teach the student how to obtain and verify that data themselves.
- You have NO external tools and NO internet access: never claim you searched, scanned or verified anything online. Everything is analytical teaching from your own knowledge.

You are now SOT Academy. Teach.
`

let mdReady = false
function initMarkdown () {
  if (mdReady) return
  if (typeof window.marked === 'undefined') return
  marked.setOptions({ breaks: true, gfm: true })
  mdReady = true
}

function renderMarkdown (text) {
  initMarkdown()
  if (!mdReady) return text
  const html = marked.parse(text)
  return html
}

function animateWords (elId, words, delay) {
  const el = document.getElementById(elId)
  if (!el) return
  el.innerHTML = words.map((w, i) => `<span class="word" style="animation-delay:${delay + i * 140}ms">${w}</span> `).join('')
}

export function renderAgent (content, prevCleanupRef) {
  content.innerHTML = `
    <div class="ai-chat" id="aiChat">
      <div class="ai-chat-welcome" id="aiWelcome">
        <div class="ai-chat-logo">
          <object type="image/svg+xml" data="assets/animations/claude.svg" style="width:130px;height:130px;pointer-events:none;"></object>
        </div>
        <div class="ai-chat-greeting" id="aiGreeting"></div>
        <div class="ai-chat-sub" id="aiSub"></div>
      </div>

      <div class="ai-chat-messages" id="aiMessages" style="display:none"></div>

      <div class="ai-chat-input-wrap">
        <div class="ai-chat-input">
          <div class="ai-chat-input-inner">
            <div class="ai-chat-editor" id="chatInput" contenteditable="true" aria-label="Write your prompt" data-placeholder="Ask your SOT instructor anything"></div>
            <div class="ai-chat-tools">
              <button class="ai-newchat-btn" id="aiNewChatBtn" title="New Chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8 5.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V10a.5.5 0 0 1-1 0V8.5H6a.5.5 0 0 1 0-1h1.5V6a.5.5 0 0 1 .5-.5z"/>
                  <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/>
                </svg>
              </button>
              <div class="ai-chat-tools-spacer"></div>
              <button class="ai-chat-send" id="chatSend">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`

  let currentModelIdx = 0
  let userAvatar = window.__userAvatar || ''

  // ── Animate greeting ──
  animateWords('aiGreeting', ['Hello,', 'I\'m', 'your', 'AI', 'Agent.'], 0)
  animateWords('aiSub', ['Bring', 'me', 'anything—a', 'tough', 'problem,', 'a', 'half-formed', 'idea.', 'We\'ll', 'figure', 'it', 'out', 'together.'], 400)

  // ── Chat elements ──
  const welcome = document.getElementById('aiWelcome')
  const messages = document.getElementById('aiMessages')
  const editor = document.getElementById('chatInput')
  const send = document.getElementById('chatSend')
  const newChatBtn = document.getElementById('aiNewChatBtn')
  
  // Debug: verify elements exist
  console.log('[renderAgent] Elements found:', { 
    welcome: !!welcome, 
    messages: !!messages, 
    editor: !!editor, 
    send: !!send, 
    newChatBtn: !!newChatBtn 
  })
  
  if (!editor || !send) {
    console.error('[renderAgent] CRITICAL: editor or send button not found!')
    return
  }
  
  const cleanupHandlers = []
  let sectionActive = true

  let firstMessage = true
  let currentSessionId = null
  let conversation = []

  async function loadSessionMessages (sessionId) {
    if (!window.electronAPI) return
    const msgs = await window.electronAPI.sessionLoad(sessionId)
    if (!msgs.length) return
    welcome.style.display = 'none'
    messages.style.display = 'flex'
    firstMessage = false
    for (const m of msgs) {
      addMsg(m.role === 'assistant' ? 'ai' : 'user', m.content)
    }
  }

  if (window.__pendingSessionId) {
    currentSessionId = window.__pendingSessionId
    loadSessionMessages(currentSessionId)
    window.__pendingSessionId = null
  }

  // Focus editor on load
  setTimeout(() => {
    editor.focus()
    console.log('[renderAgent] Editor focused')
  }, 100)

  const newChatHandler = () => {
    messages.innerHTML = ''
    messages.style.display = 'none'
    welcome.style.display = 'flex'
    firstMessage = true
    currentSessionId = null
    conversation = []
    // Cancel any in-flight AI stream
    cancelActiveStream()
    hideTyping()
  }
  if (newChatBtn) {
    newChatBtn.addEventListener('click', newChatHandler)
    cleanupHandlers.push(() => newChatBtn.removeEventListener('click', newChatHandler))
  }

  function getEditorText () {
    const text = editor.innerText.trim()
    console.log('[getEditorText] Returning:', JSON.stringify(text))
    return text
  }

  function clearEditor () {
    editor.innerHTML = ''
  }

  function addMsg (role, text) {
    const div = document.createElement('div')
    div.className = `ai-msg ${role}`
    let avatarHtml
    if (role === 'ai') {
      avatarHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
    } else {
      avatarHtml = userAvatar
        ? `<img src="${userAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21 V19 A4 4 0 0 0 16 15 H8 A4 4 0 0 0 4 19 V21"/><circle cx="12" cy="7" r="4"/></svg>'
    }
    const content = document.createElement('div')
    content.className = 'ai-msg-content'
    if (role === 'ai') {
      content.innerHTML = renderMarkdown(text)
    } else {
      content.textContent = text
    }
    const avatarWrap = document.createElement('div')
    avatarWrap.className = 'ai-msg-avatar'
    avatarWrap.innerHTML = avatarHtml
    div.appendChild(avatarWrap)
    div.appendChild(content)
    messages.appendChild(div)

    if (role === 'ai') { enhanceCodeBlocks(content); renderMermaidBlocks(content) }
    messages.scrollTop = messages.scrollHeight
    conversation.push({ role: role === 'ai' ? 'assistant' : 'user', content: text })
    return div
  }

  function showTyping () {
    const existing = document.querySelector('.ai-typing')
    if (existing) return
    const div = document.createElement('div')
    div.className = 'ai-typing'
    div.innerHTML = `
      <div class="ai-msg-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <div class="ai-typing-dots"><span></span><span></span><span></span></div>`
    messages.appendChild(div)
    messages.scrollTop = messages.scrollHeight
  }

  function hideTyping () {
    const el = document.querySelector('.ai-typing')
    if (el) el.remove()
  }

  let sending = false

  // ── Streaming infrastructure ──
  // Each request gets a unique reqId; chunk/done events carry it back so a
  // stale stream from an abandoned request can never bleed into a new one.

  let reqSeq = 0
  let activeStream = null // { id, reject }

  function cancelActiveStream () {
    if (!activeStream) return
    const s = activeStream
    activeStream = null
    s.reject(new Error('cancelled'))
    if (window.electronAPI && window.electronAPI.nvidiaChatStop) {
      window.electronAPI.nvidiaChatStop(s.id)
    }
  }

  function streamAssistantReply (history, model) {
    return new Promise((resolve, reject) => {
      const id = ++reqSeq
      let acc = ''
      let msgDiv = null
      let settled = false

      const cleanup = () => {
        unsubChunk()
        unsubDone()
        if (activeStream && activeStream.id === id) activeStream = null
      }
      const settle = (fn, val) => {
        if (settled) return
        settled = true
        cleanup()
        fn(val)
      }

      const unsubChunk = window.electronAPI.onNvidiaChunk((payload) => {
        if (!payload || payload.id !== id || !sectionActive) return
        if (!payload.content) return
        if (!msgDiv) {
          hideTyping()
          msgDiv = addMsg('ai', '')
        }
        acc += payload.content
        const contentEl = msgDiv.querySelector('.ai-msg-content')
        if (contentEl) contentEl.innerHTML = renderMarkdown(acc)
        messages.scrollTop = messages.scrollHeight
      })

      const unsubDone = window.electronAPI.onNvidiaDone((payload) => {
        if (!payload || payload.id !== id) return
        if (msgDiv) {
          const el = msgDiv.querySelector('.ai-msg-content')
          if (el) { enhanceCodeBlocks(el); renderMermaidBlocks(el) }
        }
        settle(resolve, acc)
      })

      activeStream = { id, reject: (e) => settle(reject, e) }

      window.electronAPI.nvidiaChatStream({
        provider: model.provider,
        model: model.id,
        messages: history,
        maxTokens: model.maxTokens,
        reqId: id
      }).catch((err) => settle(reject, err))
    })
  }

  // Error bubble is rendered in the UI but NOT pushed into conversation,
  // so the model never sees our own ⚠️ service messages as its own replies.
  function addErrorBubble (text) {
    hideTyping()
    const div = document.createElement('div')
    div.className = 'ai-msg ai'
    const avatarWrap = document.createElement('div')
    avatarWrap.className = 'ai-msg-avatar'
    avatarWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
    const content = document.createElement('div')
    content.className = 'ai-msg-content'
    content.textContent = text
    div.appendChild(avatarWrap)
    div.appendChild(content)
    messages.appendChild(div)
    messages.scrollTop = messages.scrollHeight
  }

  // The streaming bubble was created via addMsg('ai', ''), which already
  // pushed an empty assistant entry — fill that entry with the final text.
  function commitAssistantText (text) {
    const last = conversation[conversation.length - 1]
    if (last && last.role === 'assistant' && !last.content) {
      conversation[conversation.length - 1] = { role: 'assistant', content: text }
    } else {
      conversation.push({ role: 'assistant', content: text })
    }
  }

  async function sendMessage () {
    if (sending || !sectionActive) return
    const text = getEditorText()
    if (!text) return

    const model = MODELS[currentModelIdx]

    if (firstMessage) {
      welcome.style.display = 'none'
      messages.style.display = 'flex'
      firstMessage = false
      if (window.electronAPI && !currentSessionId) {
        currentSessionId = await window.electronAPI.sessionCreate()
      }
    }

    sending = true
    try {
      addMsg('user', text)
      clearEditor()
      showTyping()

      // Cap history length to keep token usage bounded
      const history = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversation.slice(-MAX_CONVERSATION_LENGTH)
      ]

      let response = ''
      try {
        response = await streamAssistantReply(history, model)
      } finally {
        hideTyping()
      }

      if (!sectionActive) return

      const trimmed = response.trim()
      if (!trimmed) {
        addErrorBubble('⚠️ Модель вернула пустой ответ. Попробуйте переформулировать запрос.')
        return
      }

      commitAssistantText(trimmed)

      if (currentSessionId && window.electronAPI) {
        await window.electronAPI.sessionAppend({
          id: currentSessionId,
          messages: [
            { role: 'user', content: text, ts: Date.now() },
            { role: 'assistant', content: trimmed, ts: Date.now() }
          ]
        })
      }
    } catch (err) {
      if (!sectionActive) return
      if (err && err.message === 'cancelled') return
      const msg = (err && err.message) || 'Unknown error'
      if (msg.includes('429')) {
        addErrorBubble('⚠️ Rate limited: провайдер временно перегружен. Подождите немного и повторите.')
      } else if (msg.includes('401')) {
        addErrorBubble('⚠️ Неверный API-ключ. Проверьте ключ в main.js.')
      } else if (msg.includes('402')) {
        addErrorBubble('⚠️ Недостаточно кредитов у провайдера.')
      } else {
        addErrorBubble(`⚠️ ${msg}`)
      }
    } finally {
      sending = false
    }
  }

  send.addEventListener('click', (e) => {
    console.log('[sendButton] Click event fired')
    sendMessage()
  })
  cleanupHandlers.push(() => send.removeEventListener('click', sendMessage))

  const editorKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('[editorKeydown] Enter pressed, triggering send')
      e.preventDefault()
      send.click()
    }
  }
  editor.addEventListener('keydown', editorKeydown)
  cleanupHandlers.push(() => editor.removeEventListener('keydown', editorKeydown))

  prevCleanupRef.current = () => {
    sectionActive = false
    cancelActiveStream()
    cleanupHandlers.forEach(fn => fn())
  }
}

function formatRelativeDate (iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `\u0421\u0435\u0433\u043e\u0434\u043d\u044f, ${time}`
  if (diffDays === 1) return `\u0412\u0447\u0435\u0440\u0430, ${time}`
  if (diffDays < 7) return `${d.toLocaleDateString('ru-RU', { weekday: 'long' })}, ${time}`
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function renderChatHistory (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'

  content.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:40px 24px 60px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:28px;">
        <h1 style="font-family:'Segoe UI',sans-serif;font-size:26px;font-weight:700;color:var(--text-primary);letter-spacing:-0.3px;">\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0447\u0430\u0442\u043e\u0432</h1>
        <span style="font-family:'Consolas',monospace;font-size:12px;color:var(--text-muted);letter-spacing:0.5px;" id="sessionCount">0 \u0441\u0435\u0441\u0441\u0438\u0439</span>
      </div>

      <div style="position:relative;margin-bottom:24px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="chatSearch" type="text" placeholder="\u041d\u0430\u0439\u0442\u0438 \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0438..."
          style="width:100%;padding:11px 14px 11px 40px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:'Segoe UI',sans-serif;font-size:14px;outline:none;transition:border-color .2s var(--transition-smooth);" />
      </div>

      <div id="sessionList" style="display:flex;flex-direction:column;gap:10px;"></div>

      <div id="emptyState" style="display:none;text-align:center;padding:60px 20px;color:var(--text-muted);font-family:'Segoe UI',sans-serif;font-size:14px;">
        \u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e
      </div>
    </div>`

  const searchInput = document.getElementById('chatSearch')
  const listEl = document.getElementById('sessionList')
  const emptyEl = document.getElementById('emptyState')
  const countEl = document.getElementById('sessionCount')

  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = 'var(--accent)' })
  searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'var(--border-color)' })

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

  function cardHTML (s) {
    return `
      <div class="chat-session-card" data-id="${s.id}" style="
        display:flex;align-items:center;gap:14px;
        padding:14px 16px;background:var(--bg-tertiary);border:1px solid var(--border-color);
        border-radius:12px;cursor:pointer;transition:background .18s var(--transition-smooth), border-color .18s var(--transition-smooth);">
        <div style="flex-shrink:0;width:36px;height:36px;border-radius:9px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;color:var(--accent);">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Segoe UI',sans-serif;font-size:14.5px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(s.title)}</div>
          <div style="font-family:'Segoe UI',sans-serif;font-size:13px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(s._cleanPreview || '')}</div>
        </div>
        <div style="flex-shrink:0;text-align:right;">
          <div style="font-family:'Consolas',monospace;font-size:11.5px;color:var(--text-muted);">${formatRelativeDate(s.date)}</div>
          <div style="font-family:'Consolas',monospace;font-size:11px;color:var(--text-muted);margin-top:3px;">${s.messages} \u0441\u043e\u043e\u0431\u0449.</div>
        </div>
        <button class="chat-session-delete" data-id="${s.id}" style="
          flex-shrink:0;width:28px;height:28px;border:none;border-radius:6px;
          background:transparent;color:var(--text-muted);cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all .15s var(--transition-smooth);" title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>`
  }

  function renderList (items) {
    listEl.innerHTML = items.map(cardHTML).join('')
    emptyEl.style.display = items.length ? 'none' : 'block'
    if (countEl) countEl.textContent = `${items.length} \u0441\u0435\u0441\u0441\u0438\u0439`

    listEl.querySelectorAll('.chat-session-card').forEach(card => {
      const id = card.dataset.id
      card.addEventListener('mouseenter', () => { card.style.background = 'var(--bg-hover)'; card.style.borderColor = 'var(--accent)' })
      card.addEventListener('mouseleave', () => { card.style.background = 'var(--bg-tertiary)'; card.style.borderColor = 'var(--border-color)' })
      card.addEventListener('click', (e) => {
        if (e.target.closest('.chat-session-delete')) return
        window.__pendingSessionId = id
        const agentNav = document.querySelector('.nav-item[data-label="AI Agent"]')
        if (agentNav) agentNav.click()
      })
    })

    listEl.querySelectorAll('.chat-session-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        if (window.electronAPI) {
          await window.electronAPI.sessionDelete(id)
          window.__sessionsCache = window.__sessionsCache.filter(s => s.id !== id)
          renderList(window.__sessionsCache)
        }
      })
    })
  }

  function applyFilter () {
    const q = searchInput.value.trim().toLowerCase()
    const filtered = q
      ? window.__sessionsCache.filter(s => s.title.toLowerCase().includes(q) || (s._cleanPreview || '').toLowerCase().includes(q))
      : window.__sessionsCache
    renderList(filtered)
  }

  searchInput.addEventListener('input', applyFilter)

  if (window.electronAPI) {
    window.electronAPI.sessionList().then(sessions => {
      for (const s of sessions) {
        s._cleanPreview = s.preview ? cleanMarkdown(s.preview) : ''
      }
      window.__sessionsCache = sessions
      renderList(sessions)
    })
  }

  prevCleanupRef.current = () => {}
}

export function renderDocuments (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:40px;gap:20px;">
      <h1 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0;">Documents of Criminology</h1>
      <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-secondary);margin:0;text-align:center;max-width:600px;">Библиотека документов по криминалистике. Методички, статьи, руководства и справочные материалы.</p>
    </div>`
}

export function renderDossier (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:40px;gap:20px;">
      <h1 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0;">Create a dossier</h1>
      <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-secondary);margin:0;text-align:center;max-width:600px;">Создание досье на цель. Сбор, структурирование и экспорт разведывательных данных.</p>
    </div>`
}

export function renderGraph (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:40px;gap:20px;">
      <h1 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0;">The graph of connections</h1>
      <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-secondary);margin:0;text-align:center;max-width:600px;">Визуализация связей между объектами. Интерактивный граф отношений и взаимосвязей.</p>
    </div>`
}

export function renderSettings (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div class="settings-wrap">
      <div class="settings-head">
        <h1>Settings</h1>
        <div class="settings-tabs">
          <button data-tab="appearance">Внешний вид</button>
          <button data-tab="api">API ключи</button>
        </div>
      </div>
      <div id="settings-panel"></div>
    </div>`

  const panel = content.querySelector('#settings-panel')
  const tabs = [...content.querySelectorAll('.settings-tabs button')]

  const renderAppearance = () => {
    const active = localStorage.getItem('netmind-theme') || 'Orange'
    panel.innerHTML = `
      <p style="font-family:'Segoe UI',sans-serif;font-size:14px;color:var(--text-secondary);margin:0 0 18px 0;">Тема применяется ко всему приложению мгновенно и сохраняется автоматически.</p>
      <div class="theme-grid">
        ${THEMES.map(t => `
          <div class="theme-card${t.name === active ? ' active' : ''}" data-theme="${t.name}">
            <div class="theme-preview" style="background:${t.vars['--bg-primary']};border:1px solid ${t.vars['--border-color']};">
              <span class="theme-dot" style="background:${t.vars['--accent']}"></span>
              <span class="theme-dot" style="background:${t.vars['--bg-tertiary']}"></span>
              <span class="theme-dot" style="background:${t.vars['--bg-hover']}"></span>
            </div>
            <div class="theme-name">${t.name} ${t.name === active ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
          </div>`).join('')}
      </div>`

    panel.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        applyTheme(card.dataset.theme)
        renderAppearance()
      })
    })
  }

  const maskKey = (k) => (k && k.length > 12) ? k.slice(0, 8) + '••••••' + k.slice(-4) : 'не задан'

  const renderApiKeys = () => {
    panel.innerHTML = `
      <div class="api-card">
        <div class="api-card-head">
          <div>
            <div class="api-card-title">NVIDIA NIM</div>
            <div class="api-card-sub">integrate.api.nvidia.com — провайдер AI-инструктора</div>
          </div>
          <span class="api-badge">Активен</span>
        </div>
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:0.5px;text-transform:uppercase;display:block;margin:22px 0 8px;">API ключ</label>
        <div class="api-key-row">
          <input id="apikey-input" type="password" autocomplete="off" spellcheck="false" placeholder="nvapi-..." />
          <button id="apikey-toggle" title="Показать / скрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <p id="apikey-hint" style="font-size:13px;color:var(--text-muted);margin:10px 0 0;"></p>
        <div class="api-actions">
          <button id="apikey-save">Сохранить ключ</button>
          <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer">Получить ключ на build.nvidia.com →</a>
        </div>
        <p id="apikey-status" style="font-size:13px;margin:14px 0 0;opacity:0;transition:opacity 0.3s;"></p>
      </div>`

    const input = panel.querySelector('#apikey-input')
    const toggle = panel.querySelector('#apikey-toggle')
    const hint = panel.querySelector('#apikey-hint')
    const saveBtn = panel.querySelector('#apikey-save')
    const status = panel.querySelector('#apikey-status')

    const showStatus = (msg, color) => {
      status.textContent = msg
      status.style.color = color
      status.style.opacity = '1'
      setTimeout(() => { status.style.opacity = '0' }, 2500)
    }

    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password'
    })

    if (window.electronAPI) {
      window.electronAPI.settingsGetApiKey().then(key => {
        hint.textContent = `Текущий ключ: ${maskKey(key)}`
      })
    }

    saveBtn.addEventListener('click', async () => {
      const key = input.value.trim()
      if (!key) { showStatus('Введите ключ', '#ef5350'); return }
      if (!window.electronAPI) { showStatus('IPC недоступен', '#ef5350'); return }
      const ok = await window.electronAPI.settingsSetApiKey(key)
      if (ok) {
        input.value = ''
        showStatus('Ключ сохранён и уже активен — можно писать агенту', '#4caf50')
        window.electronAPI.settingsGetApiKey().then(k => { hint.textContent = `Текущий ключ: ${maskKey(k)}` })
      } else {
        showStatus('Неверный формат: ключ должен начинаться с nvapi-', '#ef5350')
      }
    })
  }

  const activate = (tab) => {
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab))
    if (tab === 'appearance') renderAppearance()
    else renderApiKeys()
  }

  tabs.forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)))
  activate('appearance')
}

export function renderSupport (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:40px;gap:20px;">
      <h1 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0;">Support</h1>
      <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-secondary);margin:0;text-align:center;max-width:600px;">Вопросы, баг-репорты и предложения — пишите в Telegram. Поддержка отвечает лично.</p>
      <a href="https://t.me/scope_moon" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;padding:14px 28px;border-radius:14px;background:var(--accent);color:var(--bg-primary);font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9.04 15.51l-.38 5.32c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.89L22.9 4.35c.31-1.42-.51-1.98-1.46-1.63L2.9 10.06c-1.39.54-1.37 1.31-.24 1.66l4.7 1.47L17.3 6.8c.51-.34.98-.15.6.19L9.04 15.51z"/></svg>
        @scope_moon
      </a>
    </div>`
}

export async function renderProfile (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'

  const user = window.electronAPI ? await window.electronAPI.userRead() : { username: 'CyberPunk', email: 'user@sot.app', avatar: '' }

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100%;padding:40px;">
      <div id="profile-card" style="background:var(--bg-secondary);border:1px solid rgba(255,255,255,0.04);border-radius:20px;padding:50px 60px;max-width:560px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.2);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:36px;">
          <div id="profile-avatar-wrap" style="position:relative;width:100px;height:100px;border-radius:50%;cursor:pointer;overflow:hidden;border:2px solid rgba(255,255,255,0.08);background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;">
            ${user.avatar
              ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
              : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);"><path d="M20 21 V19 A4 4 0 0 0 16 15 H8 A4 4 0 0 0 4 19 V21"/><circle cx="12" cy="7" r="4"/></svg>`
            }
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);opacity:0;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s;border-radius:50%;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <input type="file" id="avatar-input" accept="image/*" style="display:none;">
          <p style="font-size:12px;color:var(--text-muted);margin:0;">Нажмите на фото для загрузки</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:20px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:0.5px;text-transform:uppercase;display:block;margin-bottom:8px;">Имя пользователя</label>
            <input id="profile-username" type="text" value="${user.username}" style="width:100%;padding:14px 16px;background:var(--bg-tertiary);border:1px solid rgba(255,255,255,0.06);border-radius:12px;color:var(--text-primary);font-size:14px;font-family:'Segoe UI',sans-serif;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='rgba(255,255,255,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:0.5px;text-transform:uppercase;display:block;margin-bottom:8px;">Email</label>
            <input id="profile-email" type="email" value="${user.email}" style="width:100%;padding:14px 16px;background:var(--bg-tertiary);border:1px solid rgba(255,255,255,0.06);border-radius:12px;color:var(--text-primary);font-size:14px;font-family:'Segoe UI',sans-serif;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='rgba(255,255,255,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'">
          </div>
        </div>

        <button id="profile-save-btn" style="width:100%;margin-top:32px;padding:14px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:12px;font-size:15px;font-weight:600;font-family:'Segoe UI',sans-serif;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Сохранить</button>
        <p id="profile-status" style="font-size:13px;color:var(--text-muted);text-align:center;margin:12px 0 0 0;opacity:0;transition:opacity 0.3s;"></p>
      </div>
    </div>`

  const avatarWrap = document.getElementById('profile-avatar-wrap')
  const avatarInput = document.getElementById('avatar-input')
  const usernameInput = document.getElementById('profile-username')
  const emailInput = document.getElementById('profile-email')
  const saveBtn = document.getElementById('profile-save-btn')
  const statusEl = document.getElementById('profile-status')

  let currentAvatar = user.avatar

  avatarWrap.addEventListener('click', () => avatarInput.click())
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      currentAvatar = ev.target.result
      const img = avatarWrap.querySelector('img') || avatarWrap.querySelector('svg')
      if (img && img.tagName === 'IMG') {
        img.src = currentAvatar
      } else if (img && img.tagName === 'SVG') {
        avatarWrap.innerHTML = `<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        const overlay = avatarWrap.querySelector('div:last-child')
        avatarWrap.appendChild(overlay)
      }
    }
    reader.readAsDataURL(file)
  })

  saveBtn.addEventListener('click', async () => {
    const newUser = {
      username: usernameInput.value.trim() || 'CyberPunk',
      email: emailInput.value.trim() || 'user@sot.app',
      avatar: currentAvatar
    }
    if (window.electronAPI) {
      await window.electronAPI.userSave(newUser)
    }
    statusEl.textContent = 'Сохранено!'
    statusEl.style.color = '#4caf50'
    statusEl.style.opacity = '1'
    setTimeout(() => { statusEl.style.opacity = '0' }, 2000)

    const sidebarUsername = document.getElementById('sidebarUsername')
    const sidebarEmail = document.getElementById('sidebarEmail')
    const sidebarAvatar = document.getElementById('sidebarAvatar')
    if (sidebarUsername) sidebarUsername.textContent = newUser.username
    if (sidebarEmail) sidebarEmail.textContent = newUser.email
    if (sidebarAvatar && newUser.avatar) {
      sidebarAvatar.innerHTML = `<img src="${newUser.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    }
  })
}
