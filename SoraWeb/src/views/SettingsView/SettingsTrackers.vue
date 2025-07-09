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
      <h2>Tracking Services</h2>
      <p>Connect and manage your anime/manga tracking accounts</p>
    </div>

    <!-- Tracking Services -->
    <div v-for="tracker in trackers" :key="tracker.id" class="settings-category">
      <h3 class="category-title">{{ tracker.name.toUpperCase() }}</h3>
      <div class="settings-card">
        <!-- Service Status Row -->
        <div class="settings-form-row tracker-status-row">
          <div class="tracker-info">
            <div class="settings-icon tracker-service-icon">
              <img :src="tracker.icon" :alt="tracker.name" class="service-icon-image" />
            </div>
            <div class="tracker-details">
              <span class="tracker-name">{{ tracker.name }}</span>
              <span class="tracker-description">{{ tracker.description }}</span>
            </div>
          </div>
          <div class="tracker-status">
            <span :class="['status-badge', tracker.connected ? 'connected' : 'disconnected']">
              {{ tracker.connected ? 'Connected' : 'Not Connected' }}
            </span>
          </div>
        </div>

        <!-- Connection Section -->
        <div v-if="!tracker.connected">
          <div class="settings-divider"></div>
          <div class="settings-form-row">
            <div class="connect-section">
              <p style="margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.9rem;">
                Connect your {{ tracker.name }} account to sync your progress
              </p>
              <button @click="connectTracker(tracker)" class="settings-action-button primary">
                <i class="icon-external-link"></i>
                Connect {{ tracker.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Connected Section -->
        <div v-else>
          <!-- User Info -->
          <div v-if="tracker.user" class="settings-divider"></div>
          <div v-if="tracker.user" class="settings-form-row">
            <div class="user-info-container">
              <div class="user-avatar-container">
                <img :src="tracker.user.avatar" :alt="tracker.user.name" class="user-avatar" />
              </div>
              <div class="user-details">
                <span class="username">{{ tracker.user.name }}</span>
                <span class="user-stats">{{ tracker.user.stats }}</span>
              </div>
            </div>
          </div>

          <!-- Sync Settings -->
          <div class="settings-divider"></div>
          <div class="settings-form-row">
            <label class="settings-toggle">
              <input type="checkbox" v-model="tracker.autoSync" @change="updateAutoSync(tracker)" />
              <span>Auto-sync progress</span>
            </label>
          </div>

          <div class="settings-divider"></div>
          <div class="settings-form-row">
            <label class="settings-toggle">
              <input type="checkbox" v-model="tracker.syncCompleted" @change="updateSyncCompleted(tracker)" />
              <span>Mark as completed when finished</span>
            </label>
          </div>

          <div class="settings-divider"></div>
          <div class="settings-form-row">
            <label class="settings-toggle">
              <input type="checkbox" v-model="tracker.privateProgress" @change="updatePrivateProgress(tracker)" />
              <span>Keep progress private</span>
            </label>
          </div>

          <!-- Actions -->
          <div class="settings-divider"></div>
          <div class="settings-form-row">
            <div class="tracker-actions">
              <button @click="syncNow(tracker)" class="settings-action-button secondary">
                <i class="icon-refresh"></i>
                Sync Now
              </button>
              <button @click="disconnectTracker(tracker)" class="settings-action-button danger">
                <i class="icon-external-link"></i>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sync Settings -->
    <div class="settings-category">
      <h3 class="category-title">SYNC PREFERENCES</h3>
      <div class="settings-card">
        <div class="settings-form-row">
          <span class="settings-label">Sync Interval</span>
          <select v-model="syncInterval" @change="updateSyncInterval" class="settings-select">
            <option value="manual">Manual Only</option>
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every hour</option>
          </select>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input type="checkbox" v-model="enableSyncNotifications" @change="updateSyncNotifications" />
            <span>Enable sync notifications</span>
          </label>
        </div>
        
        <div class="settings-divider"></div>
        
        <div class="settings-form-row">
          <label class="settings-toggle">
            <input type="checkbox" v-model="syncOnAppStart" @change="updateSyncOnAppStart" />
            <span>Sync on app start</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings-store'

export default {
  name: 'SettingsTrackers',
  setup() {
    console.log('mounted', 'SettingsTrackers')
    const router = useRouter()
    const settingsStore = useSettingsStore()

    // Sync preferences
    const syncInterval = ref('manual')
    const enableSyncNotifications = ref(true)
    const syncOnAppStart = ref(false)

    const trackers = ref([
      {
        id: 'anilist',
        name: 'AniList',
        description: 'Track your anime and manga progress on AniList',
        icon: '/anilist-icon.png',
        connected: true,
        autoSync: true,
        syncCompleted: true,
        privateProgress: false,
        user: {
          name: 'TestUser',
          avatar: '/default-avatar.png',
          stats: '247 Completed • 15 Watching'
        }
      },
      {
        id: 'mal',
        name: 'MyAnimeList',
        description: 'Sync with MyAnimeList database',
        icon: '/mal-icon.png',
        connected: false,
        autoSync: false,
        syncCompleted: false,
        privateProgress: false,
        user: null
      },
      {
        id: 'trakt',
        name: 'Trakt',
        description: 'Track movies and TV shows on Trakt',
        icon: '/trakt-icon.png',
        connected: false,
        autoSync: false,
        syncCompleted: false,
        privateProgress: false,
        user: null
      }
    ])

    const connectTracker = (tracker) => {
      // Implement OAuth connection logic
      console.log(`Connecting to ${tracker.name}`)
      // For demo purposes, simulate connection
      tracker.connected = true
      tracker.user = {
        name: 'DemoUser',
        avatar: '/default-avatar.png',
        stats: 'Recently connected'
      }
      settingsStore.updateTrackerSettings(tracker.id, {
        connected: true,
        user: tracker.user
      })
    }

    const disconnectTracker = (tracker) => {
      if (confirm(`Disconnect from ${tracker.name}?`)) {
        tracker.connected = false
        tracker.user = null
        tracker.autoSync = false
        tracker.syncCompleted = false
        tracker.privateProgress = false
        
        settingsStore.updateTrackerSettings(tracker.id, {
          connected: false,
          user: null,
          autoSync: false,
          syncCompleted: false,
          privateProgress: false
        })
      }
    }

    const syncNow = (tracker) => {
      console.log(`Syncing with ${tracker.name}`)
      // Implement manual sync logic
    }

    const updateAutoSync = (tracker) => {
      settingsStore.updateTrackerSettings(tracker.id, {
        autoSync: tracker.autoSync
      })
    }

    const updateSyncCompleted = (tracker) => {
      settingsStore.updateTrackerSettings(tracker.id, {
        syncCompleted: tracker.syncCompleted
      })
    }

    const updatePrivateProgress = (tracker) => {
      settingsStore.updateTrackerSettings(tracker.id, {
        privateProgress: tracker.privateProgress
      })
    }

    const updateSyncInterval = () => {
      settingsStore.updateSettings({ syncInterval: syncInterval.value })
    }

    const updateSyncNotifications = () => {
      settingsStore.updateSettings({ enableSyncNotifications: enableSyncNotifications.value })
    }

    const updateSyncOnAppStart = () => {
      settingsStore.updateSettings({ syncOnAppStart: syncOnAppStart.value })
    }

    const goBack = () => {
      router.replace('/settings');
    }

    return {
      trackers,
      syncInterval,
      enableSyncNotifications,
      syncOnAppStart,
      goBack,
      connectTracker,
      disconnectTracker,
      syncNow,
      updateAutoSync,
      updateSyncCompleted,
      updatePrivateProgress,
      updateSyncInterval,
      updateSyncNotifications,
      updateSyncOnAppStart
    }
  }
}
</script>

<style scoped>
/* Component-specific styles that aren't covered by shared styles */

/* Tracker Status Row */
.tracker-status-row {
  min-height: 80px;
  align-items: center;
}

.tracker-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.tracker-service-icon {
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 0;
  overflow: hidden;
}

.service-icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 7px;
}

.tracker-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tracker-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.tracker-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.tracker-status {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.connected {
  background: var(--success-color);
  color: white;
}

.status-badge.disconnected {
  background: var(--background-quaternary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

/* Connect Section */
.connect-section {
  width: 100%;
  text-align: left;
}

/* User Info Container */
.user-info-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.user-avatar-container {
  flex-shrink: 0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.username {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.user-stats {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Tracker Actions */
.tracker-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.tracker-actions .settings-action-button {
  flex: 1;
  justify-content: center;
}

@media (max-width: 768px) {
  .tracker-status-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem 0;
  }

  .tracker-info {
    width: 100%;
  }

  .tracker-status {
    width: 100%;
    justify-content: flex-start;
  }

  .user-info-container {
    flex-direction: row;
    align-items: center;
  }

  .tracker-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .tracker-actions .settings-action-button {
    width: 100%;
  }
}
</style> 