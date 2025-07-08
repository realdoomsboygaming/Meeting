/**
 * URL Utilities for Sora Module System
 * Ported from Swift URL extensions
 * Provides URL manipulation, validation, and parameter handling
 */

/**
 * URL utilities class
 */
export class URLUtils {
    /**
     * Check if a string is a valid URL
     */
    static isValidURL(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }

        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Resolve relative URL against base URL
     * Swift equivalent: URL(string:relativeTo:)
     */
    static resolveURL(urlString, baseURL) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            if (this.isValidURL(urlString)) {
                return urlString; // Already absolute
            }

            if (!baseURL) {
                return urlString; // No base URL to resolve against
            }

            const resolved = new URL(urlString, baseURL);
            return resolved.href;
        } catch (error) {
            console.warn('[URLUtils] Error resolving URL:', error);
            return null;
        }
    }

    /**
     * Get domain from URL
     */
    static getDomain(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            const url = new URL(urlString);
            return url.hostname;
        } catch {
            return null;
        }
    }

    /**
     * Get origin (protocol + domain + port) from URL
     */
    static getOrigin(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            const url = new URL(urlString);
            return url.origin;
        } catch {
            return null;
        }
    }

    /**
     * Get path from URL (without query parameters)
     */
    static getPath(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            const url = new URL(urlString);
            return url.pathname;
        } catch {
            return null;
        }
    }

    /**
     * Get query parameters as object
     */
    static getQueryParams(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return {};
        }

        try {
            const url = new URL(urlString);
            const params = {};
            
            for (const [key, value] of url.searchParams.entries()) {
                params[key] = value;
            }
            
            return params;
        } catch {
            return {};
        }
    }

    /**
     * Get specific query parameter value
     */
    static getQueryParam(urlString, paramName) {
        if (!urlString || typeof urlString !== 'string' || !paramName) {
            return null;
        }

        try {
            const url = new URL(urlString);
            return url.searchParams.get(paramName);
        } catch {
            return null;
        }
    }

    /**
     * Add query parameters to URL
     */
    static addQueryParams(urlString, params) {
        if (!urlString || typeof urlString !== 'string' || !params || typeof params !== 'object') {
            return urlString;
        }

        try {
            const url = new URL(urlString);
            
            for (const [key, value] of Object.entries(params)) {
                if (value !== null && value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
            
            return url.href;
        } catch {
            return urlString;
        }
    }

    /**
     * Remove query parameters from URL
     */
    static removeQueryParams(urlString, paramNames = null) {
        if (!urlString || typeof urlString !== 'string') {
            return urlString;
        }

        try {
            const url = new URL(urlString);
            
            if (!paramNames) {
                // Remove all query parameters
                url.search = '';
            } else if (Array.isArray(paramNames)) {
                // Remove specific parameters
                for (const paramName of paramNames) {
                    url.searchParams.delete(paramName);
                }
            } else if (typeof paramNames === 'string') {
                // Remove single parameter
                url.searchParams.delete(paramNames);
            }
            
            return url.href;
        } catch {
            return urlString;
        }
    }

    /**
     * Extract filename from URL path
     */
    static getFilename(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            const url = new URL(urlString);
            const pathParts = url.pathname.split('/');
            return pathParts[pathParts.length - 1] || null;
        } catch {
            // Try to extract from string if not a valid URL
            const parts = urlString.split('/');
            return parts[parts.length - 1] || null;
        }
    }

    /**
     * Extract file extension from URL
     */
    static getFileExtension(urlString) {
        const filename = this.getFilename(urlString);
        if (!filename) return null;

        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
    }

    /**
     * Check if URL points to an image
     */
    static isImageURL(urlString) {
        const ext = this.getFileExtension(urlString);
        if (!ext) return false;

        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        return imageExtensions.includes(ext);
    }

    /**
     * Check if URL points to a video
     */
    static isVideoURL(urlString) {
        const ext = this.getFileExtension(urlString);
        if (!ext) return false;

        const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm3u8', 'ts'];
        return videoExtensions.includes(ext);
    }

    /**
     * Normalize URL (remove fragment, normalize case, etc.)
     */
    static normalizeURL(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return urlString;
        }

        try {
            const url = new URL(urlString);
            
            // Remove fragment
            url.hash = '';
            
            // Normalize hostname to lowercase
            url.hostname = url.hostname.toLowerCase();
            
            // Remove default ports
            if ((url.protocol === 'http:' && url.port === '80') ||
                (url.protocol === 'https:' && url.port === '443')) {
                url.port = '';
            }
            
            return url.href;
        } catch {
            return urlString;
        }
    }

    /**
     * Build URL from parts
     */
    static buildURL(protocol, hostname, port = null, pathname = '', search = '', hash = '') {
        try {
            let urlString = `${protocol}//${hostname}`;
            
            if (port) {
                urlString += `:${port}`;
            }
            
            if (pathname && !pathname.startsWith('/')) {
                pathname = '/' + pathname;
            }
            urlString += pathname;
            
            if (search && !search.startsWith('?')) {
                search = '?' + search;
            }
            urlString += search;
            
            if (hash && !hash.startsWith('#')) {
                hash = '#' + hash;
            }
            urlString += hash;
            
            return urlString;
        } catch (error) {
            console.warn('[URLUtils] Error building URL:', error);
            return null;
        }
    }

    /**
     * Encode URL component safely
     */
    static encodeComponent(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }
        
        try {
            return encodeURIComponent(str);
        } catch {
            return str;
        }
    }

    /**
     * Decode URL component safely
     */
    static decodeComponent(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }
        
        try {
            return decodeURIComponent(str);
        } catch {
            return str;
        }
    }

    /**
     * Check if two URLs are from the same domain
     */
    static sameDomain(url1, url2) {
        const domain1 = this.getDomain(url1);
        const domain2 = this.getDomain(url2);
        
        return domain1 && domain2 && domain1 === domain2;
    }

    /**
     * Convert relative URLs to absolute using a base URL
     */
    static makeAbsolute(urls, baseURL) {
        if (!Array.isArray(urls)) {
            return this.resolveURL(urls, baseURL);
        }

        return urls.map(url => this.resolveURL(url, baseURL)).filter(url => url !== null);
    }

    /**
     * Extract all URLs from text using regex
     */
    static extractURLs(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const urlRegex = /https?:\/\/[^\s<>'"]+/gi;
        const matches = text.match(urlRegex);
        return matches || [];
    }

    /**
     * Validate and clean URL
     */
    static cleanURL(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        // Remove leading/trailing whitespace
        let cleaned = urlString.trim();
        
        // Add protocol if missing
        if (!cleaned.includes('://')) {
            if (cleaned.startsWith('//')) {
                cleaned = 'https:' + cleaned;
            } else if (!cleaned.startsWith('/')) {
                cleaned = 'https://' + cleaned;
            }
        }

        // Validate the cleaned URL
        return this.isValidURL(cleaned) ? cleaned : null;
    }

    /**
     * Get URL without query parameters and fragment
     */
    static getBaseURL(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return null;
        }

        try {
            const url = new URL(urlString);
            return `${url.protocol}//${url.host}${url.pathname}`;
        } catch {
            return null;
        }
    }

    /**
     * Check if URL is HTTPS
     */
    static isHTTPS(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return false;
        }

        try {
            const url = new URL(urlString);
            return url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Convert HTTP URL to HTTPS
     */
    static toHTTPS(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return urlString;
        }

        try {
            const url = new URL(urlString);
            if (url.protocol === 'http:') {
                url.protocol = 'https:';
                return url.href;
            }
            return urlString;
        } catch {
            return urlString;
        }
    }

    /**
     * Parse data URL (data: scheme)
     */
    static parseDataURL(dataURL) {
        if (!dataURL || typeof dataURL !== 'string' || !dataURL.startsWith('data:')) {
            return null;
        }

        try {
            const [header, data] = dataURL.split(',');
            const [mimeType, ...params] = header.replace('data:', '').split(';');
            
            const isBase64 = params.includes('base64');
            
            return {
                mimeType: mimeType || 'text/plain',
                isBase64: isBase64,
                data: data,
                params: params.filter(p => p !== 'base64')
            };
        } catch (error) {
            console.warn('[URLUtils] Error parsing data URL:', error);
            return null;
        }
    }
}

// Export individual functions for convenience
export const {
    isValidURL,
    resolveURL,
    getDomain,
    getOrigin,
    getPath,
    getQueryParams,
    getQueryParam,
    addQueryParams,
    removeQueryParams,
    getFilename,
    getFileExtension,
    isImageURL,
    isVideoURL,
    normalizeURL,
    buildURL,
    encodeComponent,
    decodeComponent,
    sameDomain,
    makeAbsolute,
    extractURLs,
    cleanURL,
    getBaseURL,
    isHTTPS,
    toHTTPS,
    parseDataURL
} = URLUtils;

// Default export
export default URLUtils; 