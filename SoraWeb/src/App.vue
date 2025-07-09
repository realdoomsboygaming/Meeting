<template>
  <div id="app" class="min-h-screen bg-black text-white">
    <SplashView v-if="isLoading" @loading-complete="onLoadingComplete" />
    <div v-else class="app-container" :class="{ 'app-ready': !isLoading }">
      <main class="main-content">
        <RouterView />
      </main>
    </div>
    <TabBar v-if="showTabBar" />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from './stores/settings-store'
import { useLibraryStore } from './stores/library-store'
import { useSearchStore } from './stores/search-store'
import { useModuleStore } from './stores/module-store'
import { usePlayerStore } from './stores/player-store'
import SplashView from './views/SplashView/SplashView.vue'
import TabBar from './components/navigation/TabBar.vue'

export default {
  name: 'App',
  components: {
    SplashView,
    TabBar
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const settingsStore = useSettingsStore()
    const libraryStore = useLibraryStore()
    const searchStore = useSearchStore()
    const moduleStore = useModuleStore()
    const playerStore = usePlayerStore()
    const isLoading = ref(true)

    const showTabBar = computed(() => {
      // Show TabBar on mobile except for player routes
      const currentPath = route.path
      const isPlayerRoute = currentPath.startsWith('/player')
      
      // Always hide TabBar for player routes
      return !isPlayerRoute
    })

    const onLoadingComplete = () => {
      // Called by SplashView when loading animation completes
      isLoading.value = false
      console.log('🎉 App loading completed - ready for use!')
    }

    // Initialize stores
    const initializeStores = async () => {
      try {
        // Initialize other stores first
        await settingsStore.initialize()
        await libraryStore.initialize()
        await searchStore.initialize()
        
        // No need to initialize module store - it's handled by Pinia
      } catch (error) {
        Logger.error('Failed to initialize stores:', error)
      }
    }

    onMounted(async () => {
      try {
        // Initialize all app stores and data (runs during splash screen)
        console.log('🚀 Starting app initialization...')
        
        await Promise.all([
          settingsStore.initializeSettings(),
          libraryStore.loadLibraryData(),
          libraryStore.loadContinueWatching(),
          searchStore.initializeSearch(),
          playerStore.initializePlayer()
        ])
        
        console.log('✅ App stores initialized successfully')
        
        // Note: isLoading will be set to false by SplashView's loading-complete event
        // This ensures the splash screen timing is controlled by the SplashView component
        
      } catch (error) {
        console.error('❌ Failed to initialize app:', error)
        // On error, still allow app to load after a delay
        setTimeout(() => {
          isLoading.value = false
        }, 2000)
      }
    })

    return {
      isLoading,
      showTabBar,
      onLoadingComplete
    }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100vw;
  max-width: 100vw;
  margin: 0;
  box-shadow: none;
  background: var(--background-primary);
  position: relative;
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--transition-normal) var(--ease-out-ios);
}

.app-container.app-ready {
  opacity: 1;
  transform: translateY(0);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  transition: all var(--transition-fast);
  padding-bottom: calc(80px + env(safe-area-inset-bottom)); /* Ensure content never goes under TabBar */
  width: 100vw;
  max-width: 100vw;
}

/* Smooth entrance animation for navigation */
.app-ready .main-content {
  animation: contentFadeIn 0.6s var(--ease-out-ios) forwards;
}

@keyframes contentFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile layout - TabBar at bottom, no NavigationBar */
@media (max-width: 1023px) {
  .main-content {
    padding-bottom: calc(80px + env(safe-area-inset-bottom) + 20px); /* TabBar height + safe area + extra spacing */
  }
}

/* Very small screens */
@media (max-width: 320px) {
  .main-content {
    padding-bottom: calc(70px + env(safe-area-inset-bottom) + 20px); /* Smaller TabBar height + safe area + extra spacing */
  }
}

/* Desktop layout - NavigationBar at top, no TabBar */
@media (min-width: 1024px) {
  .main-content {
    padding-bottom: 20px; /* Just some bottom spacing */
  }
}

/* Ensure smooth transitions when themes change */
#app {
  transition: background-color var(--transition-normal), color var(--transition-normal);
}
</style> 