import { createRouter, createWebHistory } from 'vue-router'

// Lazy load components for better performance
const LibraryView = () => import('../views/LibraryView/LibraryView.vue')
const SearchView = () => import('../views/SearchView/SearchView.vue')
const MediaInfoView = () => import('../views/MediaInfoView/MediaInfoView.vue')
const SettingsView = () => import('../views/SettingsView/SettingsView.vue')
const SplashView = () => import('../views/SplashView/SplashView.vue')

// Player and streaming components
const PlayerView = () => import('../views/PlayerView/PlayerView.vue')

// Settings subviews
const SettingsGeneral = () => import('../views/SettingsView/SettingsGeneral.vue')
const SettingsPlayer = () => import('../views/SettingsView/SettingsPlayer.vue')
const SettingsModules = () => import('../views/SettingsView/SettingsModules.vue')
const SettingsTrackers = () => import('../views/SettingsView/SettingsTrackers.vue')
const SettingsHome = () => import('../views/SettingsView/SettingsHome.vue')
const SettingsNetwork = () => import('../views/SettingsView/SettingsNetwork.vue')

// Library subviews
const AllWatching = () => import('../views/LibraryView/AllWatching.vue')
const AllReading = () => import('../views/LibraryView/AllReading.vue')
const BookmarkDetail = () => import('../views/LibraryView/BookmarkDetail.vue')
const CollectionDetail = () => import('../views/LibraryView/CollectionDetail.vue')

// TestNav component for /test navigation
const TestNav = {
  template: `
    <div>
      <nav style='margin-bottom: 1em;'>
        <router-link to="/test" style='margin-right: 1em;'>Home</router-link>
        <router-link to="/test/a" style='margin-right: 1em;'>A</router-link>
        <router-link to="/test/b">B</router-link>
      </nav>
      <router-view :key="$route.fullPath" />
    </div>
  `
}

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/library'
  },
  
  // Library routes with deep linking
  {
    path: '/library',
    name: 'Library',
    component: LibraryView,
    meta: {
      title: 'Library',
      showTabBar: true,
      requiresAuth: false
    },
    children: [
      {
        path: 'continue-watching',
        name: 'ContinueWatching',
        component: AllWatching,
        meta: { title: 'Continue Watching' }
      },
      {
        path: 'continue-reading', 
        name: 'ContinueReading',
        component: AllReading,
        meta: { title: 'Continue Reading' }
      },
      {
        path: 'bookmark/:id',
        name: 'BookmarkDetail',
        component: BookmarkDetail,
        props: true,
        meta: { title: 'Bookmark Details' }
      },
      {
        path: 'collection/:id',
        name: 'CollectionDetail', 
        component: CollectionDetail,
        props: true,
        meta: { title: 'Collection' }
      }
    ]
  },
  
  // Search routes with deep linking support
  {
    path: '/search',
    name: 'Search',
    component: SearchView,
    meta: {
      title: 'Search',
      showTabBar: true
    },
    // Support search query parameters
    beforeEnter: (to, from, next) => {
      // Handle search query from URL parameters
      if (to.query.q) {
        // The SearchView component will handle the query parameter
        to.meta.searchQuery = to.query.q
      }
      next()
    }
  },
  
  // Media info with comprehensive deep linking
  {
    path: '/media/:id',
    name: 'MediaInfo',
    component: MediaInfoView,
    props: route => ({
      id: route.params.id,
      tab: route.query.tab || 'episodes',
      season: route.query.season || '1'
    }),
    meta: {
      title: 'Media Details',
      showTabBar: false
    }
  },
  
  // Player routes with episode/chapter support
  {
    path: '/player/:mediaId/:episodeId?',
    name: 'Player',
    component: PlayerView,
    props: route => ({
      mediaId: route.params.mediaId,
      episodeId: route.params.episodeId,
      time: route.query.t ? parseInt(route.query.t) : 0,
      quality: route.query.quality || 'auto',
      subtitle: route.query.subtitle || 'off'
    }),
    meta: {
      title: 'Now Playing',
      showTabBar: false,
      fullscreen: true
    }
  },
  
  // Settings routes (now nested for correct navigation)
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      title: 'Settings',
      showTabBar: true
    },
    children: [
      {
        path: '',
        name: 'SettingsHome',
        component: SettingsHome,
        meta: {
          title: 'Settings Home',
          showTabBar: true
        }
      },
      {
        path: 'general',
        name: 'SettingsGeneral',
        component: SettingsGeneral,
        meta: { 
          title: 'General Settings',
          showTabBar: true 
        }
      },
      {
        path: 'player',
        name: 'SettingsPlayer',
        component: SettingsPlayer,
        meta: { 
          title: 'Player Settings',
          showTabBar: true 
        }
      },
      {
        path: 'modules',
        name: 'SettingsModules',
        component: SettingsModules,
        meta: { 
          title: 'Module Settings',
          showTabBar: true 
        }
      },
      {
        path: 'trackers',
        name: 'SettingsTrackers',
        component: SettingsTrackers,
        meta: { 
          title: 'Tracker Settings',
          showTabBar: true 
        }
      },
      {
        path: 'network',
        name: 'SettingsNetwork',
        component: SettingsNetwork,
        meta: {
          title: 'Network Settings',
          showTabBar: true
        }
      }
    ]
  },
  
  // Deep linking for direct media access
  {
    path: '/watch/:mediaId/:episodeId?',
    redirect: to => {
      return {
        name: 'Player',
        params: { 
          mediaId: to.params.mediaId,
          episodeId: to.params.episodeId 
        },
        query: to.query
      }
    }
  },
  
  // Deep linking for search with query
  {
    path: '/search/:query',
    redirect: to => {
      return {
        name: 'Search',
        query: { q: to.params.query }
      }
    }
  },
  
  // Module-specific routes for compatibility
  {
    path: '/module/:moduleId/:action?',
    name: 'ModuleAction',
    beforeEnter: (to, from, next) => {
      // Handle module-specific actions and redirect appropriately
      const { moduleId, action } = to.params
      
      if (action === 'search') {
        next({ name: 'Search', query: { module: moduleId } })
      } else if (action === 'settings') {
        next({ name: 'SettingsModules', query: { module: moduleId } })
      } else {
        next({ name: 'Settings' })
      }
    }
  },
  
  // Splash screen
  {
    path: '/splash',
    name: 'Splash',
    component: SplashView,
    meta: {
      title: 'Loading',
      showTabBar: false
    }
  },
  
  // Test routes for debugging
  {
    path: '/test',
    component: TestNav,
    children: [
      { path: '', component: { template: '<div>Test Home</div>' } },
      { path: 'a', component: { template: '<div>Test A</div>' } },
      { path: 'b', component: { template: '<div>Test B</div>' } }
    ]
  },
  
  // 404 handler
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/library'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Handle scroll behavior for better UX
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Import navigation guards
import { navigationGuards } from './guards'

// Set up navigation guards
router.beforeEach(navigationGuards.beforeEach)
router.afterEach(navigationGuards.afterEach)
router.beforeResolve(navigationGuards.beforeRouteLeave)

// Utility functions for programmatic navigation with deep linking
export const navigationHelpers = {
  // Navigate to media with specific tab and season
  goToMedia(mediaId, options = {}) {
    const { tab = 'episodes', season = '1' } = options
    return router.push({
      name: 'MediaInfo',
      params: { id: mediaId },
      query: { tab, season }
    })
  },
  
  // Navigate to player with timestamp and quality
  goToPlayer(mediaId, episodeId, options = {}) {
    const { time = 0, quality = 'auto', subtitle = 'off' } = options
    return router.push({
      name: 'Player',
      params: { mediaId, episodeId },
      query: { t: time, quality, subtitle }
    })
  },
  
  // Navigate to search with query and filters
  goToSearch(query, options = {}) {
    const { module, type, year } = options
    const queryParams = { q: query }
    
    if (module) queryParams.module = module
    if (type) queryParams.type = type
    if (year) queryParams.year = year
    
    return router.push({
      name: 'Search',
      query: queryParams
    })
  },
  
  // Navigate to library section
  goToLibrarySection(section) {
    const sectionRoutes = {
      'continue-watching': 'ContinueWatching',
      'continue-reading': 'ContinueReading'
    }
    
    const routeName = sectionRoutes[section]
    if (routeName) {
      return router.push({ name: routeName })
    } else {
      return router.push({ name: 'Library' })
    }
  },
  
  // Generate shareable URLs
  generateShareUrl(routeName, params = {}, query = {}) {
    const route = router.resolve({
      name: routeName,
      params,
      query
    })
    return `${window.location.origin}${route.href}`
  },
  
  // Parse and navigate from external deep link
  handleDeepLink(url) {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname
      const searchParams = new URLSearchParams(urlObj.search)
      
      // Convert search params to query object
      const query = {}
      for (const [key, value] of searchParams.entries()) {
        query[key] = value
      }
      
      return router.push({ path, query })
    } catch (error) {
      console.error('Failed to handle deep link:', error)
      return router.push({ name: 'Library' })
    }
  }
}

export default router 