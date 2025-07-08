import { SettingsManager } from '../core/settings-manager.js';
import { NetworkUtils } from '../core/network-utils.js';

/**
 * EnhancedPlayer - Enhanced video player with Plyr integration
 * Ported from Swift CustomPlayer functionality
 */
export class EnhancedPlayer {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            autoplay: options.autoplay || false,
            controls: options.controls !== false,
            quality: options.quality || { default: 720, options: [1080, 720, 480, 360] },
            captions: options.captions !== false,
            fullscreen: options.fullscreen !== false,
            pip: options.pip !== false,
            seekTime: options.seekTime || 10,
            volume: options.volume || 0.8,
            ...options
        };

        this.settingsManager = new SettingsManager();
        this.networkUtils = new NetworkUtils();
        
        // Player state
        this.player = null;
        this.currentSource = null;
        this.qualities = [];
        this.subtitles = [];
        this.isInitialized = false;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Auto-hide controls timer
        this.controlsTimer = null;
        this.controlsVisible = true;
        
        this.initialize();
    }

    /**
     * Initialize the enhanced player
     */
    async initialize() {
        try {
            // Load Plyr if not already loaded
            await this.loadPlyr();
            
            // Create video element
            this.createVideoElement();
            
            // Initialize Plyr
            this.initializePlyr();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load user preferences
            this.loadUserPreferences();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('EnhancedPlayer: Player initialized successfully');
            
        } catch (error) {
            console.error('EnhancedPlayer: Failed to initialize player:', error);
            this.emit('error', { type: 'initialization', error });
        }
    }

    /**
     * Load Plyr library if not already loaded
     */
    async loadPlyr() {
        if (window.Plyr) {
            console.log('EnhancedPlayer: Plyr already loaded');
            return;
        }

        return new Promise((resolve, reject) => {
            // Load Plyr CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
            document.head.appendChild(cssLink);

            // Load Plyr JS
            const script = document.createElement('script');
            script.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
            script.onload = () => {
                console.log('EnhancedPlayer: Plyr loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Plyr'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Create video element
     */
    createVideoElement() {
        this.videoElement = document.createElement('video');
        this.videoElement.className = 'enhanced-player-video';
        this.videoElement.controls = false; // Plyr will handle controls
        this.videoElement.playsInline = true;
        this.videoElement.preload = 'metadata';
        
        // Clear container and add video element
        this.container.innerHTML = '';
        this.container.appendChild(this.videoElement);
    }

    /**
     * Initialize Plyr with custom configuration
     */
    initializePlyr() {
        const plyrConfig = {
            autoplay: this.options.autoplay,
            controls: [
                'play-large',
                'restart',
                'rewind',
                'play',
                'fast-forward',
                'progress',
                'current-time',
                'duration',
                'mute',
                'volume',
                'captions',
                'settings',
                'pip',
                'airplay',
                'fullscreen'
            ],
            settings: ['captions', 'quality', 'speed'],
            quality: {
                default: this.options.quality.default,
                options: this.options.quality.options,
                forced: true
            },
            captions: {
                active: this.settingsManager.get('subtitlesEnabled', true),
                language: this.settingsManager.get('subtitleLanguage', 'auto'),
                update: true
            },
            fullscreen: {
                enabled: this.options.fullscreen,
                fallback: true,
                iosNative: true
            },
            pip: {
                enabled: this.options.pip
            },
            seekTime: this.options.seekTime,
            volume: this.options.volume,
            clickToPlay: true,
            disableContextMenu: true,
            loadSprite: true,
            iconUrl: 'https://cdn.plyr.io/3.7.8/plyr.svg',
            ratio: '16:9'
        };

        this.player = new Plyr(this.videoElement, plyrConfig);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.player) return;

        // Plyr events
        this.player.on('ready', () => {
            console.log('EnhancedPlayer: Plyr ready');
            this.emit('ready');
        });

        this.player.on('play', () => {
            this.isPlaying = true;
            this.startControlsTimer();
            this.emit('play');
        });

        this.player.on('pause', () => {
            this.isPlaying = false;
            this.clearControlsTimer();
            this.emit('pause');
        });

        this.player.on('timeupdate', () => {
            this.currentTime = this.player.currentTime;
            this.duration = this.player.duration;
            this.emit('timeupdate', { currentTime: this.currentTime, duration: this.duration });
        });

        this.player.on('ended', () => {
            this.isPlaying = false;
            this.emit('ended');
            this.handleAutoNext();
        });

        this.player.on('error', (event) => {
            console.error('EnhancedPlayer: Plyr error:', event);
            this.emit('error', { type: 'playback', event });
        });

        this.player.on('qualitychange', (event) => {
            const quality = event.detail.quality;
            console.log(`EnhancedPlayer: Quality changed to ${quality}p`);
            this.settingsManager.set('preferredQuality', quality);
            this.emit('qualitychange', { quality });
        });

        this.player.on('volumechange', () => {
            this.settingsManager.set('volume', this.player.volume);
        });

        this.player.on('captionsenabled', () => {
            this.settingsManager.set('subtitlesEnabled', true);
            this.emit('subtitlesenabled');
        });

        this.player.on('captionsdisabled', () => {
            this.settingsManager.set('subtitlesEnabled', false);
            this.emit('subtitlesdisabled');
        });

        // Custom control events
        this.setupCustomControls();
    }

    /**
     * Setup custom controls and gestures
     */
    setupCustomControls() {
        // Double-tap to skip (if enabled)
        if (this.settingsManager.get('doubleTapSeekEnabled', false)) {
            let tapCount = 0;
            let tapTimer = null;

            this.videoElement.addEventListener('click', (e) => {
                tapCount++;
                
                if (tapCount === 1) {
                    tapTimer = setTimeout(() => {
                        tapCount = 0;
                        // Single tap - toggle play/pause
                        this.player.togglePlay();
                    }, 300);
                } else if (tapCount === 2) {
                    clearTimeout(tapTimer);
                    tapCount = 0;
                    
                    // Double tap - seek forward/backward based on side of screen
                    const rect = this.videoElement.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const isRightSide = clickX > rect.width / 2;
                    
                    if (isRightSide) {
                        this.seekForward();
                    } else {
                        this.seekBackward();
                    }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.player || !this.isInViewport()) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.player.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekBackward();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekForward();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-0.1);
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.player.fullscreen.toggle();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.player.muted = !this.player.muted;
                    break;
            }
        });
    }

    /**
     * Load user preferences from settings
     */
    loadUserPreferences() {
        // Load volume
        const savedVolume = this.settingsManager.get('volume', 0.8);
        if (this.player) {
            this.player.volume = savedVolume;
        }

        // Load subtitle preferences
        const subtitlesEnabled = this.settingsManager.get('subtitlesEnabled', true);
        if (this.player && subtitlesEnabled) {
            this.player.captions.active = true;
        }

        // Load preferred quality
        const preferredQuality = this.settingsManager.get('preferredQuality', 720);
        if (this.player && this.qualities.length > 0) {
            const quality = this.qualities.find(q => q.size === preferredQuality);
            if (quality) {
                this.player.quality = preferredQuality;
            }
        }
    }

    /**
     * Load video source with qualities and subtitles
     * @param {Object} source - Source object with streams, subtitles, and metadata
     */
    async loadSource(source) {
        try {
            if (!this.player) {
                console.error('EnhancedPlayer: Player not initialized');
                return false;
            }

            this.currentSource = source;
            console.log('EnhancedPlayer: Loading source:', source);

            // Prepare video sources
            const videoSources = this.prepareVideoSources(source);
            
            // Prepare subtitle tracks
            const subtitleTracks = await this.prepareSubtitleTracks(source);

            // Update Plyr source
            this.player.source = {
                type: 'video',
                sources: videoSources,
                tracks: subtitleTracks
            };

            this.emit('sourceloaded', { source });
            console.log('EnhancedPlayer: Source loaded successfully');
            return true;

        } catch (error) {
            console.error('EnhancedPlayer: Failed to load source:', error);
            this.emit('error', { type: 'source_load', error });
            return false;
        }
    }

    /**
     * Prepare video sources for Plyr
     * @param {Object} source - Source object
     * @returns {Array} Array of video sources
     */
    prepareVideoSources(source) {
        const sources = [];

        // Handle sources with quality information
        if (source.sources && Array.isArray(source.sources)) {
            source.sources.forEach(src => {
                if (src.url) {
                    sources.push({
                        src: src.url,
                        type: this.getVideoType(src.url),
                        size: this.parseQuality(src.quality || src.label || '720p')
                    });
                }
            });
        }
        
        // Handle simple stream URLs
        if (source.streams && Array.isArray(source.streams)) {
            source.streams.forEach((streamUrl, index) => {
                sources.push({
                    src: streamUrl,
                    type: this.getVideoType(streamUrl),
                    size: 720 - (index * 240) // Default quality assignment
                });
            });
        }

        // Sort by quality (highest first)
        sources.sort((a, b) => b.size - a.size);

        this.qualities = sources;
        console.log('EnhancedPlayer: Prepared video sources:', sources);
        
        return sources;
    }

    /**
     * Prepare subtitle tracks for Plyr
     * @param {Object} source - Source object
     * @returns {Array} Array of subtitle tracks
     */
    async prepareSubtitleTracks(source) {
        const tracks = [];

        if (source.subtitles && Array.isArray(source.subtitles)) {
            for (let i = 0; i < source.subtitles.length; i++) {
                const subtitleUrl = source.subtitles[i];
                
                try {
                    // Validate subtitle URL
                    const response = await fetch(subtitleUrl, { method: 'HEAD' });
                    if (response.ok) {
                        tracks.push({
                            kind: 'captions',
                            label: this.getSubtitleLabel(subtitleUrl, i),
                            src: subtitleUrl,
                            srcLang: this.getSubtitleLanguage(subtitleUrl, i),
                            default: i === 0
                        });
                    }
                } catch (error) {
                    console.warn('EnhancedPlayer: Invalid subtitle URL:', subtitleUrl);
                }
            }
        }

        this.subtitles = tracks;
        console.log('EnhancedPlayer: Prepared subtitle tracks:', tracks);
        
        return tracks;
    }

    /**
     * Get video MIME type from URL
     * @param {string} url - Video URL
     * @returns {string} MIME type
     */
    getVideoType(url) {
        const extension = url.split('.').pop().toLowerCase().split('?')[0];
        
        switch (extension) {
            case 'mp4':
                return 'video/mp4';
            case 'webm':
                return 'video/webm';
            case 'ogg':
                return 'video/ogg';
            case 'm3u8':
                return 'application/x-mpegURL';
            default:
                return 'video/mp4'; // Default fallback
        }
    }

    /**
     * Parse quality string to number
     * @param {string} qualityStr - Quality string (e.g., "1080p")
     * @returns {number} Quality number
     */
    parseQuality(qualityStr) {
        const match = String(qualityStr).match(/(\d+)p?/i);
        return match ? parseInt(match[1], 10) : 720;
    }

    /**
     * Get subtitle label from URL or index
     * @param {string} url - Subtitle URL
     * @param {number} index - Subtitle index
     * @returns {string} Subtitle label
     */
    getSubtitleLabel(url, index) {
        // Try to extract language from URL
        const langMatch = url.match(/[._-](en|es|fr|de|it|pt|ja|ko|zh|ar|ru|hi)[._-]/i);
        if (langMatch) {
            const langCode = langMatch[1].toLowerCase();
            const languageNames = {
                en: 'English',
                es: 'Español',
                fr: 'Français',
                de: 'Deutsch',
                it: 'Italiano',
                pt: 'Português',
                ja: '日本語',
                ko: '한국어',
                zh: '中文',
                ar: 'العربية',
                ru: 'Русский',
                hi: 'हिन्दी'
            };
            return languageNames[langCode] || `Language ${index + 1}`;
        }
        
        return `Subtitle ${index + 1}`;
    }

    /**
     * Get subtitle language code
     * @param {string} url - Subtitle URL
     * @param {number} index - Subtitle index
     * @returns {string} Language code
     */
    getSubtitleLanguage(url, index) {
        const langMatch = url.match(/[._-](en|es|fr|de|it|pt|ja|ko|zh|ar|ru|hi)[._-]/i);
        return langMatch ? langMatch[1].toLowerCase() : 'en';
    }

    /**
     * Seek forward by configured amount
     */
    seekForward() {
        if (this.player) {
            this.player.currentTime = Math.min(
                this.player.currentTime + this.options.seekTime,
                this.player.duration
            );
            this.showSeekIndicator(`+${this.options.seekTime}s`);
        }
    }

    /**
     * Seek backward by configured amount
     */
    seekBackward() {
        if (this.player) {
            this.player.currentTime = Math.max(
                this.player.currentTime - this.options.seekTime,
                0
            );
            this.showSeekIndicator(`-${this.options.seekTime}s`);
        }
    }

    /**
     * Adjust volume
     * @param {number} delta - Volume change (-1 to 1)
     */
    adjustVolume(delta) {
        if (this.player) {
            this.player.volume = Math.max(0, Math.min(1, this.player.volume + delta));
        }
    }

    /**
     * Show seek indicator
     * @param {string} text - Indicator text
     */
    showSeekIndicator(text) {
        // Create or update seek indicator
        let indicator = this.container.querySelector('.seek-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'seek-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                z-index: 1000;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            this.container.appendChild(indicator);
        }

        indicator.textContent = text;
        indicator.style.opacity = '1';

        // Hide after delay
        setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
            }
        }, 1000);
    }

    /**
     * Start auto-hide controls timer
     */
    startControlsTimer() {
        this.clearControlsTimer();
        this.controlsTimer = setTimeout(() => {
            if (this.player && this.isPlaying) {
                // Plyr handles this automatically, but we can add custom logic here
                this.emit('controlshidden');
            }
        }, 3000);
    }

    /**
     * Clear auto-hide controls timer
     */
    clearControlsTimer() {
        if (this.controlsTimer) {
            clearTimeout(this.controlsTimer);
            this.controlsTimer = null;
        }
    }

    /**
     * Handle auto-next episode
     */
    handleAutoNext() {
        const autoplayEnabled = this.settingsManager.get('autoplayNext', true);
        if (autoplayEnabled) {
            this.emit('autonext');
        }
    }

    /**
     * Check if player is in viewport
     * @returns {boolean} True if player is visible
     */
    isInViewport() {
        if (!this.container) return false;
        
        const rect = this.container.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Event emitter methods
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data = null) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`EnhancedPlayer: Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Play the video
     */
    play() {
        if (this.player) {
            return this.player.play();
        }
    }

    /**
     * Pause the video
     */
    pause() {
        if (this.player) {
            this.player.pause();
        }
    }

    /**
     * Stop the video
     */
    stop() {
        if (this.player) {
            this.player.stop();
        }
    }

    /**
     * Enter fullscreen
     */
    enterFullscreen() {
        if (this.player) {
            this.player.fullscreen.enter();
        }
    }

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (this.player) {
            this.player.fullscreen.exit();
        }
    }

    /**
     * Enter picture-in-picture mode
     */
    enterPip() {
        if (this.player && this.player.pip) {
            this.player.pip.enter();
        }
    }

    /**
     * Exit picture-in-picture mode
     */
    exitPip() {
        if (this.player && this.player.pip) {
            this.player.pip.exit();
        }
    }

    /**
     * Destroy the player
     */
    destroy() {
        this.clearControlsTimer();
        
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }

        this.eventHandlers.clear();
        this.isInitialized = false;
        
        console.log('EnhancedPlayer: Player destroyed');
    }
} 