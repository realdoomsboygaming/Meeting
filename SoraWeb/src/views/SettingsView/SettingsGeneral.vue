<template>
  <div class="settings-page">
    <!-- Navigation Header -->
    <div class="settings-navigation-header">
      <button @click="goBack" class="settings-back-button">
        <i class="icon-chevron-left"></i>
        <span>Back</span>
      </button>
    </div>
    
    <!-- Page Header -->
    <div class="settings-page-header">
      <h2>General Settings</h2>
      <p>Configure general application preferences</p>
    </div>

    <!-- Theme & Appearance -->
    <div class="settings-category">
      <h3 class="category-title">THEME & APPEARANCE</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Theme</span>
          <select v-model="theme" @change="updateTheme" class="settings-select">
            <option value="auto">Auto (System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <span class="settings-label">Accent Color</span>
          <div class="color-picker">
            <div 
              v-for="color in accentColors" 
              :key="color.value"
              :class="['color-option', { active: accentColor === color.value }]"
              :style="{ backgroundColor: color.color }"
              @click="updateAccentColor(color.value)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Language & Region -->
    <div class="settings-category">
      <h3 class="category-title">LANGUAGE & REGION</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Interface Language</span>
          <select v-model="language" @change="updateLanguage" class="settings-select">
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <span class="settings-label">Preferred Content Language</span>
          <select v-model="contentLanguage" @change="updateContentLanguage" class="settings-select">
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Startup & Navigation -->
    <div class="settings-category">
      <h3 class="category-title">STARTUP & NAVIGATION</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Default Page</span>
          <select v-model="defaultPage" @change="updateDefaultPage" class="settings-select">
            <option value="library">Library</option>
            <option value="search">Search</option>
            <option value="continue-watching">Continue Watching</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="showRecentlyAdded"
              @change="updateShowRecentlyAdded"
            />
            <span>Show recently added content on startup</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="enableSwipeNavigation"
              @change="updateSwipeNavigation"
            />
            <span>Enable swipe navigation (mobile)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Content Display -->
    <div class="settings-category">
      <h3 class="category-title">CONTENT DISPLAY</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Grid Size</span>
          <select v-model="gridSize" @change="updateGridSize" class="settings-select">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="showProgress"
              @change="updateShowProgress"
            />
            <span>Show progress bars on posters</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="showRatings"
              @change="updateShowRatings"
            />
            <span>Show ratings on content cards</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Privacy & Data -->
    <div class="settings-category">
      <h3 class="category-title">PRIVACY & DATA</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="enableAnalytics"
              @change="updateAnalytics"
            />
            <span>Enable anonymous usage analytics</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="saveSearchHistory"
              @change="updateSaveSearchHistory"
            />
            <span>Save search history</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <button @click="clearAllData" class="settings-action-button danger">
            Clear All App Data
          </button>
        </div>
      </div>
    </div>

    <!-- Backup & Sync -->
    <div class="settings-category">
      <h3 class="category-title">BACKUP & SYNC</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <button @click="exportSettings" class="settings-action-button primary">
            <i class="icon-download"></i>
            Export Settings
          </button>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <button @click="importSettings" class="settings-action-button secondary">
            <i class="icon-upload"></i>
            Import Settings
          </button>
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileImport" 
            accept=".json"
            style="display: none"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings-store'

export default {
  name: 'SettingsGeneral',
  setup() {
    console.log('mounted', 'SettingsGeneral')
    const router = useRouter()
    const settingsStore = useSettingsStore()
    const fileInput = ref(null)

    // Reactive settings
    const theme = ref('auto')
    const accentColor = ref('blue')
    const language = ref('en')
    const contentLanguage = ref('auto')
    const defaultPage = ref('library')
    const showRecentlyAdded = ref(true)
    const enableSwipeNavigation = ref(true)
    const gridSize = ref('medium')
    const showProgress = ref(true)
    const showRatings = ref(true)
    const enableAnalytics = ref(false)
    const saveSearchHistory = ref(true)

    const accentColors = [
      { value: 'blue', color: '#007bff' },
      { value: 'purple', color: '#6f42c1' },
      { value: 'pink', color: '#e83e8c' },
      { value: 'red', color: '#dc3545' },
      { value: 'orange', color: '#fd7e14' },
      { value: 'yellow', color: '#ffc107' },
      { value: 'green', color: '#28a745' },
      { value: 'teal', color: '#20c997' }
    ]

    // Update functions
    const updateTheme = () => {
      settingsStore.updateGeneralSettings({ theme: theme.value })
    }

    const updateAccentColor = (color) => {
      accentColor.value = color
      settingsStore.updateGeneralSettings({ accentColor: color })
    }

    const updateLanguage = () => {
      settingsStore.updateGeneralSettings({ language: language.value })
    }

    const updateContentLanguage = () => {
      settingsStore.updateGeneralSettings({ contentLanguage: contentLanguage.value })
    }

    const updateDefaultPage = () => {
      settingsStore.updateGeneralSettings({ defaultPage: defaultPage.value })
    }

    const updateShowRecentlyAdded = () => {
      settingsStore.updateGeneralSettings({ showRecentlyAdded: showRecentlyAdded.value })
    }

    const updateSwipeNavigation = () => {
      settingsStore.updateGeneralSettings({ enableSwipeNavigation: enableSwipeNavigation.value })
    }

    const updateGridSize = () => {
      settingsStore.updateGeneralSettings({ gridSize: gridSize.value })
    }

    const updateShowProgress = () => {
      settingsStore.updateGeneralSettings({ showProgress: showProgress.value })
    }

    const updateShowRatings = () => {
      settingsStore.updateGeneralSettings({ showRatings: showRatings.value })
    }

    const updateAnalytics = () => {
      settingsStore.updateGeneralSettings({ enableAnalytics: enableAnalytics.value })
    }

    const updateSaveSearchHistory = () => {
      settingsStore.updateGeneralSettings({ saveSearchHistory: saveSearchHistory.value })
    }

    const clearAllData = () => {
      if (confirm('Are you sure you want to clear all app data? This action cannot be undone.')) {
        settingsStore.clearAllData()
        // Reset settings to defaults
        loadSettings()
      }
    }

    const exportSettings = () => {
      const settings = settingsStore.exportSettings()
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sora-settings.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    const importSettings = () => {
      fileInput.value?.click()
    }

    const handleFileImport = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const settings = JSON.parse(e.target.result)
            settingsStore.importSettings(settings)
            loadSettings()
          } catch (error) {
            alert('Invalid settings file format.')
          }
        }
        reader.readAsText(file)
      }
    }

    const goBack = () => {
      router.replace('/settings');
    }

    const loadSettings = () => {
      const settings = settingsStore.generalSettings || {};
      theme.value = settings.theme || 'auto';
      accentColor.value = settings.accentColor || 'blue';
      language.value = settings.language || 'en';
      contentLanguage.value = settings.contentLanguage || 'auto';
      defaultPage.value = settings.defaultPage || 'library';
      showRecentlyAdded.value = settings.showRecentlyAdded !== false;
      enableSwipeNavigation.value = settings.enableSwipeNavigation !== false;
      gridSize.value = settings.gridSize || 'medium';
      showProgress.value = settings.showProgress !== false;
      showRatings.value = settings.showRatings !== false;
      enableAnalytics.value = settings.enableAnalytics === true;
      saveSearchHistory.value = settings.saveSearchHistory !== false;
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      theme,
      accentColor,
      language,
      contentLanguage,
      defaultPage,
      showRecentlyAdded,
      enableSwipeNavigation,
      gridSize,
      showProgress,
      showRatings,
      enableAnalytics,
      saveSearchHistory,
      accentColors,
      fileInput,
      goBack,
      updateTheme,
      updateAccentColor,
      updateLanguage,
      updateContentLanguage,
      updateDefaultPage,
      updateShowRecentlyAdded,
      updateSwipeNavigation,
      updateGridSize,
      updateShowProgress,
      updateShowRatings,
      updateAnalytics,
      updateSaveSearchHistory,
      clearAllData,
      exportSettings,
      importSettings,
      handleFileImport
    }
  }
}
</script>

<style scoped>
/* Component-specific styles that aren't covered by shared styles */
.color-picker {
  display: flex;
  gap: 0.5rem;
}

.color-option {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--background-secondary);
}

@media (max-width: 768px) {
  .color-picker {
    justify-content: center;
    width: 100%;
  }
}
</style> 