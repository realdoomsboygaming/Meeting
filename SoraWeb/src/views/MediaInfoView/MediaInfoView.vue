<template>
  <div class="media-info-view">
    <!-- Navigation Overlay -->
    <div class="navigation-overlay">
      <button 
        class="back-button"
        @click="navigateBack"
        aria-label="Go back"
      >
        <i class="icon-chevron-left"></i>
      </button>
    </div>

    <!-- Main Content -->
    <div class="scroll-container" ref="scrollContainer">
      <!-- Hero Image Section -->
      <div class="hero-image-section">
        <div 
          class="hero-image"
          :style="{ backgroundImage: `url(${heroImageUrl})` }"
        >
          <div class="hero-gradient"></div>
        </div>
      </div>

      <!-- Content Container -->
      <div class="content-container">
        <div class="gradient-overlay"></div>
        
        <div class="content-wrapper">
          <!-- Header Section -->
          <header class="header-section">
            <!-- Air Date -->
            <div v-if="mediaData.airdate" class="air-date">
              <i class="icon-calendar"></i>
              <span>{{ mediaData.airdate }}</span>
            </div>

            <!-- Title -->
            <h1 class="media-title" @click="copyTitle">
              {{ mediaData.title }}
            </h1>

            <!-- Aliases -->
            <div v-if="mediaData.aliases && !mediaData.isNovel" class="aliases">
              {{ mediaData.aliases }}
            </div>

            <!-- Synopsis -->
            <div v-if="mediaData.synopsis" class="synopsis-section">
              <p class="synopsis-text" :class="{ 'expanded': showFullSynopsis }">
                {{ mediaData.synopsis }}
              </p>
              <button 
                v-if="mediaData.synopsis.length > 200"
                class="synopsis-toggle"
                @click="showFullSynopsis = !showFullSynopsis"
              >
                {{ showFullSynopsis ? 'Show Less' : 'Show More' }}
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button class="primary-button" @click="startWatching">
                <i class="icon-play"></i>
                <span>{{ startActionText }}</span>
              </button>
              
              <button class="bookmark-button" @click="toggleBookmark">
                <i :class="isBookmarked ? 'icon-bookmark-filled' : 'icon-bookmark'"></i>
              </button>
            </div>

            <!-- Single Episode Actions (for single episode content) -->
            <div v-if="isSingleEpisode" class="single-episode-actions">
              <button class="secondary-button" @click="markWatched">
                {{ singleEpisodeText }}
              </button>
            </div>
          </header>

          <!-- Content Sections -->
          <div class="content-sections">
            <!-- Episodes Section -->
            <section v-if="!mediaData.isNovel && hasEpisodes" class="episodes-section">
              <div class="section-header">
                <h2>Episodes</h2>
                <div class="section-controls">
                  <!-- Season Selector -->
                  <div v-if="hasMultipleSeasons" class="season-selector">
                    <select v-model="selectedSeason" class="ios-select">
                      <option 
                        v-for="(season, index) in seasons" 
                        :key="index" 
                        :value="index"
                      >
                        Season {{ index + 1 }}
                      </option>
                    </select>
                  </div>

                  <!-- Range Selector -->
                  <div v-if="needsRangeSelector" class="range-selector">
                    <select v-model="selectedRangeStart" class="ios-select">
                      <option 
                        v-for="range in episodeRanges" 
                        :key="range.start" 
                        :value="range.start"
                      >
                        {{ range.start + 1 }}-{{ range.end }}
                      </option>
                    </select>
                  </div>

                  <!-- Action Buttons -->
                  <div class="section-actions">
                    <button class="icon-button" @click="openSource" title="Open Source">
                      <i class="icon-safari"></i>
                    </button>
                    <button class="icon-button" @click="showMenu = !showMenu" title="More Options">
                      <i class="icon-more"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="episodes-list">
                <episode-item 
                  v-for="episode in displayedEpisodes" 
                  :key="episode.id"
                  :episode="episode"
                  :tmdb-id="tmdbId"
                  :season-number="selectedSeason + 1"
                  @play-episode="playEpisode"
                  @mark-watched="markEpisodeWatched"
                />
              </div>
            </section>

            <!-- Chapters Section -->
            <section v-if="mediaData.isNovel && hasChapters" class="chapters-section">
              <div class="section-header">
                <h2>Chapters</h2>
                <div class="section-controls">
                  <!-- Range Selector -->
                  <div v-if="needsChapterRangeSelector" class="range-selector">
                    <select v-model="selectedChapterRangeStart" class="ios-select">
                      <option 
                        v-for="range in chapterRanges" 
                        :key="range.start" 
                        :value="range.start"
                      >
                        {{ range.start + 1 }}-{{ range.end }}
                      </option>
                    </select>
                  </div>

                  <!-- Action Buttons -->
                  <div class="section-actions">
                    <button class="icon-button" @click="openSource" title="Open Source">
                      <i class="icon-safari"></i>
                    </button>
                    <button class="icon-button" @click="showMenu = !showMenu" title="More Options">
                      <i class="icon-more"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Chapters List -->
              <div class="chapters-list">
                <div 
                  v-for="(chapter, index) in displayedChapters" 
                  :key="chapter.id"
                  class="chapter-item"
                  @click="readChapter(chapter)"
                >
                  <div class="chapter-number">
                    {{ chapter.number }}
                  </div>
                  
                  <div class="chapter-info">
                    <h3 class="chapter-title">{{ chapter.title }}</h3>
                    <div v-if="chapter.publishDate" class="chapter-publish-date">
                      {{ formatDate(chapter.publishDate) }}
                    </div>
                  </div>

                  <div class="chapter-actions">
                    <button 
                      class="icon-button"
                      @click.stop="markChapterRead(chapter)"
                      :title="chapter.read ? 'Mark Unread' : 'Mark Read'"
                    >
                      <i :class="chapter.read ? 'icon-check-circle-filled' : 'icon-check-circle'"></i>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- No Content Section -->
            <section v-if="!hasEpisodes && !hasChapters" class="no-content-section">
              <div class="no-content-icon">
                <i :class="mediaData.isNovel ? 'icon-book-slash' : 'icon-tv-slash'"></i>
              </div>
              <h3>{{ mediaData.isNovel ? 'No Chapters Available' : 'No Episodes Available' }}</h3>
              <p>
                {{ mediaData.isNovel 
                  ? 'Chapters might not be available yet or there could be an issue with the source.' 
                  : 'Episodes might not be available yet or there could be an issue with the source.' 
                }}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading media information...</p>
    </div>

    <!-- Menu Popup -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <div class="menu-popup" @click.stop>
        <div class="menu-item" @click="matchWithAniList">
          <i class="icon-link"></i>
          <span>Match with AniList</span>
        </div>
        <div class="menu-item" @click="matchWithTMDB">
          <i class="icon-link"></i>
          <span>Match with TMDB</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="logDebugInfo">
          <i class="icon-terminal"></i>
          <span>Log Debug Info</span>
        </div>
      </div>
    </div>
    <div>{{ heroImageUrl }}</div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/module-store';
import { useLibraryStore } from '@/stores/library-store';
import Logger from '@/utils/Logger';
import EpisodeItem from './EpisodeItem.vue';
import TMDBService from '@/services/TMDBService';
import slugify from '@/utils/slugify'

export default {
  name: 'MediaInfoView',
  components: {
    EpisodeItem,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const moduleStore = useModuleStore();
    const libraryStore = useLibraryStore();

    const mediaData = ref({
      title: '',
      imageUrl: '',
      href: '',
      synopsis: '',
      airdate: '',
      aliases: '',
      isNovel: false,
      episodes: [],
      chapters: [],
    });

    const isLoading = ref(true);
    const showFullSynopsis = ref(false);
    const showMenu = ref(false);
    const scrollContainer = ref(null);

    // Add tmdbId to the state
    const tmdbId = ref(null);

    // Reactive state
    const selectedSeason = ref(0)
    const selectedRangeStart = ref(0)
    const selectedChapterRangeStart = ref(0)
    const isBookmarked = ref(false)

    // Data containers
    const episodesData = ref([])
    const chaptersData = ref([])

    // Configuration
    const chunkSize = ref(50)

    // Computed properties
    const hasEpisodes = computed(() => episodesData.value.length > 0)
    const hasChapters = computed(() => chaptersData.value.length > 0)
    const isSingleEpisode = computed(() => episodesData.value.length === 1)

    // Hero image logic: use mediaData imageUrl, or fallback to route.query.imageUrl
    const heroImageUrl = computed(() =>
      mediaData.value.imageUrl || route.query.imageUrl || ''
    );

    // Season grouping logic
    const seasons = computed(() => {
      const seasonMap = new Map()
      episodesData.value.forEach(episode => {
        const season = Math.floor((episode.number - 1) / 25) // Group by 25 episodes
        if (!seasonMap.has(season)) {
          seasonMap.set(season, [])
        }
        seasonMap.get(season).push(episode)
      })
      return Array.from(seasonMap.values())
    })

    const hasMultipleSeasons = computed(() => seasons.value.length > 1)

    // Episode ranges for pagination
    const episodeRanges = computed(() => {
      const currentEpisodes = hasMultipleSeasons.value 
        ? seasons.value[selectedSeason.value] || []
        : episodesData.value
      
      const ranges = []
      for (let i = 0; i < currentEpisodes.length; i += chunkSize.value) {
        ranges.push({
          start: i,
          end: Math.min(i + chunkSize.value, currentEpisodes.length)
        })
      }
      return ranges
    })

    const needsRangeSelector = computed(() => {
      const currentEpisodes = hasMultipleSeasons.value 
        ? seasons.value[selectedSeason.value] || []
        : episodesData.value
      return currentEpisodes.length > chunkSize.value
    })

    const displayedEpisodes = computed(() => {
      if (hasMultipleSeasons.value) {
        return seasons.value[selectedSeason.value] || [];
      }
      if (needsRangeSelector.value) {
        const range = episodeRanges.value.find(r => r.start === selectedRangeStart.value);
        return mediaData.value.episodes.slice(range.start, range.end);
      }
      return mediaData.value.episodes;
    });

    // Chapter ranges for pagination
    const chapterRanges = computed(() => {
      const ranges = []
      for (let i = 0; i < chaptersData.value.length; i += chunkSize.value) {
        ranges.push({
          start: i,
          end: Math.min(i + chunkSize.value, chaptersData.value.length)
        })
      }
      return ranges
    })

    const needsChapterRangeSelector = computed(() => {
      return chaptersData.value.length > chunkSize.value
    })

    const displayedChapters = computed(() => {
      if (!needsChapterRangeSelector.value) return chaptersData.value
      
      const end = selectedChapterRangeStart.value + chunkSize.value
      return chaptersData.value.slice(selectedChapterRangeStart.value, end)
    })

    // Action text computation
    const startActionText = computed(() => {
      if (mediaData.value.isNovel) {
        // Check for last read chapter
        return 'Start Reading'
      } else {
        if (isSingleEpisode.value) {
          const episode = episodesData.value[0]
          return episode.progress > 0 ? 'Continue Watching' : 'Start Watching'
        }
        // Find next episode to watch
        const { nextEpisode } = findNextUnwatchedEpisode();
        if (nextEpisode) {
          return nextEpisode.progress > 0 
            ? `Continue Watching Episode ${nextEpisode.number}`
            : `Start Watching Episode ${nextEpisode.number}`;
        }
        return 'Start Watching';
      }
    });

    // --- iOS-like continue/start logic ---
    function findNextUnwatchedEpisode() {
      // Find the last finished and first unfinished episode
      let finishedIndex = null;
      let firstUnfinishedIndex = null;
      for (let i = 0; i < episodesData.value.length; i++) {
        const ep = episodesData.value[i];
        // Consider watched if progress >= 0.9
        if (ep.progress >= 0.9) {
          finishedIndex = i;
        } else if (firstUnfinishedIndex === null) {
          firstUnfinishedIndex = i;
        }
      }
      let nextEpisode = null;
      if (finishedIndex !== null && finishedIndex < episodesData.value.length - 1) {
        nextEpisode = episodesData.value[finishedIndex + 1];
      } else if (firstUnfinishedIndex !== null) {
        nextEpisode = episodesData.value[firstUnfinishedIndex];
      } else if (episodesData.value.length > 0) {
        nextEpisode = episodesData.value[0];
      }
      return { nextEpisode };
    }

    // Refactored main play button logic
    const startWatching = () => {
      if (mediaData.value.isNovel) {
        // Navigate to reader
        router.push(`/reader/${mediaData.value.id}`)
      } else {
        const { nextEpisode } = findNextUnwatchedEpisode();
        if (nextEpisode) {
          router.push({
            name: 'Player',
            params: {
              mediaId: mediaData.value.id, // This is now the slug
              episodeId: nextEpisode.id
            }
          });
        } else {
          // fallback: play first episode
          if (episodesData.value.length > 0) {
            const firstEp = episodesData.value[0];
            router.push({
              name: 'Player',
              params: {
                mediaId: mediaData.value.id, // This is now the slug
                episodeId: firstEp.id
              }
            });
          }
        }
      }
    }

    const singleEpisodeText = computed(() => {
      if (isSingleEpisode.value) {
        const episode = episodesData.value[0]
        return episode.watched || episode.progress > 0.9 ? 'Reset Progress' : 'Mark Watched'
      }
      return 'Mark Watched'
    })

    // Methods
    const navigateBack = () => {
      router.back()
    }

    const copyTitle = () => {
      navigator.clipboard.writeText(mediaData.value.title)
    }

    const toggleBookmark = () => {
      isBookmarked.value = !isBookmarked.value
      // In real app, would save to library store
    }

    const playEpisode = (episode) => {
      Logger.info(`Playing episode: ${episode.title}`, episode);
      // Navigate to player view with correct params
      router.push({ 
        name: 'Player', 
        params: { 
          mediaId: mediaData.value.id, // This is now the slug
          episodeId: episode.id 
        }
      });
    };

    const readChapter = (chapter) => {
      router.push(`/reader/${mediaData.value.id}/${chapter.number}`)
    }

    const markWatched = () => {
      if (isSingleEpisode.value) {
        const episode = episodesData.value[0]
        episode.watched = !episode.watched
        episode.progress = episode.watched ? 1.0 : 0.0
      }
    }

    const markEpisodeWatched = (episode) => {
      Logger.info(`Marking episode watched: ${episode.title}`, episode);
      // Here you would typically update the state in your store
      // For now, just toggling a local state if you add one to the episode object
      const ep = mediaData.value.episodes.find(e => e.id === episode.id);
      if (ep) {
        ep.watched = !ep.watched;
      }
    };

    const markChapterRead = (chapter) => {
      chapter.read = !chapter.read
    }

    const getDefaultThumbnail = (index) => {
      const colors = ['2a2a2a', '3a3a3a', '4a4a4a', '5a5a5a']
      const color = colors[index % colors.length]
      return `https://via.placeholder.com/320x180/${color}/ffffff?text=Episode+${index + 1}`
    }

    const handleImageError = (event) => {
      event.target.src = '' // Set to empty or a default local asset
      event.target.style.display = 'none' // Hide broken image
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const openSource = () => {
      // Use mediaData.value.href if present, otherwise fallback to decoded route.params.id
      const url = mediaData.value.href && mediaData.value.href.trim() !== ''
        ? mediaData.value.href
        : decodeURIComponent(route.params.id);
      if (url && url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        alert('No valid source website URL available.');
      }
    }

    const matchWithAniList = () => {
      showMenu.value = false
      console.log('Match with AniList')
    }

    const matchWithTMDB = () => {
      showMenu.value = false
      console.log('Match with TMDB')
    }

    const logDebugInfo = () => {
      showMenu.value = false
      console.log('Media Debug Info:', mediaData.value)
    }

    const fetchMediaDetails = async () => {
      console.log('[DEBUG] fetchMediaDetails called');
      isLoading.value = true;
      try {
        // Look up the media object by slug (mediaId)
        const slug = route.params.id;
        const mediaObj = moduleStore.getMediaBySlug(slug);
        if (!mediaObj) {
          Logger.error('No media object found for slug:', slug);
          isLoading.value = false;
          return;
        }
        const url = mediaObj.href;
        Logger.info(`Decoded URL for details: ${url}`);
        
        const details = await moduleStore.getDetails({ href: url });
        console.log('[DEBUG] details:', details);
        
        if (details) {
          console.log('[DEBUG] details.title:', details.title);
          // Ensure id is always set
          const id = slug;
          mediaData.value = { ...mediaData.value, ...details, id };
          episodesData.value = details.episodes || [];
          chaptersData.value = details.chapters || [];
          
          // After getting details, try to get the TMDB ID but don't block on it
          const searchTitle = details.title || details.name || details.originalTitle || route.query.title || mediaData.value.title || url;
          console.log('[DEBUG] searchTitle:', searchTitle);
          if (!tmdbId.value && searchTitle) {
            try {
              Logger.info(`[TMDB DEBUG] Searching TMDB for title: ${searchTitle}`);
              const tmdbResults = await TMDBService.search(searchTitle);
              console.log('[TMDB DEBUG] TMDBService.search results:', tmdbResults);
              if (tmdbResults && tmdbResults.length > 0) {
                tmdbId.value = tmdbResults[0].id;
                Logger.info(`Auto-matched TMDB ID: ${tmdbId.value} for title: ${searchTitle}`);
              } else {
                Logger.info(`[TMDB DEBUG] No TMDB match found for title: ${searchTitle}`);
                // Continue without TMDB data
                tmdbId.value = null;
              }
            } catch (err) {
              Logger.error('[TMDB DEBUG] TMDBService.search error:', err);
              // Continue without TMDB data
              tmdbId.value = null;
            }
          }
          // Check if bookmarked
          isBookmarked.value = libraryStore.isBookmarked(id);
        } else {
          Logger.error('Failed to fetch media details: received null.');
        }
        console.log('[DEBUG] mediaData.value.imageUrl after fetch:', mediaData.value.imageUrl);

      } catch (error) {
        Logger.error('An error occurred while fetching media details:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    onMounted(() => {
      // If mediaData.value.imageUrl is empty, use the imageUrl from the route query
      console.log('[DEBUG] route.query.imageUrl on mount:', route.query.imageUrl);
      if (!mediaData.value.imageUrl && route.query.imageUrl) {
        mediaData.value.imageUrl = route.query.imageUrl;
      }
      console.log('[DEBUG] heroImageUrl on mount:', heroImageUrl.value);
      fetchMediaDetails();
      // Add scroll listener, etc.
    });

    onBeforeUnmount(() => {
      // Clean up listeners
    });

    return {
      mediaData,
      isLoading,
      showFullSynopsis,
      showMenu,
      scrollContainer,
      tmdbId, // expose to template
      // ... other returned properties
      isBookmarked,
      toggleBookmark,
      startActionText,
      startWatching,
      isSingleEpisode,
      singleEpisodeText,
      markWatched,
      hasEpisodes,
      hasChapters,
      hasMultipleSeasons,
      seasons,
      selectedSeason,
      needsRangeSelector,
      episodeRanges,
      selectedRangeStart,
      displayedEpisodes,
      playEpisode,
      markEpisodeWatched,
      // ... and so on
      navigateBack,
      copyTitle,
      openSource,
      logDebugInfo,
      matchWithAniList,
      matchWithTMDB,
      heroImageUrl, // <-- ensure this is returned
    };
  },
};
</script>

<style scoped>
.media-info-view {
  position: relative;
  width: 100%;
  height: 100vh;
  background: var(--background-primary);
  overflow: hidden;
}

/* Navigation Overlay */
.navigation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: var(--safe-area-top, 44px) 16px 8px 16px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(var(--background-primary-rgb), 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: rgba(var(--background-primary-rgb), 0.9);
  transform: scale(1.05);
}

/* Scroll Container */
.scroll-container {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Hero Image Section */
.hero-image-section {
  position: relative;
  width: 100%;
  height: 400px; /* was 700px */
  overflow: hidden;
  z-index: 1;
}

.hero-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.8);
}

.hero-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: linear-gradient(
    to top,
    var(--background-primary) 0%,
    rgba(var(--background-primary-rgb), 0.8) 20%,
    rgba(var(--background-primary-rgb), 0.5) 50%,
    transparent 100%
  );
}

/* Content Container */
.content-container {
  position: relative;
  margin-top: -40px; /* was -150px, reduced to show more hero image */
  z-index: 10;
  background: var(--background-primary);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -8px 32px rgba(0,0,0,0.08);
  padding-top: 48px;
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(var(--background-primary-rgb), 0.5) 20%,
    rgba(var(--background-primary-rgb), 0.8) 50%,
    var(--background-primary) 100%
  );
  box-shadow: 0 10px 30px rgba(var(--background-primary-rgb), 1);
}

.content-wrapper {
  position: relative;
  padding: 0 16px 32px 16px;
  z-index: 20;
}

/* Header Section */
.header-section {
  margin-bottom: 32px;
  margin-top: 40px;
}

.air-date {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: var(--accent-color);
  font-size: 14px;
  font-weight: 600;
}

.media-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin: 0 0 8px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.media-title:hover {
  color: var(--accent-color);
}

.aliases {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.synopsis-section {
  margin-bottom: 24px;
}

.synopsis-text {
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: 3;
}

.synopsis-text.expanded {
  -webkit-line-clamp: unset;
}

.synopsis-toggle {
  color: var(--accent-color);
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 40px;
  margin-bottom: 16px;
}

.primary-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: var(--accent-color);
  color: #000 !important;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

[data-theme="light"] .primary-button {
  color: #fff !important;
}

.primary-button:hover {
  background: var(--accent-color-hover);
  transform: translateY(-1px);
}

.bookmark-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: rgba(var(--text-primary-rgb), 0.1);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bookmark-button:hover {
  background: rgba(var(--text-primary-rgb), 0.2);
}

.single-episode-actions {
  margin-bottom: 16px;
}

.secondary-button {
  width: 100%;
  padding: 12px 24px;
  background: rgba(var(--text-primary-rgb), 0.1);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-button:hover {
  background: rgba(var(--text-primary-rgb), 0.2);
}

/* Content Sections */
.content-sections {
  margin-top: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 16px;
  gap: 16px;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ios-select {
  padding: 6px 12px;
  background: rgba(var(--text-primary-rgb), 0.1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--accent-color);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(var(--text-primary-rgb), 0.1);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-button:hover {
  background: rgba(var(--text-primary-rgb), 0.2);
}

/* Episodes List */
.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.episode-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.episode-item:hover {
  background: var(--background-tertiary);
  transform: translateY(-1px);
}

.episode-thumbnail {
  position: relative;
  width: 120px;
  height: 68px;
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
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.episode-item:hover .episode-overlay {
  opacity: 1;
}

.play-icon {
  color: white;
  font-size: 24px;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.episode-info {
  flex: 1;
  min-width: 0;
}

.episode-header {
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 4px;
}

.episode-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
}

.episode-duration {
  font-size: 12px;
  color: var(--text-secondary);
}

.episode-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.episode-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 4px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.episode-air-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.episode-actions {
  display: flex;
  align-items: center;
}

/* Chapters List */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chapter-item:hover {
  background: var(--background-tertiary);
  transform: translateY(-1px);
}

.chapter-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.chapter-info {
  flex: 1;
  min-width: 0;
}

.chapter-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.chapter-publish-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.chapter-actions {
  display: flex;
  align-items: center;
}

/* No Content Section */
.no-content-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 32px;
}

.no-content-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.no-content-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.no-content-section p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  max-width: 400px;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--background-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  color: var(--text-secondary);
  font-size: 16px;
}

/* Menu Popup */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.menu-popup {
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  min-width: 200px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.menu-item:hover {
  background: var(--background-tertiary);
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
}

/* Icon Classes */
.icon-chevron-left::before { content: '‹'; }
.icon-calendar::before { content: '📅'; }
.icon-play::before { content: '▶'; }
.icon-bookmark::before { content: '🔖'; }
.icon-bookmark-filled::before { content: '🔖'; }
.icon-check-circle::before { content: '○'; }
.icon-check-circle-filled::before { content: '●'; }
.icon-safari::before { content: '🌐'; }
.icon-more::before { content: '⋯'; }
.icon-book-slash::before { content: '📚'; }
.icon-tv-slash::before { content: '📺'; }
.icon-link::before { content: '🔗'; }
.icon-terminal::before { content: '⌨'; }

/* Responsive Design */
@media (max-width: 768px) {
  .hero-image-section {
    height: 250px;
  }
  
  .content-container {
    margin-top: -80px;
  }
  
  .media-title {
    font-size: 24px;
  }
  
  .episode-thumbnail {
    width: 100px;
    height: 56px;
  }
  
  .section-controls {
    flex-wrap: wrap;
  }
  .primary-button {
    padding: 16px 20px;
  }
}
</style> 