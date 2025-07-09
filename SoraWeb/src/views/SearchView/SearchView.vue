<template>
  <div class="search-view">
    <!-- Header Section -->
    <div class="search-header">
      <div class="header-content">
        <h1 class="search-title">Search</h1>
        <!-- Removed Advanced button -->
      </div>
    </div>

    <!-- Module Selection -->
    <div class="module-selection" v-if="!moduleStore.activeModule">
      <div class="module-warning ios-card">
        <span class="warning-icon">⚠️</span>
        <div class="warning-content">
          <h3>No Active Module</h3>
          <p>Please select a module in settings to start searching.</p>
          <router-link to="/settings/modules" class="ios-button">
            Go to Module Settings
          </router-link>
        </div>
      </div>
    </div>

    <!-- Search Input Section -->
    <div class="search-input-section" v-else>
      <div class="search-input-container">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQueryLocal"
            @keyup.enter="handleSearch"
            @input="handleInputChange"
            type="text"
            placeholder="Search anime, movies, TV shows..."
            class="search-input"
            ref="searchInput"
            :disabled="!moduleStore.activeModule"
          />
          <button 
            v-if="searchQueryLocal" 
            @click="clearSearchInput" 
            class="clear-button"
          >×</button>
        </div>
      </div>
      
      <button 
        @click="handleSearch" 
        :disabled="!searchQueryLocal.trim() || isSearching || !moduleStore.activeModule"
        class="search-button ios-button"
      >
        <span v-if="!isSearching">Search</span>
        <span v-else class="loading-spinner"></span>
      </button>
    </div>

    <!-- Quick Filters -->
    <!-- Removed: quick-filters and filter-group UI -->
    
    <!-- Advanced Search Panel -->
    <!-- Removed: advanced-search-panel and advanced-filters UI -->

    <!-- Search History (shown when no search performed) -->
    <div v-if="!hasSearched && recentSearches.length > 0" class="search-history-section">
      <h3 class="section-title">Recent Searches</h3>
      <div class="history-list">
        <div 
          v-for="(query, index) in recentSearches" 
          :key="index"
          @click="selectSuggestion(query)"
          class="history-item"
        >
          <span class="history-icon">🕒</span>
          <span class="history-text">{{ query }}</span>
          <button 
            @click.stop="removeFromHistory(query)"
            class="remove-history-button"
          >×</button>
        </div>
      </div>
      
    </div>

    <!-- Search Results -->
    <div v-if="hasSearched" class="search-results-section">
      <!-- Results Header -->
      <div class="results-header">
        <div class="results-info">
          <h3 class="results-title">Search Results</h3>
          <p v-if="!isSearching" class="results-count">
            {{ totalResults }} result{{ totalResults !== 1 ? 's' : '' }} for "{{ searchQuery }}"
          </p>
          <p v-else class="results-loading">Searching...</p>
        </div>
        <!-- Removed Clear Results button -->
      </div>

      <!-- Error State -->
      <div v-if="searchError" class="error-state ios-card">
        <div class="error-content">
          <span class="error-icon">❌</span>
          <h3>Search Error</h3>
          <p>{{ searchError }}</p>
          <button @click="handleSearch" class="ios-button">
            Try Again
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="isSearching && searchResults.length === 0" class="loading-state">
        <div class="loading-content">
          <div class="loading-spinner-large"></div>
          <p>Searching with {{ moduleStore.activeModule?.metadata.name }}...</p>
        </div>
      </div>

      <!-- No Results State -->
      <div v-else-if="!isSearching && !hasResults" class="no-results-state">
        <div class="no-results-content">
          <span class="no-results-icon">🔍</span>
          <h3>No Results Found</h3>
          <p>Try adjusting your search terms or filters</p>
        </div>
      </div>

      <!-- Results Grid -->
      <div v-else-if="hasResults" class="results-grid">
        <div 
          v-for="result in searchResults" 
          :key="result.href"
          @click="openMediaDetails(result)"
          class="result-item ios-card"
        >
          <div class="result-thumbnail">
            <img 
              :src="result.imageUrl || '/assets/placeholder.jpg'" 
              :alt="result.title"
              class="thumbnail-image"
              loading="lazy"
            />
            <!-- Removed overlay with type and rating to match Swift implementation -->
          </div>
          
          <div class="result-info">
            <h4 class="result-title">{{ result.title }}</h4>
            <!-- Removed metadata and genres to match Swift implementation -->
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasResults && currentPage < totalPages" class="load-more">
        <button 
          @click="loadMoreResults" 
          :disabled="isSearching"
          class="load-more-button ios-button"
        >
          <span v-if="!isSearching">Load More</span>
          <span v-else class="loading-spinner"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search-store'
import { useModuleStore } from '@/stores/module-store'
import slugify from '@/utils/slugify'

const router = useRouter()
const searchStore = useSearchStore()
const moduleStore = useModuleStore()

// Debug: Log activeModule changes
watch(
  () => moduleStore.activeModule,
  (newVal, oldVal) => {
    console.log('[DEBUG] activeModule changed:', newVal)
  },
  { immediate: true }
)

// Local state
const searchQueryLocal = ref('')
const currentYear = new Date().getFullYear()

// Computed properties
const {
  searchQuery,
  searchResults,
  isSearching,
  hasSearched,
  searchError,
  recentSearches,
  hasResults,
  totalResults,
  currentPage,
  totalPages
} = storeToRefs(searchStore)

// Methods
const handleSearch = async () => {
  if (!searchQueryLocal.value.trim() || !moduleStore.activeModule) return
  await searchStore.performSearch(searchQueryLocal.value)
}

const handleInputChange = () => {
  // Clear results when input is cleared
  if (!searchQueryLocal.value.trim()) {
    searchStore.clearSearch()
  }
}

const clearSearchInput = () => {
  searchQueryLocal.value = ''
  searchStore.clearSearch()
}

const selectSuggestion = (query) => {
  searchQueryLocal.value = query
  handleSearch()
}

/**
 * Navigate to the media details page
 * @param {Object} item - The search result item
 */
const openMediaDetails = (item) => {
  if (!item || !item.href) {
    console.error('Cannot open media details, item or href is missing.', item);
    return;
  }
  // Generate a slug for the mediaId
  const mediaId = slugify(item.title || item.href)
  // Store the mapping in the module store for later lookup
  moduleStore.registerMediaSlug(mediaId, item)
  router.push({
    name: 'MediaInfo',
    params: {
      id: mediaId
    },
    query: {
      title: item.title,
      imageUrl: item.imageUrl // <-- pass imageUrl for hero image
    }
  });
};

const clearSearch = () => {
  searchStore.clearSearch()
}

const loadMoreResults = () => {
  searchStore.loadMoreResults()
}

const removeFromHistory = (query) => {
  searchStore.removeFromHistory(query)
}

const clearSearchHistory = () => {
  searchStore.clearSearchHistory()
}

// Watch for changes
watch(() => searchQuery.value, (newQuery) => {
  if (newQuery !== searchQueryLocal.value) {
    searchQueryLocal.value = newQuery
  }
})

// Lifecycle hooks
onMounted(async () => {
  await searchStore.initializeSearch()
  
  // If URL has search query, perform search
  const urlParams = new URLSearchParams(window.location.search)
  const queryParam = urlParams.get('q')
  if (queryParam && moduleStore.activeModule) {
    searchQueryLocal.value = queryParam
    handleSearch()
  }
})
</script>

<style lang="scss" scoped>
.search-view {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.search-header {
  margin-bottom: 1.5rem;
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .search-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }
}

.module-selection {
  margin: 2rem 0;
  
  .module-warning {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    background: var(--warning-bg);
    border-radius: 12px;
    
    .warning-icon {
      font-size: 2rem;
      margin-right: 1rem;
    }
    
    .warning-content {
      h3 {
        margin: 0 0 0.5rem;
        color: var(--warning-text);
      }
      
      p {
        margin: 0 0 1rem;
        color: var(--warning-text);
      }
    }
  }
}

.search-input-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  .search-input-container {
    flex: 1;
    position: relative;
  }
  
  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border-radius: 12px;
    padding: 0.5rem 1rem;
    
    .search-icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }
    
    .search-input {
      flex: 1;
      border: none;
      background: none;
      font-size: 1rem;
      padding: 0.5rem 0;
      color: var(--text-primary);
      
      &::placeholder {
        color: var(--text-secondary);
      }
      
      &:focus {
        outline: none;
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
    
    .clear-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      padding: 0 0.5rem;
      cursor: pointer;
      
      &:hover {
        color: var(--text-primary);
      }
    }
  }
}

.quick-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  .filter-group {
    display: flex;
    gap: 1rem;
  }
  
  .filter-select {
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    
    &:focus {
      outline: none;
      border-color: var(--accent-color);
    }
  }
}

.advanced-search-panel {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  
  .panel-title {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }
  
  .advanced-filters {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-row {
    display: flex;
    gap: 1rem;
    
    .filter-field {
      flex: 1;
      
      label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
      }
      
      input, select {
        width: 100%;
        padding: 0.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-primary);
        
        &:focus {
          outline: none;
          border-color: var(--accent-color);
        }
      }
    }
  }
  
  .checkbox-group {
    display: flex;
    gap: 1rem;
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      
      input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
      }
    }
  }
}

.search-history-section {
  margin-top: 2rem;
  
  .section-title {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }
  
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .history-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 8px;
    cursor: pointer;
    
    &:hover {
      background: var(--card-bg-hover);
    }
    
    .history-icon {
      margin-right: 0.75rem;
    }
    
    .history-text {
      flex: 1;
    }
    
    .remove-history-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.25rem;
      padding: 0 0.5rem;
      cursor: pointer;
      
      &:hover {
        color: var(--text-primary);
      }
    }
  }
}

.search-results-section {
  margin-top: 2rem;
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    
    .results-info {
      .results-title {
        margin: 0 0 0.25rem;
        font-size: 1.5rem;
      }
      
      .results-count {
        margin: 0;
        color: var(--text-secondary);
      }
      
      .results-loading {
        margin: 0;
        color: var(--text-secondary);
        font-style: italic;
      }
    }
  }
  
  .error-state {
    text-align: center;
    padding: 2rem;
    
    .error-content {
      .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
      }
      
      h3 {
        margin: 0 0 0.5rem;
        color: var(--error-text);
      }
      
      p {
        margin: 0 0 1rem;
        color: var(--text-secondary);
      }
    }
  }
  
  .loading-state {
    text-align: center;
    padding: 2rem;
    
    .loading-content {
      .loading-spinner-large {
        width: 3rem;
        height: 3rem;
        margin: 0 auto 1rem;
        border: 4px solid var(--border-color);
        border-top-color: var(--accent-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      p {
        margin: 0;
        color: var(--text-secondary);
      }
    }
  }
  
  .no-results-state {
    text-align: center;
    padding: 2rem;
    
    .no-results-content {
      .no-results-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
      }
      
      h3 {
        margin: 0 0 0.5rem;
      }
      
      p {
        margin: 0;
        color: var(--text-secondary);
      }
    }
  }
  
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
    
    .result-item {
      cursor: pointer;
      transition: transform 0.2s;
      
      &:hover {
        transform: translateY(-4px);
      }
      
      .result-thumbnail {
        position: relative;
        aspect-ratio: 2/3;
        border-radius: 8px;
        overflow: hidden;
        
        .thumbnail-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .result-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 0.5rem;
          display: flex;
          justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
          
          .result-type {
            padding: 0.25rem 0.5rem;
            background: rgba(0,0,0,0.5);
            border-radius: 4px;
            font-size: 0.8rem;
            color: white;
          }
          
          .result-rating {
            padding: 0.25rem 0.5rem;
            background: rgba(0,0,0,0.5);
            border-radius: 4px;
            font-size: 0.8rem;
            color: white;
          }
        }
      }
      
      .result-info {
        padding: 1rem;
        
        .result-title {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .result-metadata {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          
          span {
            &:not(:last-child)::after {
              content: "•";
              margin-left: 0.5rem;
            }
          }
        }
        
        .result-genres {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          
          .genre-tag {
            padding: 0.25rem 0.5rem;
            background: var(--tag-bg);
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--tag-text);
          }
        }
      }
    }
  }
  
  .load-more {
    text-align: center;
    margin-top: 2rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style> 