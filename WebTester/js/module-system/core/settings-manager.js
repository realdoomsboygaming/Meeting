/**
 * Settings Manager for Sora Module System
 * Ported from Swift UserDefaults functionality
 * Provides persistent storage with video quality preferences and network awareness
 */

/**
 * Video Quality Preferences enum (ported from Swift)
 * Swift equivalent: enum VideoQualityPreference
 */
export const VideoQualityPreference = {
    BEST: 'Best',
    P1080: '1080p',
    P720: '720p',
    P420: '420p',
    P360: '360p',
    WORST: 'Worst'
};

/**
 * Network Type enum for quality selection
 */
export const NetworkType = {
    WIFI: 'wifi',
    CELLULAR: 'cellular',
    UNKNOWN: 'unknown'
};

/**
 * Settings Manager class
 * Handles all persistent storage with fallback mechanisms
 */
export class SettingsManager {
    constructor() {
        this.storagePrefix = 'sora_';
        this.defaults = {
            videoQualityWiFi: VideoQualityPreference.BEST,
            videoQualityCellular: VideoQualityPreference.P720,
            holdForPauseEnabled: false,
            skip85Visible: true,
            doubleTapSeekEnabled: false,
            pipAutoEnabled: false,
            pipButtonVisible: true,
            autoplayNext: true,
            maxConcurrentDownloads: 3,
            episodeChunkSize: 50,
            chapterChunkSize: 50,
            externalPlayer: 'Default',
            selectedAppearance: 'system'
        };
        
        this.qualityPriority = [
            VideoQualityPreference.BEST,
            VideoQualityPreference.P1080,
            VideoQualityPreference.P720,
            VideoQualityPreference.P420,
            VideoQualityPreference.P360,
            VideoQualityPreference.WORST
        ];
        
        this.init();
    }

    /**
     * Initialize settings manager
     */
    init() {
        this.checkStorageAvailability();
        this.migrateOldSettings();
    }

    /**
     * Check if localStorage is available (mobile compatibility)
     */
    checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.storageAvailable = true;
        } catch (error) {
            console.warn('[SettingsManager] localStorage not available, using memory storage');
            this.storageAvailable = false;
            this.memoryStorage = new Map();
        }
    }

    /**
     * Migrate old settings format if needed
     */
    migrateOldSettings() {
        // Check for old format settings and migrate them
        if (this.storageAvailable) {
            const oldKeys = Object.keys(localStorage).filter(key => 
                !key.startsWith(this.storagePrefix) && 
                Object.keys(this.defaults).includes(key)
            );
            
            for (const key of oldKeys) {
                const value = localStorage.getItem(key);
                this.set(key, JSON.parse(value));
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Get a setting value
     */
    get(key, defaultValue = null) {
        const prefixedKey = this.storagePrefix + key;
        
        if (this.storageAvailable) {
            try {
                const value = localStorage.getItem(prefixedKey);
                if (value !== null) {
                    return JSON.parse(value);
                }
            } catch (error) {
                console.error(`[SettingsManager] Error reading ${key}:`, error);
            }
        } else if (this.memoryStorage) {
            const value = this.memoryStorage.get(prefixedKey);
            if (value !== undefined) {
                return value;
            }
        }
        
        // Return provided default or system default
        return defaultValue !== null ? defaultValue : this.defaults[key];
    }

    /**
     * Set a setting value
     */
    set(key, value) {
        const prefixedKey = this.storagePrefix + key;
        
        if (this.storageAvailable) {
            try {
                localStorage.setItem(prefixedKey, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error(`[SettingsManager] Error saving ${key}:`, error);
                
                // Handle quota exceeded error
                if (error.name === 'QuotaExceededError') {
                    this.handleQuotaExceeded();
                }
                return false;
            }
        } else if (this.memoryStorage) {
            this.memoryStorage.set(prefixedKey, value);
            return true;
        }
        
        return false;
    }

    /**
     * Remove a setting
     */
    remove(key) {
        const prefixedKey = this.storagePrefix + key;
        
        if (this.storageAvailable) {
            localStorage.removeItem(prefixedKey);
        } else if (this.memoryStorage) {
            this.memoryStorage.delete(prefixedKey);
        }
    }

    /**
     * Handle quota exceeded error by cleaning up old data
     */
    handleQuotaExceeded() {
        console.warn('[SettingsManager] Storage quota exceeded, attempting cleanup');
        
        if (!this.storageAvailable) return;
        
        // Remove non-essential cached data
        const keysToClean = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('_cache_') ||
                key.includes('_temp_') ||
                key.includes('lastPlayedTime_')
            )) {
                keysToClean.push(key);
            }
        }
        
        keysToClean.forEach(key => localStorage.removeItem(key));
        console.log(`[SettingsManager] Cleaned up ${keysToClean.length} cached items`);
    }

    /**
     * Get current network type (simplified for web)
     */
    getCurrentNetworkType() {
        // Use Navigator Connection API if available
        if (navigator.connection) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            
            // Map connection types to our enum
            if (['4g', 'wifi'].includes(effectiveType)) {
                return NetworkType.WIFI;
            } else if (['3g', '2g', 'slow-2g'].includes(effectiveType)) {
                return NetworkType.CELLULAR;
            }
        }
        
        // Fallback: assume WiFi for web browsers
        return NetworkType.WIFI;
    }

    /**
     * Get video quality preference based on current network
     * Swift equivalent: getVideoQualityPreference()
     */
    getVideoQualityPreference() {
        const networkType = this.getCurrentNetworkType();
        
        switch (networkType) {
            case NetworkType.WIFI:
                return this.get('videoQualityWiFi', VideoQualityPreference.BEST);
            case NetworkType.CELLULAR:
                return this.get('videoQualityCellular', VideoQualityPreference.P720);
            default:
                return VideoQualityPreference.P720;
        }
    }

    /**
     * Find closest quality match from available qualities
     * Swift equivalent: VideoQualityPreference.findClosestQuality()
     */
    findClosestQuality(preferredQuality, availableQualities) {
        if (!Array.isArray(availableQualities) || availableQualities.length === 0) {
            return null;
        }

        // First, try exact match
        for (const quality of availableQualities) {
            if (this.isQualityMatch(preferredQuality, quality.name || quality)) {
                return quality;
            }
        }

        // If no exact match, find closest based on priority
        const preferredIndex = this.qualityPriority.indexOf(preferredQuality);
        if (preferredIndex === -1) {
            return availableQualities[0]; // Return first available if preferred not in priority
        }

        // Search through priority list
        for (const priorityQuality of this.qualityPriority) {
            for (const quality of availableQualities) {
                if (this.isQualityMatch(priorityQuality, quality.name || quality)) {
                    return quality;
                }
            }
        }

        // Return first available as fallback
        return availableQualities[0];
    }

    /**
     * Check if quality name matches preference
     * Swift equivalent: isQualityMatch()
     */
    isQualityMatch(preference, qualityName) {
        if (!qualityName || typeof qualityName !== 'string') {
            return false;
        }

        const lowercaseName = qualityName.toLowerCase();

        switch (preference) {
            case VideoQualityPreference.BEST:
                return lowercaseName.includes('best') || 
                       lowercaseName.includes('highest') || 
                       lowercaseName.includes('max');
            case VideoQualityPreference.P1080:
                return lowercaseName.includes('1080') || 
                       lowercaseName.includes('1920');
            case VideoQualityPreference.P720:
                return lowercaseName.includes('720') || 
                       lowercaseName.includes('1280');
            case VideoQualityPreference.P420:
                return lowercaseName.includes('420') || 
                       lowercaseName.includes('480');
            case VideoQualityPreference.P360:
                return lowercaseName.includes('360') || 
                       lowercaseName.includes('640');
            case VideoQualityPreference.WORST:
                return lowercaseName.includes('worst') || 
                       lowercaseName.includes('lowest') || 
                       lowercaseName.includes('min');
            default:
                return false;
        }
    }

    /**
     * Get all settings as object
     */
    getAllSettings() {
        const settings = {};
        const allKeys = Object.keys(this.defaults);
        
        for (const key of allKeys) {
            settings[key] = this.get(key);
        }
        
        return settings;
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        if (this.storageAvailable) {
            // Remove all prefixed keys
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } else if (this.memoryStorage) {
            this.memoryStorage.clear();
        }
        
        console.log('[SettingsManager] All settings reset to defaults');
    }

    /**
     * Export settings for backup
     */
    exportSettings() {
        const settings = this.getAllSettings();
        return JSON.stringify(settings, null, 2);
    }

    /**
     * Import settings from backup
     */
    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            
            for (const [key, value] of Object.entries(settings)) {
                if (key in this.defaults) {
                    this.set(key, value);
                }
            }
            
            console.log('[SettingsManager] Settings imported successfully');
            return true;
        } catch (error) {
            console.error('[SettingsManager] Error importing settings:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        if (!this.storageAvailable) {
            return { available: false, used: 0, total: 0 };
        }

        let used = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                used += localStorage.getItem(key).length;
            }
        }

        return {
            available: true,
            used: used,
            total: 5 * 1024 * 1024, // Assume 5MB limit
            percentage: Math.round((used / (5 * 1024 * 1024)) * 100)
        };
    }
}

// Create singleton instance
export const settingsManager = new SettingsManager();

// Convenience functions matching Swift UserDefaults pattern
export const UserDefaults = {
    bool: (key) => settingsManager.get(key, false),
    string: (key) => settingsManager.get(key, ''),
    integer: (key) => settingsManager.get(key, 0),
    double: (key) => settingsManager.get(key, 0.0),
    object: (key) => settingsManager.get(key, null),
    
    set: (key, value) => settingsManager.set(key, value),
    setBool: (key, value) => settingsManager.set(key, Boolean(value)),
    setString: (key, value) => settingsManager.set(key, String(value)),
    setInteger: (key, value) => settingsManager.set(key, parseInt(value) || 0),
    setDouble: (key, value) => settingsManager.set(key, parseFloat(value) || 0.0),
    
    remove: (key) => settingsManager.remove(key),
    
    // Video quality helpers
    getVideoQualityPreference: () => settingsManager.getVideoQualityPreference(),
    findClosestQuality: (preferred, available) => settingsManager.findClosestQuality(preferred, available)
};

// Default export
export default {
    SettingsManager,
    settingsManager,
    UserDefaults,
    VideoQualityPreference,
    NetworkType
}; 