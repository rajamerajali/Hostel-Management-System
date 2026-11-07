import { createContext, useContext, useEffect, useState } from 'react'

export const COLOR_THEMES = [
  { name: 'Dark',   class: '',              icon: '🌙', color: '#63b3ed' },
  { name: 'Light',  class: 'light',         icon: '☀️', color: '#f6c35a' },
  { name: 'Ocean',  class: 'theme-ocean',   icon: '🌊', color: '#3b82f6' },
  { name: 'Sunset', class: 'theme-sunset',  icon: '🌅', color: '#f97316' },
  { name: 'Forest', class: 'theme-forest',  icon: '🌲', color: '#48bb78' },
]

const ThemeContext = createContext(null)

function readSavedTheme() {
  const saved = localStorage.getItem('hostel_color_theme')
  return COLOR_THEMES.some((t) => t.name === saved) ? saved : 'Dark'
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(readSavedTheme)

  useEffect(() => {
    const theme = COLOR_THEMES.find((t) => t.name === themeName) || COLOR_THEMES[0]
    document.body.classList.remove('light', 'theme-ocean', 'theme-sunset', 'theme-forest')
    if (theme.class) document.body.classList.add(theme.class)
    localStorage.setItem('hostel_color_theme', themeName)
  }, [themeName])

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
