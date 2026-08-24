const digits = {
  '0': [' █████ ', '██   ██', '██   ██', '██   ██', ' █████ '],
  '1': ['  ██  ', ' ███  ', '  ██  ', '  ██  ', ' █████'],
  '2': [' █████ ', '██   ██', '   ██  ', ' ██    ', '███████'],
  '3': [' █████ ', '██   ██', '   ███ ', '██   ██', ' █████ '],
  '4': ['██   ██', '██   ██', '███████', '     ██', '     ██'],
  '5': ['███████', '██     ', '██████ ', '     ██', '██████ '],
  '6': [' █████ ', '██     ', '██████ ', '██   ██', ' █████ '],
  '7': ['███████', '    ██ ', '   ██  ', '  ██   ', ' ██    '],
  '8': [' █████ ', '██   ██', ' █████ ', '██   ██', ' █████ '],
  '9': [' █████ ', '██   ██', ' ██████', '     ██', ' █████ '],
  ':': ['      ', '  ██  ', '      ', '  ██  ', '      ']
}

function buildClock (timeStr) {
  const chars = timeStr.split('')
  const lines = ['', '', '', '', '']
  for (const ch of chars) {
    const pattern = digits[ch] || digits['0']
    for (let r = 0; r < 5; r++) lines[r] += pattern[r] + '  '
  }
  return lines.join('\n')
}

export function renderDashboard (content, prevCleanupRef) {
  content.style.cssText = 'position:fixed;top:44px;left:0;right:0;bottom:0;overflow-y:auto;'
  content.innerHTML = `
    <div style="height:1100px;position:relative;">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;margin-top:-520px;z-index:1;pointer-events:none;">
        <pre id="ascii-clock" style="font-family:'Consolas','Cascadia Code','Fira Code',monospace;font-size:15px;line-height:1.3;color:var(--accent);text-align:center;margin:0;opacity:0.85;"></pre>
      </div>
      <div style="position:absolute;left:90px;top:-10px;width:500px;height:700px;overflow:hidden;pointer-events:none;z-index:0;transform:translateZ(0);contain:strict;">
        <object type="image/svg+xml" data="assets/animations/Search Concept.svg" style="height:100%;width:100%;display:block;"></object>
      </div>
      <div style="position:absolute;left:140px;top:510px;width:520px;z-index:2;pointer-events:none;padding:20px 30px;">
        <h2 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0 0 10px 0;letter-spacing:-0.5px;line-height:1.2;">Легальность</h2>
        <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-primary);margin:0 0 12px 0;line-height:1.6;opacity:0.92;">Только в рамках закона.</p>
        <p style="font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:400;color:var(--text-secondary);margin:0;line-height:1.6;">SOT работает исключительно с общедоступными источниками информации, соблюдая законодательство РФ и международные нормы. Сервис не предназначен для взлома, несанкционированного доступа или иных противоправных действий — их использование строго запрещено.</p>
      </div>
      <div id="svg-new" style="position:absolute;left:170px;top:830px;width:350px;z-index:1;pointer-events:none;border-radius:12px;overflow:hidden;"></div>
      <div style="position:absolute;left:170px;top:1150px;width:430px;z-index:2;pointer-events:none;padding:20px 30px;">
        <h2 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0 0 10px 0;letter-spacing:-0.5px;line-height:1.2;">Поддержка и гарантия</h2>
        <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-primary);margin:0 0 12px 0;line-height:1.6;opacity:0.92;">Один разработчик — полная ответственность.</p>
        <p style="font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:400;color:var(--text-secondary);margin:0;line-height:1.6;">Проект разработан одним разработчиком, поэтому возможны баги. Однако архитектура максимально устойчива, и найти их будет непросто. Если вы всё же обнаружите ошибку — я бесплатно исправлю её и выдам исправленную версию без каких-либо доплат.</p>
      </div>
      <div style="position:absolute;left:650px;top:770px;width:500px;z-index:2;pointer-events:none;padding:20px 30px;">
        <h2 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0 0 10px 0;letter-spacing:-0.5px;line-height:1.2;">Библиотека знаний</h2>
        <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-primary);margin:0 0 12px 0;line-height:1.6;opacity:0.92;">200 мануалов, 20 направлений OSINT.</p>
        <p style="font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:400;color:var(--text-secondary);margin:0;line-height:1.6;">Раздел «Documents of OSINT» содержит 200 методических мануалов по двадцати направлениям разведки — от THREAT_INTEL и SOCMINT до FININT и DARKWEB. Раздел «Documents of Criminology» дополняет их курсом криминалистической методики. Встроенный поиск и фильтры по категориям помогут найти нужную технику за секунды, а полный текст каждого мануала открывается прямо в приложении.</p>
      </div>
      <div style="position:absolute;left:800px;top:1080px;width:400px;z-index:1;pointer-events:none;border-radius:12px;overflow:hidden;">
        <object type="image/svg+xml" data="assets/animations/404 error page with cat.svg" style="display:block;width:100%;height:auto;"></object>
      </div>
      <div style="position:absolute;left:610px;right:20px;top:calc(50% - 30px);transform:translateZ(0) translateY(-50%);z-index:2;pointer-events:none;contain:layout style;">
        <h1 style="font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:700;color:var(--accent);margin:0 0 10px 0;letter-spacing:-0.5px;line-height:1.2;">SOT - Scope OSINT Training</h1>
        <p style="font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:400;color:var(--text-primary);margin:0 0 12px 0;line-height:1.6;opacity:0.92;">платформа для изучения OSINT и пентеста с AI-наставником.</p>
        <p style="font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:400;color:var(--text-secondary);margin:0 0 12px 0;line-height:1.6;">AI-агент выступает в роли преподавателя: объяснит любую тему — от сбора цифровых следов до методологии тестирования на проникновение — развёрнуто, со схемами, таблицами и ссылками на первоисточники.</p>
        <p style="font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:400;color:var(--text-secondary);margin:0;line-height:1.6;">Встроенная библиотека знаний: более 200 учебных мануалов по 20 направлениям OSINT и полный курс криминалистики — вся теория всегда под рукой.</p>
      </div>
      <div style="position:absolute;left:610px;right:20px;bottom:20px;z-index:1;pointer-events:none;display:flex;justify-content:flex-end;contain:layout;">
        <object type="image/svg+xml" data="assets/animations/Computer.svg" style="display:block;width:440px;"></object>
      </div>
    </div>`

  ;(async () => {
    try {
      const svg = await window.electronAPI.readFile('assets/animations/Google Ads with Leo Voruta.svg')
      const el = document.getElementById('svg-new')
      if (el) {
        el.innerHTML = svg
        const s = el.querySelector('svg')
        if (s) { s.style.width = '100%'; s.style.height = 'auto' }
      }
    } catch (e) { console.error(e) }
  })()

  const clockEl = document.getElementById('ascii-clock')
  let lastTime = ''
  let interval

  function update () {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    const timeStr = `${h}:${m}`
    if (timeStr !== lastTime) {
      lastTime = timeStr
      clockEl.textContent = buildClock(timeStr)
    }
  }

  update()
  interval = setInterval(update, 1000)

  prevCleanupRef.current = () => { if (interval) clearInterval(interval) }
}
