import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  // Player State
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const isMuted = ref(false)
  const playbackRate = ref(1)
  const isFullscreen = ref(false)
  const isPictureInPicture = ref(false)
  
  // Current Media
  const currentMedia = ref(null)
  const currentEpisode = ref(null)
  const currentStreamUrl = ref('')
  const availableQualities = ref([])
  const selectedQuality = ref('auto')
  
  // Subtitles
  const availableSubtitles = ref([])
  const selectedSubtitle = ref('off')
  const subtitleSettings = ref({
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    position: 'bottom'
  })
  
  // Audio Tracks
  const availableAudioTracks = ref([])
  const selectedAudioTrack = ref('default')
  
  // Playback History and Progress
  const watchHistory = ref([])
  const playbackProgress = ref({})
  
  // Player Settings
  const playerSettings = ref({
    autoPlay: true,
    autoNext: true,
    skipIntro: true,
    skipOutro: true,
    rememberPosition: true,
    preferredQuality: 'auto',
    preferredSubtitle: 'auto',
    keyboardShortcuts: true
  })
  
  // Loading and Error States
  const isLoading = ref(false)
  const isBuffering = ref(false)
  const error = ref(null)
  const hasError = ref(false)
  
  // Player UI State
  const showControls = ref(true)
  const controlsTimeout = ref(null)
  const isUserActive = ref(true)
  
  // Computed getters
  const progress = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })
  
  const remainingTime = computed(() => {
    return duration.value - currentTime.value
  })
  
  const formattedCurrentTime = computed(() => {
    return formatTime(currentTime.value)
  })
  
  const formattedDuration = computed(() => {
    return formatTime(duration.value)
  })
  
  const formattedRemainingTime = computed(() => {
    return formatTime(remainingTime.value)
  })
  
  const canPlayNext = computed(() => {
    return currentEpisode.value && currentEpisode.value.nextEpisode
  })
  
  const canPlayPrevious = computed(() => {
    return currentEpisode.value && currentEpisode.value.previousEpisode
  })
  
  const currentProgress = computed(() => {
    if (!currentMedia.value || !currentEpisode.value) return 0
    const key = `${currentMedia.value.id}-${currentEpisode.value.id}`
    return playbackProgress.value[key] || 0
  })
  
  // Actions
  const initializePlayer = async () => {
    try {
      // Load saved player settings
      const savedSettings = localStorage.getItem('sora-player-settings')
      const savedProgress = localStorage.getItem('sora-playback-progress')
      const savedHistory = localStorage.getItem('sora-watch-history')
      
      if (savedSettings) {
        Object.assign(playerSettings.value, JSON.parse(savedSettings))
      }
      
      if (savedProgress) {
        playbackProgress.value = JSON.parse(savedProgress)
      }
      
      if (savedHistory) {
        watchHistory.value = JSON.parse(savedHistory)
      }
      
      // Apply saved volume
      const savedVolume = localStorage.getItem('sora-player-volume')
      if (savedVolume) {
        volume.value = parseFloat(savedVolume)
      }
      
    } catch (error) {
      console.error('Failed to initialize player:', error)
    }
  }
  
  const loadMedia = async (media, episode, streamUrl) => {
    try {
      isLoading.value = true
      error.value = null
      hasError.value = false
      
      currentMedia.value = media
      currentEpisode.value = episode
      currentStreamUrl.value = streamUrl
      
      // Reset player state
      currentTime.value = 0
      duration.value = 0
      isPlaying.value = false
      
      // Load saved progress for this episode
      const progressKey = `${media.id}-${episode.id}`
      const savedProgress = playbackProgress.value[progressKey]
      if (savedProgress && playerSettings.value.rememberPosition) {
        currentTime.value = savedProgress
      }
      
      // Add to watch history
      addToWatchHistory(media, episode)
      
    } catch (err) {
      error.value = err
      hasError.value = true
      console.error('Failed to load media:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const play = () => {
    isPlaying.value = true
    showControlsTemporarily()
  }
  
  const pause = () => {
    isPlaying.value = false
    showControls.value = true
  }
  
  const togglePlay = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }
  
  const seek = (time) => {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
    saveProgress()
  }
  
  const seekBy = (seconds) => {
    seek(currentTime.value + seconds)
  }
  
  const setVolume = (newVolume) => {
    volume.value = Math.max(0, Math.min(1, newVolume))
    localStorage.setItem('sora-player-volume', volume.value.toString())
  }
  
  const toggleMute = () => {
    isMuted.value = !isMuted.value
  }
  
  const setPlaybackRate = (rate) => {
    playbackRate.value = rate
  }
  
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }
  
  const togglePictureInPicture = () => {
    isPictureInPicture.value = !isPictureInPicture.value
  }
  
  const setQuality = (quality) => {
    selectedQuality.value = quality
    // Quality change logic would go here
  }
  
  const setSubtitle = (subtitleTrack) => {
    selectedSubtitle.value = subtitleTrack
  }
  
  const setAudioTrack = (audioTrack) => {
    selectedAudioTrack.value = audioTrack
  }
  
  const updateSubtitleSettings = (settings) => {
    Object.assign(subtitleSettings.value, settings)
    savePlayerSettings()
  }
  
  const playNext = () => {
    if (canPlayNext.value && currentEpisode.value.nextEpisode) {
      // This would trigger loading the next episode
      const nextEpisode = currentEpisode.value.nextEpisode
      // loadMedia(currentMedia.value, nextEpisode, nextEpisode.streamUrl)
    }
  }
  
  const playPrevious = () => {
    if (canPlayPrevious.value && currentEpisode.value.previousEpisode) {
      // This would trigger loading the previous episode
      const prevEpisode = currentEpisode.value.previousEpisode
      // loadMedia(currentMedia.value, prevEpisode, prevEpisode.streamUrl)
    }
  }
  
  const updateProgress = (time, dur) => {
    currentTime.value = time
    duration.value = dur
    saveProgress()
  }
  
  const setBuffering = (buffering) => {
    isBuffering.value = buffering
  }
  
  const setError = (err) => {
    error.value = err
    hasError.value = !!err
    isPlaying.value = false
  }
  
  const clearError = () => {
    error.value = null
    hasError.value = false
  }
  
  const showControlsTemporarily = () => {
    showControls.value = true
    
    if (controlsTimeout.value) {
      clearTimeout(controlsTimeout.value)
    }
    
    controlsTimeout.value = setTimeout(() => {
      if (isPlaying.value && isUserActive.value) {
        showControls.value = false
      }
    }, 3000)
  }
  
  const setUserActive = (active) => {
    isUserActive.value = active
    if (active) {
      showControlsTemporarily()
    }
  }
  
  const updatePlayerSettings = (settings) => {
    Object.assign(playerSettings.value, settings)
    savePlayerSettings()
  }
  
  const resetPlayer = () => {
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    currentMedia.value = null
    currentEpisode.value = null
    currentStreamUrl.value = ''
    error.value = null
    hasError.value = false
    isLoading.value = false
    isBuffering.value = false
    showControls.value = true
  }
  
  // Private helper methods
  const saveProgress = () => {
    if (!currentMedia.value || !currentEpisode.value) return
    
    const progressKey = `${currentMedia.value.id}-${currentEpisode.value.id}`
    playbackProgress.value[progressKey] = currentTime.value
    
    localStorage.setItem('sora-playback-progress', JSON.stringify(playbackProgress.value))
  }
  
  const savePlayerSettings = () => {
    localStorage.setItem('sora-player-settings', JSON.stringify(playerSettings.value))
  }
  
  const addToWatchHistory = (media, episode) => {
    const historyItem = {
      mediaId: media.id,
      mediaTitle: media.title,
      episodeId: episode.id,
      episodeTitle: episode.title,
      episodeNumber: episode.number,
      watchedAt: new Date().toISOString(),
      thumbnail: media.thumbnail || episode.thumbnail
    }
    
    // Remove existing entry if it exists
    watchHistory.value = watchHistory.value.filter(
      item => !(item.mediaId === media.id && item.episodeId === episode.id)
    )
    
    // Add to beginning
    watchHistory.value.unshift(historyItem)
    
    // Keep only last 100 items
    if (watchHistory.value.length > 100) {
      watchHistory.value = watchHistory.value.slice(0, 100)
    }
    
    localStorage.setItem('sora-watch-history', JSON.stringify(watchHistory.value))
  }
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }
  
  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    isPictureInPicture,
    currentMedia,
    currentEpisode,
    currentStreamUrl,
    availableQualities,
    selectedQuality,
    availableSubtitles,
    selectedSubtitle,
    subtitleSettings,
    availableAudioTracks,
    selectedAudioTrack,
    watchHistory,
    playbackProgress,
    playerSettings,
    isLoading,
    isBuffering,
    error,
    hasError,
    showControls,
    isUserActive,
    
    // Computed
    progress,
    remainingTime,
    formattedCurrentTime,
    formattedDuration,
    formattedRemainingTime,
    canPlayNext,
    canPlayPrevious,
    currentProgress,
    
    // Actions
    initializePlayer,
    loadMedia,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen,
    togglePictureInPicture,
    setQuality,
    setSubtitle,
    setAudioTrack,
    updateSubtitleSettings,
    playNext,
    playPrevious,
    updateProgress,
    setBuffering,
    setError,
    clearError,
    showControlsTemporarily,
    setUserActive,
    updatePlayerSettings,
    resetPlayer
  }
}, {
  persist: {
    paths: ['volume', 'playerSettings', 'subtitleSettings']
  }
}) 