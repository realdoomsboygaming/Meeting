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
      <h2>Module Management</h2>
      <p>Manage streaming modules and sources</p>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-indicator">
      Loading...
    </div>

    <!-- Installed Modules -->
    <div class="settings-category">
      <h3 class="category-title">INSTALLED MODULES</h3>
      <div class="settings-card">
        <div v-if="modules.length === 0" class="empty-state">
          <div class="empty-content">
            <i class="icon-cube" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>No modules installed</p>
            <span style="color: var(--text-tertiary); font-size: 0.9rem;">Add modules below to access streaming sources</span>
          </div>
        </div>
        <div v-else>
          <div v-for="(module, index) in modules" :key="module.id">
            <div :class="['module-item-row', { loading: isLoading }]">
              <div class="module-info">
                <div class="module-icon">
                  <img :src="module.icon" :alt="module.name" 
                       @error="$event.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>��</text></svg>'" />
                </div>
                <div class="module-details">
                  <div class="module-header">
                    <span class="module-name">{{ module.name }}</span>
                    <span class="module-version">v{{ module.version }}</span>
                  </div>
                  <div class="module-meta">
                    <span class="module-description">{{ module.description }}</span>
                    <div class="module-author">
                      <img :src="module.author.icon" :alt="module.author.name" class="author-icon"
                           @error="$event.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>��</text></svg>'" />
                      <span>{{ module.author.name }}</span>
                    </div>
                  </div>
                  <div class="module-features">
                    <span v-for="feature in module.features" 
                          :key="feature" 
                          class="feature-tag">
                      {{ feature }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="module-actions">
                <button @click="toggleModule(module)" 
                        :class="['toggle-button', module.enabled ? 'enabled' : 'disabled']"
                        :disabled="isLoading">
                  {{ module.enabled ? (module.isActive ? 'Active' : 'Enabled') : 'Disabled' }}
                </button>
                <button @click="removeModule(module)" 
                        class="settings-action-button danger"
                        :disabled="isLoading">
                  <i class="icon-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="index < modules.length - 1" class="settings-divider"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Module -->
    <div class="settings-category">
      <h3 class="category-title">ADD MODULE</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <div :class="['add-module-container', { loading: isLoading }]">
            <input 
              v-model="moduleUrl" 
              placeholder="Module URL or paste module code..." 
              class="module-input"
              @keyup.enter="addModule"
              :disabled="isLoading"
            />
            <button 
              @click="addModule" 
              :disabled="!moduleUrl.trim() || isLoading" 
              class="settings-action-button primary">
              <i class="icon-upload"></i>
              Add Module
            </button>
          </div>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <button 
            @click="openModuleLibrary" 
            class="settings-action-button secondary"
            :disabled="isLoading">
            <i class="icon-external-link"></i>
            Browse Module Library
          </button>
        </div>
      </div>
    </div>

    <!-- Module Settings -->
    <div class="settings-category">
      <h3 class="category-title">MODULE SETTINGS</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="autoUpdateModules" 
              @change="updateAutoUpdate"
              :disabled="isLoading" 
            />
            <span>Auto-update modules</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input 
              type="checkbox" 
              v-model="enableModuleNotifications" 
              @change="updateNotifications"
              :disabled="isLoading" 
            />
            <span>Enable module notifications</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <button 
            @click="refreshAllModules" 
            class="settings-action-button secondary"
            :disabled="isLoading">
            <i class="icon-refresh"></i>
            Refresh All Modules
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useModuleStore } from '@/stores/module-store'
import moduleManager from '@/services/ModuleManager'

export default {
  name: 'SettingsModules',
  setup() {
    console.log('mounted', 'SettingsModules')
    const router = useRouter()
    const moduleStore = useModuleStore()
    const moduleUrl = ref('')
    const autoUpdateModules = ref(localStorage.getItem('autoUpdateModules') === 'true')
    const enableModuleNotifications = ref(localStorage.getItem('enableModuleNotifications') !== 'false')
    const isLoading = ref(false)
    const error = ref(null)

    // Map modules to display format with all metadata
    const modules = computed(() => moduleStore.modules.map(m => ({
      id: m.id,
      name: m.metadata.sourceName,
      description: `${m.metadata.type || 'Media'} - ${m.metadata.language}`,
      version: m.metadata.version,
      enabled: m.isEnabled,
      isActive: m.isActive,
      icon: m.metadata.iconUrl,
      author: m.metadata.author,
      baseUrl: m.metadata.baseUrl,
      streamType: m.metadata.streamType,
      quality: m.metadata.quality,
      features: [
        m.metadata.softsub && 'Soft Subtitles',
        m.metadata.multiStream && 'Multiple Streams',
        m.metadata.multiSubs && 'Multiple Subtitles',
        m.metadata.novel && 'Novel Support',
        m.metadata.asyncJS && 'Async Loading'
      ].filter(Boolean)
    })))

    async function toggleModule(module) {
      try {
        // Toggle enabled state
        await moduleStore.setModuleEnabled(module.id, !module.enabled)
        
        // If disabling, make sure it's not active
        if (!module.enabled && module.isActive) {
          await moduleStore.setModuleActive(null)
        }
        // If enabling, always set as active
        else if (!module.enabled) { // We are enabling it now
          await moduleStore.setModuleActive(module.id)
        }
      } catch (error) {
        console.error('Failed to toggle module:', error)
        throw error
      }
    }

    const removeModule = async (module) => {
      if (confirm(`Remove ${module.name}?`)) {
        try {
          const mod = moduleStore.modules.find(m => m.id === module.id)
          if (mod) {
            await moduleManager.removeModule(mod)
          }
        } catch (err) {
          error.value = `Failed to remove module: ${err.message}`
        }
      }
    }

    const addModule = async () => {
      if (!moduleUrl.value.trim()) return
      
      isLoading.value = true
      error.value = null
      
      try {
        await moduleManager.addModule(moduleUrl.value.trim())
        moduleUrl.value = ''
      } catch (err) {
        error.value = `Failed to add module: ${err.message}`
      } finally {
        isLoading.value = false
      }
    }

    const openModuleLibrary = () => {
      window.open('https://library.cufiy.net/library/', '_blank')
    }

    const updateAutoUpdate = () => {
      localStorage.setItem('autoUpdateModules', autoUpdateModules.value)
    }

    const updateNotifications = () => {
      localStorage.setItem('enableModuleNotifications', enableModuleNotifications.value)
    }

    const refreshAllModules = async () => {
      isLoading.value = true
      error.value = null
      
      try {
        await moduleManager.refreshModules()
      } catch (err) {
        error.value = `Failed to refresh modules: ${err.message}`
      } finally {
        isLoading.value = false
      }
    }

    const goBack = () => {
      router.replace('/settings')
    }

    // Auto-update modules on mount if enabled
    onMounted(async () => {
      if (autoUpdateModules.value) {
        await refreshAllModules()
      }
    })

    return {
      modules,
      moduleUrl,
      autoUpdateModules,
      enableModuleNotifications,
      isLoading,
      error,
      goBack,
      toggleModule,
      removeModule,
      addModule,
      openModuleLibrary,
      updateAutoUpdate,
      updateNotifications,
      refreshAllModules
    }
  }
}
</script>

<style scoped>
/* Component-specific styles that aren't covered by shared styles */

/* Empty State */
.empty-state {
  padding: 3rem 2rem;
}

.empty-content {
  text-align: center;
  color: var(--text-secondary);
}

.empty-content p {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 500;
}

/* Module Item Row */
.module-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  min-height: 80px;
}

.module-item-row.loading {
  opacity: 0.5;
  pointer-events: none;
}

.module-info {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
}

.module-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.module-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.module-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.module-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.module-version {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  padding: 2px 6px;
  background-color: var(--background-tertiary);
  border-radius: 4px;
}

.module-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.author-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.module-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.feature-tag {
  font-size: 0.8rem;
  padding: 2px 8px;
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
  border-radius: 4px;
}

.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--background-secondary);
}

.module-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.module-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-button {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button.enabled {
  background-color: var(--success-color);
  color: white;
}

.toggle-button.disabled {
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
}

.toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Add Module Container */
.add-module-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.add-module-container.loading {
  opacity: 0.5;
}

.module-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.module-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.module-input::placeholder {
  color: var(--text-tertiary);
}

/* Icon overrides for this component */
.icon-trash::before { content: '🗑️'; }

@media (max-width: 768px) {
  .module-item-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem 0;
  }

  .module-info {
    width: 100%;
  }

  .module-actions {
    width: 100%;
    justify-content: space-between;
  }

  .add-module-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .module-input {
    width: 100%;
  }

  .settings-action-button {
    width: 100%;
    justify-content: center;
  }
}

/* Add new styles */
.error-message {
  background-color: var(--error-color);
  color: white;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 8px;
  text-align: center;
}

.loading-indicator {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
}
</style> 