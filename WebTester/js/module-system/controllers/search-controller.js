import { SearchItem } from '../core/data-models.js';
import { NetworkUtils } from '../core/network-utils.js';
import { StringUtils } from '../utils/string-utils.js';
import { URLUtils } from '../utils/url-utils.js';

/**
 * SearchController - Handles search operations for modules
 * Ported from Swift JSController-Search.swift
 */
export class SearchController {
    constructor(moduleExecutionManager) {
        this.moduleExecutionManager = moduleExecutionManager;
        this.networkUtils = new NetworkUtils();
    }

    /**
     * Fetch search results using URL-based search (searchBaseUrl template)
     * @param {string} keyword - Search keyword
     * @param {Object} module - Module metadata with searchBaseUrl
     * @returns {Promise<SearchItem[]>} Array of search results
     */
    async fetchSearchResults(keyword, module) {
        try {
            // URL encode the keyword and replace %s placeholder
            const encodedKeyword = encodeURIComponent(keyword);
            const searchUrl = module.metadata.searchBaseUrl.replace('%s', encodedKeyword);
            
            if (!URLUtils.isValidUrl(searchUrl)) {
                console.error('SearchController: Invalid search URL:', searchUrl);
                return [];
            }

            console.log('SearchController: Fetching search results from:', searchUrl);

            // Fetch HTML content using NetworkUtils
            const html = await this.networkUtils.fetchText(searchUrl);
            
            if (!html) {
                console.error('SearchController: No HTML content received');
                return [];
            }

            console.log('SearchController: HTML content length:', html.length);

            // Execute the searchResults function in the module context
            const searchResultsFunction = this.moduleExecutionManager.getFunction('searchResults');
            if (!searchResultsFunction) {
                console.error('SearchController: searchResults function not found in module');
                return [];
            }

            const results = await this.moduleExecutionManager.executeFunction('searchResults', [html]);
            
            if (!Array.isArray(results)) {
                console.error('SearchController: searchResults function did not return an array');
                return [];
            }

            // Convert results to SearchItem objects
            const searchItems = results.map(item => {
                if (!item || typeof item !== 'object') {
                    console.warn('SearchController: Invalid search item:', item);
                    return null;
                }

                return new SearchItem(
                    item.title || '',
                    item.image || '',
                    item.href || ''
                );
            }).filter(item => item !== null);

            console.log(`SearchController: Successfully parsed ${searchItems.length} search results`);
            return searchItems;

        } catch (error) {
            console.error('SearchController: Error in fetchSearchResults:', error);
            return [];
        }
    }

    /**
     * Fetch search results using JavaScript-based search
     * @param {string} keyword - Search keyword
     * @param {Object} module - Module metadata
     * @returns {Promise<SearchItem[]>} Array of search results
     */
    async fetchJsSearchResults(keyword, module) {
        try {
            // Check for JavaScript exceptions in the execution context
            if (this.moduleExecutionManager.hasException()) {
                console.error('SearchController: JavaScript exception in context');
                return [];
            }

            // Get the searchResults function from the module
            const searchResultsFunction = this.moduleExecutionManager.getFunction('searchResults');
            if (!searchResultsFunction) {
                console.error('SearchController: searchResults function not found in module');
                return [];
            }

            console.log('SearchController: Executing JS search with keyword:', keyword);

            // Execute the search function with the keyword
            const promiseResult = await this.moduleExecutionManager.executeFunction('searchResults', [keyword]);
            
            if (!promiseResult) {
                console.error('SearchController: Search function returned invalid response');
                return [];
            }

            // Parse the result - could be JSON string or direct array
            let results;
            if (typeof promiseResult === 'string') {
                try {
                    results = JSON.parse(promiseResult);
                } catch (parseError) {
                    console.error('SearchController: JSON parsing error:', parseError);
                    return [];
                }
            } else if (Array.isArray(promiseResult)) {
                results = promiseResult;
            } else {
                console.error('SearchController: Invalid search result format');
                return [];
            }

            if (!Array.isArray(results)) {
                console.error('SearchController: Results is not an array');
                return [];
            }

            // Convert results to SearchItem objects with validation
            const searchItems = results.map(item => {
                if (!item || typeof item !== 'object') {
                    console.warn('SearchController: Invalid search result data format:', item);
                    return null;
                }

                const title = item.title;
                const imageUrl = item.image;
                const href = item.href;

                if (typeof title !== 'string' || typeof imageUrl !== 'string' || typeof href !== 'string') {
                    console.warn('SearchController: Invalid search result data types:', {
                        title: typeof title,
                        image: typeof imageUrl,
                        href: typeof href
                    });
                    return null;
                }

                return new SearchItem(title, imageUrl, href);
            }).filter(item => item !== null);

            console.log(`SearchController: Successfully parsed ${searchItems.length} JS search results`);
            return searchItems;

        } catch (error) {
            console.error('SearchController: Error in fetchJsSearchResults:', error);
            return [];
        }
    }

    /**
     * Enhanced search method that tries both URL and JS-based search
     * @param {string} keyword - Search keyword
     * @param {Object} module - Module metadata
     * @returns {Promise<SearchItem[]>} Array of search results
     */
    async search(keyword, module) {
        if (!keyword || keyword.trim().length === 0) {
            console.warn('SearchController: Empty search keyword');
            return [];
        }

        if (!module || !module.metadata) {
            console.error('SearchController: Invalid module provided');
            return [];
        }

        console.log(`SearchController: Starting search for "${keyword}" with module:`, module.metadata.name);

        // Try JS-based search first (more flexible)
        const jsResults = await this.fetchJsSearchResults(keyword, module);
        if (jsResults.length > 0) {
            return jsResults;
        }

        // Fall back to URL-based search if available
        if (module.metadata.searchBaseUrl) {
            console.log('SearchController: Falling back to URL-based search');
            const urlResults = await this.fetchSearchResults(keyword, module);
            return urlResults;
        }

        console.warn('SearchController: No search method available for module');
        return [];
    }

    /**
     * Search with preprocessing and filtering
     * @param {string} keyword - Search keyword
     * @param {Object} module - Module metadata
     * @param {Object} options - Search options
     * @returns {Promise<SearchItem[]>} Filtered search results
     */
    async searchWithFilters(keyword, module, options = {}) {
        const {
            maxResults = 50,
            minTitleLength = 1,
            filterDuplicates = true,
            sortByRelevance = true
        } = options;

        // Preprocess keyword
        const processedKeyword = StringUtils.normalizeSearchText(keyword);
        
        // Perform search
        const results = await this.search(processedKeyword, module);

        // Apply filters
        let filteredResults = results.filter(item => {
            // Filter by minimum title length
            if (item.title.length < minTitleLength) {
                return false;
            }

            // Basic validation
            return item.title && item.href;
        });

        // Remove duplicates if requested
        if (filterDuplicates) {
            const seen = new Set();
            filteredResults = filteredResults.filter(item => {
                const key = `${item.title}|${item.href}`;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        // Sort by relevance if requested
        if (sortByRelevance) {
            const keywordLower = keyword.toLowerCase();
            filteredResults.sort((a, b) => {
                const aRelevance = this.calculateRelevance(a.title, keywordLower);
                const bRelevance = this.calculateRelevance(b.title, keywordLower);
                return bRelevance - aRelevance;
            });
        }

        // Limit results
        return filteredResults.slice(0, maxResults);
    }

    /**
     * Calculate relevance score for search results
     * @param {string} title - Result title
     * @param {string} keyword - Search keyword (lowercase)
     * @returns {number} Relevance score
     */
    calculateRelevance(title, keyword) {
        const titleLower = title.toLowerCase();
        let score = 0;

        // Exact match bonus
        if (titleLower.includes(keyword)) {
            score += 100;
        }

        // Start of title bonus
        if (titleLower.startsWith(keyword)) {
            score += 50;
        }

        // Word boundary matches
        const words = keyword.split(' ');
        words.forEach(word => {
            if (word.length > 2 && titleLower.includes(word)) {
                score += 10;
            }
        });

        return score;
    }

    /**
     * Get search suggestions based on partial keyword
     * @param {string} partialKeyword - Partial search keyword
     * @param {Object} module - Module metadata
     * @returns {Promise<string[]>} Array of search suggestions
     */
    async getSearchSuggestions(partialKeyword, module) {
        // This would typically use a dedicated suggestions endpoint
        // For now, return empty array as most modules don't support this
        console.log('SearchController: Search suggestions not yet implemented');
        return [];
    }
} 