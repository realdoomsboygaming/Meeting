<template>
  <nav class="navigation-bar">
    <div class="nav-content">
      <router-link to="/library" class="nav-brand">
        <h1>Sora</h1>
      </router-link>
      
      <div class="nav-actions">
        <button class="nav-button" @click="toggleSearch">
          Search
        </button>
        <button class="nav-button" @click="goToSettings">
          Settings
        </button>
      </div>
    </div>
  </nav>
</template>

<script>
import { useRouter } from 'vue-router'

export default {
  name: 'NavigationBar',
  setup() {
    const router = useRouter()
    
    const toggleSearch = () => {
      router.push('/search')
    }
    
    const goToSettings = () => {
      router.push('/settings')
    }
    
    return {
      toggleSearch,
      goToSettings
    }
  }
}
</script>

<style scoped>
.navigation-bar {
  background: var(--background-card);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ios-padding-sm);
  max-width: 1200px;
  margin: 0 auto;
}

.nav-brand h1 {
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-semibold);
  color: var(--accent-color);
  transition: color var(--transition-fast);
}

.nav-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.nav-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--background-tertiary);
  border-radius: var(--ios-radius-button);
  color: var(--text-primary);
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  border: 1px solid var(--border-color);
}

.nav-button:hover {
  background: var(--background-quaternary);
  border-color: var(--accent-color-tertiary);
  transform: translateY(-1px);
}

.nav-button:active {
  transform: translateY(0);
  background: var(--background-elevated);
}

/* Hide NavigationBar on mobile/tablet, show on desktop */
@media (max-width: 1023px) {
  .navigation-bar {
    display: none;
  }
}

/* Desktop-only styling adjustments */
@media (min-width: 1200px) {
  .nav-content {
    padding: var(--ios-padding-md);
  }
}
</style> 