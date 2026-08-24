export const THEMES = [
  { name: 'Dark', vars: { '--bg-primary': '#1e1e1e', '--bg-secondary': '#1a1a1a', '--bg-tertiary': '#242424', '--bg-hover': '#2e2e2e', '--bg-active': '#363636', '--text-primary': '#f0f0f0', '--text-secondary': '#888888', '--text-muted': '#555555', '--accent': '#e0e0e0', '--border-color': '#1e1e1e' } },
  { name: 'Light', vars: { '--bg-primary': '#f0f0f0', '--bg-secondary': '#e8e8e8', '--bg-tertiary': '#f0f0f0', '--bg-hover': '#dcdcdc', '--bg-active': '#d0d0d0', '--text-primary': '#1a1a1a', '--text-secondary': '#666666', '--text-muted': '#999999', '--accent': '#1a1a1a', '--border-color': '#e0e0e0' } },
  { name: 'Amber', vars: { '--bg-primary': '#1c1814', '--bg-secondary': '#1a1612', '--bg-tertiary': '#24201c', '--bg-hover': '#2e2822', '--bg-active': '#363028', '--text-primary': '#f0e8d8', '--text-secondary': '#b09878', '--text-muted': '#706050', '--accent': '#ffb300', '--border-color': '#2a2420' } },
  { name: 'Green', vars: { '--bg-primary': '#141c16', '--bg-secondary': '#121a14', '--bg-tertiary': '#1e2820', '--bg-hover': '#28322a', '--bg-active': '#303c32', '--text-primary': '#d8f0e0', '--text-secondary': '#78b090', '--text-muted': '#507060', '--accent': '#4caf50', '--border-color': '#202a22' } },
  { name: 'Purple', vars: { '--bg-primary': '#18141c', '--bg-secondary': '#16121a', '--bg-tertiary': '#221c28', '--bg-hover': '#2c2432', '--bg-active': '#342c3c', '--text-primary': '#e0d8f0', '--text-secondary': '#9078b0', '--text-muted': '#605070', '--accent': '#ab47bc', '--border-color': '#24202a' } },
  { name: 'Blue', vars: { '--bg-primary': '#14181c', '--bg-secondary': '#12161a', '--bg-tertiary': '#1c2228', '--bg-hover': '#262c32', '--bg-active': '#2e343c', '--text-primary': '#d8e0f0', '--text-secondary': '#7890b0', '--text-muted': '#506070', '--accent': '#42a5f5', '--border-color': '#20242a' } },
  { name: 'Red', vars: { '--bg-primary': '#1c1414', '--bg-secondary': '#1a1212', '--bg-tertiary': '#281c1c', '--bg-hover': '#322626', '--bg-active': '#3c2e2e', '--text-primary': '#f0d8d8', '--text-secondary': '#b07878', '--text-muted': '#705050', '--accent': '#ef5350', '--border-color': '#2a2020' } },
  { name: 'Orange', vars: { '--bg-primary': '#1c1814', '--bg-secondary': '#1a1612', '--bg-tertiary': '#24201c', '--bg-hover': '#2e2822', '--bg-active': '#363028', '--text-primary': '#f0e8d8', '--text-secondary': '#b09878', '--text-muted': '#706050', '--accent': '#ff6a00', '--border-color': '#2a2420' } }
]

export function applyTheme (name) {
  const theme = THEMES.find(t => t.name === name) || THEMES[7]
  const root = document.documentElement
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val)
  }
  localStorage.setItem('netmind-theme', name)
}

const savedTheme = localStorage.getItem('netmind-theme')
if (savedTheme) applyTheme(savedTheme)
