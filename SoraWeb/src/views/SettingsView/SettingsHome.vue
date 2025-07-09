<template>
  <div>
    <!-- Modules Section -->
    <div class="settings-category">
      <h2 class="category-title">MODULES</h2>
      <div class="settings-card">
        <router-link to="/settings/modules" class="settings-row module-preview-row" replace>
          <div class="module-preview">
            <div class="module-icon">
              <img v-if="selectedModule?.iconUrl" 
                   :src="selectedModule.iconUrl" 
                   :alt="selectedModule.name" 
                   class="module-image"
                   @error="$event.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📺</text></svg>'" />
              <div v-else class="module-placeholder">
                <i class="icon-cube"></i>
              </div>
            </div>
            <div class="module-info">
              <h3 class="module-name">
                {{ selectedModule?.name || 'No Module Selected' }}
              </h3>
              <p class="module-description">
                <template v-if="selectedModule">
                  {{ selectedModule.description }}
                  <span class="module-author" v-if="selectedModule.author">
                    by {{ selectedModule.author.name }}
                  </span>
                </template>
                <template v-else>
                  Tap to select a module
                </template>
              </p>
            </div>
            <div class="settings-arrow">
              <i class="icon-chevron-right"></i>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Main Settings Section -->
    <div class="settings-category">
      <h2 class="category-title">MAIN SETTINGS</h2>
      <div class="settings-card">
        <router-link to="/settings/general" class="settings-row" replace>
          <div class="settings-icon">
            <i class="icon-settings"></i>
          </div>
          <span class="settings-label">General Preferences</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </router-link>
        <div class="settings-divider"></div>
        <router-link to="/settings/player" class="settings-row" replace>
          <div class="settings-icon">
            <i class="icon-play-circle"></i>
          </div>
          <span class="settings-label">Video Player</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </router-link>
        <div class="settings-divider"></div>
        <router-link to="/settings/network" class="settings-row" replace>
          <div class="settings-icon">
            <i class="icon-globe"></i>
          </div>
          <span class="settings-label">Network</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </router-link>
        <div class="settings-divider"></div>
        <router-link to="/settings/trackers" class="settings-row" replace>
          <div class="settings-icon">
            <i class="icon-stack"></i>
          </div>
          <span class="settings-label">Trackers</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Data & Logs Section -->
    <div class="settings-category">
      <h2 class="category-title">DATA & LOGS</h2>
      <div class="settings-card">
        <div class="settings-row" @click="openDataManagement">
          <div class="settings-icon">
            <i class="icon-folder"></i>
          </div>
          <span class="settings-label">Data</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row" @click="openLogs">
          <div class="settings-icon">
            <i class="icon-document"></i>
          </div>
          <span class="settings-label">Logs</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row" @click="openBackupRestore">
          <div class="settings-icon">
            <i class="icon-refresh"></i>
          </div>
          <span class="settings-label">Backup & Restore</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="settings-category">
      <h2 class="category-title">INFO</h2>
      <div class="settings-card">
        <div class="settings-row" @click="showAbout">
          <div class="settings-icon">
            <i class="icon-info-circle"></i>
          </div>
          <span class="settings-label">About Sora</span>
          <div class="settings-arrow">
            <i class="icon-chevron-right"></i>
          </div>
        </div>
        <div class="settings-divider"></div>
        <a href="https://github.com/cranci1/Sora" target="_blank" class="settings-row external-link">
          <div class="settings-icon social-icon">
            <i class="icon-github"></i>
          </div>
          <span class="settings-label external">Sora GitHub Repository</span>
          <div class="settings-arrow">
            <i class="icon-external-link"></i>
          </div>
        </a>
        <div class="settings-divider"></div>
        <a href="https://discord.gg/x7hppDWFDZ" target="_blank" class="settings-row external-link">
          <div class="settings-icon social-icon">
            <i class="icon-message-circle"></i>
          </div>
          <span class="settings-label external">Join the Discord</span>
          <div class="settings-arrow">
            <i class="icon-external-link"></i>
          </div>
        </a>
        <div class="settings-divider"></div>
        <a href="https://github.com/cranci1/Sora/issues" target="_blank" class="settings-row external-link">
          <div class="settings-icon">
            <i class="icon-alert-circle"></i>
          </div>
          <span class="settings-label external">Report an Issue</span>
          <div class="settings-arrow">
            <i class="icon-external-link"></i>
          </div>
        </a>
        <div class="settings-divider"></div>
        <a href="https://github.com/cranci1/Sora/blob/dev/LICENSE" target="_blank" class="settings-row external-link">
          <div class="settings-icon">
            <i class="icon-file-text"></i>
          </div>
          <span class="settings-label external">License (GPLv3.0)</span>
          <div class="settings-arrow">
            <i class="icon-external-link"></i>
          </div>
        </a>
      </div>
    </div>

    <!-- App Version -->
    <div class="app-version">
      <p>Sora Web {{ appVersion }} by cranci1</p>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useModuleStore } from '@/stores/module-store'
import { useLibraryStore } from '@/stores/library-store'
import { useSettingsStore } from '@/stores/settings-store'

export default {
  name: 'SettingsHome',
  emits: ['openDataManagement', 'openLogs', 'openBackupRestore', 'showAbout'],
  setup(props, { emit }) {
    console.log('mounted', 'SettingsHome')
    const moduleStore = useModuleStore()
    const libraryStore = useLibraryStore()
    const settingsStore = useSettingsStore()

    const selectedModule = computed(() => {
      const active = moduleStore.activeModule
      if (!active) return null
      
      return {
        name: active.metadata.sourceName,
        iconUrl: active.metadata.iconUrl,
        description: `${active.metadata.type || 'Media'} - ${active.metadata.language}`,
        author: active.metadata.author
      }
    })
    const appVersion = computed(() => '1.0.1')

    // Emit events to parent component
    const openDataManagement = () => {
      emit('openDataManagement')
    }
    
    const openLogs = () => {
      emit('openLogs')
    }
    
    const openBackupRestore = () => {
      emit('openBackupRestore')
    }
    
    const showAbout = () => {
      emit('showAbout')
    }

    return {
      selectedModule,
      appVersion,
      openDataManagement,
      openLogs,
      openBackupRestore,
      showAbout
    }
  }
}
</script>

<style scoped>
/* ... existing styles ... */

.module-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--background-secondary);
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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  font-size: 24px;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-author {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin-left: 0.5rem;
}

.settings-arrow {
  color: var(--text-tertiary);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}
</style> 