// Import stores using ES6 imports
import { useSettingsStore } from '../stores/settings-store'
import { useSearchStore } from '../stores/search-store'
import { useLibraryStore } from '../stores/library-store'
import { usePlayerStore } from '../stores/player-store'
import { useModuleStore } from '../stores/module-store'

// Store instances cache
let settingsStore, searchStore, libraryStore, playerStore, moduleStore

function getStores() {
  if (!settingsStore) {
    settingsStore = useSettingsStore()
    searchStore = useSearchStore()
    libraryStore = useLibraryStore()
    playerStore = usePlayerStore()
    moduleStore = useModuleStore()
  }
  
  return { settingsStore, searchStore, libraryStore, playerStore, moduleStore }
}

// Route parameter validation schemas
const routeValidators = {
  mediaId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
  episodeId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
  searchQuery: (value) => value && value.trim().length > 0,
  time: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 0
}

// Route state synchronization handlers
export const routeStateHandlers = {
  // Handle search route state
  async handleSearchRoute(to, from, next) {
    const { searchStore } = getStores()
    
    if (to.query.q) {
      // Validate search query
      if (!routeValidators.searchQuery(to.query.q)) {
        next({ name: 'Search' })
        return false
      }
      
      // Set search filters from URL
      if (to.query.type) searchStore.mediaType = to.query.type
      if (to.query.year) searchStore.year = to.query.year
      if (to.query.module) {
        searchStore.selectedModules = [to.query.module]
      }
      
      // Perform search if query is different
      if (searchStore.searchQuery !== to.query.q) {
        await searchStore.performSearch(to.query.q)
      }
    }
    
    return true
  },
  
  // Handle media info route state
  async handleMediaRoute(to, from, next) {
    // The id is a URL-encoded href, so the simple regex validation was failing.
    // The parameter is encoded, so it is safe to pass.
    // if (!routeValidators.mediaId(to.params.id)) {
    //   next({ name: 'Library' })
    //   return false
    // }
    
    // Could preload media data here
    console.log(`Preparing media view for: ${to.params.id}`)
    
    // Validate and set default tab
    const validTabs = ['episodes', 'details', 'cast', 'recommendations']
    if (to.query.tab && !validTabs.includes(to.query.tab)) {
      next({ 
        name: 'MediaInfo', 
        params: to.params, 
        query: { ...to.query, tab: 'episodes' } 
      })
      return false
    }
    
    return true
  },
  
  // Handle player route state
  async handlePlayerRoute(to, from, next) {
    const { playerStore } = getStores()
    
    // Validate required parameters
    if (!routeValidators.mediaId(to.params.mediaId)) {
      next({ name: 'Library' })
      return false
    }
    
    // Validate optional episode ID
    if (to.params.episodeId && !routeValidators.episodeId(to.params.episodeId)) {
      next({ 
        name: 'Player', 
        params: { mediaId: to.params.mediaId } 
      })
      return false
    }
    
    // Validate time parameter
    if (to.query.t && !routeValidators.time(to.query.t)) {
      const cleanQuery = { ...to.query }
      delete cleanQuery.t
      next({ 
        name: 'Player', 
        params: to.params, 
        query: cleanQuery 
      })
      return false
    }
    
    // Set player state from URL parameters
    if (to.query.quality) {
      playerStore.selectedQuality = to.query.quality
    }
    if (to.query.subtitle) {
      playerStore.selectedSubtitle = to.query.subtitle
    }
    
    return true
  },
  
  // Handle library route state
  async handleLibraryRoute(to, from, next) {
    const { libraryStore } = getStores()
    
    // Apply URL filters to library
    if (to.query.filter) {
      libraryStore.updateLibraryFilter(to.query.filter)
    }
    if (to.query.sort) {
      libraryStore.updateLibrarySortBy(to.query.sort)
      if (to.query.order) {
        libraryStore.updateLibrarySortOrder(to.query.order)
      }
    }
    
    return true
  },
  
  // Handle settings route state
  async handleSettingsRoute(to, from, next) {
    const { settingsStore, moduleStore } = getStores()
    
    // Handle module-specific settings
    if (to.query.module) {
      // Find module by ID
      const module = moduleStore.modules.find(m => m.id === to.query.module)
      
      if (!module) {
        // Module doesn't exist, redirect to general settings
        next({ name: 'SettingsGeneral' })
        return false
      }
    }
    
    return true
  }
}

// Advanced navigation guard functions
export const navigationGuards = {
  // Global before guard with state synchronization
  async beforeEach(to, from, next) {
    // Update document title with breadcrumb support
    updateDocumentTitle(to)
    
    // Handle authentication check
    if (to.meta.requiresAuth && !checkAuthStatus()) {
      next({ name: 'Library' })
      return
    }
    
    // Route-specific state handlers
    let canProceed = true
    
    switch (to.name) {
      case 'Search':
        canProceed = await routeStateHandlers.handleSearchRoute(to, from, next)
        break
      case 'MediaInfo':
        canProceed = await routeStateHandlers.handleMediaRoute(to, from, next)
        break
      case 'Player':
        canProceed = await routeStateHandlers.handlePlayerRoute(to, from, next)
        break
      case 'Library':
        canProceed = await routeStateHandlers.handleLibraryRoute(to, from, next)
        break
      case 'SettingsModules':
        canProceed = await routeStateHandlers.handleSettingsRoute(to, from, next)
        break
    }
    
    if (!canProceed) {
      return // Navigation was redirected by handler
    }
    
    // Store navigation for analytics and history
    storeNavigationHistory(to, from)
    
    // Update URL with clean parameters
    cleanUrlParameters(to, from, next)
    
    next()
  },
  
  // Global after guard for post-navigation setup
  afterEach(to, from) {
    // Update app theme based on route
    updateRouteTheme(to)
    
    // Handle fullscreen mode
    handleFullscreenMode(to)
    
    // Update browser history state
    updateBrowserState(to)
    
    // Analytics tracking
    trackPageView(to, from)
    
    // Performance monitoring
    measureNavigationPerformance(to, from)
  },
  
  // Route leave guard for cleanup
  beforeRouteLeave(to, from, next) {
    // Handle unsaved changes warning
    if (hasUnsavedChanges(from)) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) {
        next(false)
        return
      }
    }
    
    // Cleanup route-specific state
    cleanupRouteState(from)
    
    next()
  }
}

// Helper functions
function updateDocumentTitle(to) {
  const baseTitle = 'Sora'
  let title = baseTitle
  
  if (to.meta.title) {
    title = `${to.meta.title} - ${baseTitle}`
  }
  
  // Add breadcrumb for nested routes
  if (to.matched.length > 1) {
    const breadcrumbs = to.matched
      .filter(route => route.meta.title)
      .map(route => route.meta.title)
    
    if (breadcrumbs.length > 1) {
      title = `${breadcrumbs.join(' / ')} - ${baseTitle}`
    }
  }
  
  document.title = title
}

function checkAuthStatus() {
  // Placeholder for future authentication logic
  return true
}

function storeNavigationHistory(to, from) {
  try {
    const history = JSON.parse(localStorage.getItem('sora-nav-history') || '[]')
    
    if (from.name && from.name !== to.name) {
      const historyItem = {
        path: from.path,
        name: from.name,
        params: from.params,
        query: from.query,
        timestamp: new Date().toISOString(),
        title: from.meta.title || from.name
      }
      
      history.unshift(historyItem)
      
      // Keep only last 20 entries
      if (history.length > 20) {
        history.splice(20)
      }
      
      localStorage.setItem('sora-nav-history', JSON.stringify(history))
    }
  } catch (error) {
    console.error('Failed to store navigation history:', error)
  }
}

function cleanUrlParameters(to, from, next) {
  // Remove empty or invalid query parameters
  const cleanQuery = {}
  let hasChanges = false
  
  for (const [key, value] of Object.entries(to.query)) {
    if (value && value !== '' && value !== 'undefined') {
      cleanQuery[key] = value
    } else {
      hasChanges = true
    }
  }
  
  // Redirect with clean parameters if needed
  if (hasChanges) {
    next({
      name: to.name,
      params: to.params,
      query: cleanQuery,
      replace: true
    })
    return false
  }
  
  return true
}

function updateRouteTheme(to) {
  const { settingsStore } = getStores()
  const body = document.body
  
  // Remove previous route classes
  body.classList.remove('route-library', 'route-search', 'route-player', 'route-settings')
  
  // Add current route class
  if (to.name) {
    body.classList.add(`route-${to.name.toLowerCase()}`)
  }
  
  // Handle fullscreen mode
  if (to.meta.fullscreen) {
    body.classList.add('route-fullscreen')
  } else {
    body.classList.remove('route-fullscreen')
  }
}

function handleFullscreenMode(to) {
  const { playerStore } = getStores()
  
  if (to.meta.fullscreen) {
    playerStore.isFullscreen = true
    
    // Hide system UI elements
    document.documentElement.style.setProperty('--system-ui', 'none')
  } else {
    playerStore.isFullscreen = false
    
    // Show system UI elements
    document.documentElement.style.removeProperty('--system-ui')
  }
}

function updateBrowserState(to) {
  // Update browser state for better back/forward behavior
  if (window.history && window.history.replaceState) {
    const state = {
      name: to.name,
      params: to.params,
      query: to.query,
      timestamp: Date.now()
    }
    
    window.history.replaceState(state, document.title, to.fullPath)
  }
}

function trackPageView(to, from) {
  // Analytics tracking placeholder
  console.log(`Page view: ${to.name}`, {
    from: from.name,
    path: to.path,
    params: to.params,
    query: to.query
  })
  
  // Could integrate with analytics services here
}

function measureNavigationPerformance(to, from) {
  // Performance monitoring
  if (window.performance && window.performance.mark) {
    window.performance.mark(`nav-${to.name}-start`)
    
    // Measure after DOM is ready
    setTimeout(() => {
      window.performance.mark(`nav-${to.name}-end`)
      window.performance.measure(
        `navigation-${to.name}`,
        `nav-${to.name}-start`,
        `nav-${to.name}-end`
      )
    }, 0)
  }
}

function hasUnsavedChanges(route) {
  // Check for unsaved changes in forms or settings
  const { settingsStore } = getStores()
  
  // Add logic to check for unsaved changes
  return false
}

function cleanupRouteState(route) {
  // Cleanup route-specific state
  if (route.name === 'Player') {
    // Could pause player or save progress
    const { playerStore } = getStores()
    // playerStore.pause()
  }
} 