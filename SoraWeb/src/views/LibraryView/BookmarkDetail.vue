<template>
  <div class="bookmark-detail">
    <div class="header">
      <button @click="goBack" class="back-button">← Back</button>
      <h2>Bookmark Details</h2>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading bookmark...</p>
    </div>

    <div v-else-if="bookmark" class="bookmark-content">
      <div class="bookmark-header">
        <img :src="bookmark.poster" :alt="bookmark.title" class="poster" />
        <div class="info">
          <h1>{{ bookmark.title }}</h1>
          <p class="type">{{ bookmark.type }}</p>
          <p class="description">{{ bookmark.description }}</p>
          <div class="meta">
            <span>Added: {{ formatDate(bookmark.dateAdded) }}</span>
            <span>Progress: {{ bookmark.progress }}%</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="playContent" class="play-button">
          {{ bookmark.type === 'anime' ? 'Watch' : 'Read' }}
        </button>
        <button @click="removeBookmark" class="remove-button">
          Remove Bookmark
        </button>
      </div>
    </div>

    <div v-else class="error">
      <p>Bookmark not found</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library-store'

export default {
  name: 'BookmarkDetail',
  props: {
    id: String
  },
  setup(props) {
    const route = useRoute()
    const router = useRouter()
    const libraryStore = useLibraryStore()
    
    const loading = ref(true)
    const bookmark = ref(null)

    const loadBookmark = async () => {
      loading.value = true
      try {
      } catch (error) {
        console.error('Failed to load bookmark:', error)
      } finally {
        loading.value = false
      }
    }

    const formatDate = (date) => {
      return date.toLocaleDateString()
    }

    const playContent = () => {
      if (bookmark.value.type === 'anime') {
        router.push({
          name: 'Player',
          params: { 
            mediaId: bookmark.value.id,
            episodeId: bookmark.value.currentEpisode 
          }
        })
      } else {
        router.push({
          name: 'MediaInfo',
          params: { id: bookmark.value.id },
          query: { tab: 'chapters' }
        })
      }
    }

    const removeBookmark = () => {
      if (confirm('Remove this bookmark?')) {
        libraryStore.removeBookmark(bookmark.value.id)
        router.push('/library')
      }
    }

    const goBack = () => {
      router.push('/library')
    }

    onMounted(() => {
      loadBookmark()
    })

    return {
      loading,
      bookmark,
      formatDate,
      playContent,
      removeBookmark,
      goBack
    }
  }
}
</script>

<style scoped>
.bookmark-detail {
  padding: 1rem;
  max-width: 800px;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-button {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.bookmark-header {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
}

.poster {
  width: 200px;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
}

.info {
  flex: 1;
}

.info h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.type {
  margin: 0 0 1rem 0;
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.description {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta span {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.play-button {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.remove-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.error {
  text-align: center;
  color: var(--text-secondary);
  padding: 3rem;
}

@media (max-width: 768px) {
  .bookmark-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .poster {
    width: 150px;
    height: 225px;
  }

  .actions {
    flex-direction: column;
  }
}
</style> 