import { ref, watch } from 'vue'

const currentTheme = ref('light')

export function useTheme() {
  const applyTheme = (theme) => {
    // Remove existing theme link
    const existingThemeLink = document.getElementById('theme-link')
    if (existingThemeLink) {
      existingThemeLink.remove()
    }

    // Create new theme link
    const link = document.createElement('link')
    link.id = 'theme-link'
    link.rel = 'stylesheet'
    
    // Map theme values to PrimeVue theme names
    let themeName
    if (theme === 'dark') {
      themeName = 'lara-dark-blue'
      document.documentElement.classList.add('dark-theme')
      document.documentElement.classList.remove('light-theme')
    } else if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      themeName = prefersDark ? 'lara-dark-blue' : 'lara-light-blue'
      if (prefersDark) {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.remove('light-theme')
      } else {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.remove('dark-theme')
      }
    } else {
      themeName = 'lara-light-blue'
      document.documentElement.classList.add('light-theme')
      document.documentElement.classList.remove('dark-theme')
    }
    
    link.href = `/node_modules/primevue/resources/themes/${themeName}/theme.css`
    document.head.appendChild(link)
    
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
  }

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    applyTheme(savedTheme)
    return savedTheme
  }

  // Listen for system theme changes when in auto mode
  const setupAutoThemeListener = () => {
    if (currentTheme.value === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (currentTheme.value === 'auto') {
          applyTheme('auto')
        }
      })
    }
  }

  return {
    currentTheme,
    applyTheme,
    loadTheme,
    setupAutoThemeListener
  }
}
