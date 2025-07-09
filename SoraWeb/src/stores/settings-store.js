import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // Theme settings
  const theme = ref('dark')
  const accentColor = ref('#007AFF')
  
  // Player settings
  const autoPlay = ref(true)
  const autoNext = ref(true)
  const preferredQuality = ref('auto')
  const subtitleLanguage = ref('en')
  const audioLanguage = ref('en')
  
  // Module settings
  const enabledModules = ref([])
  const moduleSettings = ref({})
  
  // Tracking settings
  const anilistEnabled = ref(false)
  const traktEnabled = ref(false)
  const tmdbEnabled = ref(true)
  
  // General settings
  const language = ref('en')
  const region = ref('US')
  
  // Network settings
  const corsProxyUrl = ref('https://cloudflare-cors-anywhere.realdoomsboygaming.workers.dev/?')

  // Methods
  const initializeSettings = async () => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('sora-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      theme.value = parsed.theme || detectSystemTheme()
      accentColor.value = parsed.accentColor || '#007AFF'
      autoPlay.value = parsed.autoPlay ?? true
      autoNext.value = parsed.autoNext ?? true
      preferredQuality.value = parsed.preferredQuality || 'auto'
      subtitleLanguage.value = parsed.subtitleLanguage || 'en'
      audioLanguage.value = parsed.audioLanguage || 'en'
      enabledModules.value = parsed.enabledModules || []
      moduleSettings.value = parsed.moduleSettings || {}
      anilistEnabled.value = parsed.anilistEnabled ?? false
      traktEnabled.value = parsed.traktEnabled ?? false
      tmdbEnabled.value = parsed.tmdbEnabled ?? true
      language.value = parsed.language || 'en'
      region.value = parsed.region || 'US'
      corsProxyUrl.value = parsed.corsProxyUrl || 'https://cloudflare-cors-anywhere.realdoomsboygaming.workers.dev/?'
    } else {
      // Default to system theme if no saved settings
      theme.value = detectSystemTheme()
    }
    
    // Apply theme immediately
    applyTheme(theme.value)
    
    // Listen for system theme changes
    setupSystemThemeListener()
  }
  
  const detectSystemTheme = () => {
    // Detect user's system preference (iOS-like behavior)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }
  
  const applyTheme = (newTheme) => {
    // Apply theme to document root (iOS-like behavior)
    const root = document.documentElement
    
    // Remove any existing theme attributes
    root.removeAttribute('data-theme')
    
    // Apply new theme
    if (newTheme !== 'system') {
      root.setAttribute('data-theme', newTheme)
    } else {
      // For system theme, let CSS media queries handle it
      const systemTheme = detectSystemTheme()
      root.setAttribute('data-theme', systemTheme)
    }
  }
  
  const setupSystemThemeListener = () => {
    // Listen for system theme changes (iOS-like behavior)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleSystemThemeChange = (e) => {
        if (theme.value === 'system') {
          const newSystemTheme = e.matches ? 'dark' : 'light'
          applyTheme(newSystemTheme)
        }
      }
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange)
      } else {
        // Legacy browsers
        mediaQuery.addListener(handleSystemThemeChange)
      }
    }
  }
  
  const saveSettings = () => {
    const settings = {
      theme: theme.value,
      accentColor: accentColor.value,
      autoPlay: autoPlay.value,
      autoNext: autoNext.value,
      preferredQuality: preferredQuality.value,
      subtitleLanguage: subtitleLanguage.value,
      audioLanguage: audioLanguage.value,
      enabledModules: enabledModules.value,
      moduleSettings: moduleSettings.value,
      anilistEnabled: anilistEnabled.value,
      traktEnabled: traktEnabled.value,
      tmdbEnabled: tmdbEnabled.value,
      language: language.value,
      region: region.value,
      corsProxyUrl: corsProxyUrl.value
    }
    localStorage.setItem('sora-settings', JSON.stringify(settings))
  }
  
  const updateTheme = (newTheme) => {
    // iOS-like theme switching with system support
    const validThemes = ['light', 'dark', 'system']
    if (!validThemes.includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}. Using system theme.`)
      newTheme = 'system'
    }
    
    theme.value = newTheme
    applyTheme(newTheme)
    saveSettings()
  }

  const updateCorsProxyUrl = (url) => {
    corsProxyUrl.value = url
    saveSettings()
  }

  const updateAccentColor = (color) => {
    // iOS-like dynamic accent color
    accentColor.value = color
    
    // Apply custom accent color to CSS custom properties
    const root = document.documentElement
    if (color !== '#007AFF') {
      // Custom color - update CSS variables
      root.style.setProperty('--ios-blue', color)
      root.style.setProperty('--info-color', color)
    } else {
      // Reset to default
      root.style.removeProperty('--ios-blue')
      root.style.removeProperty('--info-color')
    }
    
    saveSettings()
  }
  
  const getAvailableThemes = () => {
    return [
      { value: 'system', label: 'System', description: 'Follow system setting' },
      { value: 'light', label: 'Light', description: 'Light theme' },
      { value: 'dark', label: 'Dark', description: 'Dark theme' }
    ]
  }
  
  const getCurrentTheme = () => {
    // Get the actual applied theme (resolves 'system' to actual theme)
    if (theme.value === 'system') {
      return detectSystemTheme()
    }
    return theme.value
  }
  
  const toggleModule = (moduleId) => {
    const index = enabledModules.value.indexOf(moduleId)
    if (index > -1) {
      enabledModules.value.splice(index, 1)
    } else {
      enabledModules.value.push(moduleId)
    }
    saveSettings()
  }
  
  return {
    // State
    theme,
    accentColor,
    autoPlay,
    autoNext,
    preferredQuality,
    subtitleLanguage,
    audioLanguage,
    enabledModules,
    moduleSettings,
    anilistEnabled,
    traktEnabled,
    tmdbEnabled,
    language,
    region,
    corsProxyUrl,
    
    // Actions
    initializeSettings,
    saveSettings,
    updateTheme,
    updateAccentColor,
    updateCorsProxyUrl,
    toggleModule,
    
    // Theme utilities
    getAvailableThemes,
    getCurrentTheme,
    detectSystemTheme,
    applyTheme,
    setupSystemThemeListener
  }
}, {
  persist: true
}) 