export async function extractStreams(masterUrl, corsProxy = '', headers = {}) {
  // Fetch the master playlist directly, with headers
  const response = await fetch(masterUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status}`)
  }
  const content = await response.text()

  const lines = content.split(/\r?\n/)
  const streams = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
      const infoLine = line
      const urlLine = lines[i + 1].trim()

      // Extract resolution
      const resMatch = infoLine.match(/RESOLUTION=(\d+)x(\d+)/)
      let height = 0
      if (resMatch) {
        height = parseInt(resMatch[2], 10)
      }

      // Build absolute URL for relative paths
      let streamUrl = urlLine
      if (!/^(https?:)?\/\//.test(urlLine)) {
        const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1)
        streamUrl = baseUrl + urlLine
      }
      // Always proxy the stream URL, but avoid double-encoding
      if (corsProxy && !streamUrl.startsWith(corsProxy)) {
        // Only encode if not already encoded
        const urlPart = streamUrl.startsWith('http') ? encodeURIComponent(streamUrl) : streamUrl;
        // Pass headers as x-cors-headers-*
        let proxyUrl = corsProxy + urlPart;
        // Attach headers as query params if needed (for some proxies)
        // (If your proxy expects headers as query params, add here)
        streamUrl = proxyUrl;
      }

      streams.push({
        url: streamUrl,
        type: 'application/x-mpegURL',
        label: getQualityLabel(height),
        height,
      })
    }
  }

  // Sort by resolution descending
  streams.sort((a, b) => b.height - a.height)

  return streams
}

function getQualityLabel(height) {
  if (height >= 1080) return `${height}p (FHD)`
  if (height >= 720) return `${height}p (HD)`
  if (height >= 480) return `${height}p (SD)`
  return `${height}p`
} 