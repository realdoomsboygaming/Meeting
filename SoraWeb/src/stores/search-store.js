import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useModuleStore } from './module-store'
import moduleExecutor from '../services/ModuleExecutor'
import Logger from '../utils/Logger'

export const useSearchStore = defineStore('search', () => {
  const moduleStore = useModuleStore()
  
  // Search State
  const searchQuery = ref('')
  const searchResults = ref([])
  const searchHistory = ref([])
  const isSearching = ref(false)
  const hasSearched = ref(false)
  const searchError = ref(null)
  
  // Search Suggestions and Autocomplete
  const searchSuggestions = ref([])
  const isLoadingSuggestions = ref(false)
  
  // Pagination
  const currentPage = ref(1)
  const totalPages = ref(1)
  const resultsPerPage = ref(20)
  
  const recentSearches = computed(() => {
    return searchHistory.value
      .slice(-10)
      .reverse()
  })
  
  const hasResults = computed(() => {
    return searchResults.value.length > 0
  })
  
  const totalResults = computed(() => {
    return searchResults.value.length
  })
  
  // Actions
  const initializeSearch = async () => {
    try {
      const savedHistory = localStorage.getItem('sora-search-history')
      
      if (savedHistory) {
        searchHistory.value = JSON.parse(savedHistory)
      }
    } catch (error) {
      Logger.error('Failed to initialize search:', error)
    }
  }
  
  const performSearch = async (query, options = {}) => {
    if (!query.trim()) return
    
    isSearching.value = true
    searchQuery.value = query
    currentPage.value = 1
    searchError.value = null
    
    try {
      // Add to search history
      addToSearchHistory(query)
      
      // Get active module
      const activeModule = moduleStore.activeModule
      if (!activeModule) {
        throw new Error('No active module selected')
      }
      
      // Perform search using module executor
      const results = await moduleExecutor.executeSearch(
        activeModule,
        query,
        {
          ...options,
          page: currentPage.value,
          resultsPerPage: resultsPerPage.value
        }
      )
      
      searchResults.value = results
      hasSearched.value = true
      
      // Save search filters
      saveSearchHistory()
      
    } catch (error) {
      Logger.error('Search failed:', error)
      searchError.value = error.message
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }
  
  const loadMoreResults = async () => {
    if (currentPage.value >= totalPages.value) return
    
    isSearching.value = true
    currentPage.value += 1
    
    try {
      // Get active module
      const activeModule = moduleStore.activeModule
      if (!activeModule) {
        throw new Error('No active module selected')
      }
      
      // Perform search with pagination
      const results = await moduleExecutor.executeSearch(
        activeModule,
        searchQuery.value,
        {
          page: currentPage.value,
          resultsPerPage: resultsPerPage.value
        }
      )
      
      searchResults.value.push(...results)
      
    } catch (error) {
      Logger.error('Failed to load more results:', error)
      currentPage.value -= 1 // Revert page increment
    } finally {
      isSearching.value = false
    }
  }
  
  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
    hasSearched.value = false
    currentPage.value = 1
    searchError.value = null
  }
  
  const clearSearchHistory = () => {
    searchHistory.value = []
    localStorage.removeItem('sora-search-history')
  }
  
  const removeFromHistory = (query) => {
    const index = searchHistory.value.indexOf(query)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
      saveSearchHistory()
    }
  }
  
  const addToSearchHistory = (query) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    
    // Remove existing instance of query
    const index = searchHistory.value.indexOf(trimmedQuery)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
    
    // Add to history
    searchHistory.value.push(trimmedQuery)
    
    // Keep only last 10 searches
    if (searchHistory.value.length > 10) {
      searchHistory.value.shift()
    }
    
    saveSearchHistory()
  }
  
  const saveSearchHistory = () => {
    localStorage.setItem('sora-search-history', JSON.stringify(searchHistory.value))
  }

  return {
    // State
    searchQuery,
    searchResults,
    searchHistory,
    isSearching,
    hasSearched,
    searchError,
    currentPage,
    totalPages,
    resultsPerPage,
    searchSuggestions,
    isLoadingSuggestions,
    
    // Getters
    recentSearches,
    hasResults,
    totalResults,
    
    // Actions
    initializeSearch,
    performSearch,
    loadMoreResults,
    clearSearch,
    clearSearchHistory,
    removeFromHistory,
    addToSearchHistory
  }
}) 