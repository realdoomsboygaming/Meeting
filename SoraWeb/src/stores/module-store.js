import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Logger from '../utils/Logger'
import ModuleExecutor from '../services/ModuleExecutor'

export const useModuleStore = defineStore('module', () => {
  // State
  const modules = ref([])
  const moduleSettings = ref({})
  const moduleScripts = ref({})
  const modulePerformance = ref({})
  // Map from slug (mediaId) to media object
  const mediaSlugMap = ref({})

  // Load persisted data
  try {
    const savedModules = localStorage.getItem('sora-modules')
    const savedSettings = localStorage.getItem('sora-module-settings')
    const savedScripts = localStorage.getItem('sora-module-scripts')
    const savedPerformance = localStorage.getItem('sora-module-performance')

    if (savedModules) modules.value = JSON.parse(savedModules)
    if (savedSettings) moduleSettings.value = JSON.parse(savedSettings)
    if (savedScripts) moduleScripts.value = JSON.parse(savedScripts)
    if (savedPerformance) modulePerformance.value = JSON.parse(savedPerformance)
  } catch (error) {
    Logger.error('Failed to load persisted module data:', error)
  }

  // Computed
  const activeModule = computed(() => 
    modules.value.find(m => m.isActive)
  )

  const enabledModules = computed(() => 
    modules.value.filter(m => m.isEnabled)
  )

  // Actions
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('sora-modules', JSON.stringify(modules.value))
      localStorage.setItem('sora-module-settings', JSON.stringify(moduleSettings.value))
      localStorage.setItem('sora-module-scripts', JSON.stringify(moduleScripts.value))
      localStorage.setItem('sora-module-performance', JSON.stringify(modulePerformance.value))
    } catch (error) {
      Logger.error('Failed to save module data:', error)
    }
  }

  const installModule = (module) => {
    modules.value.push(module)
    moduleSettings.value[module.id] = {}
    saveToLocalStorage()
  }

  const uninstallModule = (moduleId) => {
    const index = modules.value.findIndex(m => m.id === moduleId)
    if (index > -1) {
      modules.value.splice(index, 1)
      delete moduleSettings.value[moduleId]
      delete moduleScripts.value[moduleId]
      delete modulePerformance.value[moduleId]
      saveToLocalStorage()
    }
  }

  const updateModule = (updatedModule) => {
    const index = modules.value.findIndex(m => m.id === updatedModule.id)
    if (index > -1) {
      modules.value[index] = updatedModule
      saveToLocalStorage()
    }
  }

  const setModuleActive = (moduleId) => {
    console.log('[DEBUG] setModuleActive called with:', moduleId)
    modules.value = modules.value.map(m => ({
      ...m,
      isActive: m.id === moduleId
    }))
    console.log('[DEBUG] modules after setModuleActive:', modules.value)
    saveToLocalStorage()
  }

  const setModuleEnabled = (moduleId, enabled) => {
    console.log('[DEBUG] setModuleEnabled called with:', moduleId, enabled)
    const module = modules.value.find(m => m.id === moduleId)
    if (module) {
      module.isEnabled = enabled
      if (!enabled && module.isActive) {
        module.isActive = false
        console.log('[DEBUG] Module deactivated due to disable:', moduleId)
      }
      saveToLocalStorage()
    }
  }

  const setModuleStatus = (moduleId, status, error = null) => {
    const module = modules.value.find(m => m.id === moduleId)
    if (module) {
      module.status = status
      module.error = error
      saveToLocalStorage()
    }
  }

  const updateModuleSettings = (moduleId, settings) => {
    moduleSettings.value[moduleId] = {
      ...moduleSettings.value[moduleId],
      ...settings
    }
    saveToLocalStorage()
  }

  const saveModuleScript = (moduleId, script) => {
    moduleScripts.value[moduleId] = script
    saveToLocalStorage()
  }

  const getModuleScript = (moduleId) => {
    return moduleScripts.value[moduleId]
  }

  const deleteModuleScript = (moduleId) => {
    delete moduleScripts.value[moduleId]
    saveToLocalStorage()
  }

  const recordModulePerformance = (moduleId, operation, duration, success) => {
    if (!modulePerformance.value[moduleId]) {
      modulePerformance.value[moduleId] = {
        operations: 0,
        totalDuration: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0
      }
    }

    const stats = modulePerformance.value[moduleId]
    stats.operations++
    stats.totalDuration += duration
    stats.averageDuration = stats.totalDuration / stats.operations

    if (success) {
      stats.successCount++
    } else {
      stats.failureCount++
    }

    saveToLocalStorage()
  }

  const clearModulePerformance = (moduleId) => {
    if (moduleId) {
      delete modulePerformance.value[moduleId]
    } else {
      modulePerformance.value = {}
    }
    saveToLocalStorage()
  }

  const getDetails = async (request) => {
    if (!activeModule.value) {
      Logger.error('getDetails failed: No active module.')
      return null
    }

    try {
      const details = await ModuleExecutor.executeDetails(activeModule.value, request)
      return details
    } catch (error) {
      Logger.error(`getDetails failed for module ${activeModule.value.id}:`, error)
      setModuleStatus(activeModule.value.id, 'error', error.message)
      return null
    }
  }

  // Extract a stream URL for a given episode/page URL
  const extractStreamUrl = async (url, options = {}) => {
    if (!activeModule.value) {
      Logger.error('extractStreamUrl failed: No active module.')
      return null
    }
    return await ModuleExecutor.extractStreamUrl(activeModule.value, url, options)
  }

  // Register a slug for a media item
  const registerMediaSlug = (slug, mediaObj) => {
    mediaSlugMap.value[slug] = mediaObj
  }
  // Lookup a media object by slug
  const getMediaBySlug = (slug) => {
    return mediaSlugMap.value[slug] || null
  }

  return {
    // State
    modules,
    moduleSettings,
    moduleScripts,
    modulePerformance,
    mediaSlugMap,

    // Getters
    activeModule,
    enabledModules,

    // Actions
    installModule,
    uninstallModule,
    updateModule,
    setModuleActive,
    setModuleEnabled,
    setModuleStatus,
    updateModuleSettings,
    saveModuleScript,
    getModuleScript,
    deleteModuleScript,
    recordModulePerformance,
    registerMediaSlug,
    getMediaBySlug,
    clearModulePerformance,
    getDetails,
    extractStreamUrl
  }
}) 