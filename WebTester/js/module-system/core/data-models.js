/**
 * Core Data Models for Sora Module System
 * Ported from Swift structs: SearchItem, MediaItem, EpisodeLink
 * Provides type-safe data structures with validation
 */

/**
 * Represents a search result item
 * Swift equivalent: struct SearchItem { title: String, imageUrl: String, href: String }
 */
export class SearchItem {
    constructor(title, imageUrl, href) {
        this.id = this.generateId();
        this.title = this.validateString(title, 'title');
        this.imageUrl = this.validateString(imageUrl, 'imageUrl');
        this.href = this.validateString(href, 'href');
        
        // Validate href is a proper URL or relative path
        if (!this.isValidHref(href)) {
            throw new Error(`Invalid href format: ${href}`);
        }
    }

    validateString(value, fieldName) {
        if (typeof value !== 'string') {
            throw new Error(`${fieldName} must be a string, got ${typeof value}`);
        }
        return value.trim();
    }

    isValidHref(href) {
        // Accept relative paths or valid URLs
        if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
            return true;
        }
        try {
            new URL(href);
            return true;
        } catch {
            // Check if it's a relative URL without protocol
            return href.includes('/') || href.includes('?') || href.includes('#');
        }
    }

    generateId() {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Utility method for JSON serialization
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            imageUrl: this.imageUrl,
            href: this.href
        };
    }

    // Static factory method for creating from JSON
    static fromJSON(data) {
        return new SearchItem(data.title, data.imageUrl, data.href);
    }
}

/**
 * Represents media item details
 * Swift equivalent: struct MediaItem { description: String, aliases: String, airdate: String }
 */
export class MediaItem {
    constructor(description, aliases, airdate) {
        this.id = this.generateId();
        this.description = this.validateString(description, 'description');
        this.aliases = this.validateString(aliases, 'aliases');
        this.airdate = this.validateString(airdate, 'airdate');
        
        // Parse and validate airdate if provided
        if (airdate && airdate.trim()) {
            this.parsedAirdate = this.parseAirdate(airdate);
        }
    }

    validateString(value, fieldName) {
        if (typeof value !== 'string') {
            throw new Error(`${fieldName} must be a string, got ${typeof value}`);
        }
        return value.trim();
    }

    parseAirdate(airdate) {
        // Try to parse various date formats
        const date = new Date(airdate);
        return isNaN(date.getTime()) ? null : date;
    }

    generateId() {
        return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get aliases as array
    getAliasesArray() {
        if (!this.aliases) return [];
        return this.aliases.split(',').map(alias => alias.trim()).filter(alias => alias);
    }

    // Format airdate for display
    getFormattedAirdate() {
        if (!this.parsedAirdate) return this.airdate;
        return this.parsedAirdate.toLocaleDateString();
    }

    toJSON() {
        return {
            id: this.id,
            description: this.description,
            aliases: this.aliases,
            airdate: this.airdate,
            parsedAirdate: this.parsedAirdate
        };
    }

    static fromJSON(data) {
        const item = new MediaItem(data.description, data.aliases, data.airdate);
        if (data.parsedAirdate) {
            item.parsedAirdate = new Date(data.parsedAirdate);
        }
        return item;
    }
}

/**
 * Represents an episode link
 * Swift equivalent: struct EpisodeLink { number: Int, title: String, href: String, duration: Int? }
 */
export class EpisodeLink {
    constructor(number, title, href, duration = null) {
        this.id = this.generateId();
        this.number = this.validateNumber(number, 'number');
        this.title = this.validateString(title, 'title');
        this.href = this.validateString(href, 'href');
        this.duration = this.validateDuration(duration);
        
        // Validate href
        if (!this.isValidHref(href)) {
            throw new Error(`Invalid href format: ${href}`);
        }
    }

    validateString(value, fieldName) {
        if (typeof value !== 'string') {
            throw new Error(`${fieldName} must be a string, got ${typeof value}`);
        }
        return value.trim();
    }

    validateNumber(value, fieldName) {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
            throw new Error(`${fieldName} must be a valid non-negative number, got ${value}`);
        }
        return num;
    }

    validateDuration(duration) {
        if (duration === null || duration === undefined) {
            return null;
        }
        const num = parseInt(duration);
        if (isNaN(num) || num < 0) {
            return null; // Invalid duration becomes null
        }
        return num;
    }

    isValidHref(href) {
        // Same validation as SearchItem
        if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
            return true;
        }
        try {
            new URL(href);
            return true;
        } catch {
            return href.includes('/') || href.includes('?') || href.includes('#');
        }
    }

    generateId() {
        return `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get formatted duration
    getFormattedDuration() {
        if (!this.duration) return null;
        
        const hours = Math.floor(this.duration / 3600);
        const minutes = Math.floor((this.duration % 3600) / 60);
        const seconds = this.duration % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Get display title (use episode number if title is empty)
    getDisplayTitle() {
        if (this.title && this.title.trim()) {
            return this.title;
        }
        return `Episode ${this.number}`;
    }

    toJSON() {
        return {
            id: this.id,
            number: this.number,
            title: this.title,
            href: this.href,
            duration: this.duration
        };
    }

    static fromJSON(data) {
        return new EpisodeLink(data.number, data.title, data.href, data.duration);
    }
}

/**
 * Utility functions for working with data models
 */
export class DataModelUtils {
    /**
     * Create SearchItem array from raw JavaScript data
     */
    static createSearchItems(rawData) {
        if (!Array.isArray(rawData)) {
            throw new Error('Search data must be an array');
        }

        return rawData.map((item, index) => {
            try {
                return new SearchItem(
                    item.title || '',
                    item.image || item.imageUrl || '',
                    item.href || ''
                );
            } catch (error) {
                console.error(`Error creating SearchItem at index ${index}:`, error);
                // Return a placeholder item to prevent breaking the whole array
                return new SearchItem(
                    item.title || 'Invalid Item',
                    '',
                    '#'
                );
            }
        });
    }

    /**
     * Create MediaItem array from raw JavaScript data
     */
    static createMediaItems(rawData) {
        if (!Array.isArray(rawData)) {
            throw new Error('Media data must be an array');
        }

        return rawData.map((item, index) => {
            try {
                return new MediaItem(
                    item.description || '',
                    item.aliases || '',
                    item.airdate || ''
                );
            } catch (error) {
                console.error(`Error creating MediaItem at index ${index}:`, error);
                return new MediaItem('', '', '');
            }
        });
    }

    /**
     * Create EpisodeLink array from raw JavaScript data
     */
    static createEpisodeLinks(rawData) {
        if (!Array.isArray(rawData)) {
            throw new Error('Episode data must be an array');
        }

        return rawData.map((item, index) => {
            try {
                return new EpisodeLink(
                    item.number || index + 1,
                    item.title || '',
                    item.href || '',
                    item.duration || null
                );
            } catch (error) {
                console.error(`Error creating EpisodeLink at index ${index}:`, error);
                return new EpisodeLink(
                    index + 1,
                    'Invalid Episode',
                    '#',
                    null
                );
            }
        });
    }

    /**
     * Validate and sanitize URL for use in modules
     */
    static sanitizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        const trimmed = url.trim();
        
        // Handle relative URLs
        if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
            return trimmed;
        }

        // Handle absolute URLs
        try {
            const urlObj = new URL(trimmed);
            return urlObj.href;
        } catch {
            // If it's not a valid URL, return as-is (might be a relative path)
            return trimmed;
        }
    }
}

// Default export for convenience
export default {
    SearchItem,
    MediaItem,
    EpisodeLink,
    DataModelUtils
}; 