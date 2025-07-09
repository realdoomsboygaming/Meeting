<template>
  <div class="all-watching">
    <div class="header">
      <h2>Continue Watching</h2>
      <div class="view-options">
        <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }">
          <i class="icon-grid"></i>
        </button>
        <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }">
          <i class="icon-list"></i>
        </button>
      </div>
    </div>

    <div class="filters">
      <select v-model="sortBy" class="sort-select">
        <option value="lastWatched">Last Watched</option>
        <option value="progress">Progress</option>
        <option value="title">Title</option>
        <option value="year">Year</option>
      </select>
      
      <select v-model="filterType" class="filter-select">
        <option value="all">All Types</option>
        <option value="anime">Anime</option>
        <option value="movie">Movies</option>
        <option value="tv">TV Shows</option>
      </select>
    </div>

    <div v-if="loading" class="loading">
      <div class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card"></div>
      </div>
    </div>

    <div v-else-if="filteredContent.length === 0" class="empty-state">
      <div class="empty-icon">📺</div>
      <h3>No content to continue watching</h3>
      <p>Start watching something to see your progress here!</p>
      <router-link to="/search" class="cta-button">Browse Content</router-link>
    </div>

    <div v-else class="content-grid" :class="viewMode">
      <div 
        v-for="item in filteredContent" 
        :key="item.id"
        class="continue-watching-card"
        @click="goToMedia(item)"
      >
        <div class="card-image">
          <img :src="item.poster || '/placeholder-poster.jpg'" :alt="item.title" />
          <div class="progress-overlay">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ item.progress }}%</span>
          </div>
          <div class="play-overlay">
            <div class="play-button">▶</div>
          </div>
        </div>
        
        <div class="card-content">
          <h3 class="title">{{ item.title }}</h3>
          <p class="episode-info">
            Episode {{ item.currentEpisode }} of {{ item.totalEpisodes }}
          </p>
          <p class="last-watched">
            {{ formatLastWatched(item.lastWatched) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/library-store'
import { useRouter } from 'vue-router'

export default {
  name: 'AllWatching',
  setup() {
    const libraryStore = useLibraryStore()
    const router = useRouter()
    
    const viewMode = ref('grid')
    const sortBy = ref('lastWatched')
    const filterType = ref('all')
    const loading = ref(true)

    const filteredContent = computed(() => {
      let content = [...libraryStore.continueWatching]
      
      // Filter by type
      if (filterType.value !== 'all') {
        content = content.filter(item => item.type === filterType.value)
      }
      
      // Sort content
      content.sort((a, b) => {
        switch (sortBy.value) {
          case 'lastWatched':
            return new Date(b.lastWatched) - new Date(a.lastWatched)
          case 'progress':
            return b.progress - a.progress
          case 'title':
            return a.title.localeCompare(b.title)
          case 'year':
            return b.year - a.year
          default:
            return 0
        }
      })
      
      return content
    })

    const formatLastWatched = (date) => {
      const now = new Date()
      const watched = new Date(date)
      const diffTime = Math.abs(now - watched)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      return watched.toLocaleDateString()
    }

    const goToMedia = (item) => {
      router.push({
        name: 'MediaInfo',
        params: { id: item.id }
      })
    }

    onMounted(async () => {
      // Simulate loading time
      setTimeout(() => {
        loading.value = false
      }, 500)
    })

    return {
      viewMode,
      sortBy,
      filterType,
      loading,
      filteredContent,
      formatLastWatched,
      goToMedia
    }
  }
}
</script>

<style scoped>
.all-watching {
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header h2 {
  margin: 0;
  color: var(--text-primary);
}

.view-options {
  display: flex;
  gap: 0.5rem;
}

.view-options button {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-options button.active {
  background: var(--accent-color);
  color: white;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sort-select,
.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-primary);
}

.loading {
  margin-top: 2rem;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.skeleton-card {
  height: 300px;
  background: linear-gradient(90deg, var(--background-secondary) 25%, var(--background-tertiary) 50%, var(--background-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.cta-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent-color);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.2s;
}

.cta-button:hover {
  background: var(--accent-color-dark);
}

.content-grid {
  display: grid;
  gap: 1rem;
}

.content-grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.content-grid.list {
  grid-template-columns: 1fr;
}

.continue-watching-card {
  background: var(--background-secondary);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.continue-watching-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-image {
  position: relative;
  aspect-ratio: 2/3;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s;
}

.progress-text {
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
}

.continue-watching-card:hover .play-overlay {
  opacity: 1;
}

.play-button {
  width: 3rem;
  height: 3rem;
  background: var(--accent-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.card-content {
  padding: 1rem;
}

.title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.episode-info {
  margin: 0 0 0.25rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.last-watched {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.content-grid.list .continue-watching-card {
  display: flex;
  align-items: center;
}

.content-grid.list .card-image {
  width: 120px;
  aspect-ratio: 2/3;
  flex-shrink: 0;
}

.content-grid.list .card-content {
  flex: 1;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }
  
  .content-grid.grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style> 