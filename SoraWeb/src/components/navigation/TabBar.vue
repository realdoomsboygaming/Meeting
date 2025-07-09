<template>
  <div class="tab-bar">
    <router-link 
      v-for="tab in tabs" 
      :key="tab.name"
      :to="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab.path) }"
    >
      <span class="tab-label">{{ tab.label }}</span>
    </router-link>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'TabBar',
  setup() {
    const route = useRoute()
    
    const tabs = [
      { name: 'library', path: '/library', label: 'Library' },
      { name: 'search', path: '/search', label: 'Search' },
      { name: 'settings', path: '/settings', label: 'Settings' }
    ]
    
    const isActive = (path) => {
      // Handle settings routes - highlight tab for any settings page
      if (path === '/settings') {
        return route.path.startsWith('/settings')
      }
      
      // For other routes, check if current path starts with the tab path
      return route.path.startsWith(path) || route.path === path
    }
    
    return {
      tabs,
      isActive
    }
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  background: var(--background-card);
  border-top: 1px solid var(--border-color);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999; /* Ensure it's always on top */
  height: 80px; /* Fixed height for consistent spacing */
  padding-bottom: env(safe-area-inset-bottom);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-xs);
  text-decoration: none;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  height: 100%; /* Fill the tab bar height */
  position: relative;
  border-radius: var(--ios-radius-button);
  margin: var(--spacing-xs);
}

.tab-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--accent-color-tertiary);
  border-radius: var(--ios-radius-button);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.tab-item.active {
  color: var(--accent-color);
  font-weight: var(--font-weight-medium);
}

.tab-item.active::before {
  opacity: 1;
}

.tab-item:hover:not(.active) {
  color: var(--text-secondary);
  background: var(--background-tertiary);
}

.tab-item:active {
  transform: scale(0.95);
}

.tab-label {
  font-size: var(--font-size-caption);
  font-weight: inherit;
  z-index: 1;
  position: relative;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (max-width: 320px) {
  .tab-bar {
    height: 70px; /* Slightly smaller on very small screens */
  }
  
  .tab-label {
    font-size: var(--font-size-footnote);
  }
  
  .tab-item {
    padding: var(--spacing-xs);
  }
}
</style> 