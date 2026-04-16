import { Buffer } from 'node:buffer'
import sharp from 'sharp'

const DARK_BACKGROUND = '#1a1b22'
const LIGHT_BACKGROUND = '#eef1f4'
const IMAGE_WIDTH = 600
const IMAGE_HEIGHT = 300
const TILE_SIZE = 256
const ZOOM = 15
const USER_AGENT = 'ens.sh local map renderer'
const geocodeCache = new Map()
const imageCache = new Map()

const TILE_STYLES = {
  light: {
    background: LIGHT_BACKGROUND,
    baseTilePath: 'light_nolabels',
    labelTilePath: 'light_only_labels',
  },
  dark: {
    background: DARK_BACKGROUND,
    baseTilePath: 'dark_nolabels',
    labelTilePath: 'dark_only_labels',
  },
}

const FALLBACK_LOCATIONS = new Map([
  [
    'Akfırat, Göçbeyli Bv No:1, 34959 Tuzla/İstanbul',
    { lat: 40.9522725, lon: 29.4111677 },
  ],
  [
    'Akfirat, Gocbeyli Bv No:1, 34959 Tuzla/Istanbul',
    { lat: 40.9522725, lon: 29.4111677 },
  ],
])

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light'
}

function normalizeLocation(location) {
  return location.trim().replace(/\s+/g, ' ')
}

function normalizeAsciiLocation(location) {
  return normalizeLocation(
    location
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I'),
  )
}

function longitudeToPixelX(longitude, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  return ((longitude + 180) / 360) * scale
}

function latitudeToPixelY(latitude, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const latitudeInRadians = (latitude * Math.PI) / 180
  return (
    (0.5 -
      Math.log(
        (1 + Math.sin(latitudeInRadians)) /
          (1 - Math.sin(latitudeInRadians)),
      ) /
        (4 * Math.PI)) *
    scale
  )
}

async function geocodeLocation(location) {
  const normalizedLocation = normalizeLocation(location)
  const asciiLocation = normalizeAsciiLocation(normalizedLocation)

  if (FALLBACK_LOCATIONS.has(normalizedLocation)) {
    return FALLBACK_LOCATIONS.get(normalizedLocation)
  }

  if (FALLBACK_LOCATIONS.has(asciiLocation)) {
    return FALLBACK_LOCATIONS.get(asciiLocation)
  }

  if (geocodeCache.has(normalizedLocation)) {
    return geocodeCache.get(normalizedLocation)
  }

  const attempts = [
    normalizedLocation,
    asciiLocation,
    normalizedLocation.replaceAll('/', ', '),
    normalizedLocation.split(',').slice(0, 3).join(', '),
    normalizedLocation.split(',').slice(-2).join(', '),
  ]

  for (const query of attempts) {
    if (!query) {
      continue
    }

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '1')

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) {
      continue
    }

    const payload = await response.json()

    if (Array.isArray(payload) && payload.length > 0) {
      const result = {
        lat: Number(payload[0].lat),
        lon: Number(payload[0].lon),
      }

      geocodeCache.set(normalizedLocation, result)
      return result
    }
  }

  throw new Error(`Unable to geocode location: ${normalizedLocation}`)
}

function getTileUrl(tilePath, zoom, x, y) {
  return `https://a.basemaps.cartocdn.com/${tilePath}/${zoom}/${x}/${y}.png`
}

async function fetchTile(tilePath, zoom, x, y) {
  const response = await fetch(getTileUrl(tilePath, zoom, x, y), {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch tile ${zoom}/${x}/${y}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function buildMapImage({ latitude, longitude, theme }) {
  const centerX = longitudeToPixelX(longitude, ZOOM)
  const centerY = latitudeToPixelY(latitude, ZOOM)
  const left = centerX - IMAGE_WIDTH / 2
  const top = centerY - IMAGE_HEIGHT / 2
  const right = left + IMAGE_WIDTH
  const bottom = top + IMAGE_HEIGHT
  const startTileX = Math.floor(left / TILE_SIZE)
  const endTileX = Math.floor((right - 1) / TILE_SIZE)
  const startTileY = Math.floor(top / TILE_SIZE)
  const endTileY = Math.floor((bottom - 1) / TILE_SIZE)
  const maxTile = 2 ** ZOOM
  const tilesWide = endTileX - startTileX + 1
  const tilesHigh = endTileY - startTileY + 1

  const tileRequests = []

  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      if (tileY < 0 || tileY >= maxTile) {
        continue
      }

      const wrappedTileX = ((tileX % maxTile) + maxTile) % maxTile

      tileRequests.push(
        Promise.all([
          fetchTile(TILE_STYLES[theme].baseTilePath, ZOOM, wrappedTileX, tileY),
          fetchTile(
            TILE_STYLES[theme].labelTilePath,
            ZOOM,
            wrappedTileX,
            tileY,
          ),
        ]).then(([baseInput, labelInput]) => ({
          input: [
            {
              input: baseInput,
              left: (tileX - startTileX) * TILE_SIZE,
              top: (tileY - startTileY) * TILE_SIZE,
            },
            {
              input: labelInput,
              left: (tileX - startTileX) * TILE_SIZE,
              top: (tileY - startTileY) * TILE_SIZE,
            },
          ],
        })),
      )
    }
  }

  const compositeTiles = (await Promise.all(tileRequests)).flatMap(
    ({ input }) => input,
  )
  const baseImage = sharp({
    create: {
      width: tilesWide * TILE_SIZE,
      height: tilesHigh * TILE_SIZE,
      channels: 4,
      background: TILE_STYLES[theme].background,
    },
  })

  const extracted = baseImage
    .composite(compositeTiles)
    .extract({
      left: Math.round(left - startTileX * TILE_SIZE),
      top: Math.round(top - startTileY * TILE_SIZE),
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    })

  if (theme === 'dark') {
    return extracted
      .modulate({
        brightness: 0.92,
        saturation: 0.78,
      })
      .png()
      .toBuffer()
  }

  return extracted
    .modulate({
      brightness: 1.02,
      saturation: 0.92,
    })
    .png()
    .toBuffer()
}

export async function renderMapImage({
  location,
  theme,
  latitude,
  longitude,
}) {
  const normalizedLocation = normalizeLocation(location)
  const normalizedTheme = normalizeTheme(theme)
  const cacheKey = `${normalizedLocation}::${normalizedTheme}::${latitude ?? 'auto'}::${longitude ?? 'auto'}`

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)
  }

  const coordinates =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? { lat: latitude, lon: longitude }
      : await geocodeLocation(normalizedLocation)
  const imageBuffer = await buildMapImage({
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    theme: normalizedTheme,
  })

  imageCache.set(cacheKey, imageBuffer)
  return imageBuffer
}

export async function handleMapRequest(req, res) {
  try {
    const requestUrl = new URL(req.url, 'http://localhost')
    const location = requestUrl.searchParams.get('location')
    const theme = requestUrl.searchParams.get('theme')
    const latitude = Number(requestUrl.searchParams.get('lat'))
    const longitude = Number(requestUrl.searchParams.get('lon'))

    if (!location) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Missing "location" query parameter.')
      return
    }

    const imageBuffer = await renderMapImage({
      location,
      theme,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(imageBuffer)
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(
      error instanceof Error
        ? error.message
        : 'Unable to render map image.',
    )
  }
}
