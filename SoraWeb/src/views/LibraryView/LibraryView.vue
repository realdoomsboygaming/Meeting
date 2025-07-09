<template>
  <div class="library-view">
    <!-- Header Section -->
    <div class="library-header">
      <div class="header-content">
        <h1 class="library-title">Library</h1>
        <div class="header-actions">
          <button @click="refreshLibrary" class="refresh-button ios-button-secondary" :disabled="isRefreshing">
            <span v-if="!isRefreshing">↻</span>
            <span v-else class="loading-spinner"></span>
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Continue Watching Section -->
    <div v-if="continueWatching.length > 0" class="library-section">
      <div class="section-header">
        <h2 class="section-title">Continue Watching</h2>
        <router-link to="/library/continue-watching" class="section-link">View All</router-link>
      </div>
      
      <div class="continue-watching-grid">
        <div 
          v-for="item in continueWatching.slice(0, 6)" 
          :key="`${item.mediaId}-${item.episodeId}`"
          class="continue-item ios-card"
          @click="continueWatchingItem(item)"
        >
          <div class="continue-thumbnail">
            <img 
              :src="item.thumbnail || '/assets/placeholder.jpg'" 
              :alt="item.title"
              class="thumbnail-image"
            />
            <div class="progress-overlay">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: getProgressPercentage(item) + '%' }"
                ></div>
              </div>
              <span class="progress-time">{{ formatTime(item.progress) }} / {{ formatTime(item.totalDuration) }}</span>
            </div>
            <button 
              @click.stop="removeContinueWatching(item.mediaId, item.episodeId)"
              class="remove-button"
            >×</button>
          </div>
          <div class="continue-info">
            <h4 class="media-title">{{ item.title }}</h4>
            <p class="episode-info">{{ item.episodeTitle || `Episode ${item.episodeNumber}` }}</p>
            <span class="last-watched">{{ formatLastWatched(item.lastWatched) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button @click="showBookmarksModal = true" class="action-button ios-card">
        <span class="action-icon">📚</span>
        <div class="action-content">
          <h3>Bookmarks</h3>
          <p>{{ bookmarks.length }} items</p>
        </div>
      </button>
      
      <button @click="showCollectionsModal = true" class="action-button ios-card">
        <span class="action-icon">📂</span>
        <div class="action-content">
          <h3>Collections</h3>
          <p>{{ collections.length }} collections</p>
        </div>
      </button>
      
      <button @click="showWatchlistModal = true" class="action-button ios-card">
        <span class="action-icon">⭐</span>
        <div class="action-content">
          <h3>Watchlist</h3>
          <p>{{ watchlist.length }} items</p>
        </div>
      </button>
    </div>

    <!-- Recent Bookmarks -->
    <div v-if="bookmarks.length > 0" class="library-section">
      <div class="section-header">
        <h2 class="section-title">Recent Bookmarks</h2>
        <button @click="showBookmarksModal = true" class="section-link">View All</button>
      </div>
      
      <div class="bookmarks-grid">
        <div 
          v-for="bookmark in recentBookmarks" 
          :key="bookmark.id"
          class="bookmark-item ios-card"
          @click="openMediaDetails(bookmark)"
        >
          <div class="bookmark-thumbnail">
            <img 
              :src="bookmark.thumbnail || '/assets/placeholder.jpg'" 
              :alt="bookmark.title"
              class="thumbnail-image"
            />
            <div class="status-badge" :class="'status-' + bookmark.status">
              {{ formatStatus(bookmark.status) }}
            </div>
          </div>
          <div class="bookmark-info">
            <h4 class="media-title">{{ bookmark.title }}</h4>
            <p class="media-type">{{ bookmark.type || 'Anime' }}</p>
            <span class="date-added">Added {{ formatDateAdded(bookmark.dateAdded) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Collections Preview -->
    <div v-if="collections.length > 0" class="library-section">
      <div class="section-header">
        <h2 class="section-title">Collections</h2>
        <button @click="showCollectionsModal = true" class="section-link">View All</button>
      </div>
      
      <div class="collections-grid">
        <div 
          v-for="collection in collections.slice(0, 4)" 
          :key="collection.id"
          class="collection-item ios-card"
          @click="openCollection(collection)"
        >
          <div class="collection-preview">
            <div class="collection-thumbnails">
              <img 
                v-for="(item, index) in collection.items.slice(0, 4)" 
                :key="item.id"
                :src="item.thumbnail || '/assets/placeholder.jpg'"
                :alt="item.title"
                class="collection-thumb"
                :style="{ zIndex: 4 - index }"
              />
            </div>
          </div>
          <div class="collection-info">
            <h4 class="collection-name">{{ collection.name }}</h4>
            <p class="collection-count">{{ collection.items.length }} items</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="isLibraryEmpty" class="empty-state">
      <div class="empty-content">
        <span class="empty-icon">📚</span>
        <h3>Your Library is Empty</h3>
        <p>Start adding anime and manga to your library to see them here.</p>
        <router-link to="/search" class="empty-action ios-button">
          Browse Content
        </router-link>
      </div>
    </div>

    <!-- Bookmarks Modal -->
    <div v-if="showBookmarksModal" class="modal-overlay" @click="showBookmarksModal = false">
      <div class="modal-content ios-card" @click.stop>
        <div class="modal-header">
          <h3>Bookmarks</h3>
          <button @click="showBookmarksModal = false" class="close-button">×</button>
        </div>
        
        <!-- Filter Controls -->
        <div class="filter-controls">
          <select v-model="libraryFilter" class="filter-select">
            <option value="all">All Status</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="dropped">Dropped</option>
          </select>
          
          <select v-model="librarySortBy" class="filter-select">
            <option value="last-watched">Last Watched</option>
            <option value="title">Title</option>
            <option value="date-added">Date Added</option>
          </select>
          
          <button @click="toggleSortOrder" class="sort-button ios-button-secondary">
            {{ librarySortOrder === 'desc' ? '↓' : '↑' }}
          </button>
        </div>
        
        <div class="modal-bookmarks">
          <div 
            v-for="bookmark in filteredLibrary" 
            :key="bookmark.id"
            class="bookmark-row"
            @click="openMediaDetails(bookmark)"
          >
            <img 
              :src="bookmark.thumbnail || '/assets/placeholder.jpg'" 
              :alt="bookmark.title"
              class="bookmark-thumb"
            />
            <div class="bookmark-details">
              <h4>{{ bookmark.title }}</h4>
              <p class="bookmark-status">{{ formatStatus(bookmark.status) }}</p>
              <span class="bookmark-date">{{ formatDateAdded(bookmark.dateAdded) }}</span>
            </div>
            <button 
              @click.stop="removeFromBookmarks(bookmark.id)"
              class="remove-bookmark-button"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Collections Modal -->
    <div v-if="showCollectionsModal" class="modal-overlay" @click="showCollectionsModal = false">
      <div class="modal-content ios-card" @click.stop>
        <div class="modal-header">
          <h3>Collections</h3>
          <div class="modal-actions">
            <button @click="showCreateCollection = true" class="ios-button">
              Create Collection
            </button>
            <button @click="showCollectionsModal = false" class="close-button">×</button>
          </div>
        </div>
        
        <div class="modal-collections">
          <div 
            v-for="collection in collections" 
            :key="collection.id"
            class="collection-row"
            @click="openCollection(collection)"
          >
            <div class="collection-preview-small">
              <img 
                v-for="item in collection.items.slice(0, 3)" 
                :key="item.id"
                :src="item.thumbnail || '/assets/placeholder.jpg'"
                :alt="item.title"
                class="preview-thumb"
              />
            </div>
            <div class="collection-details">
              <h4>{{ collection.name }}</h4>
              <p>{{ collection.items.length }} items</p>
              <span class="collection-created">Created {{ formatDateAdded(collection.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Collection Modal -->
    <div v-if="showCreateCollection" class="modal-overlay" @click="showCreateCollection = false">
      <div class="modal-content ios-card" @click.stop>
        <div class="modal-header">
          <h3>Create Collection</h3>
          <button @click="showCreateCollection = false" class="close-button">×</button>
        </div>
        
        <form @submit.prevent="createNewCollection" class="create-form">
          <div class="form-group">
            <label for="collection-name">Collection Name</label>
            <input 
              v-model="newCollectionName" 
              id="collection-name"
              type="text" 
              placeholder="Enter collection name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="collection-description">Description (Optional)</label>
            <textarea 
              v-model="newCollectionDescription"
              id="collection-description"
              placeholder="Describe your collection"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCreateCollection = false" class="ios-button-secondary">
              Cancel
            </button>
            <button type="submit" class="ios-button">
              Create Collection
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library-store'

export default {
  name: 'LibraryView',
  setup() {
    const router = useRouter()
    const libraryStore = useLibraryStore()
    
    // Modal states
    const showBookmarksModal = ref(false)
    const showCollectionsModal = ref(false)
    const showWatchlistModal = ref(false)
    const showCreateCollection = ref(false)
    const isRefreshing = ref(false)
    
    // Form data
    const newCollectionName = ref('')
    const newCollectionDescription = ref('')
    
    // Computed properties from store
    const continueWatching = computed(() => libraryStore.continueWatching)
    const bookmarks = computed(() => libraryStore.bookmarks)
    const collections = computed(() => libraryStore.collections)
    const watchlist = computed(() => libraryStore.watchlist)
    const filteredLibrary = computed(() => libraryStore.filteredLibrary)
    const libraryFilter = computed({
      get: () => libraryStore.libraryFilter,
      set: (value) => libraryStore.updateLibraryFilter(value)
    })
    const librarySortBy = computed({
      get: () => libraryStore.librarySortBy,
      set: (value) => libraryStore.updateLibrarySortBy(value)
    })
    const librarySortOrder = computed({
      get: () => libraryStore.librarySortOrder,
      set: (value) => libraryStore.updateLibrarySortOrder(value)
    })
    
    const recentBookmarks = computed(() => {
      return bookmarks.value
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 6)
    })
    
    const isLibraryEmpty = computed(() => {
      return continueWatching.value.length === 0 && 
             bookmarks.value.length === 0 && 
             collections.value.length === 0
    })
    
    // Utility functions
    const formatTime = (seconds) => {
      if (!seconds) return '0:00'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
    
    const getProgressPercentage = (item) => {
      if (!item.progress || !item.totalDuration) return 0
      return Math.min(100, (item.progress / item.totalDuration) * 100)
    }
    
    const formatLastWatched = (dateString) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)
      
      if (diffInHours < 1) return 'Just now'
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
      return date.toLocaleDateString()
    }
    
    const formatDateAdded = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }
    
    const formatStatus = (status) => {
      const statusMap = {
        'watching': 'Watching',
        'completed': 'Completed',
        'on-hold': 'On Hold',
        'dropped': 'Dropped',
        'plan-to-watch': 'Plan to Watch'
      }
      return statusMap[status] || status
    }
    
    // Actions
    const refreshLibrary = async () => {
      isRefreshing.value = true
      try {
        await Promise.all([
          libraryStore.loadLibraryData(),
          libraryStore.loadContinueWatching()
        ])
      } finally {
        isRefreshing.value = false
      }
    }
    
    const continueWatchingItem = (item) => {
      router.push({
        name: 'Player',
        params: { 
          mediaId: item.mediaId,
          episodeId: item.episodeId 
        },
        query: { 
          t: Math.floor(item.progress)
        }
      })
    }
    
    const removeContinueWatching = (mediaId, episodeId) => {
      libraryStore.removeContinueWatching(mediaId, episodeId)
    }
    
    const openMediaDetails = (media) => {
      router.push({
        name: 'MediaInfo',
        params: { id: media.id }
      })
    }
    
    const openCollection = (collection) => {
      router.push({
        name: 'CollectionDetail',
        params: { id: collection.id }
      })
    }
    
    const removeFromBookmarks = (mediaId) => {
      libraryStore.removeFromBookmarks(mediaId)
    }
    
    const toggleSortOrder = () => {
      librarySortOrder.value = librarySortOrder.value === 'desc' ? 'asc' : 'desc'
    }
    
    const createNewCollection = () => {
      if (newCollectionName.value.trim()) {
        libraryStore.createCollection(
          newCollectionName.value.trim(),
          newCollectionDescription.value.trim()
        )
        
        // Reset form
        newCollectionName.value = ''
        newCollectionDescription.value = ''
        showCreateCollection.value = false
      }
    }
    
    onMounted(() => {
      // Data is already loaded during app initialization
      // This component just displays the current state
    })
    
    return {
      // State
      showBookmarksModal,
      showCollectionsModal,
      showWatchlistModal,
      showCreateCollection,
      isRefreshing,
      newCollectionName,
      newCollectionDescription,
      
      // Computed
      continueWatching,
      bookmarks,
      collections,
      watchlist,
      filteredLibrary,
      libraryFilter,
      librarySortBy,
      librarySortOrder,
      recentBookmarks,
      isLibraryEmpty,
      
      // Methods
      formatTime,
      getProgressPercentage,
      formatLastWatched,
      formatDateAdded,
      formatStatus,
      refreshLibrary,
      continueWatchingItem,
      removeContinueWatching,
      openMediaDetails,
      openCollection,
      removeFromBookmarks,
      toggleSortOrder,
      createNewCollection
    }
  }
}
</script>

<style scoped>
.library-view {
  padding: var(--ios-padding-md);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

/* Header */
.library-header {
  margin-bottom: var(--spacing-2xl);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.library-title {
  font-size: var(--font-size-large-title);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--background-tertiary);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Sections */
.library-section {
  margin-bottom: var(--spacing-2xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.section-link {
  color: var(--accent-color);
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.section-link:hover {
  opacity: 0.8;
}

/* Continue Watching Grid */
.continue-watching-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.continue-item {
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.continue-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--ios-shadow-elevated);
}

.continue-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-fast);
}

.continue-item:hover .thumbnail-image {
  transform: scale(1.05);
}

.progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: var(--spacing-sm);
}

.progress-bar {
  height: 4px;
  background: var(--background-tertiary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: var(--border-radius-sm);
  transition: width var(--transition-normal);
}

.progress-time {
  font-size: var(--font-size-caption);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.remove-button {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.7);
  color: var(--text-primary);
  font-size: var(--font-size-callout);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.continue-item:hover .remove-button {
  opacity: 1;
}

.continue-info {
  padding: var(--spacing-md);
}

.media-title {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
  line-height: var(--line-height-tight);
}

.episode-info {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xs);
}

.last-watched {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  text-align: left;
  width: 100%;
  transition: all var(--transition-fast);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--ios-shadow-elevated);
}

.action-icon {
  font-size: var(--font-size-3xl);
}

.action-content h3 {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
}

.action-content p {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  margin: 0;
}

/* Bookmarks Grid */
.bookmarks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.bookmark-item {
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.bookmark-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--ios-shadow-elevated);
}

.bookmark-thumbnail {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
}

.status-badge {
  position: absolute;
  top: var(--spacing-xs);
  left: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.status-watching { background: var(--ios-blue); }
.status-completed { background: var(--success-color); }
.status-on-hold { background: var(--warning-color); }
.status-dropped { background: var(--error-color); }

.bookmark-info {
  padding: var(--spacing-sm);
}

.media-type {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xs);
}

.date-added {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

/* Collections Grid */
.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.collection-item {
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.collection-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--ios-shadow-elevated);
}

.collection-preview {
  margin-bottom: var(--spacing-md);
}

.collection-thumbnails {
  display: flex;
  gap: var(--spacing-xs);
  height: 80px;
}

.collection-thumb {
  width: 60px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--border-radius-sm);
  border: 2px solid var(--background-card);
}

.collection-name {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
}

.collection-count {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  margin: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  display: block;
}

.empty-content h3 {
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

.empty-content p {
  font-size: var(--font-size-callout);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xl);
  line-height: var(--line-height-relaxed);
}

.empty-action {
  display: inline-block;
  text-decoration: none;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-lg);
}

.modal-content {
  background: var(--background-card);
  border-radius: var(--ios-radius-modal);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--background-tertiary);
  color: var(--text-primary);
  font-size: var(--font-size-title3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.close-button:hover {
  background: var(--background-quaternary);
}

/* Filter Controls */
.filter-controls {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.filter-select {
  flex: 1;
  background: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
}

.sort-button {
  min-width: 40px;
}

/* Modal Content Areas */
.modal-bookmarks,
.modal-collections {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.bookmark-row,
.collection-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  transition: background-color var(--transition-fast);
  cursor: pointer;
}

.bookmark-row:hover,
.collection-row:hover {
  background: var(--background-tertiary);
}

.bookmark-thumb {
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: var(--border-radius-sm);
}

.bookmark-details,
.collection-details {
  flex: 1;
}

.bookmark-details h4,
.collection-details h4 {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
}

.bookmark-status,
.collection-details p {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xs);
}

.bookmark-date,
.collection-created {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.remove-bookmark-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--error-color);
  color: var(--background-primary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-footnote);
  transition: background-color var(--transition-fast);
}

.remove-bookmark-button:hover {
  background: var(--error-color-secondary);
}

/* Collection Preview Small */
.collection-preview-small {
  display: flex;
  gap: 2px;
}

.preview-thumb {
  width: 30px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--border-radius-xs);
}

/* Create Form */
.create-form {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.form-group input,
.form-group textarea {
  width: 100%;
  background: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-size-callout);
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--accent-color);
  background: var(--background-elevated);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

/* Responsive Design */
@media (max-width: 768px) {
  .library-view {
    padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: flex-start;
  }
  
  .library-title {
    font-size: var(--font-size-title1);
  }
  
  .continue-watching-grid,
  .bookmarks-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .collections-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .modal-overlay {
    padding: var(--spacing-sm);
  }
  
  .modal-content {
    max-height: 90vh;
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .continue-watching-grid,
  .bookmarks-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .bookmark-row,
  .collection-row {
    flex-direction: column;
    text-align: center;
  }
  
  .bookmark-thumb {
    align-self: center;
  }
}
</style> 