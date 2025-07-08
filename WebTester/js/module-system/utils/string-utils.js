/**
 * String Utilities for Sora Module System
 * Ported from Swift String extensions
 * Provides HTML stripping, text trimming, and text processing utilities
 */

/**
 * String utilities class
 */
export class StringUtils {
    /**
     * Strip HTML tags from string (ported from Swift strippedHTML)
     */
    static stripHTML(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') {
            return '';
        }

        // Create a temporary DOM element to parse HTML
        if (typeof document !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            return tempDiv.textContent || tempDiv.innerText || '';
        }

        // Fallback for non-browser environments
        return htmlString.replace(/<[^>]*>/g, '');
    }

    /**
     * Trim whitespace and newlines (ported from Swift trimmed)
     */
    static trim(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }
        return str.trim();
    }

    /**
     * Decode HTML entities
     */
    static decodeHTMLEntities(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        if (typeof document !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = str;
            return tempDiv.textContent || tempDiv.innerText || '';
        }

        // Fallback for common HTML entities
        const entityMap = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™'
        };

        return str.replace(/&[#\w]+;/g, (entity) => entityMap[entity] || entity);
    }

    /**
     * Extract text content from HTML while preserving some structure
     */
    static extractTextContent(htmlString, preserveLineBreaks = true) {
        if (!htmlString || typeof htmlString !== 'string') {
            return '';
        }

        let text = htmlString;
        
        if (preserveLineBreaks) {
            // Convert common block elements to line breaks
            text = text.replace(/<\/(div|p|br|h[1-6]|li)>/gi, '\n');
            text = text.replace(/<br\s*\/?>/gi, '\n');
        }

        // Remove all HTML tags
        text = this.stripHTML(text);
        
        // Decode HTML entities
        text = this.decodeHTMLEntities(text);
        
        // Clean up multiple line breaks and spaces
        if (preserveLineBreaks) {
            text = text.replace(/\n\s*\n/g, '\n').trim();
        } else {
            text = text.replace(/\s+/g, ' ').trim();
        }

        return text;
    }

    /**
     * Clean and normalize text for search/comparison
     */
    static normalizeText(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, ''); // Remove special characters
    }

    /**
     * Normalize text specifically for search queries
     */
    static normalizeSearchText(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\-\.]/g, ''); // Keep basic punctuation for search
    }

    /**
     * Truncate string to specified length with ellipsis
     */
    static truncate(str, maxLength, ellipsis = '...') {
        if (!str || typeof str !== 'string') {
            return '';
        }

        if (str.length <= maxLength) {
            return str;
        }

        return str.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
    }

    /**
     * Extract numbers from string
     */
    static extractNumbers(str) {
        if (!str || typeof str !== 'string') {
            return [];
        }

        const matches = str.match(/\d+/g);
        return matches ? matches.map(num => parseInt(num, 10)) : [];
    }

    /**
     * Extract episode number from string (common in anime/TV)
     */
    static extractEpisodeNumber(str) {
        if (!str || typeof str !== 'string') {
            return null;
        }

        // Common patterns for episode numbers
        const patterns = [
            /episode\s*(\d+)/i,
            /ep\s*(\d+)/i,
            /e(\d+)/i,
            /第(\d+)話/i, // Japanese
            /(\d+)話/i,   // Japanese
            /#(\d+)/,
            /\[(\d+)\]/,
            /\((\d+)\)/
        ];

        for (const pattern of patterns) {
            const match = str.match(pattern);
            if (match) {
                return parseInt(match[1], 10);
            }
        }

        // Try to extract the last number in the string
        const numbers = this.extractNumbers(str);
        return numbers.length > 0 ? numbers[numbers.length - 1] : null;
    }

    /**
     * Clean filename/title string
     */
    static cleanTitle(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str
            .replace(/^\[.*?\]\s*/, '') // Remove bracketed prefixes
            .replace(/\[.*?\]$/g, '')   // Remove bracketed suffixes
            .replace(/\(.*?\)$/g, '')   // Remove parentheses at end
            .replace(/\s*-\s*\d+\s*$/, '') // Remove episode numbers at end
            .trim();
    }

    /**
     * Parse resolution from string (e.g., "1080p", "720p")
     */
    static parseResolution(str) {
        if (!str || typeof str !== 'string') {
            return null;
        }

        const match = str.match(/(\d+)p?/i);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Format duration in seconds to readable time
     */
    static formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) {
            return '0:00';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Parse duration string to seconds
     */
    static parseDuration(durationStr) {
        if (!durationStr || typeof durationStr !== 'string') {
            return 0;
        }

        // Handle formats like "1:23:45", "23:45", "45"
        const parts = durationStr.split(':').map(part => parseInt(part, 10) || 0);
        
        if (parts.length === 3) {
            // Hours:Minutes:Seconds
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            // Minutes:Seconds
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            // Just seconds
            return parts[0];
        }

        return 0;
    }

    /**
     * Check if string contains any of the specified terms (case-insensitive)
     */
    static containsAny(str, terms) {
        if (!str || typeof str !== 'string' || !Array.isArray(terms)) {
            return false;
        }

        const lowerStr = str.toLowerCase();
        return terms.some(term => lowerStr.includes(term.toLowerCase()));
    }

    /**
     * Check if string is a valid URL-like string
     */
    static isUrlLike(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }

        return /^https?:\/\//.test(str) || 
               str.startsWith('/') || 
               str.includes('://') ||
               str.includes('www.');
    }

    /**
     * Safe JSON parse that returns default value on error
     */
    static safeJsonParse(str, defaultValue = null) {
        if (!str || typeof str !== 'string') {
            return defaultValue;
        }

        try {
            return JSON.parse(str);
        } catch (error) {
            console.warn('[StringUtils] JSON parse failed:', error);
            return defaultValue;
        }
    }

    /**
     * Escape HTML characters
     */
    static escapeHTML(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return str.replace(/[&<>"']/g, (char) => entityMap[char] || char);
    }

    /**
     * Generate a slug from string (URL-friendly)
     */
    static slugify(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }

    /**
     * Check if string is empty or only whitespace
     */
    static isEmpty(str) {
        return !str || typeof str !== 'string' || str.trim().length === 0;
    }

    /**
     * Capitalize first letter of each word
     */
    static titleCase(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
}

// Export individual functions for convenience
export const {
    stripHTML,
    trim,
    decodeHTMLEntities,
    extractTextContent,
    normalizeText,
    truncate,
    extractNumbers,
    extractEpisodeNumber,
    cleanTitle,
    parseResolution,
    formatDuration,
    parseDuration,
    containsAny,
    isUrlLike,
    safeJsonParse,
    escapeHTML,
    slugify,
    isEmpty,
    titleCase
} = StringUtils;

// Default export
export default StringUtils; 