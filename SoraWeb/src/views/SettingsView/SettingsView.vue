<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="settings-header">
      <h1 class="settings-title">Settings</h1>
    </div>

    <div class="settings-content">
      <router-view 
        :key="$route.fullPath" 
        @openDataManagement="openDataManagement"
        @openLogs="openLogs"
        @openBackupRestore="openBackupRestore"
        @showAbout="showAbout"
      />
      <!-- Data Management Modal -->
      <div v-if="showDataModal" class="modal-overlay" @click="closeDataModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Data Management</h3>
            <button @click="closeDataModal" class="modal-close">
              <i class="icon-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="data-stats">
              <div class="stat-item">
                <span class="stat-label">Library Items</span>
                <span class="stat-value">{{ dataStats.libraryItems }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Watch History</span>
                <span class="stat-value">{{ dataStats.watchHistory }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Search History</span>
                <span class="stat-value">{{ dataStats.searchHistory }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Cache Size</span>
                <span class="stat-value">{{ dataStats.cacheSize }}</span>
              </div>
            </div>
            <div class="data-actions">
              <button @click="clearCache" class="action-button secondary">
                Clear Cache
              </button>
              <button @click="clearSearchHistory" class="action-button secondary">
                Clear Search History
              </button>
              <button @click="clearAllData" class="action-button danger">
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Modal -->
      <div v-if="showLogsModal" class="modal-overlay" @click="closeLogsModal">
        <div class="modal-content logs-modal" @click.stop>
          <div class="modal-header">
            <h3>Application Logs</h3>
            <div class="modal-actions">
              <button @click="exportLogs" class="action-button secondary">
                Export
              </button>
              <button @click="clearLogs" class="action-button secondary">
                Clear
              </button>
              <button @click="closeLogsModal" class="modal-close">
                <i class="icon-x"></i>
              </button>
            </div>
          </div>
          <div class="modal-body">
            <div class="log-filters">
              <select v-model="logLevel">
                <option value="all">All Levels</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div class="log-content">
              <div 
                v-for="log in filteredLogs" 
                :key="log.id"
                :class="['log-entry', `log-${log.level}`]"
              >
                <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup & Restore Modal -->
      <div v-if="showBackupModal" class="modal-overlay" @click="closeBackupModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Backup & Restore</h3>
            <button @click="closeBackupModal" class="modal-close">
              <i class="icon-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="backup-section">
              <h4>Export Settings</h4>
              <p>Export your settings, library, and preferences to a backup file.</p>
              <button @click="exportSettings" class="action-button primary">
                <i class="icon-download"></i>
                Export Settings
              </button>
            </div>
            
            <div class="backup-section">
              <h4>Import Settings</h4>
              <p>Import settings from a previously exported backup file.</p>
              <div class="file-upload">
                <input 
                  type="file" 
                  ref="fileInput" 
                  @change="importSettings" 
                  accept=".json"
                  style="display: none"
                />
                <button @click="$refs.fileInput.click()" class="action-button secondary">
                  <i class="icon-upload"></i>
                  Choose File
                </button>
              </div>
            </div>
            
            <div class="backup-section">
              <h4>Reset to Defaults</h4>
              <p class="warning-text">This will reset all settings to their default values. This action cannot be undone.</p>
              <button @click="resetToDefaults" class="action-button danger">
                <i class="icon-refresh-cw"></i>
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- About Modal -->
      <div v-if="showAboutModal" class="modal-overlay" @click="closeAboutModal">
        <div class="modal-content about-modal" @click.stop>
          <div class="modal-header">
            <h3>About Sora</h3>
            <button @click="closeAboutModal" class="modal-close">
              <i class="icon-x"></i>
            </button>
          </div>
          <div class="modal-body">
                       <div class="about-content">
               <div class="app-logo">
                 <div class="logo-placeholder">
                   <i class="icon-cube"></i>
                 </div>
               </div>
               <div class="app-info">
                <h2>Sora Web</h2>
                <p class="version">Version {{ appVersion }}</p>
                <p class="description">
                  A modern web application for streaming anime and reading manga, 
                  built with Vue.js and designed with iOS aesthetics in mind.
                </p>
                <div class="developer-info">
                  <p><strong>Developer:</strong> cranci1</p>
                  <p><strong>License:</strong> GPL v3.0</p>
                  <p><strong>Build:</strong> {{ buildNumber }}</p>
                </div>
                <div class="feature-list">
                  <h4>Features</h4>
                  <ul>
                    <li>Stream anime with multiple quality options</li>
                    <li>Read manga with optimized reader</li>
                    <li>Track progress with AniList and Trakt</li>
                    <li>Modular content source system</li>
                    <li>Responsive design for all devices</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings-store'
import { useModuleStore } from '@/stores/module-store'
import { useLibraryStore } from '@/stores/library-store'
import Logger from '@/utils/Logger'

export default {
  name: 'SettingsView',
  setup() {
    const router = useRouter()
    const settingsStore = useSettingsStore()
    const moduleStore = useModuleStore()
    const libraryStore = useLibraryStore()

    // Modal states
    const showDataModal = ref(false)
    const showLogsModal = ref(false)
    const showBackupModal = ref(false)
    const showAboutModal = ref(false)

    // Log filtering and management
    const logLevel = ref('all')
    const logs = ref([])
    
    // Get logs from localStorage and console intercept
    const loadLogs = () => {
      try {
        const storedLogs = localStorage.getItem('sora-app-logs')
        if (storedLogs) {
          logs.value = JSON.parse(storedLogs)
        }
      } catch (error) {
        console.error('Error loading logs:', error)
      }
      
      // Add some default logs if none exist
      if (logs.value.length === 0) {
        logs.value = [
          {
            id: Date.now(),
            timestamp: new Date(),
            level: 'info',
            message: 'Application started successfully'
          },
          {
            id: Date.now() + 1,
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            level: 'debug',
            message: 'Module system initialized'
          },
          {
            id: Date.now() + 2,
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
            level: 'warn',
            message: 'Settings view loaded'
          }
        ]
        saveLogs()
      }
    }
    
    const saveLogs = () => {
      try {
        localStorage.setItem('sora-app-logs', JSON.stringify(logs.value))
      } catch (error) {
        console.error('Error saving logs:', error)
      }
    }
    
    const addLog = (level, message) => {
      const newLog = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        level,
        message
      }
      logs.value.unshift(newLog) // Add to beginning
      
      // Keep only last 1000 logs
      if (logs.value.length > 1000) {
        logs.value = logs.value.slice(0, 1000)
      }
      
      saveLogs()
    }

    // App info
    const appVersion = ref('1.0.1')
    const buildNumber = ref('2024.01.15.001')

    // Get active module
    const selectedModule = computed(() => moduleStore.activeModule)

    // Handle backup/restore
    const backup = {
      modules: moduleStore.modules
    }

    const restoreBackup = () => {
      moduleStore.$patch({
        modules: backup.modules
      })
    }

    // Computed properties
    const dataStats = computed(() => ({
      libraryItems: libraryStore.bookmarks.length,
      watchHistory: libraryStore.continueWatching.length,
      searchHistory: 42, // Mock data
      cacheSize: '15.2 MB' // Mock data
    }))

    const filteredLogs = computed(() => {
      if (logLevel.value === 'all') {
        return logs.value
      }
      return logs.value.filter(log => log.level === logLevel.value)
    })

    // Methods
    const navigateToModules = () => {
      router.push('/settings/modules')
    }

    const openDataManagement = () => {
      showDataModal.value = true
    }

    const closeDataModal = () => {
      showDataModal.value = false
    }

    const openLogs = () => {
      showLogsModal.value = true
    }

    const closeLogsModal = () => {
      showLogsModal.value = false
    }

    const openBackupRestore = () => {
      showBackupModal.value = true
    }

    const closeBackupModal = () => {
      showBackupModal.value = false
    }

    const showAbout = () => {
      showAboutModal.value = true
    }

    const closeAboutModal = () => {
      showAboutModal.value = false
    }

    const clearCache = async () => {
      try {
        addLog('info', 'Starting cache clear operation')
        
        let clearedItems = 0
        
        // Clear browser cache/localStorage
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
          clearedItems += cacheNames.length
          addLog('info', `Cleared ${cacheNames.length} browser caches`)
        }
        
        // Clear specific app cache items
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sora-cache-') || key.startsWith('module-cache-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        clearedItems += keysToRemove.length
        
        addLog('info', `Cache clear completed - removed ${clearedItems} items`)
        alert('Cache cleared successfully!')
      } catch (error) {
        addLog('error', `Cache clear failed: ${error.message}`)
        console.error('Error clearing cache:', error)
        alert('Error clearing cache. Please try again.')
      }
    }

    const clearSearchHistory = () => {
      localStorage.removeItem('sora-search-history')
      addLog('info', 'Search history cleared by user')
      alert('Search history cleared!')
    }

    const clearAllData = () => {
      if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        addLog('warn', 'User initiated complete data wipe')
        localStorage.clear()
        sessionStorage.clear()
        alert('All data cleared! The page will reload.')
        window.location.reload()
      }
    }

    const exportLogs = () => {
      const logData = logs.value.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message
      }))
      
      const blob = new Blob([JSON.stringify(logData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sora-logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const clearLogs = () => {
      if (confirm('Clear all logs?')) {
        logs.value = []
        localStorage.removeItem('sora-app-logs')
        addLog('info', 'Logs cleared by user')
      }
    }

    const exportSettings = () => {
      try {
        addLog('info', 'Starting settings export')
        
        const settings = {
          app: 'Sora Web',
          version: appVersion.value,
          exported: new Date().toISOString(),
          settings: settingsStore.$state,
          modules: moduleStore.modules,
          library: {
            bookmarks: libraryStore.bookmarks,
            continueWatching: libraryStore.continueWatching
          },
          logs: logs.value.slice(0, 100) // Include last 100 logs
        }
        
        const blob = new Blob([JSON.stringify(settings, null, 2)], { 
          type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sora-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        addLog('info', 'Settings exported successfully')
      } catch (error) {
        addLog('error', `Export failed: ${error.message}`)
        alert('Export failed. Please try again.')
      }
    }

    const importSettings = (event) => {
      const file = event.target.files[0]
      if (!file) return

      addLog('info', `Starting import of file: ${file.name}`)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result)
          
          if (backup.app !== 'Sora Web') {
            addLog('error', 'Invalid backup file format - not a Sora Web backup')
            alert('Invalid backup file format!')
            return
          }
          
          if (confirm('Import settings? This will overwrite your current configuration.')) {
            addLog('info', 'User confirmed settings import')
            
            // Restore settings
            if (backup.settings) {
              Object.assign(settingsStore.$state, backup.settings)
              settingsStore.saveSettings()
              addLog('info', 'Settings restored from backup')
            }
            
            // Restore modules
            if (backup.modules) {
              moduleStore.modules = backup.modules
              addLog('info', 'Modules restored from backup')
            }
            
            // Restore library
            if (backup.library) {
              if (backup.library.bookmarks) {
                libraryStore.bookmarks = backup.library.bookmarks
              }
              if (backup.library.continueWatching) {
                libraryStore.continueWatching = backup.library.continueWatching
              }
              addLog('info', 'Library data restored from backup')
            }
            
            // Restore logs if available
            if (backup.logs) {
              logs.value = backup.logs
              saveLogs()
              addLog('info', 'Logs restored from backup')
            }
            
            addLog('info', 'Import completed successfully - reloading page')
            alert('Settings imported successfully! The page will reload.')
            window.location.reload()
          } else {
            addLog('info', 'User cancelled settings import')
          }
        } catch (error) {
          addLog('error', `Import failed: ${error.message}`)
          console.error('Error importing settings:', error)
          alert('Error importing settings. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }

    const resetToDefaults = () => {
      if (confirm('Reset all settings to defaults? This action cannot be undone.')) {
        addLog('warn', 'User reset settings to defaults')
        localStorage.removeItem('sora-settings')
        localStorage.removeItem('sora-modules')
        localStorage.removeItem('sora-library')
        alert('Settings reset to defaults! The page will reload.')
        window.location.reload()
      }
    }

    const formatTime = (timestamp) => {
      try {
        const date = new Date(timestamp)
        if (isNaN(date.getTime())) {
          return 'Invalid Date'
        }
        return date.toLocaleTimeString()
      } catch (error) {
        return 'Invalid Date'
      }
    }

    // Lifecycle
    onMounted(() => {
      // Initialize logs
      loadLogs()
      addLog('info', 'Settings page opened')
    })

    return {
      // Data
      selectedModule,
      dataStats,
      filteredLogs,
      appVersion,
      buildNumber,
      logLevel,
      
      // Modal states
      showDataModal,
      showLogsModal,
      showBackupModal,
      showAboutModal,
      
      // Methods
      navigateToModules,
      openDataManagement,
      closeDataModal,
      openLogs,
      closeLogsModal,
      openBackupRestore,
      closeBackupModal,
      showAbout,
      closeAboutModal,
      clearCache,
      clearSearchHistory,
      clearAllData,
      exportLogs,
      clearLogs,
      exportSettings,
      importSettings,
      resetToDefaults,
      formatTime,
      addLog,
      loadLogs
    }
  }
}
</script>

<style scoped>
.settings-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: #fff;
  padding-bottom: 80px;
}

.settings-header {
  padding: 1rem 1.5rem 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.settings-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  padding: 1rem 0;
  background: linear-gradient(135deg, #007AFF, #00C7FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-content {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-category {
  margin-bottom: 2rem;
}

.category-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8E8E93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
}

.settings-card {
  background: rgba(28, 28, 30, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.settings-row {
  display: flex;
  align-items: center;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.settings-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.settings-row:active {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0.98);
}

.module-preview-row {
  padding: 1.5rem 1rem;
}

.module-preview {
  display: flex;
  align-items: center;
  width: 100%;
}

.module-icon {
  width: 60px;
  height: 60px;
  margin-right: 1rem;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 122, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.module-placeholder {
  color: #007AFF;
  font-size: 1.5rem;
}

.module-info {
  flex: 1;
}

.module-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #fff;
}

.module-description {
  font-size: 0.875rem;
  color: #8E8E93;
  margin: 0;
}

.settings-icon {
  width: 24px;
  height: 24px;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007AFF;
}

.social-icon {
  color: #8E8E93;
}

.settings-label {
  flex: 1;
  font-size: 1rem;
  font-weight: 400;
}

.settings-label.external {
  color: #8E8E93;
}

.settings-arrow {
  color: #8E8E93;
  font-size: 0.875rem;
}

.settings-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 1rem;
}

.external-link {
  color: #8E8E93;
}

.app-version {
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
}

.app-version p {
  font-size: 0.875rem;
  color: #8E8E93;
  margin: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.logs-modal {
  max-width: 800px;
  max-height: 90vh;
}

.about-modal {
  max-width: 500px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.modal-close {
  background: none;
  border: none;
  color: #8E8E93;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
  max-height: calc(80vh - 80px);
  overflow-y: auto;
}

/* Data Stats */
.data-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: rgba(0, 122, 255, 0.1);
  border: 1px solid rgba(0, 122, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.875rem;
  color: #8E8E93;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #007AFF;
}

/* Action Buttons */
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-button.primary {
  background: #007AFF;
  color: #fff;
}

.action-button.primary:hover {
  background: #0056CC;
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-button.danger {
  background: #FF3B30;
  color: #fff;
}

.action-button.danger:hover {
  background: #D70015;
}

/* Logs */
.log-filters {
  margin-bottom: 1rem;
}

.log-filters select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  color: #fff;
  font-size: 0.875rem;
}

.log-content {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  align-items: center;
}

.log-timestamp {
  color: #8E8E93;
  white-space: nowrap;
}

.log-level {
  font-weight: 600;
  width: 60px;
  text-align: center;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.625rem;
}

.log-error .log-level {
  background: #FF3B30;
  color: #fff;
}

.log-warn .log-level {
  background: #FF9500;
  color: #fff;
}

.log-info .log-level {
  background: #007AFF;
  color: #fff;
}

.log-debug .log-level {
  background: #8E8E93;
  color: #fff;
}

.log-message {
  flex: 1;
  color: #fff;
}

/* Backup Sections */
.backup-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.backup-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.backup-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  color: #fff;
}

.backup-section p {
  margin: 0 0 1rem 0;
  color: #8E8E93;
  font-size: 0.875rem;
}

.warning-text {
  color: #FF9500 !important;
}

.file-upload {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* About Modal */
.about-content {
  text-align: center;
}

.app-logo {
  margin-bottom: 1.5rem;
}

.logo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: rgba(0, 122, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007AFF;
  font-size: 2rem;
}

.app-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #fff;
}

.version {
  margin: 0 0 1rem 0;
  color: #8E8E93;
  font-size: 0.875rem;
}

.description {
  margin: 0 0 1.5rem 0;
  color: #8E8E93;
  line-height: 1.5;
}

.developer-info {
  background: rgba(0, 122, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.developer-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #8E8E93;
}

.feature-list {
  text-align: left;
}

.feature-list h4 {
  margin: 0 0 0.75rem 0;
  color: #fff;
}

.feature-list ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #8E8E93;
}

.feature-list li {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

/* Icon classes for better semantic representation */
.icon-cube::before { content: '📦'; }
.icon-chevron-right::before { content: '›'; }
.icon-settings::before { content: '⚙️'; }
.icon-play-circle::before { content: '▶️'; }
.icon-download::before { content: '⬇️'; }
.icon-stack::before { content: '📚'; }
.icon-folder::before { content: '📁'; }
.icon-document::before { content: '📄'; }
.icon-refresh::before { content: '🔄'; }
.icon-info-circle::before { content: 'ℹ️'; }
.icon-github::before { content: '💻'; }
.icon-message-circle::before { content: '💬'; }
.icon-alert-circle::before { content: '⚠️'; }
.icon-file-text::before { content: '📝'; }
.icon-external-link::before { content: '🔗'; }
.icon-x::before { content: '✕'; }
.icon-upload::before { content: '⬆️'; }
.icon-refresh-cw::before { content: '🔄'; }

/* Responsive Design */
@media (max-width: 768px) {
  .settings-content {
    padding: 1rem;
  }
  
  .settings-title {
    font-size: 1.75rem;
  }
  
  .modal-content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
  
  .data-stats {
    grid-template-columns: 1fr;
  }
  
  .data-actions {
    gap: 0.5rem;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .settings-row {
    padding: 0.75rem;
  }
  
  .module-preview-row {
    padding: 1rem 0.75rem;
  }
  
  .module-icon {
    width: 50px;
    height: 50px;
  }
  
  .module-name {
    font-size: 1rem;
  }
  
  .settings-label {
    font-size: 0.875rem;
  }
}
</style> 