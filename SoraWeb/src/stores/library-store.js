import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLibraryStore = defineStore('library', () => {
  // Continue Watching State
  const continueWatching = ref([])
  const continueReading = ref([])
  
  // Bookmarks and Collections
  const bookmarks = ref([])
  const collections = ref([])
  const watchlist = ref([])
  
  // Library Filters and Sorting
  const libraryFilter = ref('all') // 'all', 'watching', 'completed', 'on-hold', 'dropped'
  const librarySortBy = ref('last-watched') // 'last-watched', 'title', 'date-added'
  const librarySortOrder = ref('desc') // 'asc', 'desc'
  
  // Loading states
  const isLoadingLibrary = ref(false)
  const isLoadingContinueWatching = ref(false)

  // Computed getters
  const filteredLibrary = computed(() => {
    let items = [...bookmarks.value]
    
    if (libraryFilter.value !== 'all') {
      items = items.filter(item => item.status === libraryFilter.value)
    }
    
    // Sort items
    items.sort((a, b) => {
      let comparison = 0
      
      switch (librarySortBy.value) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'date-added':
          comparison = new Date(a.dateAdded) - new Date(b.dateAdded)
          break
        case 'last-watched':
        default:
          comparison = new Date(a.lastWatched || a.dateAdded) - new Date(b.lastWatched || b.dateAdded)
          break
      }
      
      return librarySortOrder.value === 'desc' ? -comparison : comparison
    })
    
    return items
  })
  
  const recentlyWatched = computed(() => {
    return continueWatching.value
      .filter(item => item.progress > 0)
      .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
      .slice(0, 10)
  })
  
  // Returns true if a media item with the given id is bookmarked
  const isBookmarked = (mediaId) => {
    return bookmarks.value.some(item => item.id === mediaId);
  };
  
  // Actions
  const loadLibraryData = async () => {
    isLoadingLibrary.value = true
    try {
      // Load from localStorage
      const savedBookmarks = localStorage.getItem('sora-bookmarks')
      const savedCollections = localStorage.getItem('sora-collections')
      const savedWatchlist = localStorage.getItem('sora-watchlist')
      
      if (savedBookmarks) {
        bookmarks.value = JSON.parse(savedBookmarks)
      }
      if (savedCollections) {
        collections.value = JSON.parse(savedCollections)
      }
      if (savedWatchlist) {
        watchlist.value = JSON.parse(savedWatchlist)
      }
    } catch (error) {
      console.error('Failed to load library data:', error)
    } finally {
      isLoadingLibrary.value = false
    }
  }
  
  const loadContinueWatching = async () => {
    isLoadingContinueWatching.value = true
    try {
      const savedContinueWatching = localStorage.getItem('sora-continue-watching')
      const savedContinueReading = localStorage.getItem('sora-continue-reading')
      
      if (savedContinueWatching) {
        continueWatching.value = JSON.parse(savedContinueWatching)
      }
      if (savedContinueReading) {
        continueReading.value = JSON.parse(savedContinueReading)
      }
    } catch (error) {
      console.error('Failed to load continue watching data:', error)
    } finally {
      isLoadingContinueWatching.value = false
    }
  }
  
  const addToBookmarks = (media) => {
    const existingIndex = bookmarks.value.findIndex(item => item.id === media.id)
    if (existingIndex === -1) {
      const bookmarkItem = {
        ...media,
        dateAdded: new Date().toISOString(),
        status: 'watching'
      }
      bookmarks.value.push(bookmarkItem)
      saveLibraryData()
    }
  }
  
  const removeFromBookmarks = (mediaId) => {
    const index = bookmarks.value.findIndex(item => item.id === mediaId)
    if (index > -1) {
      bookmarks.value.splice(index, 1)
      saveLibraryData()
    }
  }
  
  const updateBookmarkStatus = (mediaId, status) => {
    const item = bookmarks.value.find(item => item.id === mediaId)
    if (item) {
      item.status = status
      item.lastUpdated = new Date().toISOString()
      saveLibraryData()
    }
  }
  
  const addToContinueWatching = (media, episode, progress, totalDuration) => {
    const existingIndex = continueWatching.value.findIndex(
      item => item.mediaId === media.id && item.episodeId === episode.id
    )
    
    const continueItem = {
      mediaId: media.id,
      episodeId: episode.id,
      title: media.title,
      episodeTitle: episode.title,
      episodeNumber: episode.number,
      progress: progress,
      totalDuration: totalDuration,
      lastWatched: new Date().toISOString(),
      thumbnail: media.thumbnail || episode.thumbnail
    }
    
    if (existingIndex > -1) {
      continueWatching.value[existingIndex] = continueItem
    } else {
      continueWatching.value.unshift(continueItem)
    }
    
    // Keep only last 50 items
    if (continueWatching.value.length > 50) {
      continueWatching.value = continueWatching.value.slice(0, 50)
    }
    
    saveContinueWatching()
  }
  
  const removeContinueWatching = (mediaId, episodeId) => {
    const index = continueWatching.value.findIndex(
      item => item.mediaId === mediaId && item.episodeId === episodeId
    )
    if (index > -1) {
      continueWatching.value.splice(index, 1)
      saveContinueWatching()
    }
  }
  
  const createCollection = (name, description = '') => {
    const collection = {
      id: Date.now().toString(),
      name,
      description,
      items: [],
      createdAt: new Date().toISOString()
    }
    collections.value.push(collection)
    saveLibraryData()
    return collection
  }
  
  const addToCollection = (collectionId, media) => {
    const collection = collections.value.find(c => c.id === collectionId)
    if (collection && !collection.items.some(item => item.id === media.id)) {
      collection.items.push(media)
      saveLibraryData()
    }
  }
  
  const updateLibraryFilter = (filter) => {
    libraryFilter.value = filter
  }
  
  const updateLibrarySortBy = (sortBy) => {
    librarySortBy.value = sortBy
  }
  
  const updateLibrarySortOrder = (sortOrder) => {
    librarySortOrder.value = sortOrder
  }
  
  // Private save methods
  const saveLibraryData = () => {
    localStorage.setItem('sora-bookmarks', JSON.stringify(bookmarks.value))
    localStorage.setItem('sora-collections', JSON.stringify(collections.value))
    localStorage.setItem('sora-watchlist', JSON.stringify(watchlist.value))
  }
  
  const saveContinueWatching = () => {
    localStorage.setItem('sora-continue-watching', JSON.stringify(continueWatching.value))
    localStorage.setItem('sora-continue-reading', JSON.stringify(continueReading.value))
  }
  
  return {
    // State
    continueWatching,
    continueReading,
    bookmarks,
    collections,
    watchlist,
    libraryFilter,
    librarySortBy,
    librarySortOrder,
    isLoadingLibrary,
    isLoadingContinueWatching,
    
    // Computed
    filteredLibrary,
    recentlyWatched,
    isBookmarked,
    
    // Actions
    loadLibraryData,
    loadContinueWatching,
    addToBookmarks,
    removeFromBookmarks,
    updateBookmarkStatus,
    addToContinueWatching,
    removeContinueWatching,
    createCollection,
    addToCollection,
    updateLibraryFilter,
    updateLibrarySortBy,
    updateLibrarySortOrder,
  }
}, {
  persist: {
    paths: ['libraryFilter', 'librarySortBy', 'librarySortOrder']
  }
}) 