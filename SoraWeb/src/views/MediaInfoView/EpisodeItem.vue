<template>
  <div class="episode-item" @click="playEpisode">
    <div class="episode-thumbnail">
      <img
        :src="thumbnailUrl || getDefaultThumbnail()"
        :alt="`Image for ${title}`"
        @error="onImageError"
      />
      <div class="episode-overlay">
        <div class="play-icon">
          <i class="icon-play"></i>
        </div>
      </div>
      <div v-if="progress > 0" class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress * 100}%` }"></div>
      </div>
    </div>
    
    <div class="episode-info">
      <div class="episode-header">
        <span class="episode-number">Episode {{ episode.number }}</span>
      </div>
      <h3 class="episode-title">{{ title }}</h3>
    </div>

    <div class="episode-actions">
      <button
        class="icon-button"
        @click.stop="markWatched"
        :title="isWatched ? 'Mark Unwatched' : 'Mark Watched'"
      >
        <i :class="isWatched ? 'icon-check-circle-filled' : 'icon-check-circle'"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import TMDBService from '@/services/TMDBService';

const props = defineProps({
  episode: {
    type: Object,
    required: true,
  },
  tmdbId: {
    type: Number,
    required: false,
  },
  seasonNumber: {
    type: Number,
    required: false,
  },
});

const emit = defineEmits(['play-episode', 'mark-watched']);

// Internal state for fetched data
const title = ref(`Episode ${props.episode.number}`);
const thumbnailUrl = ref(props.episode.thumbnail); // Start with placeholder
const isWatched = ref(props.episode.watched || false);
const progress = ref(props.episode.progress || 0);

const playEpisode = () => {
  emit('play-episode', props.episode);
};

const markWatched = () => {
  isWatched.value = !isWatched.value;
  emit('mark-watched', { ...props.episode, watched: isWatched.value });
};

const defaultLightBanner = "https://raw.githubusercontent.com/cranci1/Sora/refs/heads/dev/assets/banner1.png";
const defaultDarkBanner = "https://raw.githubusercontent.com/cranci1/Sora/refs/heads/dev/assets/banner2.png";

const getDefaultThumbnail = () => {
  // Use prefers-color-scheme to match iOS logic
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return defaultDarkBanner;
  }
  return defaultLightBanner;
};

const onImageError = (event) => {
  event.target.src = getDefaultThumbnail();
};

const fetchTmdbEpisodeDetails = async () => {
  console.log('[TMDB DEBUG] Attempting fetch:', {
    tmdbId: props.tmdbId,
    seasonNumber: props.seasonNumber,
    episodeNumber: props.episode.number
  });
  if (props.tmdbId && props.seasonNumber) {
    try {
      const details = await TMDBService.fetchEpisodeDetails(
        props.tmdbId,
        props.seasonNumber,
        props.episode.number,
        'original' // or '500' if you want w500
      );
      console.log('[TMDB DEBUG] Fetch result:', details);
      if (details) {
        title.value = details.name || `Episode ${props.episode.number}`;
        if (details.imageUrl) {
          thumbnailUrl.value = details.imageUrl;
        }
      }
    } catch (e) {
      console.error('[TMDB DEBUG] Fetch error:', e);
      // Fallback: keep default thumbnail
    }
  }
};

onMounted(fetchTmdbEpisodeDetails);

watch([
  () => props.tmdbId,
  () => props.seasonNumber
], fetchTmdbEpisodeDetails);
</script>

<style scoped>
/* Scoped styles for the episode item */
.episode-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: var(--color-background-soft);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.episode-item:hover {
  background-color: var(--color-background-mute);
}

.episode-thumbnail {
  position: relative;
  width: 160px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.episode-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.episode-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.episode-item:hover .episode-overlay {
  opacity: 1;
}

.play-icon i {
  font-size: 24px;
  color: white;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
}

.progress-fill {
  height: 100%;
  background-color: var(--color-accent);
}

.episode-info {
  margin-left: 16px;
  flex-grow: 1;
}

.episode-header {
  display: flex;
  justify-content: space-between;
}

.episode-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.episode-title {
  font-size: 16px;
  color: var(--color-text-soft);
  margin: 4px 0 0;
}

.episode-actions {
  margin-left: 16px;
}
</style> 