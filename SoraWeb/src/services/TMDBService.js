// TMDBService.js
// Service for interacting with The Movie Database (TMDB) API
// Provides functions to search for shows/movies, fetch episode details, and (optionally) fetch all episodes for a season.
// Caching, error handling, and proxy support to be added per plan.

const TMDB_API_KEY = 'c75d96333e8bd66453ae73c54a99f0dc'; // WARNING: Do not expose this key in production. Use a backend proxy for security.
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

class TMDBService {
  // Placeholder for in-memory cache
  static cache = {};

  // Levenshtein distance for title similarity
  static levenshtein(a, b) {
    const matrix = [];
    const aLen = a.length;
    const bLen = b.length;
    for (let i = 0; i <= aLen; i++) matrix[i] = [i];
    for (let j = 0; j <= bLen; j++) matrix[0][j] = j;
    for (let i = 1; i <= aLen; i++) {
      for (let j = 1; j <= bLen; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[aLen][bLen];
  }

  // Title similarity (1.0 = exact match, 0.0 = no similarity)
  static titleSimilarity(a, b) {
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();
    const distance = TMDBService.levenshtein(lowerA, lowerB);
    const maxLen = Math.max(lowerA.length, lowerB.length);
    if (maxLen === 0) return 1.0;
    return 1.0 - distance / maxLen;
  }

  // Search TMDB for a show/movie by title (mirrors iOS logic)
  static async search(title) {
    const types = ['tv', 'movie'];
    const results = [];
    const fetches = types.map(async (type) => {
      const query = encodeURIComponent(title);
      const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${query}`;
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        for (const result of data.results || []) {
          const candidateTitle = type === 'tv' ? result.name || '' : result.title || '';
          const similarity = TMDBService.titleSimilarity(title, candidateTitle);
          const score = similarity * 0.7 + ((result.popularity || 0) / 100.0) * 0.3;
          results.push({
            id: result.id,
            type,
            title: candidateTitle,
            posterUrl: result.poster_path
              ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
              : null,
            score,
            popularity: result.popularity || 0,
            similarity,
          });
        }
      } catch (e) {
        // Ignore errors for this type
      }
    });
    await Promise.all(fetches);
    // Return the best match (highest score), or empty array if none
    if (results.length === 0) return [];
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // Fetch episode details by TMDB show ID, season, and episode number
  static async fetchEpisodeDetails(tmdbId, season, episodeNum, imageWidth = 'original') {
    if (!tmdbId || !season || !episodeNum) return null;
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const json = await response.json();
      const name = json.name || '';
      const stillPath = json.still_path || null;
      const airDate = json.air_date || null;
      const overview = json.overview || '';
      let imageUrl = '';
      if (stillPath) {
        imageUrl = imageWidth === 'original'
          ? `https://image.tmdb.org/t/p/original${stillPath}`
          : `https://image.tmdb.org/t/p/w${imageWidth}${stillPath}`;
      }
      return {
        name,
        imageUrl,
        airDate,
        overview,
      };
    } catch (e) {
      // Log error if needed
      return null;
    }
  }

  // (Optional) Fetch all episodes for a season
  static async fetchSeasonDetails(tmdbId, season) {
    // TODO: Implement season bulk fetch logic
    return [];
  }
}

export default TMDBService; 