import { MediaItem, EpisodeLink } from '../core/data-models.js';
import { NetworkUtils } from '../core/network-utils.js';
import { URLUtils } from '../utils/url-utils.js';

/**
 * DetailsController - Handles details and episodes extraction for media items
 * Ported from Swift JSController-Details.swift
 */
export class DetailsController {
    constructor(moduleExecutionManager) {
        this.moduleExecutionManager = moduleExecutionManager;
        this.networkUtils = new NetworkUtils();
        this.defaultTimeout = 10000; // 10 seconds timeout
    }

    /**
     * Fetch details using URL-based extraction (HTML parsing)
     * @param {string} url - URL to fetch details from
     * @returns {Promise<{details: MediaItem[], episodes: EpisodeLink[]}>}
     */
    async fetchDetails(url) {
        try {
            if (!URLUtils.isValidUrl(url)) {
                console.error('DetailsController: Invalid URL:', url);
                return { details: [], episodes: [] };
            }

            console.log('DetailsController: Fetching details from:', url);

            // Fetch HTML content using NetworkUtils
            const html = await this.networkUtils.fetchText(url);
            
            if (!html) {
                console.error('DetailsController: No HTML content received');
                return { details: [], episodes: [] };
            }

            console.log('DetailsController: HTML content length:', html.length);

            let resultItems = [];
            let episodeLinks = [];

            // Extract details using extractDetails function
            const extractDetailsFunction = this.moduleExecutionManager.getFunction('extractDetails');
            if (extractDetailsFunction) {
                try {
                    const detailsResults = await this.moduleExecutionManager.executeFunction('extractDetails', [html]);
                    
                    if (Array.isArray(detailsResults)) {
                        resultItems = detailsResults.map(item => {
                            if (!item || typeof item !== 'object') {
                                console.warn('DetailsController: Invalid details item:', item);
                                return null;
                            }

                            return new MediaItem(
                                item.description || '',
                                item.aliases || '',
                                item.airdate || ''
                            );
                        }).filter(item => item !== null);
                    }
                } catch (error) {
                    console.error('DetailsController: Error extracting details:', error);
                }
            } else {
                console.warn('DetailsController: extractDetails function not found');
            }

            // Extract episodes using extractEpisodes function
            const extractEpisodesFunction = this.moduleExecutionManager.getFunction('extractEpisodes');
            if (extractEpisodesFunction) {
                try {
                    const episodesResults = await this.moduleExecutionManager.executeFunction('extractEpisodes', [html]);
                    
                    if (Array.isArray(episodesResults)) {
                        episodeLinks = episodesResults.map(episodeData => {
                            if (!episodeData || typeof episodeData !== 'object') {
                                console.warn('DetailsController: Invalid episode data:', episodeData);
                                return null;
                            }

                            const number = parseInt(episodeData.number, 10);
                            const href = episodeData.href;

                            if (isNaN(number) || !href) {
                                console.warn('DetailsController: Invalid episode number or href:', { number, href });
                                return null;
                            }

                            return new EpisodeLink(
                                number,
                                episodeData.title || '',
                                href,
                                episodeData.duration || null
                            );
                        }).filter(item => item !== null);
                    }
                } catch (error) {
                    console.error('DetailsController: Error extracting episodes:', error);
                }
            } else {
                console.warn('DetailsController: extractEpisodes function not found');
            }

            console.log(`DetailsController: Successfully extracted ${resultItems.length} details and ${episodeLinks.length} episodes`);
            return { details: resultItems, episodes: episodeLinks };

        } catch (error) {
            console.error('DetailsController: Error in fetchDetails:', error);
            return { details: [], episodes: [] };
        }
    }

    /**
     * Fetch details using JavaScript-based extraction with concurrent processing
     * @param {string} url - URL to extract details from
     * @returns {Promise<{details: MediaItem[], episodes: EpisodeLink[]}>}
     */
    async fetchDetailsJS(url) {
        try {
            if (!URLUtils.isValidUrl(url)) {
                console.error('DetailsController: Invalid URL in fetchDetailsJS:', url);
                return { details: [], episodes: [] };
            }

            // Check for JavaScript exceptions in the execution context
            if (this.moduleExecutionManager.hasException()) {
                console.error('DetailsController: JavaScript exception in context');
                return { details: [], episodes: [] };
            }

            // Verify required functions exist
            const extractDetailsFunction = this.moduleExecutionManager.getFunction('extractDetails');
            const extractEpisodesFunction = this.moduleExecutionManager.getFunction('extractEpisodes');

            if (!extractDetailsFunction) {
                console.error('DetailsController: extractDetails function not found');
                return { details: [], episodes: [] };
            }

            if (!extractEpisodesFunction) {
                console.error('DetailsController: extractEpisodes function not found');
                return { details: [], episodes: [] };
            }

            console.log('DetailsController: Executing JS-based details extraction for:', url);

            // Execute both functions concurrently with timeout handling
            const results = await Promise.allSettled([
                this.executeWithTimeout(
                    () => this.moduleExecutionManager.executeFunction('extractDetails', [url]),
                    this.defaultTimeout,
                    'extractDetails'
                ),
                this.executeWithTimeout(
                    () => this.moduleExecutionManager.executeFunction('extractEpisodes', [url]),
                    this.defaultTimeout,
                    'extractEpisodes'
                )
            ]);

            let resultItems = [];
            let episodeLinks = [];

            // Process details results
            const detailsResult = results[0];
            if (detailsResult.status === 'fulfilled' && detailsResult.value) {
                resultItems = this.parseDetailsResults(detailsResult.value);
            } else if (detailsResult.status === 'rejected') {
                console.error('DetailsController: extractDetails failed:', detailsResult.reason);
            }

            // Process episodes results
            const episodesResult = results[1];
            if (episodesResult.status === 'fulfilled' && episodesResult.value) {
                episodeLinks = this.parseEpisodesResults(episodesResult.value);
            } else if (episodesResult.status === 'rejected') {
                console.error('DetailsController: extractEpisodes failed:', episodesResult.reason);
            }

            console.log(`DetailsController: JS extraction completed - ${resultItems.length} details, ${episodeLinks.length} episodes`);
            return { details: resultItems, episodes: episodeLinks };

        } catch (error) {
            console.error('DetailsController: Error in fetchDetailsJS:', error);
            return { details: [], episodes: [] };
        }
    }

    /**
     * Execute a function with timeout
     * @param {Function} func - Function to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} name - Function name for logging
     * @returns {Promise} Promise that resolves with function result or rejects on timeout
     */
    async executeWithTimeout(func, timeout, name) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout: ${name} exceeded ${timeout}ms`));
            }, timeout);

            try {
                const result = await func();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Parse details results from JavaScript function
     * @param {any} result - Raw result from extractDetails function
     * @returns {MediaItem[]} Parsed MediaItem array
     */
    parseDetailsResults(result) {
        try {
            let detailsArray;

            // Handle different result types
            if (typeof result === 'string') {
                detailsArray = JSON.parse(result);
            } else if (Array.isArray(result)) {
                detailsArray = result;
            } else {
                console.error('DetailsController: Invalid details result format');
                return [];
            }

            if (!Array.isArray(detailsArray)) {
                console.error('DetailsController: Details result is not an array');
                return [];
            }

            return detailsArray.map(item => {
                if (!item || typeof item !== 'object') {
                    console.warn('DetailsController: Invalid details item format:', item);
                    return null;
                }

                return new MediaItem(
                    item.description || '',
                    item.aliases || '',
                    item.airdate || ''
                );
            }).filter(item => item !== null);

        } catch (error) {
            console.error('DetailsController: Error parsing details results:', error);
            return [];
        }
    }

    /**
     * Parse episodes results from JavaScript function
     * @param {any} result - Raw result from extractEpisodes function
     * @returns {EpisodeLink[]} Parsed EpisodeLink array
     */
    parseEpisodesResults(result) {
        try {
            let episodesArray;

            // Handle different result types
            if (typeof result === 'string') {
                episodesArray = JSON.parse(result);
            } else if (Array.isArray(result)) {
                episodesArray = result;
            } else {
                console.error('DetailsController: Invalid episodes result format');
                return [];
            }

            if (!Array.isArray(episodesArray)) {
                console.error('DetailsController: Episodes result is not an array');
                return [];
            }

            return episodesArray.map(item => {
                if (!item || typeof item !== 'object') {
                    console.warn('DetailsController: Invalid episode item format:', item);
                    return null;
                }

                const number = parseInt(item.number, 10);
                const href = item.href;

                if (isNaN(number) || !href) {
                    console.warn('DetailsController: Invalid episode data:', { number, href });
                    return null;
                }

                return new EpisodeLink(
                    number,
                    item.title || '',
                    href,
                    item.duration || null
                );
            }).filter(item => item !== null);

        } catch (error) {
            console.error('DetailsController: Error parsing episodes results:', error);
            return [];
        }
    }

    /**
     * Enhanced details extraction that tries both URL and JS-based methods
     * @param {string} url - URL to extract details from
     * @returns {Promise<{details: MediaItem[], episodes: EpisodeLink[]}>}
     */
    async extractDetails(url) {
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            console.warn('DetailsController: Empty or invalid URL');
            return { details: [], episodes: [] };
        }

        console.log(`DetailsController: Starting details extraction for: ${url}`);

        // Try JS-based extraction first (more flexible and concurrent)
        const jsResults = await this.fetchDetailsJS(url);
        if (jsResults.details.length > 0 || jsResults.episodes.length > 0) {
            return jsResults;
        }

        // Fall back to URL-based extraction
        console.log('DetailsController: Falling back to URL-based extraction');
        const urlResults = await this.fetchDetails(url);
        return urlResults;
    }

    /**
     * Extract only episode links (useful for episode-only updates)
     * @param {string} url - URL to extract episodes from
     * @returns {Promise<EpisodeLink[]>} Array of episode links
     */
    async extractEpisodesOnly(url) {
        try {
            const extractEpisodesFunction = this.moduleExecutionManager.getFunction('extractEpisodes');
            if (!extractEpisodesFunction) {
                console.error('DetailsController: extractEpisodes function not found');
                return [];
            }

            console.log('DetailsController: Extracting episodes only from:', url);

            const result = await this.executeWithTimeout(
                () => this.moduleExecutionManager.executeFunction('extractEpisodes', [url]),
                this.defaultTimeout,
                'extractEpisodes'
            );

            return this.parseEpisodesResults(result);

        } catch (error) {
            console.error('DetailsController: Error in extractEpisodesOnly:', error);
            return [];
        }
    }

    /**
     * Extract only media details (useful for details-only updates)
     * @param {string} url - URL to extract details from
     * @returns {Promise<MediaItem[]>} Array of media items
     */
    async extractDetailsOnly(url) {
        try {
            const extractDetailsFunction = this.moduleExecutionManager.getFunction('extractDetails');
            if (!extractDetailsFunction) {
                console.error('DetailsController: extractDetails function not found');
                return [];
            }

            console.log('DetailsController: Extracting details only from:', url);

            const result = await this.executeWithTimeout(
                () => this.moduleExecutionManager.executeFunction('extractDetails', [url]),
                this.defaultTimeout,
                'extractDetails'
            );

            return this.parseDetailsResults(result);

        } catch (error) {
            console.error('DetailsController: Error in extractDetailsOnly:', error);
            return [];
        }
    }

    /**
     * Set timeout for operations
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.defaultTimeout = timeout;
        console.log(`DetailsController: Timeout set to ${timeout}ms`);
    }
} 