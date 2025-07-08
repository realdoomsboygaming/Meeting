import { SettingsManager } from '../core/settings-manager.js';
import { NetworkUtils } from '../core/network-utils.js';

/**
 * SubtitleCue - Represents a single subtitle cue
 */
export class SubtitleCue {
    constructor(startTime, endTime, text, id = null) {
        this.id = id || this.generateId();
        this.startTime = startTime;
        this.endTime = endTime;
        this.text = text;
    }

    generateId() {
        return 'cue_' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * SubtitleManager - Manages subtitle loading, parsing, and display
 * Ported from Swift VTTSubtitlesLoader functionality
 */
export class SubtitleManager {
    constructor(player) {
        this.player = player;
        this.settingsManager = new SettingsManager();
        this.networkUtils = new NetworkUtils();
        
        // Subtitle data
        this.cues = [];
        this.currentCue = null;
        this.tracks = [];
        this.activeTrackIndex = -1;
        
        // Display settings
        this.subtitlesEnabled = true;
        this.fontSize = 16;
        this.fontFamily = 'Arial, sans-serif';
        this.textColor = '#ffffff';
        this.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.position = 'bottom';
        this.shadowEnabled = true;
        
        // Timing adjustments
        this.timeOffset = -0.5; // Default offset to sync subtitles
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Display elements
        this.subtitleContainer = null;
        this.subtitleElement = null;
        
        this.initialize();
    }

    /**
     * Initialize subtitle manager
     */
    initialize() {
        try {
            // Load user preferences
            this.loadUserPreferences();
            
            // Create subtitle display elements
            this.createSubtitleDisplay();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('SubtitleManager: Initialized successfully');
        } catch (error) {
            console.error('SubtitleManager: Initialization failed:', error);
        }
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        this.subtitlesEnabled = this.settingsManager.get('subtitlesEnabled', true);
        this.fontSize = this.settingsManager.get('subtitleFontSize', 16);
        this.fontFamily = this.settingsManager.get('subtitleFontFamily', 'Arial, sans-serif');
        this.textColor = this.settingsManager.get('subtitleTextColor', '#ffffff');
        this.backgroundColor = this.settingsManager.get('subtitleBackgroundColor', 'rgba(0, 0, 0, 0.8)');
        this.position = this.settingsManager.get('subtitlePosition', 'bottom');
        this.shadowEnabled = this.settingsManager.get('subtitleShadowEnabled', true);
        this.timeOffset = this.settingsManager.get('subtitleTimeOffset', -0.5);
        
        console.log('SubtitleManager: User preferences loaded', {
            enabled: this.subtitlesEnabled,
            fontSize: this.fontSize,
            position: this.position
        });
    }

    /**
     * Create subtitle display elements
     */
    createSubtitleDisplay() {
        if (!this.player || !this.player.container) return;

        // Create subtitle container
        this.subtitleContainer = document.createElement('div');
        this.subtitleContainer.className = 'subtitle-container';
        this.subtitleContainer.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            ${this.position}: 20px;
            text-align: center;
            pointer-events: none;
            z-index: 1000;
            display: ${this.subtitlesEnabled ? 'block' : 'none'};
        `;

        // Create subtitle text element
        this.subtitleElement = document.createElement('div');
        this.subtitleElement.className = 'subtitle-text';
        this.updateSubtitleStyles();
        
        this.subtitleContainer.appendChild(this.subtitleElement);
        this.player.container.appendChild(this.subtitleContainer);
    }

    /**
     * Update subtitle styles
     */
    updateSubtitleStyles() {
        if (!this.subtitleElement) return;

        const shadowStyle = this.shadowEnabled ? '2px 2px 4px rgba(0, 0, 0, 0.8)' : 'none';
        
        this.subtitleElement.style.cssText = `
            display: inline-block;
            font-size: ${this.fontSize}px;
            font-family: ${this.fontFamily};
            color: ${this.textColor};
            background: ${this.backgroundColor};
            padding: 4px 8px;
            border-radius: 4px;
            line-height: 1.4;
            max-width: 80%;
            word-wrap: break-word;
            text-shadow: ${shadowStyle};
            white-space: pre-line;
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.player) return;

        // Listen to player time updates
        this.player.on('timeupdate', (data) => {
            this.updateCurrentSubtitle(data.currentTime);
        });

        // Listen to player events
        this.player.on('play', () => {
            this.showSubtitles();
        });

        this.player.on('pause', () => {
            // Keep subtitles visible when paused
        });

        this.player.on('ended', () => {
            this.hideCurrentSubtitle();
        });
    }

    /**
     * Load subtitle tracks
     * @param {Array} subtitleUrls - Array of subtitle URLs
     * @returns {Promise<boolean>} Success status
     */
    async loadSubtitleTracks(subtitleUrls) {
        try {
            if (!subtitleUrls || !Array.isArray(subtitleUrls)) {
                console.warn('SubtitleManager: Invalid subtitle URLs provided');
                return false;
            }

            this.tracks = [];
            
            for (let i = 0; i < subtitleUrls.length; i++) {
                const url = subtitleUrls[i];
                
                try {
                    const trackData = await this.loadSubtitleTrack(url);
                    if (trackData) {
                        this.tracks.push({
                            index: i,
                            url: url,
                            label: this.getTrackLabel(url, i),
                            language: this.getTrackLanguage(url, i),
                            cues: trackData.cues,
                            format: trackData.format
                        });
                        
                        console.log(`SubtitleManager: Loaded track ${i}: ${trackData.format} with ${trackData.cues.length} cues`);
                    }
                } catch (error) {
                    console.warn(`SubtitleManager: Failed to load subtitle track ${i}:`, error);
                }
            }

            // Auto-select first track if available
            if (this.tracks.length > 0) {
                this.setActiveTrack(0);
            }

            this.emit('tracksloaded', { tracks: this.tracks });
            return true;

        } catch (error) {
            console.error('SubtitleManager: Failed to load subtitle tracks:', error);
            return false;
        }
    }

    /**
     * Load single subtitle track
     * @param {string} url - Subtitle URL
     * @returns {Promise<Object>} Track data with cues and format
     */
    async loadSubtitleTrack(url) {
        try {
            const content = await this.networkUtils.fetchText(url);
            if (!content) {
                throw new Error('Empty subtitle content');
            }

            const format = this.determineSubtitleFormat(url, content);
            let cues = [];

            switch (format) {
                case 'vtt':
                    cues = this.parseVTT(content);
                    break;
                case 'srt':
                    cues = this.parseSRT(content);
                    break;
                default:
                    // Auto-detect format
                    if (content.trim().startsWith('WEBVTT')) {
                        cues = this.parseVTT(content);
                        format = 'vtt';
                    } else {
                        cues = this.parseSRT(content);
                        format = 'srt';
                    }
            }

            return { cues, format };

        } catch (error) {
            console.error('SubtitleManager: Failed to load subtitle track:', error);
            return null;
        }
    }

    /**
     * Determine subtitle format from URL and content
     * @param {string} url - Subtitle URL
     * @param {string} content - Subtitle content
     * @returns {string} Format ('vtt', 'srt', or 'unknown')
     */
    determineSubtitleFormat(url, content) {
        // Check file extension
        const extension = url.split('.').pop().toLowerCase().split('?')[0];
        
        switch (extension) {
            case 'vtt':
            case 'webvtt':
                return 'vtt';
            case 'srt':
                return 'srt';
            default:
                // Check content
                if (content.trim().startsWith('WEBVTT')) {
                    return 'vtt';
                } else if (content.includes('-->') && /\d{2}:\d{2}:\d{2}/.test(content)) {
                    return content.includes(',') ? 'srt' : 'vtt';
                }
                return 'unknown';
        }
    }

    /**
     * Parse VTT subtitle content
     * @param {string} content - VTT content
     * @returns {Array<SubtitleCue>} Parsed cues
     */
    parseVTT(content) {
        const cues = [];
        const lines = content.split(/\r?\n/);
        let index = 0;

        while (index < lines.length) {
            const line = lines[index].trim();
            
            // Skip empty lines and WEBVTT header
            if (!line || line === 'WEBVTT') {
                index++;
                continue;
            }

            // Skip lines that don't contain time codes
            if (!line.includes('-->')) {
                index++;
                if (index >= lines.length) break;
            }

            // Parse time line
            const timeLine = lines[index];
            const times = timeLine.split('-->');
            if (times.length < 2) {
                index++;
                continue;
            }

            const startTime = this.parseTimecode(times[0].trim()) + this.timeOffset;
            const endTime = this.parseTimecode(times[1].trim()) + this.timeOffset;
            
            index++;

            // Parse cue text
            let cueText = '';
            while (index < lines.length && lines[index].trim() !== '') {
                cueText += lines[index] + '\n';
                index++;
            }

            if (cueText.trim()) {
                cues.push(new SubtitleCue(
                    Math.max(startTime, 0),
                    Math.max(endTime, 0),
                    cueText.trim()
                ));
            }
        }

        return cues;
    }

    /**
     * Parse SRT subtitle content
     * @param {string} content - SRT content
     * @returns {Array<SubtitleCue>} Parsed cues
     */
    parseSRT(content) {
        const cues = [];
        const normalizedContent = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        
        const blocks = normalizedContent.split('\n\n').filter(block => block.trim());

        for (const block of blocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length < 2) continue;

            // Find the time line (usually second line, but could vary)
            let timeLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('-->')) {
                    timeLineIndex = i;
                    break;
                }
            }

            if (timeLineIndex === -1) continue;

            const timeLine = lines[timeLineIndex];
            const times = timeLine.split('-->');
            if (times.length < 2) continue;

            const startTime = this.parseSRTTimecode(times[0].trim()) + this.timeOffset;
            const endTime = this.parseSRTTimecode(times[1].trim()) + this.timeOffset;

            // Get text lines (everything after time line)
            const textLines = lines.slice(timeLineIndex + 1);
            const text = textLines.join('\n');

            if (text.trim()) {
                cues.push(new SubtitleCue(
                    Math.max(startTime, 0),
                    Math.max(endTime, 0),
                    text.trim()
                ));
            }
        }

        return cues;
    }

    /**
     * Parse VTT timecode
     * @param {string} timeString - Time string
     * @returns {number} Time in seconds
     */
    parseTimecode(timeString) {
        const parts = timeString.split(':');
        let seconds = 0;

        if (parts.length === 3) {
            // HH:MM:SS.mmm
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const secs = parseFloat(parts[2].replace(',', '.')) || 0;
            seconds = hours * 3600 + minutes * 60 + secs;
        } else if (parts.length === 2) {
            // MM:SS.mmm
            const minutes = parseFloat(parts[0]) || 0;
            const secs = parseFloat(parts[1].replace(',', '.')) || 0;
            seconds = minutes * 60 + secs;
        }

        return seconds;
    }

    /**
     * Parse SRT timecode
     * @param {string} timeString - SRT time string
     * @returns {number} Time in seconds
     */
    parseSRTTimecode(timeString) {
        const parts = timeString.split(':');
        if (parts.length !== 3) return 0;

        const secondsParts = parts[2].split(',');
        if (secondsParts.length !== 2) return 0;

        const hours = parseFloat(parts[0]) || 0;
        const minutes = parseFloat(parts[1]) || 0;
        const seconds = parseFloat(secondsParts[0]) || 0;
        const milliseconds = parseFloat(secondsParts[1]) || 0;

        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    /**
     * Get track label from URL or index
     * @param {string} url - Track URL
     * @param {number} index - Track index
     * @returns {string} Track label
     */
    getTrackLabel(url, index) {
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
            return languageNames[langCode] || `Track ${index + 1}`;
        }
        
        return `Track ${index + 1}`;
    }

    /**
     * Get track language code
     * @param {string} url - Track URL
     * @param {number} index - Track index
     * @returns {string} Language code
     */
    getTrackLanguage(url, index) {
        const langMatch = url.match(/[._-](en|es|fr|de|it|pt|ja|ko|zh|ar|ru|hi)[._-]/i);
        return langMatch ? langMatch[1].toLowerCase() : 'en';
    }

    /**
     * Set active subtitle track
     * @param {number} trackIndex - Track index to activate
     */
    setActiveTrack(trackIndex) {
        if (trackIndex < 0 || trackIndex >= this.tracks.length) {
            this.activeTrackIndex = -1;
            this.cues = [];
            this.hideCurrentSubtitle();
            return;
        }

        this.activeTrackIndex = trackIndex;
        this.cues = this.tracks[trackIndex].cues;
        
        console.log(`SubtitleManager: Active track set to ${trackIndex}: ${this.tracks[trackIndex].label}`);
        this.emit('trackchanged', { track: this.tracks[trackIndex], index: trackIndex });
    }

    /**
     * Update current subtitle based on time
     * @param {number} currentTime - Current playback time
     */
    updateCurrentSubtitle(currentTime) {
        if (!this.subtitlesEnabled || this.cues.length === 0) {
            this.hideCurrentSubtitle();
            return;
        }

        // Find current cue
        const activeCue = this.cues.find(cue => 
            currentTime >= cue.startTime && currentTime <= cue.endTime
        );

        if (activeCue && activeCue !== this.currentCue) {
            this.currentCue = activeCue;
            this.displaySubtitle(activeCue.text);
        } else if (!activeCue && this.currentCue) {
            this.currentCue = null;
            this.hideCurrentSubtitle();
        }
    }

    /**
     * Display subtitle text
     * @param {string} text - Subtitle text to display
     */
    displaySubtitle(text) {
        if (!this.subtitleElement || !this.subtitlesEnabled) return;

        // Process text (remove HTML tags, handle formatting)
        const processedText = this.processSubtitleText(text);
        
        this.subtitleElement.textContent = processedText;
        this.subtitleContainer.style.display = 'block';
    }

    /**
     * Hide current subtitle
     */
    hideCurrentSubtitle() {
        if (this.subtitleContainer) {
            this.subtitleContainer.style.display = 'none';
        }
        if (this.subtitleElement) {
            this.subtitleElement.textContent = '';
        }
    }

    /**
     * Process subtitle text
     * @param {string} text - Raw subtitle text
     * @returns {string} Processed text
     */
    processSubtitleText(text) {
        // Remove common subtitle HTML tags but preserve line breaks
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }

    /**
     * Show subtitles
     */
    showSubtitles() {
        this.subtitlesEnabled = true;
        this.settingsManager.set('subtitlesEnabled', true);
        
        if (this.subtitleContainer) {
            this.subtitleContainer.style.display = 'block';
        }
        
        this.emit('subtitlesenabled');
    }

    /**
     * Hide subtitles
     */
    hideSubtitles() {
        this.subtitlesEnabled = false;
        this.settingsManager.set('subtitlesEnabled', false);
        this.hideCurrentSubtitle();
        
        this.emit('subtitlesdisabled');
    }

    /**
     * Toggle subtitles
     */
    toggleSubtitles() {
        if (this.subtitlesEnabled) {
            this.hideSubtitles();
        } else {
            this.showSubtitles();
        }
    }

    /**
     * Set subtitle settings
     * @param {Object} settings - Subtitle settings
     */
    setSubtitleSettings(settings) {
        if (settings.fontSize !== undefined) {
            this.fontSize = settings.fontSize;
            this.settingsManager.set('subtitleFontSize', this.fontSize);
        }

        if (settings.fontFamily !== undefined) {
            this.fontFamily = settings.fontFamily;
            this.settingsManager.set('subtitleFontFamily', this.fontFamily);
        }

        if (settings.textColor !== undefined) {
            this.textColor = settings.textColor;
            this.settingsManager.set('subtitleTextColor', this.textColor);
        }

        if (settings.backgroundColor !== undefined) {
            this.backgroundColor = settings.backgroundColor;
            this.settingsManager.set('subtitleBackgroundColor', this.backgroundColor);
        }

        if (settings.position !== undefined) {
            this.position = settings.position;
            this.settingsManager.set('subtitlePosition', this.position);
            this.updateSubtitlePosition();
        }

        if (settings.shadowEnabled !== undefined) {
            this.shadowEnabled = settings.shadowEnabled;
            this.settingsManager.set('subtitleShadowEnabled', this.shadowEnabled);
        }

        if (settings.timeOffset !== undefined) {
            this.timeOffset = settings.timeOffset;
            this.settingsManager.set('subtitleTimeOffset', this.timeOffset);
        }

        this.updateSubtitleStyles();
        console.log('SubtitleManager: Settings updated');
    }

    /**
     * Update subtitle position
     */
    updateSubtitlePosition() {
        if (!this.subtitleContainer) return;

        // Reset position styles
        this.subtitleContainer.style.top = 'auto';
        this.subtitleContainer.style.bottom = 'auto';

        if (this.position === 'top') {
            this.subtitleContainer.style.top = '20px';
        } else {
            this.subtitleContainer.style.bottom = '20px';
        }
    }

    /**
     * Get available tracks
     * @returns {Array} Available subtitle tracks
     */
    getAvailableTracks() {
        return this.tracks;
    }

    /**
     * Get current track
     * @returns {Object|null} Current track
     */
    getCurrentTrack() {
        return this.activeTrackIndex >= 0 ? this.tracks[this.activeTrackIndex] : null;
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
                    console.error(`SubtitleManager: Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Destroy subtitle manager
     */
    destroy() {
        // Remove display elements
        if (this.subtitleContainer && this.subtitleContainer.parentNode) {
            this.subtitleContainer.parentNode.removeChild(this.subtitleContainer);
        }

        // Clear data
        this.cues = [];
        this.tracks = [];
        this.currentCue = null;
        this.activeTrackIndex = -1;

        // Clear event handlers
        this.eventHandlers.clear();

        console.log('SubtitleManager: Destroyed');
    }
} 