<template>
  <nav class="tab-bar" v-show="isVisible">
    <div class="tab-bar-container">
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab-item"
        :class="{ active: isActiveTab(tab.path) }"
      >
        <div class="tab-icon">
          <component :is="tab.icon" />
        </div>
        <span class="tab-label">{{ tab.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  PlayIcon,
  Cog6ToothIcon
} from '@heroicons/vue/24/outline'

export default {
  name: 'TabBar',
  components: {
    HomeIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    PlayIcon,
    Cog6ToothIcon
  },
  setup() {
    const route = useRoute()

    const tabs = [
      { name: 'home', label: 'Home', path: '/library', icon: 'HomeIcon' },
      { name: 'search', label: 'Search', path: '/search', icon: 'MagnifyingGlassIcon' },
      { name: 'library', label: 'Library', path: '/library', icon: 'BookOpenIcon' },
      { name: 'player', label: 'Player', path: '/player', icon: 'PlayIcon' },
      { name: 'settings', label: 'Settings', path: '/settings/general', icon: 'Cog6ToothIcon' }
    ]

    const isVisible = computed(() => {
      // Hide on player routes
      return !route.path.startsWith('/player')
    })

    const isActiveTab = (tabPath) => {
      if (tabPath === '/settings/general') {
        return route.path.startsWith('/settings')
      }
      return route.path === tabPath
    }

    return {
      tabs,
      isVisible,
      isActiveTab
    }
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(242, 242, 247, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.2);
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Ensure it works with mobile browsers */
  padding-bottom: env(safe-area-inset-bottom, 0);
}

@media (min-width: 1024px) {
  .tab-bar {
    display: none;
  }
}

@media (max-width: 640px) {
  .tab-bar {
    height: 60px;
  }
}

.tab-bar-container {
  display: flex;
  width: 100%;
  max-width: 500px;
  justify-content: space-around;
  align-items: center;
  padding: 0 20px;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #8e8e93;
  transition: color 0.2s ease;
  padding: 4px 8px;
  min-width: 44px;
}

.tab-item.active {
  color: #007aff;
}

.tab-item:hover {
  color: #007aff;
}

.tab-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  line-height: 1;
}

@media (max-width: 640px) {
  .tab-icon {
    width: 22px;
    height: 22px;
  }
  
  .tab-label {
    font-size: 9px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .tab-bar {
    background: rgba(28, 28, 30, 0.8);
    border-top-color: rgba(255, 255, 255, 0.2);
  }
  
  .tab-item {
    color: #8e8e93;
  }
  
  .tab-item.active {
    color: #0a84ff;
  }
  
  .tab-item:hover {
    color: #0a84ff;
  }
}
</style> 