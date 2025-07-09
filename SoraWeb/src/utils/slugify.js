// slugify.js
// Utility to convert a string to a URL-safe slug
export default function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')     // Trim leading/trailing hyphens
    .replace(/-{2,}/g, '-')      // Collapse multiple hyphens
} 