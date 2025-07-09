<template>
  <div class="collection-detail">
    <div class="header">
      <button @click="goBack" class="back-button">← Back</button>
      <h2>{{ collection?.name || 'Collection' }}</h2>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading collection...</p>
    </div>

    <div v-else-if="collection" class="collection-content">
      <div class="collection-header">
        <div class="collection-info">
          <h1>{{ collection.name }}</h1>
          <p class="description">{{ collection.description }}</p>
          <div class="meta">
            <span>{{ collection.items.length }} items</span>
            <span>Created: {{ formatDate(collection.dateCreated) }}</span>
            <span>Updated: {{ formatDate(collection.dateUpdated) }}</span>
          </div>
        </div>
        <div class="collection-actions">
          <button @click="editCollection" class="edit-button">Edit</button>
          <button @click="deleteCollection" class="delete-button">Delete</button>
        </div>
      </div>

      <div class="filter-controls">
        <select v-model="sortBy" @change="sortItems">
          <option value="title">Sort by Title</option>
          <option value="dateAdded">Sort by Date Added</option>
          <option value="progress">Sort by Progress</option>
          <option value="type">Sort by Type</option>
        </select>
        
        <select v-model="filterType">
          <option value="all">All Types</option>
          <option value="anime">Anime</option>
          <option value="manga">Manga</option>
          <option value="movie">Movies</option>
        </select>
      </div>

      <div v-if="filteredItems.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>No items in this collection</h3>
        <p>Add some content to get started!</p>
      </div>

      <div v-else class="items-grid">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="collection-item"
          @click="openItem(item)"
        >
          <div class="item-image">
            <img :src="item.poster || '/placeholder-poster.jpg'" :alt="item.title" />
            <div class="item-overlay">
              <button @click.stop="removeFromCollection(item)" class="remove-button">
                ✕
              </button>
            </div>
          </div>
          <div class="item-info">
            <h4>{{ item.title }}</h4>
            <p class="item-type">{{ item.type }}</p>
            <div class="item-progress" v-if="item.progress > 0">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
              </div>
              <span>{{ item.progress }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error">
      <p>Collection not found</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library-store'

export default {
  name: 'CollectionDetail',
  props: {
    id: String
  },
  setup(props) {
    const route = useRoute()
    const router = useRouter()
    const libraryStore = useLibraryStore()
    
    const loading = ref(true)
    const collection = ref(null)
    const sortBy = ref('title')
    const filterType = ref('all')

    const loadCollection = async () => {
      loading.value = true
      try {
        // Fetch from store
        await libraryStore.loadLibraryData() // Ensure data is loaded
        const foundCollection = libraryStore.collections.find(c => c.id === props.id)
        if (foundCollection) {
          collection.value = foundCollection
        } else {
          console.error(`Collection with id ${props.id} not found.`)
          collection.value = null
        }
      } catch (error) {
        console.error('Failed to load collection:', error)
        collection.value = null
      } finally {
        loading.value = false
      }
    }

    const filteredItems = computed(() => {
      if (!collection.value) return []
      
      let items = [...collection.value.items]
      
      // Filter by type
      if (filterType.value !== 'all') {
        items = items.filter(item => item.type === filterType.value)
      }
      
      return items
    })

    const sortItems = () => {
      if (!collection.value) return
      
      collection.value.items.sort((a, b) => {
        switch (sortBy.value) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'dateAdded':
            return new Date(b.dateAdded) - new Date(a.dateAdded)
          case 'progress':
            return b.progress - a.progress
          case 'type':
            return a.type.localeCompare(b.type)
          default:
            return 0
        }
      })
    }

    const formatDate = (date) => {
      return date.toLocaleDateString()
    }

    const openItem = (item) => {
      router.push({
        name: 'MediaInfo',
        params: { id: item.id }
      })
    }

    const removeFromCollection = (item) => {
      if (confirm(`Remove "${item.title}" from this collection?`)) {
        const index = collection.value.items.findIndex(i => i.id === item.id)
        if (index > -1) {
          collection.value.items.splice(index, 1)
          libraryStore.updateCollection(collection.value.id, {
            items: collection.value.items,
            dateUpdated: new Date()
          })
        }
      }
    }

    const editCollection = () => {
      // Implement edit collection logic
      const newName = prompt('Collection name:', collection.value.name)
      if (newName && newName !== collection.value.name) {
        collection.value.name = newName
        collection.value.dateUpdated = new Date()
        libraryStore.updateCollection(collection.value.id, {
          name: newName,
          dateUpdated: collection.value.dateUpdated
        })
      }
    }

    const deleteCollection = () => {
      if (confirm(`Delete collection "${collection.value.name}"? This cannot be undone.`)) {
        libraryStore.removeCollection(collection.value.id)
        router.push('/library')
      }
    }

    const goBack = () => {
      router.push('/library')
    }

    onMounted(() => {
      loadCollection()
    })

    return {
      loading,
      collection,
      sortBy,
      filterType,
      filteredItems,
      sortItems,
      formatDate,
      openItem,
      removeFromCollection,
      editCollection,
      deleteCollection,
      goBack
    }
  }
}
</script>

<style scoped>
.collection-detail {
  padding: 1rem;
  max-width: 1200px;
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

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--background-secondary);
  border-radius: 8px;
}

.collection-info h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.description {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta span {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.collection-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-button {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.filter-controls select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 3rem;
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

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.collection-item {
  background: var(--background-secondary);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.collection-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-image {
  position: relative;
  aspect-ratio: 2/3;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.collection-item:hover .item-overlay {
  opacity: 1;
}

.remove-button {
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-info {
  padding: 1rem;
}

.item-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.2;
}

.item-type {
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 600;
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s;
}

.item-progress span {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  min-width: 35px;
}

.error {
  text-align: center;
  color: var(--text-secondary);
  padding: 3rem;
}

@media (max-width: 768px) {
  .collection-header {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-controls {
    flex-direction: column;
  }

  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style> 