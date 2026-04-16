const USER_AGENT = 'ens.sh local social route'
const CACHE_TTL = 5 * 60 * 1000
const socialCache = new Map()

function getCacheEntry(key) {
  const cached = socialCache.get(key)

  if (!cached) {
    return null
  }

  if (Date.now() - cached.createdAt > CACHE_TTL) {
    socialCache.delete(key)
    return null
  }

  return cached.data
}

function setCacheEntry(key, data) {
  socialCache.set(key, {
    createdAt: Date.now(),
    data,
  })
}

function parseCompactNumber(value) {
  if (!value) {
    return 0
  }

  const normalizedValue = value.replace(/,/g, '').trim()
  const suffix = normalizedValue.slice(-1).toUpperCase()

  if (/\d/.test(suffix)) {
    return Number(normalizedValue)
  }

  const baseValue = Number(normalizedValue.slice(0, -1))

  if (!Number.isFinite(baseValue)) {
    return 0
  }

  if (suffix === 'K') {
    return Math.round(baseValue * 1_000)
  }

  if (suffix === 'M') {
    return Math.round(baseValue * 1_000_000)
  }

  if (suffix === 'B') {
    return Math.round(baseValue * 1_000_000_000)
  }

  return 0
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`)
  }

  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain, text/html;q=0.9',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`)
  }

  return response.text()
}

async function getGithubStats(handle) {
  const cacheKey = `github::${handle}`
  const cachedStats = getCacheEntry(cacheKey)

  if (cachedStats) {
    return cachedStats
  }

  let profile;
  try {
    profile = await fetchJson(`https://api.github.com/users/${handle}`)
  } catch (error) {
    throw new Error('Unable to fetch GitHub profile stats')
  }

  let events = [];
  try {
    events = await fetchJson(`https://api.github.com/users/${handle}/events/public?per_page=100`)
  } catch (error) {
    // Gracefully handle rate limits for commits
  }

  const recentCommits = Array.isArray(events)
    ? events.reduce((total, event) => {
        if (event?.type !== 'PushEvent') {
          return total
        }

        return total + (event.payload?.commits?.length ?? 0)
      }, 0)
    : 0

  const stats = {
    platform: 'github',
    handle,
    name: profile.name || profile.login,
    publicRepos: profile.public_repos ?? 0,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
    recentCommits,
  }

  setCacheEntry(cacheKey, stats)
  return stats
}

async function getXStats(handle) {
  const cacheKey = `x::${handle}`
  const cachedStats = getCacheEntry(cacheKey)

  if (cachedStats) {
    return cachedStats
  }

  const profile = await fetchJson(`https://api.vxtwitter.com/${handle}`)
  const stats = {
    platform: 'x',
    handle,
    name: profile.name || handle,
    posts: profile.tweet_count || 0,
    followers: profile.followers_count || 0,
    following: profile.following_count || 0,
  }

  setCacheEntry(cacheKey, stats)
  return stats
}

export async function handleSocialRequest(req, res) {
  try {
    const requestUrl = new URL(req.url, 'http://localhost')
    const platform = requestUrl.searchParams.get('platform')
    const handle = requestUrl.searchParams.get('handle')?.trim()

    if (!platform || !handle) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: 'Missing "platform" or "handle" query parameter.',
        }),
      )
      return
    }

    let payload = null

    if (platform === 'github') {
      payload = await getGithubStats(handle)
    } else if (platform === 'x') {
      payload = await getXStats(handle)
    } else {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: `Unsupported platform: ${platform}`,
        }),
      )
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.end(JSON.stringify(payload))
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to fetch social stats.',
      }),
    )
  }
}
