import { SettingsManager } from '../core/settings-manager.js';

/**
 * QualityManager - Manages video quality selection with network awareness
 * Ported from Swift CustomPlayer quality management functionality
 */
export class QualityManager {
    constructor(player) {
        this.player = player;
        this.settingsManager = new SettingsManager();
        
        // Network monitoring
        this.networkConnection = null;
        this.networkSpeed = null;
        this.isNetworkMonitoring = false;
        
        // Quality settings
        this.availableQualities = [];
        this.currentQuality = null;
        this.autoQualityEnabled = true;
        this.qualityChangeTimer = null;
        
        // Bandwidth estimation
        this.bandwidthHistory = [];
        this.maxBandwidthSamples = 10;
        
        // Quality thresholds (kbps)
        this.qualityThresholds = {
            240: 500,
            360: 800,
            480: 1200,
            720: 2500,
            1080: 5000,
            1440: 10000,
            2160: 20000
        };
        
        // Buffer health monitoring
        this.bufferHealthTimer = null;
        this.lowBufferThreshold = 10; // seconds
        this.highBufferThreshold = 30; // seconds
        
        this.initialize();
    }

    /**
     * Initialize quality manager
     */
    initialize() {
        try {
            // Load user preferences
            this.loadUserPreferences();
            
            // Setup network monitoring
            this.setupNetworkMonitoring();
            
            // Setup buffer monitoring
            this.setupBufferMonitoring();
            
            console.log('QualityManager: Initialized successfully');
        } catch (error) {
            console.error('QualityManager: Initialization failed:', error);
        }
    }

    /**
     * Load user preferences from settings
     */
    loadUserPreferences() {
        // Load quality preferences
        this.autoQualityEnabled = this.settingsManager.get('autoQualityEnabled', true);
        
        // Load preferred quality for different network types
        this.wifiQuality = this.settingsManager.get('wifiPreferredQuality', 1080);
        this.cellularQuality = this.settingsManager.get('cellularPreferredQuality', 720);
        this.ethernetQuality = this.settingsManager.get('ethernetPreferredQuality', 1080);
        
        // Load bandwidth preferences
        this.conserveBandwidth = this.settingsManager.get('conserveBandwidth', false);
        
        console.log('QualityManager: User preferences loaded', {
            autoQuality: this.autoQualityEnabled,
            wifiQuality: this.wifiQuality,
            cellularQuality: this.cellularQuality,
            conserveBandwidth: this.conserveBandwidth
        });
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        // Monitor network connection type
        if (navigator.connection) {
            this.networkConnection = navigator.connection;
            this.updateNetworkInfo();
            
            this.networkConnection.addEventListener('change', () => {
                this.updateNetworkInfo();
                this.handleNetworkChange();
            });
        }

        // Monitor online/offline status
        window.addEventListener('online', () => {
            console.log('QualityManager: Connection restored');
            this.handleNetworkChange();
        });

        window.addEventListener('offline', () => {
            console.log('QualityManager: Connection lost');
            this.pauseQualityAdjustment();
        });
    }

    /**
     * Update network information
     */
    updateNetworkInfo() {
        if (!this.networkConnection) return;

        const connection = this.networkConnection;
        
        this.networkSpeed = {
            effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
            downlink: connection.downlink, // Mbps
            rtt: connection.rtt, // Round trip time in ms
            saveData: connection.saveData // Data saver mode
        };

        console.log('QualityManager: Network info updated', this.networkSpeed);
    }

    /**
     * Setup buffer monitoring
     */
    setupBufferMonitoring() {
        if (!this.player || !this.player.player) return;

        // Monitor buffer health every 5 seconds
        this.bufferHealthTimer = setInterval(() => {
            this.checkBufferHealth();
        }, 5000);
    }

    /**
     * Check buffer health and adjust quality accordingly
     */
    checkBufferHealth() {
        if (!this.player || !this.player.player || !this.autoQualityEnabled) return;

        try {
            const video = this.player.videoElement;
            if (!video || !video.buffered || video.buffered.length === 0) return;

            const currentTime = video.currentTime;
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const bufferAhead = bufferedEnd - currentTime;

            // Check if buffer is running low
            if (bufferAhead < this.lowBufferThreshold && this.currentQuality) {
                this.handleLowBuffer();
            }
            // Check if buffer is healthy and we can increase quality
            else if (bufferAhead > this.highBufferThreshold && this.currentQuality) {
                this.handleHealthyBuffer();
            }

        } catch (error) {
            console.warn('QualityManager: Buffer check failed:', error);
        }
    }

    /**
     * Handle low buffer situation
     */
    handleLowBuffer() {
        if (!this.currentQuality) return;

        const lowerQuality = this.getLowerQuality(this.currentQuality.size);
        if (lowerQuality) {
            console.log(`QualityManager: Buffer low, reducing quality from ${this.currentQuality.size}p to ${lowerQuality.size}p`);
            this.changeQuality(lowerQuality);
        }
    }

    /**
     * Handle healthy buffer situation
     */
    handleHealthyBuffer() {
        if (!this.currentQuality || !this.networkSpeed) return;

        const higherQuality = this.getHigherQuality(this.currentQuality.size);
        if (higherQuality && this.canSupportQuality(higherQuality.size)) {
            console.log(`QualityManager: Buffer healthy, increasing quality from ${this.currentQuality.size}p to ${higherQuality.size}p`);
            this.changeQuality(higherQuality);
        }
    }

    /**
     * Set available qualities
     * @param {Array} qualities - Array of quality objects
     */
    setAvailableQualities(qualities) {
        this.availableQualities = qualities.sort((a, b) => b.size - a.size);
        console.log('QualityManager: Available qualities set:', this.availableQualities);
        
        // Auto-select initial quality
        if (this.autoQualityEnabled) {
            this.selectInitialQuality();
        }
    }

    /**
     * Select initial quality based on network conditions
     */
    selectInitialQuality() {
        if (this.availableQualities.length === 0) return;

        let targetQuality;

        // Use network type preferences
        if (this.networkConnection) {
            const connectionType = this.getConnectionType();
            
            switch (connectionType) {
                case 'wifi':
                    targetQuality = this.wifiQuality;
                    break;
                case 'cellular':
                    targetQuality = this.cellularQuality;
                    break;
                case 'ethernet':
                    targetQuality = this.ethernetQuality;
                    break;
                default:
                    targetQuality = this.conserveBandwidth ? 480 : 720;
            }
        } else {
            // Fallback to conservative choice
            targetQuality = this.conserveBandwidth ? 480 : 720;
        }

        // Find best available quality
        const selectedQuality = this.findBestQuality(targetQuality);
        if (selectedQuality) {
            this.changeQuality(selectedQuality);
        }
    }

    /**
     * Get connection type
     * @returns {string} Connection type
     */
    getConnectionType() {
        if (!this.networkConnection) return 'unknown';

        // Check for ethernet (wired connection)
        if (this.networkConnection.type === 'ethernet') {
            return 'ethernet';
        }

        // Check for cellular
        if (['cellular', '2g', '3g', '4g', '5g'].includes(this.networkConnection.type) || 
            ['slow-2g', '2g', '3g'].includes(this.networkConnection.effectiveType)) {
            return 'cellular';
        }

        // Default to wifi for unknown connections
        return 'wifi';
    }

    /**
     * Find best available quality for target
     * @param {number} targetQuality - Target quality (e.g., 720)
     * @returns {Object|null} Best quality object
     */
    findBestQuality(targetQuality) {
        if (this.availableQualities.length === 0) return null;

        // Find exact match first
        let bestQuality = this.availableQualities.find(q => q.size === targetQuality);
        
        // If no exact match, find closest lower quality
        if (!bestQuality) {
            bestQuality = this.availableQualities
                .filter(q => q.size <= targetQuality)
                .sort((a, b) => b.size - a.size)[0];
        }

        // If still no match, use lowest quality
        if (!bestQuality) {
            bestQuality = this.availableQualities[this.availableQualities.length - 1];
        }

        return bestQuality;
    }

    /**
     * Get lower quality option
     * @param {number} currentSize - Current quality size
     * @returns {Object|null} Lower quality object
     */
    getLowerQuality(currentSize) {
        const lowerQualities = this.availableQualities.filter(q => q.size < currentSize);
        return lowerQualities.length > 0 ? lowerQualities[0] : null;
    }

    /**
     * Get higher quality option
     * @param {number} currentSize - Current quality size
     * @returns {Object|null} Higher quality object
     */
    getHigherQuality(currentSize) {
        const higherQualities = this.availableQualities.filter(q => q.size > currentSize);
        return higherQualities.length > 0 ? higherQualities[higherQualities.length - 1] : null;
    }

    /**
     * Check if network can support quality
     * @param {number} qualitySize - Quality size to check
     * @returns {boolean} True if quality is supported
     */
    canSupportQuality(qualitySize) {
        if (!this.networkSpeed) return true; // Assume yes if no network info

        const requiredBandwidth = this.qualityThresholds[qualitySize] || 1000;
        const availableBandwidth = this.networkSpeed.downlink * 1000; // Convert Mbps to kbps

        // Apply safety margin
        const safetyMargin = this.conserveBandwidth ? 0.6 : 0.8;
        const effectiveBandwidth = availableBandwidth * safetyMargin;

        // Consider RTT for quality selection
        const rttPenalty = this.networkSpeed.rtt > 200 ? 0.8 : 1.0;
        const adjustedBandwidth = effectiveBandwidth * rttPenalty;

        return adjustedBandwidth >= requiredBandwidth;
    }

    /**
     * Change quality
     * @param {Object} quality - Quality object to change to
     */
    changeQuality(quality) {
        if (!quality || !this.player || !this.player.player) return;

        try {
            // Prevent rapid quality changes
            if (this.qualityChangeTimer) {
                clearTimeout(this.qualityChangeTimer);
            }

            this.qualityChangeTimer = setTimeout(() => {
                this.currentQuality = quality;
                
                // Change quality in Plyr
                if (this.player.player.quality !== quality.size) {
                    this.player.player.quality = quality.size;
                    console.log(`QualityManager: Quality changed to ${quality.size}p`);
                    
                    // Save preference
                    const connectionType = this.getConnectionType();
                    this.settingsManager.set(`${connectionType}PreferredQuality`, quality.size);
                }
            }, 1000); // 1 second delay to prevent rapid changes

        } catch (error) {
            console.error('QualityManager: Failed to change quality:', error);
        }
    }

    /**
     * Handle network change
     */
    handleNetworkChange() {
        if (!this.autoQualityEnabled) return;

        console.log('QualityManager: Network changed, reassessing quality');
        
        // Delay quality change to allow network to stabilize
        setTimeout(() => {
            this.selectInitialQuality();
        }, 2000);
    }

    /**
     * Pause quality adjustment (e.g., when offline)
     */
    pauseQualityAdjustment() {
        if (this.qualityChangeTimer) {
            clearTimeout(this.qualityChangeTimer);
            this.qualityChangeTimer = null;
        }
    }

    /**
     * Enable auto quality adjustment
     */
    enableAutoQuality() {
        this.autoQualityEnabled = true;
        this.settingsManager.set('autoQualityEnabled', true);
        this.selectInitialQuality();
        console.log('QualityManager: Auto quality enabled');
    }

    /**
     * Disable auto quality adjustment
     */
    disableAutoQuality() {
        this.autoQualityEnabled = false;
        this.settingsManager.set('autoQualityEnabled', false);
        this.pauseQualityAdjustment();
        console.log('QualityManager: Auto quality disabled');
    }

    /**
     * Manually set quality
     * @param {number} qualitySize - Quality size to set
     */
    setQuality(qualitySize) {
        const quality = this.availableQualities.find(q => q.size === qualitySize);
        if (quality) {
            this.disableAutoQuality();
            this.changeQuality(quality);
            
            // Save manual preference
            const connectionType = this.getConnectionType();
            this.settingsManager.set(`${connectionType}PreferredQuality`, qualitySize);
        }
    }

    /**
     * Get current quality
     * @returns {Object|null} Current quality object
     */
    getCurrentQuality() {
        return this.currentQuality;
    }

    /**
     * Get available qualities
     * @returns {Array} Available qualities
     */
    getAvailableQualities() {
        return this.availableQualities;
    }

    /**
     * Get network status
     * @returns {Object} Network status information
     */
    getNetworkStatus() {
        return {
            connection: this.networkConnection,
            speed: this.networkSpeed,
            type: this.getConnectionType(),
            online: navigator.onLine
        };
    }

    /**
     * Enable bandwidth conservation
     */
    enableBandwidthConservation() {
        this.conserveBandwidth = true;
        this.settingsManager.set('conserveBandwidth', true);
        
        // Reduce quality if needed
        if (this.autoQualityEnabled && this.currentQuality) {
            const conservativeQuality = this.findBestQuality(this.cellularQuality);
            if (conservativeQuality && conservativeQuality.size < this.currentQuality.size) {
                this.changeQuality(conservativeQuality);
            }
        }
        
        console.log('QualityManager: Bandwidth conservation enabled');
    }

    /**
     * Disable bandwidth conservation
     */
    disableBandwidthConservation() {
        this.conserveBandwidth = false;
        this.settingsManager.set('conserveBandwidth', false);
        
        // Allow higher quality
        if (this.autoQualityEnabled) {
            this.selectInitialQuality();
        }
        
        console.log('QualityManager: Bandwidth conservation disabled');
    }

    /**
     * Get quality recommendations
     * @returns {Object} Quality recommendations for different scenarios
     */
    getQualityRecommendations() {
        const recommendations = {
            current: this.currentQuality,
            optimal: null,
            conservative: null,
            maximum: null
        };

        if (this.availableQualities.length === 0) return recommendations;

        // Get maximum available quality
        recommendations.maximum = this.availableQualities[0];

        // Get conservative quality (480p or lower)
        recommendations.conservative = this.findBestQuality(480);

        // Get optimal quality based on current network
        if (this.networkSpeed && this.canSupportQuality(720)) {
            recommendations.optimal = this.findBestQuality(720);
        } else if (this.networkSpeed && this.canSupportQuality(480)) {
            recommendations.optimal = this.findBestQuality(480);
        } else {
            recommendations.optimal = this.findBestQuality(360);
        }

        return recommendations;
    }

    /**
     * Destroy quality manager
     */
    destroy() {
        // Clear timers
        if (this.qualityChangeTimer) {
            clearTimeout(this.qualityChangeTimer);
        }
        
        if (this.bufferHealthTimer) {
            clearInterval(this.bufferHealthTimer);
        }

        // Remove event listeners
        if (this.networkConnection) {
            this.networkConnection.removeEventListener('change', this.handleNetworkChange);
        }

        console.log('QualityManager: Destroyed');
    }
} 