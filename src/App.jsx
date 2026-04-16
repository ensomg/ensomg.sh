import { useEffect, useRef, useState } from 'react'

const site = {
  name: 'ensomg',
  hoverName: 'Enes I.',
  intro:
    'I work on raven.best. I am interested in html python node js. It is nice to meet you.',
  fallbackPhoto: '/profile-photo-placeholder.svg',
  fallbackPhotoAlt: 'Profile portrait',
  posts: [
    {
      title: '[A recent note]',
      href: 'https://example.com/post-one',
    },
    {
      title: '[Something technical]',
      href: 'https://example.com/post-two',
    },
    {
      title: '[An older post]',
      href: 'https://example.com/post-three',
    },
  ],
  location: 'Akf\u0131rat, G\u00f6\u00e7beyli Bv No:1, 34959 Tuzla/\u0130stanbul',
  map: {
    lat: 40.9251836,
    lon: 29.417775,
  },
  github: {
    label: '@ensomg on GitHub',
    href: 'https://github.com/ensomg',
    handle: 'ensomg',
  },
  x: {
    label: '@ensomg0 on X',
    href: 'https://x.com/ensomg0',
    handle: 'ensomg0',
  },
  discord: {
    label: '@ensomg on Discord',
    href: 'https://discord.com/users/852629327891660881',
  },
  work: {
    label: 'raven.best',
    href: 'https://raven.best',
  },
  interests: [
    {
      label: 'HTML',
      href: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    },
    {
      label: 'Python',
      href: 'https://www.python.org/',
    },
    {
      label: 'Node.js',
      href: 'https://nodejs.org/',
    },
  ],
  lanyard: {
    discordId: '852629327891660881',
    spotifyHref:
      'https://open.spotify.com/user/31nfajr6sunfjjdgy4oplhfun6qa?si=5fab1a28655c4dee',
  },
}

const syncedLyricCache = new Map()
const officialDiscordBadgeImages = {
  serverBoost: '/discord-badges/server-boost.png',
}

function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function formatPresenceText(value) {
  if (!value) {
    return ''
  }

  const trimmedValue = value.trim()
  const lettersOnly = trimmedValue.replace(/[^\p{L}]/gu, '')

  if (
    lettersOnly &&
    lettersOnly === lettersOnly.toLocaleUpperCase('tr-TR')
  ) {
    return trimmedValue
      .toLocaleLowerCase('tr-TR')
      .replace(
        /(^|[\s'([{-])\p{L}/gu,
        (segment) => segment.toLocaleUpperCase('tr-TR'),
      )
  }

  return trimmedValue
}

function formatPlaybackTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function formatCompactCount(value) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat('en', {
    notation: value >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDurationSince(timestamp) {
  if (!timestamp) {
    return ''
  }

  const elapsedMilliseconds = Date.now() - timestamp

  if (elapsedMilliseconds <= 0) {
    return ''
  }

  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000)
  const hours = Math.floor(elapsedMinutes / 60)
  const minutes = elapsedMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function normalizeLyricValue(value) {
  if (!value) {
    return ''
  }

  return value
    .toLocaleLowerCase('en-US')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft)\.?\b.*$/giu, ' ')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getPrimaryArtistName(value) {
  return value?.split(/,|&|\bfeat\.?\b|\bft\.?\b/iu)[0]?.trim() ?? ''
}

function getSyncedLyricCacheKey(spotify) {
  return [
    spotify?.track_id ?? '',
    normalizeLyricValue(spotify?.song),
    normalizeLyricValue(spotify?.artist),
  ].join('::')
}

function parseSyncedLyrics(value) {
  if (!value) {
    return []
  }

  return value
    .split('\n')
    .map((line) => {
      const match = line.match(
        /\[(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\](.*)/u,
      )

      if (!match) {
        return null
      }

      const [, minutes, seconds, fraction = '0', text] = match
      const lyricText = formatPresenceText(text)

      if (!lyricText) {
        return null
      }

      const milliseconds = fraction.padEnd(3, '0').slice(0, 3)

      return {
        timeMs:
          Number(minutes) * 60_000 +
          Number(seconds) * 1_000 +
          Number(milliseconds),
        text: lyricText,
      }
    })
    .filter(Boolean)
}

function scoreLyricCandidate(candidate, { normalizedSong, normalizedArtist, durationMs }) {
  const candidateSong = normalizeLyricValue(candidate.trackName ?? candidate.name)
  const candidateArtist = normalizeLyricValue(candidate.artistName)
  const candidateDurationMs = Math.round((candidate.duration ?? 0) * 1_000)
  let score = 0

  if (candidateSong === normalizedSong) {
    score += 6
  } else if (
    candidateSong.includes(normalizedSong) ||
    normalizedSong.includes(candidateSong)
  ) {
    score += 3
  }

  if (candidateArtist === normalizedArtist) {
    score += 6
  } else if (
    candidateArtist.includes(normalizedArtist) ||
    normalizedArtist.includes(candidateArtist)
  ) {
    score += 3
  }

  if (durationMs && candidateDurationMs) {
    const delta = Math.abs(candidateDurationMs - durationMs)

    if (delta <= 2_000) {
      score += 4
    } else if (delta <= 5_000) {
      score += 2
    } else if (delta <= 10_000) {
      score += 1
    }
  }

  if (candidate.syncedLyrics) {
    score += 2
  }

  return score
}

function pickBestLyricMatch(results, spotify) {
  const normalizedSong = normalizeLyricValue(spotify?.song)
  const normalizedArtist = normalizeLyricValue(getPrimaryArtistName(spotify?.artist))
  const durationMs = Math.max(
    0,
    (spotify?.timestamps?.end ?? 0) - (spotify?.timestamps?.start ?? 0),
  )
  const candidates = results.filter((result) => result?.syncedLyrics)

  if (!candidates.length) {
    return null
  }

  return candidates.reduce((bestCandidate, candidate) => {
    const bestScore = bestCandidate
      ? scoreLyricCandidate(bestCandidate, {
          normalizedSong,
          normalizedArtist,
          durationMs,
        })
      : Number.NEGATIVE_INFINITY
    const candidateScore = scoreLyricCandidate(candidate, {
      normalizedSong,
      normalizedArtist,
      durationMs,
    })

    return candidateScore > bestScore ? candidate : bestCandidate
  }, null)
}

function getActiveLyricIndex(lines, elapsedMs) {
  if (!lines.length) {
    return -1
  }

  let activeIndex = 0

  for (let index = 0; index < lines.length; index += 1) {
    if (elapsedMs >= lines[index].timeMs) {
      activeIndex = index
      continue
    }

    break
  }

  return activeIndex
}

function SpotifyLyrics({ lyrics, activeIndex, isLoading, isSunMode }) {
  const dividerClass = isSunMode
    ? 'border-sky-400/12'
    : 'border-zinc-200 dark:border-zinc-800'
  const loadingTextClass = isSunMode
    ? 'text-sky-100/40'
    : 'text-zinc-400 dark:text-zinc-600'

  if (isLoading) {
    return (
      <div className={joinClasses('mt-3 border-t pt-3', dividerClass)}>
        <p className={joinClasses('text-[11px]', loadingTextClass)}>
          Looking for synced lyrics...
        </p>
      </div>
    )
  }

  if (!lyrics.length) {
    return null
  }

  const lineHeight = 24
  const translateY = `${Math.max(activeIndex - 1, 0) * lineHeight}px`

  return (
    <div className={joinClasses('mt-3 border-t pt-3', dividerClass)}>
      <div className="relative h-[72px] overflow-hidden">
        <div
          className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateY(-${translateY})` }}
        >
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex
            const isNearActive = Math.abs(index - activeIndex) === 1

            return (
              <p
                key={`${line.timeMs}-${line.text}`}
                className={`h-6 truncate font-serif text-[12px] leading-6 transition-[opacity,color] duration-500 motion-reduce:transition-none ${
                  isActive
                    ? isSunMode
                      ? 'text-sky-50 opacity-100'
                      : 'text-zinc-700 opacity-100 dark:text-zinc-200'
                    : isNearActive
                      ? isSunMode
                        ? 'text-sky-200/60 opacity-60'
                        : 'text-zinc-500 opacity-60 dark:text-zinc-500'
                      : isSunMode
                        ? 'text-sky-100/15 opacity-20'
                        : 'text-zinc-400 opacity-20 dark:text-zinc-700'
                }`}
              >
                {line.text}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpotifyPlayer({ spotify, isSunMode }) {
  const start = spotify?.timestamps?.start ?? 0
  const end = spotify?.timestamps?.end ?? 0
  const songName = spotify?.song ?? ''
  const artistName = spotify?.artist ?? ''
  const trackId = spotify?.track_id ?? ''
  const [now, setNow] = useState(start)
  const [lyrics, setLyrics] = useState([])
  const [isLyricsLoading, setIsLyricsLoading] = useState(false)
  const duration = Math.max(0, end - start)
  const elapsed = Math.min(Math.max(now - start, 0), duration)
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0
  const activeLyricIndex = getActiveLyricIndex(lyrics, elapsed)
  const dividerClass = isSunMode
    ? 'border-sky-400/12'
    : 'border-zinc-200 dark:border-zinc-800'
  const strongTextClass = isSunMode
    ? 'text-slate-50'
    : 'text-zinc-900 dark:text-white'
  const subtleTextClass = isSunMode
    ? 'text-slate-400'
    : 'text-zinc-500 dark:text-zinc-500'
  const progressTrackClass = isSunMode
    ? 'bg-sky-100/8'
    : 'bg-zinc-200 dark:bg-zinc-800'
  const progressFillClass = isSunMode
    ? 'bg-sky-300'
    : 'bg-zinc-700 dark:bg-zinc-300'

  useEffect(() => {
    if (!start || !end) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [end, start, trackId])

  useEffect(() => {
    if (!songName || !artistName) {
      setLyrics([])
      setIsLyricsLoading(false)
      return undefined
    }

    const cacheKey = getSyncedLyricCacheKey({
      track_id: trackId,
      song: songName,
      artist: artistName,
    })
    const cachedLyrics = syncedLyricCache.get(cacheKey)

    if (cachedLyrics) {
      setLyrics(cachedLyrics)
      setIsLyricsLoading(false)
      return undefined
    }

    const abortController = new AbortController()
    const primaryArtistName = getPrimaryArtistName(artistName)

    const fetchLyrics = async () => {
      setIsLyricsLoading(true)

      try {
        const searchParams = new URLSearchParams({
          track_name: songName,
          artist_name: primaryArtistName || artistName,
        })
        const response = await fetch(
          `https://lrclib.net/api/search?${searchParams.toString()}`,
          {
            signal: abortController.signal,
          },
        )

        if (!response.ok) {
          throw new Error(`Lyrics request failed with ${response.status}`)
        }

        const results = await response.json()
        const bestMatch = pickBestLyricMatch(results, {
          song: songName,
          artist: artistName,
          timestamps: { start, end },
        })
        const nextLyrics = parseSyncedLyrics(bestMatch?.syncedLyrics)

        syncedLyricCache.set(cacheKey, nextLyrics)
        setLyrics(nextLyrics)
      } catch (error) {
        if (error.name !== 'AbortError') {
          syncedLyricCache.set(cacheKey, [])
          setLyrics([])
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLyricsLoading(false)
        }
      }
    }

    fetchLyrics()

    return () => {
      abortController.abort()
    }
  }, [artistName, end, songName, start, trackId])

  return (
    <div className={joinClasses('border-t pt-3', dividerClass)}>
      <div className="flex items-center gap-3">
        <img
          src={spotify.album_art_url}
          alt=""
          aria-hidden="true"
          className="size-11 rounded-[10px] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className={joinClasses('truncate font-serif italic', strongTextClass)}>
            {formatPresenceText(spotify.song)}
          </p>
          <p className={joinClasses('truncate text-[12px]', subtleTextClass)}>
            {formatPresenceText(spotify.artist)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className={joinClasses('h-[2px] rounded-full', progressTrackClass)}>
          <div
            className={joinClasses(
              'h-full rounded-full transition-[width] duration-700 ease-linear',
              progressFillClass,
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={joinClasses('mt-1 flex justify-between text-[11px]', subtleTextClass)}>
          <span>{formatPlaybackTime(elapsed)}</span>
          <span>{formatPlaybackTime(duration)}</span>
        </div>
      </div>
      <SpotifyLyrics
        lyrics={lyrics}
        activeIndex={activeLyricIndex}
        isLoading={isLyricsLoading}
        isSunMode={isSunMode}
      />
    </div>
  )
}

function DiscordRpcCard({ activity, isSunMode }) {
  const start = activity?.timestamps?.start ?? 0
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!start) return undefined
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [start])

  const elapsed = start ? Math.max(0, now - start) : 0
  const dividerClass = isSunMode ? 'border-sky-400/12' : 'border-zinc-200 dark:border-zinc-800'
  const strongTextClass = isSunMode ? 'text-slate-50' : 'text-zinc-900 dark:text-white'
  const subtleTextClass = isSunMode ? 'text-slate-400' : 'text-zinc-500 dark:text-zinc-500'

  const formatRpcTime = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`
  }

  const getAssetUrl = (appId, assetId) => {
    if (!assetId) return null
    if (assetId.startsWith('mp:external/')) {
      return `https://media.discordapp.net/external/${assetId.replace('mp:external/', '')}`
    }
    return `https://cdn.discordapp.com/app-assets/${appId}/${assetId}.png`
  }

  const largeImage = getAssetUrl(activity.application_id, activity.assets?.large_image)
  const smallImage = getAssetUrl(activity.application_id, activity.assets?.small_image)

  return (
    <div className={joinClasses('border-t pt-3', dividerClass)}>
      <div className="flex items-center gap-3">
        {largeImage || smallImage ? (
          <div className="relative size-11 shrink-0">
            <img
              src={largeImage || smallImage}
              alt={activity.assets?.large_text || activity.name}
              className="size-11 rounded-[10px] object-cover"
            />
            {largeImage && smallImage && (
              <img
                src={smallImage}
                alt={activity.assets?.small_text || ''}
                className={joinClasses(
                  'absolute -bottom-1 -right-1 size-[20px] rounded-full ring-[2.5px] object-cover',
                  isSunMode ? 'ring-[rgba(9,13,28)]' : 'ring-zinc-100 dark:ring-zinc-900',
                )}
              />
            )}
          </div>
        ) : (
          <div
            className={joinClasses(
              'flex size-11 shrink-0 items-center justify-center rounded-[10px]',
              isSunMode ? 'bg-sky-500/10' : 'bg-zinc-200/50 dark:bg-zinc-800/50',
            )}
          >
            <DiscordIcon
              className={joinClasses(
                'size-5',
                isSunMode ? 'text-sky-300' : 'text-zinc-500 dark:text-zinc-400',
              )}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={joinClasses('truncate font-serif italic text-[15px]', strongTextClass)}>
            {formatPresenceText(activity.name)}
          </p>
          {activity.details && (
            <p className={joinClasses('truncate text-[12px] leading-tight', subtleTextClass)}>
              {formatPresenceText(activity.details)}
            </p>
          )}
          {activity.state && (
            <p className={joinClasses('truncate text-[12px] leading-tight', subtleTextClass)}>
              {formatPresenceText(activity.state)}
            </p>
          )}
        </div>
      </div>
      {start > 0 && (
        <div className="mt-2.5">
          <div className={joinClasses('flex items-center text-[11px]', subtleTextClass)}>
            <span>{formatRpcTime(elapsed)} elapsed</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityLine({ presence, linkClass, isSunMode, onHoverChange }) {
  const [isHovered, setIsHovered] = useState(false)
  const [playerHeight, setPlayerHeight] = useState(0)
  const openTimeoutRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const playerInnerRef = useRef(null)
  const revealMotion =
    'duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none'
  const strongTextClass = isSunMode ? 'text-slate-50' : 'text-zinc-900 dark:text-white'
  const accentIconClass = isSunMode ? 'text-sky-300' : ''

  const clearTimers = () => {
    clearTimeout(openTimeoutRef.current)
    clearTimeout(closeTimeoutRef.current)
  }

  const handleMouseEnter = () => {
    clearTimeout(closeTimeoutRef.current)
    openTimeoutRef.current = setTimeout(() => {
      setIsHovered(true)
      onHoverChange?.(true)
    }, 120)
  }

  const handleMouseLeave = () => {
    clearTimeout(openTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      onHoverChange?.(false)
    }, 180)
  }

  useEffect(() => clearTimers, [])

  useEffect(() => {
    const element = playerInnerRef.current

    if (!element) return undefined

    const updateHeight = () => {
      setPlayerHeight(element.scrollHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [presence])

  if (presence?.listening_to_spotify && presence.spotify?.song) {
    return (
      <div>
        <p>
          I&apos;m listening to{' '}
          <span className={joinClasses('font-serif italic', strongTextClass)}>
            {formatPresenceText(presence.spotify.song)}
          </span>
          {presence.spotify.artist
            ? ` from ${formatPresenceText(presence.spotify.artist)}`
            : ''}{' '}
          on{' '}
          <span
            className="inline-flex items-baseline gap-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <a
              href={site.lanyard.spotifyHref}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
              onFocus={handleMouseEnter}
              onBlur={handleMouseLeave}
            >
              Spotify
            </a>
            <SpotifyIcon className={accentIconClass} />
          </span>
          .
        </p>
        <div
          className={`overflow-hidden transition-[height,opacity] ${revealMotion} ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ height: isHovered ? `${playerHeight}px` : '0px' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={playerInnerRef}
            className={`transition-[opacity,transform] ${revealMotion} ${
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            <SpotifyPlayer spotify={presence.spotify} isSunMode={isSunMode} />
          </div>
        </div>
      </div>
    )
  }

  const currentActivity = presence?.activities?.find(
    (activity) => activity.type !== 4 && activity.name !== 'Spotify',
  )

  if (
    currentActivity &&
    (currentActivity.type === 0 ||
      currentActivity.type === 1 ||
      currentActivity.type === 3 ||
      currentActivity.details ||
      currentActivity.assets)
  ) {
    const activityMap = { 0: 'playing', 1: 'streaming', 3: 'watching' }
    const actionText = activityMap[currentActivity.type] ?? 'on'

    return (
      <div>
        <p>
          I&apos;m currently {actionText}{' '}
          <span
            className="inline-flex items-baseline gap-1 cursor-default"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span
              className={joinClasses(
                'underline underline-offset-[0.18em] transition-[color,text-decoration-color] duration-500',
                isSunMode
                  ? 'text-sky-200 decoration-sky-500/45 hover:text-sky-50 hover:decoration-sky-200'
                  : 'text-zinc-900 dark:text-white decoration-zinc-400 hover:decoration-zinc-600 dark:decoration-zinc-500/80 dark:hover:decoration-zinc-400'
              )}
              onFocus={handleMouseEnter}
              onBlur={handleMouseLeave}
              tabIndex={0}
            >
              {currentActivity.name}
            </span>
          </span>
          .
        </p>
        <div
          className={`overflow-hidden transition-[height,opacity] ${revealMotion} ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ height: isHovered ? `${playerHeight}px` : '0px' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={playerInnerRef}
            className={`transition-[opacity,transform] ${revealMotion} ${
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            <DiscordRpcCard activity={currentActivity} isSunMode={isSunMode} />
          </div>
        </div>
      </div>
    )
  }

  const customStatus = presence?.activities?.find((activity) => activity.type === 4)

  if (customStatus?.state) {
    return <>I&apos;m currently: {customStatus.state}.</>
  }

  if (presence?.discord_status && presence.discord_status !== 'offline') {
    return <>I&apos;m currently around on Discord.</>
  }

  return <>I&apos;m currently away from Discord.</>
}

function SocialStatsPanel({ platform, stats, status, isSunMode }) {
  const dividerClass = isSunMode
    ? 'border-sky-400/12'
    : 'border-zinc-200 dark:border-zinc-800'
  const subtleTextClass = isSunMode
    ? 'text-slate-400'
    : 'text-zinc-500 dark:text-zinc-500'
  const strongTextClass = isSunMode
    ? 'text-slate-50'
    : 'text-zinc-900 dark:text-white'
  const loadingLabel =
    platform === 'github' ? 'Looking up GitHub stats...' : 'Looking up X stats...'

  if (status === 'loading') {
    return (
      <div className={joinClasses('border-t pt-3', dividerClass)}>
        <p className={joinClasses('text-[11px]', subtleTextClass)}>
          {loadingLabel}
        </p>
      </div>
    )
  }

  if (status === 'error' || !stats) {
    return (
      <div className={joinClasses('border-t pt-3', dividerClass)}>
        <p className={joinClasses('text-[11px]', subtleTextClass)}>
          Couldn&apos;t load {platform === 'github' ? 'GitHub' : 'X'} stats right now.
        </p>
      </div>
    )
  }

  if (platform === 'github') {
    return (
      <div className={joinClasses('border-t pt-3', dividerClass)}>
        <p className={joinClasses('text-[12px]', subtleTextClass)}>
          <span className={joinClasses('font-serif italic', strongTextClass)}>
            {formatCompactCount(stats.publicRepos)}
          </span>{' '}
          repos,{' '}
          <span className={joinClasses('font-serif italic', strongTextClass)}>
            {formatCompactCount(stats.followers)}
          </span>{' '}
          followers,{' '}
          <span className={joinClasses('font-serif italic', strongTextClass)}>
            {formatCompactCount(stats.following)}
          </span>{' '}
          following.
        </p>
        <p className={joinClasses('mt-1 text-[12px]', subtleTextClass)}>
          <span className={joinClasses('font-serif italic', strongTextClass)}>
            {formatCompactCount(stats.recentCommits)}
          </span>{' '}
          recent public commits.
        </p>
      </div>
    )
  }

  return (
    <div className={joinClasses('border-t pt-3', dividerClass)}>
      <p className={joinClasses('text-[12px]', subtleTextClass)}>
        <span className={joinClasses('font-serif italic', strongTextClass)}>
          {formatCompactCount(stats.posts)}
        </span>{' '}
        posts,{' '}
        <span className={joinClasses('font-serif italic', strongTextClass)}>
          {formatCompactCount(stats.followers)}
        </span>{' '}
        followers,{' '}
        <span className={joinClasses('font-serif italic', strongTextClass)}>
          {formatCompactCount(stats.following)}
        </span>{' '}
        following.
      </p>
    </div>
  )
}

function SocialLine({ platform, social, linkClass, isSunMode, renderIcon }) {
  const [isOpen, setIsOpen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(0)
  const [status, setStatus] = useState('idle')
  const [stats, setStats] = useState(null)
  const openTimeoutRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const panelInnerRef = useRef(null)
  const revealMotion =
    'duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none'
  const accentIconClass = isSunMode ? 'text-sky-300' : ''

  const clearTimers = () => {
    clearTimeout(openTimeoutRef.current)
    clearTimeout(closeTimeoutRef.current)
  }

  const handleMouseEnter = () => {
    clearTimeout(closeTimeoutRef.current)
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 120)
  }

  const handleMouseLeave = () => {
    clearTimeout(openTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 180)
  }

  useEffect(() => clearTimers, [])

  useEffect(() => {
    const element = panelInnerRef.current

    if (!element) {
      return undefined
    }

    const updateHeight = () => {
      setPanelHeight(element.scrollHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [platform, stats, status])

  useEffect(() => {
    if (!isOpen || status === 'loading' || status === 'loaded') {
      return undefined
    }

    let isCancelled = false

    const fetchStats = async () => {
      setStatus('loading')

      try {
        const searchParams = new URLSearchParams({
          platform,
          handle: social.handle,
        })
        const response = await fetch(`/api/social?${searchParams.toString()}`)

        if (!response.ok) {
          throw new Error(`Social request failed with ${response.status}`)
        }

        const payload = await response.json()

        if (!isCancelled) {
          setStats(payload)
          setStatus('loaded')
        }
      } catch {
        if (!isCancelled) {
          setStatus('error')
        }
      }
    }

    fetchStats()

    return () => {
      isCancelled = true
    }
  }, [isOpen, platform, social.handle, status])

  return (
    <div className="inline-block align-top">
      <p className="w-fit">
        I&apos;m{' '}
        <span
          className="inline-flex items-baseline gap-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
          >
            {social.label}
          </a>
          {renderIcon(accentIconClass)}
        </span>
        .
      </p>
      <div
        className={`overflow-hidden transition-[height,opacity] ${revealMotion} ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: isOpen ? `${panelHeight}px` : '0px',
          width: isOpen ? undefined : '0px',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={panelInnerRef}
          className={`transition-[opacity,transform] ${revealMotion} ${
            isOpen ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <SocialStatsPanel
            platform={platform}
            stats={stats}
            status={status}
            isSunMode={isSunMode}
          />
        </div>
      </div>
    </div>
  )
}

function getDiscordAvatarUrl(discordUser, format = 'dynamic') {
  if (!discordUser?.id || !discordUser?.avatar) {
    return null
  }

  const isAnimated = discordUser.avatar.startsWith('a_')
  const extension =
    format === 'static' ? 'png' : isAnimated ? 'gif' : 'png'

  return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${extension}?size=160`
}

function getDiscordAvatarDecorationUrl(avatarDecorationData, size = 240) {
  if (!avatarDecorationData?.asset) {
    return null
  }

  return `https://cdn.discordapp.com/avatar-decoration-presets/${avatarDecorationData.asset}.png?size=${size}&passthrough=false`
}

function getDiscordGuildBadgeUrl(primaryGuild, size = 64) {
  if (!primaryGuild?.identity_guild_id || !primaryGuild?.badge) {
    return null
  }

  return `https://cdn.discordapp.com/clan-badges/${primaryGuild.identity_guild_id}/${primaryGuild.badge}.png?size=${size}`
}

function getDiscordStatusLabel(status) {
  if (status === 'online') {
    return 'online'
  }

  if (status === 'idle') {
    return 'idle'
  }

  if (status === 'dnd') {
    return 'do not disturb'
  }

  return 'offline'
}

function getDiscordBadgeItems(discordUser) {
  if (!discordUser) {
    return []
  }

  return [
    {
      kind: 'image',
      label: 'Server Booster',
      imageSrc: officialDiscordBadgeImages.serverBoost,
    },
  ]
}

function DiscordBadgeGlyph({ badge, className = '' }) {
  if (badge.imageSrc) {
    return (
      <img
        src={badge.imageSrc}
        alt=""
        aria-hidden="true"
        className={joinClasses('size-[17px] object-contain', className)}
      />
    )
  }

  if (badge.icon === 'shield') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <path
          d="M12 2.75 19.2 6.1v5.48c0 4.23-2.41 7.66-7.2 9.67-4.79-2.01-7.2-5.44-7.2-9.67V6.1Z"
          fill="#5865F2"
        />
        <path
          d="m9.45 12.1 1.7 1.72 3.53-3.87"
          stroke="#fff"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (badge.icon === 'guild') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <path
          d="M12 2.85 18.35 7v7.08L12 21.15 5.65 14.08V7Z"
          fill="#3BA55D"
        />
        <path
          d="m12 5.55 3.45 2.23v3.82L12 13.82 8.55 11.6V7.78Z"
          fill="#fff"
          opacity=".96"
        />
      </svg>
    )
  }

  if (badge.icon === 'balance') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <circle cx="12" cy="6.4" r="3.35" fill="#FEE75C" />
        <circle cx="7.45" cy="15.9" r="3.35" fill="#57F287" />
        <circle cx="16.55" cy="15.9" r="3.35" fill="#3BA55D" />
        <path
          d="M12 9.8v2.35m-1.9.95-1.3 1.15m5.1-1.15 1.3 1.15"
          stroke="#1F2937"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (badge.icon === 'sparkles') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <path
          d="m12 2.85 1.75 4.95 4.95 1.75-4.95 1.7L12 16.25l-1.75-4.95L5.3 9.55l4.95-1.75Z"
          fill="#EB459E"
        />
        <path
          d="m18.45 13.25.7 2.05 2 .7-2 .7-.7 2.05-.7-2.05-2-.7 2-.7Z"
          fill="#FEE75C"
        />
        <path
          d="m5.55 14.3.72 2.1 2.08.72-2.08.72-.72 2.1-.72-2.1-2.1-.72 2.1-.72Z"
          fill="#57F287"
        />
      </svg>
    )
  }

  if (badge.icon === 'snowflake') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
        stroke="#8BC7FF"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.75v18.5" />
        <path d="m7.25 5.5 9.5 13" />
        <path d="m16.75 5.5-9.5 13" />
        <path d="m9.4 4.8 2.6 1.5 2.6-1.5" />
        <path d="m9.4 19.2 2.6-1.5 2.6 1.5" />
        <path d="m4.8 9.4 1.5 2.6-1.5 2.6" />
        <path d="m19.2 9.4-1.5 2.6 1.5 2.6" />
      </svg>
    )
  }

  if (badge.icon === 'diamond') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <path
          d="m8.45 4.3-4.1 5.25L12 19.7l7.65-10.15-4.1-5.25Z"
          fill="#3BA55D"
        />
        <path d="M8.45 4.3 12 9.55 15.55 4.3" fill="#57F287" />
        <path d="M4.35 9.55H19.65" stroke="#E9FFF1" strokeWidth="1.3" />
      </svg>
    )
  }

  if (badge.icon === 'bug') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
        stroke="#FEE75C"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.5 7.5 8 6" />
        <path d="m14.5 7.5 1.5-1.5" />
        <path d="M8 11H4.5" />
        <path d="M19.5 11H16" />
        <path d="M8 15H4.5" />
        <path d="M19.5 15H16" />
        <path d="M12 7.5a4 4 0 0 1 4 4v3a4 4 0 1 1-8 0v-3a4 4 0 0 1 4-4Z" />
      </svg>
    )
  }

  if (badge.icon === 'heart') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="#EB459E"
      >
        <path d="M12 20s-7-4.6-7-10.1c0-2.4 1.9-4.4 4.2-4.4 1.4 0 2.3.5 2.8 1.5.5-1 1.4-1.5 2.8-1.5 2.3 0 4.2 2 4.2 4.4C19 15.4 12 20 12 20Z" />
      </svg>
    )
  }

  if (badge.icon === 'code') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={joinClasses('size-[17px]', className)}
        fill="none"
      >
        <path
          d="M12 3.2 19.1 7v9.95L12 20.8 4.9 16.95V7Z"
          fill="#5865F2"
        />
        <path
          d="m9.35 10.05-2.15 1.95 2.15 1.95m5.3-3.9 2.15 1.95-2.15 1.95m-1.55-5.25-2.2 6.5"
          stroke="#fff"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('size-[17px]', className)}
      fill="#8EA1E1"
    >
      <path d="m12 3 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8-3.5-3.4 4.8-.7Z" />
    </svg>
  )
}

function DiscordBadgeChip({ badge, isSunMode }) {
  return (
    <span
      title={badge.label}
      aria-label={badge.label}
      className={joinClasses(
        'inline-flex size-[18px] items-center justify-center leading-none',
        isSunMode ? 'drop-shadow-[0_0_10px_rgba(96,165,250,0.18)]' : '',
      )}
    >
      <DiscordBadgeGlyph badge={badge} />
    </span>
  )
}

function DiscordPanel({ presence, isSunMode }) {
  const dividerClass = isSunMode
    ? 'border-sky-400/12'
    : 'border-zinc-200 dark:border-zinc-800'
  const subtleTextClass = isSunMode
    ? 'text-slate-400'
    : 'text-zinc-500 dark:text-zinc-500'
  const strongTextClass = isSunMode
    ? 'text-slate-50'
    : 'text-zinc-900 dark:text-white'

  if (!presence?.discord_user) {
    return (
      <div className={joinClasses('border-t pt-3', dividerClass)}>
        <p className={joinClasses('text-[11px]', subtleTextClass)}>
          Looking up Discord presence...
        </p>
      </div>
    )
  }

  const discordUser = presence.discord_user
  const avatarDecorationSrc = getDiscordAvatarDecorationUrl(
    discordUser.avatar_decoration_data,
  )
  const guildBadgeSrc = getDiscordGuildBadgeUrl(discordUser.primary_guild)
  const badgeItems = getDiscordBadgeItems(discordUser)
  const customStatus = presence.activities?.find((activity) => activity.type === 4)
  const rpcActivities =
    presence.activities?.filter((activity) => {
      return activity.type !== 4 && activity.name !== 'Spotify'
    }) ?? []
  const activeClients = [
    presence.active_on_discord_desktop ? 'desktop' : null,
    presence.active_on_discord_mobile ? 'mobile' : null,
    presence.active_on_discord_web ? 'web' : null,
  ].filter(Boolean)

  return (
    <div className={joinClasses('border-t pt-3', dividerClass)}>
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0">
          <img
            src={getDiscordAvatarUrl(discordUser) ?? site.fallbackPhoto}
            alt=""
            aria-hidden="true"
            className="size-16 rounded-full object-cover"
          />
          {avatarDecorationSrc ? (
            <img
              src={avatarDecorationSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[132%] w-[132%] -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          ) : null}
          {guildBadgeSrc ? (
            <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-white p-[2px] shadow-[0_2px_8px_rgba(0,0,0,0.14)] dark:bg-zinc-950">
              <img
                src={guildBadgeSrc}
                alt=""
                aria-hidden="true"
                className="size-full rounded-full"
              />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className={joinClasses('truncate font-serif italic', strongTextClass)}>
            {discordUser.display_name || discordUser.global_name || discordUser.username}
          </p>
          <p className={joinClasses('truncate text-[12px]', subtleTextClass)}>
            @{discordUser.username} <span aria-hidden="true">&middot;</span>{' '}
            {getDiscordStatusLabel(presence.discord_status)}
          </p>
          {customStatus?.state ? (
            <p className={joinClasses('mt-1 text-[12px]', subtleTextClass)}>
              {customStatus.state}
            </p>
          ) : null}
        </div>
      </div>

      {badgeItems.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badgeItems.map((badge) => (
            <DiscordBadgeChip
              key={`${badge.kind}-${badge.label}`}
              badge={badge}
              isSunMode={isSunMode}
            />
          ))}
        </div>
      ) : null}

      {rpcActivities.length ? (
        <div className="mt-3 space-y-1.5">
          {rpcActivities.map((activity) => (
            <p
              key={activity.id}
              className={joinClasses('text-[12px] leading-5', subtleTextClass)}
            >
              <span className={joinClasses('font-serif italic', strongTextClass)}>
                {activity.name}
              </span>
              {activity.details ? `, ${activity.details}` : ''}
              {activity.state ? `, ${activity.state}` : ''}
              {activity.timestamps?.start ? (
                <>
                  {' '}
                  <span aria-hidden="true">&middot;</span>{' '}
                  {formatDurationSince(activity.timestamps.start)}
                </>
              ) : null}
            </p>
          ))}
        </div>
      ) : null}

      {activeClients.length ? (
        <p className={joinClasses('mt-3 text-[12px]', subtleTextClass)}>
          active on {activeClients.join(', ')}.
        </p>
      ) : null}
    </div>
  )
}

function DiscordLine({ presence, social, linkClass, isSunMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(0)
  const openTimeoutRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const panelInnerRef = useRef(null)
  const revealMotion =
    'duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none'
  const accentIconClass = isSunMode ? 'text-sky-300' : ''

  const clearTimers = () => {
    clearTimeout(openTimeoutRef.current)
    clearTimeout(closeTimeoutRef.current)
  }

  const handleMouseEnter = () => {
    clearTimeout(closeTimeoutRef.current)
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 120)
  }

  const handleMouseLeave = () => {
    clearTimeout(openTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 180)
  }

  useEffect(() => clearTimers, [])

  useEffect(() => {
    const element = panelInnerRef.current

    if (!element) {
      return undefined
    }

    const updateHeight = () => {
      setPanelHeight(element.scrollHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [presence])

  return (
    <div className="inline-block align-top">
      <p className="w-fit">
        I&apos;m{' '}
        <span
          className="inline-flex items-baseline gap-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
          >
            {social.label}
          </a>
          <DiscordIcon className={accentIconClass} />
        </span>
        .
      </p>
      <div
        className={`overflow-hidden transition-[height,opacity] ${revealMotion} ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: isOpen ? `${panelHeight}px` : '0px',
          width: isOpen ? undefined : '0px',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={panelInnerRef}
          className={`transition-[opacity,transform] ${revealMotion} ${
            isOpen ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <DiscordPanel presence={presence} isSunMode={isSunMode} />
        </div>
      </div>
    </div>
  )
}

function GitHubIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[3px] inline size-[1em]', className)}
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function XIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[3px] inline size-[1em]', className)}
      fill="currentColor"
    >
      <path d="M19.913 5.322a1.034 1.034 0 0 1 .837 1.629l-1.042 1.481c-.064 5.086-1.765 8.539-5.056 10.264A10.917 10.917 0 0 1 9.6 19.835a12.233 12.233 0 0 1-6.2-1.524.76.76 0 0 1-.317-.8.768.768 0 0 1 .63-.6 20.6 20.6 0 0 0 3.745-.886C2 13.5 3.19 7.824 3.71 6.081a1.028 1.028 0 0 1 1.729-.422 9.931 9.931 0 0 0 5.995 2.95A4.188 4.188 0 0 1 12.725 5.3a4.125 4.125 0 0 1 5.7.02ZM4.521 17.794c1.862.872 6.226 1.819 9.667.016 2.955-1.549 4.476-4.732 4.521-9.461a.771.771 0 0 1 .142-.436l1.081-1.538-.041-.053c-.518-.007-1.029-.014-1.55 0a.835.835 0 0 1-.547-.221 3.13 3.13 0 0 0-4.383-.072 3.174 3.174 0 0 0-.935 2.87.646.646 0 0 1-.154.545.591.591 0 0 1-.516.205A10.924 10.924 0 0 1 4.722 6.354c-.67 2.078-1.52 7.094 3.869 9.065a.632.632 0 0 1 .416.538.625.625 0 0 1-.3.6 13.178 13.178 0 0 1-4.186 1.237Z" />
    </svg>
  )
}

function DiscordIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[3px] inline size-[1em]', className)}
      fill="currentColor"
    >
      <path d="M20.32 4.37A17.37 17.37 0 0 0 16.02 3a12.02 12.02 0 0 0-.55 1.12 16.14 16.14 0 0 0-6.94 0A10.5 10.5 0 0 0 7.98 3a17.07 17.07 0 0 0-4.31 1.38C.95 8.53.21 12.57.58 16.55A17.5 17.5 0 0 0 5.85 19.2c.43-.58.81-1.2 1.13-1.86-.62-.24-1.21-.54-1.76-.89.15-.11.3-.22.44-.34a12.23 12.23 0 0 0 10.7 0c.15.12.29.23.44.34-.55.35-1.14.65-1.76.89.32.66.7 1.28 1.13 1.86a17.38 17.38 0 0 0 5.28-2.65c.43-4.62-.74-8.62-3.43-12.18ZM8.68 14.14c-1.05 0-1.92-.97-1.92-2.16s.84-2.16 1.92-2.16c1.09 0 1.94.98 1.92 2.16 0 1.19-.84 2.16-1.92 2.16Zm6.64 0c-1.05 0-1.92-.97-1.92-2.16s.84-2.16 1.92-2.16c1.09 0 1.94.98 1.92 2.16 0 1.19-.84 2.16-1.92 2.16Z" />
    </svg>
  )
}

function LockIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('size-[0.95em]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" />
      <rect x="6.5" y="10" width="11" height="9" rx="2.5" />
    </svg>
  )
}

function SpotifyIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[3px] inline size-[1em] shrink-0', className)}
      fill="currentColor"
    >
      <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0Zm5.505 17.315a.749.749 0 0 1-1.031.247c-2.826-1.726-6.383-2.118-10.57-1.164a.75.75 0 1 1-.333-1.462c4.582-1.045 8.52-.598 11.685 1.337a.75.75 0 0 1 .249 1.042Zm1.472-3.276a.937.937 0 0 1-1.289.309c-3.235-1.989-8.169-2.565-11.995-1.401a.938.938 0 0 1-.546-1.794c4.37-1.327 9.804-.69 13.523 1.598a.938.938 0 0 1 .307 1.288Zm.126-3.412C15.223 8.338 8.808 8.127 4.91 9.31a1.125 1.125 0 1 1-.654-2.153c4.476-1.359 11.577-1.097 16.024 1.542a1.125 1.125 0 1 1-1.177 1.928Z" />
    </svg>
  )
}

function LocationIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[3px] inline size-[1em]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.5s6-5.35 6-11a6 6 0 1 0-12 0c0 5.65 6 11 6 11Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  )
}

function HtmlIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[2px] inline size-[1em] shrink-0', className)}
      fill="currentColor"
    >
      <path d="M3.2 2.5h17.6l-1.6 18.1L12 22.5l-7.2-1.9L3.2 2.5Zm14.3 5.2H9.1l.2 2.2h8l-.6 6.6-4.7 1.3-4.6-1.3-.3-3.2h2.3l.2 1.4 2.4.7 2.4-.7.2-2.5H7.2L6.5 5.5h11.2Z" />
    </svg>
  )
}

function PythonIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[2px] inline size-[1em] shrink-0', className)}
      fill="currentColor"
    >
      <path d="M12.1 2.5c-4.1 0-3.9 1.8-3.9 1.8v1.9h3.9v.6H6.7c-2.3 0-4.2 1.9-4.2 4.2v2.4c0 2.3 1.9 4.2 4.2 4.2h2.1v-2.9c0-2.8 2.4-5.1 5.3-5.1h3.8c2.1 0 3.8-1.7 3.8-3.8V6.3c0-2.2-1.9-3.8-3.8-3.8h-5.8Zm2.2 2.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM11.9 21.5c4.1 0 3.9-1.8 3.9-1.8v-1.9h-3.9v-.6h5.4c2.3 0 4.2-1.9 4.2-4.2v-2.4c0-2.3-1.9-4.2-4.2-4.2h-2.1v2.9c0 2.8-2.4 5.1-5.3 5.1H6.1c-2.1 0-3.8 1.7-3.8 3.8v.5c0 2.2 1.9 3.8 3.8 3.8h5.8Zm-2.2-2.3a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
    </svg>
  )
}

function NodeIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('mb-[2px] inline size-[1em] shrink-0', className)}
      fill="currentColor"
    >
      <path d="m12 1.9 8.2 4.7v10.8L12 22.1l-8.2-4.7V6.6L12 1.9Zm0 2.2L5.7 7.7v8.6l6.3 3.6 6.3-3.6V7.7L12 4.1Zm0 3.1c2 0 3.5.8 4.4 2.3l-1.6.9c-.5-.9-1.4-1.4-2.7-1.4-1.8 0-3 .9-3.5 2.7-.4 1.7-.1 3 .9 4 .8.8 1.8 1.1 3.1 1.1 1 0 1.9-.2 2.6-.7v-1.9h-2.9v-1.7H17v4.6c-1.3 1-2.8 1.5-4.6 1.5-2 0-3.6-.6-4.8-1.9-1.3-1.3-1.8-3-1.4-5 .7-2.8 2.7-4.6 5.8-4.6Z" />
    </svg>
  )
}

function SunIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={joinClasses('size-[1.05rem]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2.5" />
      <path d="M12 18.75v2.5" />
      <path d="m5.46 5.46 1.78 1.78" />
      <path d="m16.76 16.76 1.78 1.78" />
      <path d="M2.75 12h2.5" />
      <path d="M18.75 12h2.5" />
      <path d="m5.46 18.54 1.78-1.78" />
      <path d="m16.76 7.24 1.78-1.78" />
    </svg>
  )
}

function CustomCursor() {
  const cursorRef = useRef(null)

  useEffect(() => {
    // Only initialize custom cursor on devices that have a real pointer (non-touch)
    if (window.matchMedia('(pointer: coarse)').matches) return undefined

    document.documentElement.classList.add('hide-cursor')

    let mouseX = 0
    let mouseY = 0
    let cursorX = 0
    let cursorY = 0

    const onMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', onMouseMove)

    let animationFrameId
    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.15
      cursorY += (mouseY - cursorY) * 0.15
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`
      }
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(animationFrameId)
      document.documentElement.classList.remove('hide-cursor')
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 z-[99999] size-5 rounded-full bg-zinc-950/20 dark:bg-white/20 backdrop-blur-[1.5px] border border-zinc-900/10 dark:border-white/10 pointer-events-none hidden sm:block will-change-transform"
    />
  )
}

function useVersionCheck() {
  useEffect(() => {
    let currentVersion = null

    // Check version every 60 seconds
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          if (currentVersion && currentVersion !== data.version) {
             window.location.reload(true)
          }
          currentVersion = data.version
        }
      } catch (err) {
        // ignore errors
      }
    }, 60000)

    // Initial fetch to set the baseline purely in the background 
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(d => { currentVersion = d.version }).catch(() => {})

    return () => clearInterval(intervalId)
  }, [])
}

function App() {
  useVersionCheck()
  const [isSunMode, setIsSunMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem('ens-sun-mode') === 'on'
  })
  const [isWritingPinned, setIsWritingPinned] = useState(false)
  const [isWritingHovered, setIsWritingHovered] = useState(false)
  const [writingListHeight, setWritingListHeight] = useState(0)
  const [presence, setPresence] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900)
    return () => clearTimeout(timer)
  }, [])

  const writingOpenTimeoutRef = useRef(null)
  const writingCloseTimeoutRef = useRef(null)
  const writingListInnerRef = useRef(null)

  const isWritingOpen = isWritingPinned || isWritingHovered
  const rowDelay = (ms) => ({ '--row-delay': `${ms}ms` })
  const bubbleDelay = (ms) => ({ '--bubble-delay': `${ms}ms` })
  const softMotion =
    'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
  const writingRevealMotion =
    'duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none'
  const shellClass = joinClasses(
    'relative z-10 mx-auto max-w-xl px-2.5 pb-8 transition-[padding-top,color] duration-700 sm:px-3 sm:pb-16',
    presence?.listening_to_spotify ? 'pt-[3.25rem] sm:pt-[4.5rem]' : 'pt-10 sm:pt-24',
    isSunMode && 'text-slate-300',
  )
  const bubbleClass = joinClasses(
    'bubble-enter w-fit max-w-[calc(100vw-4.75rem)] overflow-hidden rounded-[18px] text-[13px] transition-[background-color,color,box-shadow,border-color,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-0.5 sm:max-w-[450px] sm:rounded-[20px] sm:text-sm',
    isSunMode
      ? 'border border-sky-400/15 bg-sky-500/[0.04] text-sky-200'
      : 'bg-zinc-100 text-zinc-900 shadow-sm dark:bg-[#111113] dark:text-zinc-300',
  )
  const avatarClass = joinClasses(
    'bubble-enter size-10 shrink-0 select-none rounded-full object-cover transition-[opacity,transform] sm:size-12',
    isSunMode && 'opacity-60 grayscale',
  )
  const linkClass = joinClasses(
    'underline underline-offset-[0.18em] transition-[color,text-decoration-color] duration-500',
    isSunMode
      ? 'text-sky-200 decoration-sky-500/45 hover:text-sky-50 hover:decoration-sky-200'
      : 'text-zinc-900 decoration-zinc-400 hover:decoration-zinc-600 dark:text-white dark:decoration-zinc-500/80 dark:hover:decoration-zinc-400',
  )
  const strongTextClass = isSunMode ? 'text-slate-50' : 'text-zinc-900 dark:text-white'
  const accentIconClass = isSunMode ? 'text-sky-300' : ''
  const dividerClass = isSunMode ? 'border-sky-400/12' : 'border-zinc-200 dark:border-zinc-800'
  const mapLightClass = joinClasses(
    'absolute inset-0 h-full w-full scale-125 object-cover transition-[opacity,filter] duration-700',
    isSunMode
      ? 'opacity-0 saturate-125 brightness-110 contrast-105'
      : 'dark:hidden',
  )
  const mapDarkClass = joinClasses(
    'absolute inset-0 h-full w-full scale-125 object-cover transition-[opacity,filter] duration-700',
    isSunMode
      ? 'block opacity-100 saturate-125 brightness-110 contrast-105'
      : 'hidden dark:block',
  )
  const mapAvatarClass = joinClasses(
    'size-14 rounded-full border-2 object-cover transition-[filter,border-color,box-shadow,transform] duration-700 sm:size-16',
    isSunMode
      ? 'border-sky-200/70 grayscale-0 saturate-110 contrast-105 shadow-[0_0_0_1px_rgba(191,219,254,0.18),0_0_30px_rgba(56,189,248,0.18)]'
      : 'border-white grayscale dark:border-zinc-900',
  )
  const pingClass = isSunMode ? 'bg-sky-400/45' : 'bg-lime-500/70'
  const rowClass = 'row-enter flex items-end gap-1.5 sm:gap-2'
  
  const getSubRowClass = (rowIndex) => {
    // If a row higher up in the list is expanded, fade out this lower row
    if (expandedRow !== null && rowIndex > expandedRow) {
      return joinClasses(
        rowClass,
        'opacity-0 scale-[0.98] !h-0 !my-0 !py-0 overflow-hidden pointer-events-none',
        'transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]'
      )
    }
    return joinClasses(
      rowClass,
      'opacity-100 scale-100 h-auto overflow-visible',
      'transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]'
    )
  }

  const stackClass = 'space-y-0.5 sm:space-y-1'
  const bubblePaddingClass = 'px-3.5 py-2 sm:px-4 sm:py-2.5'
  const bubbleSidePaddingClass = 'px-3.5 sm:px-4'
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.location)}`
  const lightMapImageSrc = `/api/map?location=${encodeURIComponent(site.location)}&lat=${site.map.lat}&lon=${site.map.lon}&theme=light`
  const darkMapImageSrc = `/api/map?location=${encodeURIComponent(site.location)}&lat=${site.map.lat}&lon=${site.map.lon}&theme=dark`
  const lanyardApiHref = `https://api.lanyard.rest/v1/users/${site.lanyard.discordId}`
  const profilePhotoSrc = `https://github.com/${site.github.handle}.png`
  const faviconSrc = `https://github.com/${site.github.handle}.png`
  const profilePhotoAlt = `${site.github.handle} GitHub portrait`

  const clearWritingHoverTimers = () => {
    clearTimeout(writingOpenTimeoutRef.current)
    clearTimeout(writingCloseTimeoutRef.current)
  }

  const handleWritingMouseEnter = () => {
    clearTimeout(writingCloseTimeoutRef.current)
    writingOpenTimeoutRef.current = setTimeout(() => {
      setIsWritingHovered(true)
      if (!isWritingPinned) setExpandedRow(2)
    }, 320)
  }

  const handleWritingMouseLeave = () => {
    clearTimeout(writingOpenTimeoutRef.current)
    writingCloseTimeoutRef.current = setTimeout(() => {
      setIsWritingHovered(false)
      if (!isWritingPinned) setExpandedRow(null)
    }, 420)
  }

  useEffect(() => clearWritingHoverTimers, [])

  useEffect(() => {
    const element = writingListInnerRef.current

    if (!element) {
      return undefined
    }

    const updateHeight = () => {
      setWritingListHeight(element.scrollHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    let socket = null
    let heartbeatIntervalId = null
    let reconnectTimeoutId = null

    const clearHeartbeat = () => {
      if (heartbeatIntervalId !== null) {
        window.clearInterval(heartbeatIntervalId)
        heartbeatIntervalId = null
      }
    }

    const clearReconnect = () => {
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId)
        reconnectTimeoutId = null
      }
    }

    const applyPresence = (nextPresence) => {
      if (!isCancelled && nextPresence) {
        setPresence(nextPresence)
      }
    }

    const fetchPresence = async () => {
      try {
        const response = await fetch(lanyardApiHref)

        if (!response.ok) {
          throw new Error(`Lanyard request failed with ${response.status}`)
        }

        const payload = await response.json()

        if (!isCancelled && payload?.success && payload.data) {
          applyPresence(payload.data)
        }
      } catch {
        if (!isCancelled) {
          setPresence(null)
        }
      }
    }

    const connect = () => {
      clearReconnect()

      socket = new WebSocket('wss://api.lanyard.rest/socket')

      socket.addEventListener('message', (event) => {
        let message

        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }

        if (message.op === 1) {
          const heartbeatInterval =
            Number(message.d?.heartbeat_interval) || 30_000

          clearHeartbeat()

          heartbeatIntervalId = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ op: 3 }))
            }
          }, heartbeatInterval)

          socket.send(
            JSON.stringify({
              op: 2,
              d: {
                subscribe_to_id: site.lanyard.discordId,
              },
            }),
          )

          return
        }

        if (message.op !== 0) {
          return
        }

        if (message.t === 'INIT_STATE') {
          const initialPresence =
            message.d?.[site.lanyard.discordId] ?? message.d

          applyPresence(initialPresence)
          return
        }

        if (message.t === 'PRESENCE_UPDATE') {
          applyPresence(message.d)
        }
      })

      socket.addEventListener('close', () => {
        clearHeartbeat()

        if (!isCancelled) {
          reconnectTimeoutId = window.setTimeout(connect, 3_000)
        }
      })

      socket.addEventListener('error', () => {
        socket?.close()
      })
    }

    fetchPresence()
    connect()

    return () => {
      isCancelled = true
      clearHeartbeat()
      clearReconnect()
      socket?.close()
    }
  }, [lanyardApiHref])

  useEffect(() => {
    const faviconLink = document.querySelector('link[rel="icon"]')

    if (!faviconLink) {
      return
    }

    faviconLink.setAttribute('href', faviconSrc)
    faviconLink.setAttribute('type', 'image/png')
  }, [faviconSrc])

  useEffect(() => {
    window.localStorage.setItem('ens-sun-mode', isSunMode ? 'on' : 'off')
  }, [isSunMode])

  return (
    <>
      <div
        aria-hidden="true"
        className={joinClasses('sun-background', isSunMode && 'is-active')}
      />
      <main className={shellClass}>
        <ul className="space-y-4 sm:space-y-8">
        <li className={rowClass} style={rowDelay(0)}>
          <img
            src={profilePhotoSrc}
            alt={profilePhotoAlt}
            className={avatarClass}
          />
          <div className={bubbleClass} style={bubbleDelay(120)}>
            <p className={bubblePaddingClass}>
              I&apos;m{' '}
              <span
                title={site.hoverName}
                className="group/name relative inline-grid cursor-default align-baseline"
              >
                <span
                  className={joinClasses(
                    'col-start-1 row-start-1 font-serif italic transition-opacity duration-300 group-hover/name:opacity-0',
                    strongTextClass,
                  )}
                >
                  {site.name}
                </span>
                <span
                  className={joinClasses(
                    'col-start-1 row-start-1 font-serif italic opacity-0 transition-opacity duration-300 group-hover/name:opacity-100',
                    strongTextClass,
                  )}
                >
                  {site.hoverName}
                </span>
              </span>
              . I work on{' '}
              <a
                href={site.work.href}
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                {site.work.label}
              </a>
              . I am interested in{' '}
              {site.interests.map((interest, index) => (
                <span key={interest.label}>
                  {index > 0 ? (index === site.interests.length - 1 ? ', and ' : ', ') : ''}
                  <a
                    href={interest.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${linkClass} inline-flex items-baseline gap-1`}
                  >
                    {interest.label === 'HTML' ? <HtmlIcon /> : null}
                    {interest.label === 'Python' ? <PythonIcon /> : null}
                    {interest.label === 'Node.js' ? <NodeIcon /> : null}
                    <span>{interest.label}</span>
                  </a>
                </span>
              ))}
              . It is nice to meet you.
            </p>
          </div>
        </li>

        <li className={getSubRowClass(1)} style={rowDelay(420)}>
          <img
            src={profilePhotoSrc}
            alt=""
            aria-hidden="true"
            className={avatarClass}
          />
          <div className={bubbleClass} style={bubbleDelay(560)}>
            <div className={bubblePaddingClass}>
              <ActivityLine
                presence={presence}
                linkClass={linkClass}
                isSunMode={isSunMode}
                onHoverChange={(hovered) => setExpandedRow(hovered ? 1 : null)}
              />
            </div>
          </div>
        </li>

        <li className={getSubRowClass(2)} style={rowDelay(920)}>
          <img
            src={profilePhotoSrc}
            alt=""
            aria-hidden="true"
            className={avatarClass}
          />
          <div
            className={bubbleClass}
            onMouseEnter={handleWritingMouseEnter}
            onMouseLeave={handleWritingMouseLeave}
            style={bubbleDelay(1080)}
          >
            <div className="relative pt-3 sm:pt-4">
              <div className={bubbleSidePaddingClass}>
                <div className={joinClasses('flex items-start justify-between border-b pb-3 sm:pb-4', dividerClass)}>
                  <p className="mr-4">
                    I try to write every now and then, often about things
                    I&apos;ve recently been working through. Hover or tap here
                    to see the list.
                  </p>
                  <button
                    type="button"
                    title={isWritingPinned ? 'Hide the list' : 'Show the list'}
                    onClick={() => {
                        setIsWritingPinned((open) => {
                            const next = !open
                            if (next) setExpandedRow(2)
                            else setExpandedRow(isWritingHovered ? 2 : null)
                            return next
                        })
                    }}
                    className={joinClasses(
                      'group -my-3 -mr-3 -ml-6 inline h-fit cursor-pointer px-5 focus-visible:outline-none',
                      isSunMode ? 'text-sky-200/60' : 'text-zinc-500 dark:text-zinc-400',
                    )}
                  >
                    <span className="sr-only">Toggle writing list</span>
                    <span
                      aria-hidden="true"
                      className={`${joinClasses(
                        'block rounded-md p-2 text-base leading-none transition-transform transition-colors',
                        softMotion,
                      )} ${
                        isWritingOpen
                          ? isSunMode
                            ? 'rotate-45 bg-sky-400/12 text-sky-100'
                            : 'rotate-45 bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          : isSunMode
                            ? 'group-hover:bg-sky-400/10 group-hover:text-sky-100'
                            : 'group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800'
                      }`}
                    >
                      <LockIcon className={accentIconClass} />
                    </span>
                  </button>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-[height,opacity] ${writingRevealMotion} ${
                  isWritingOpen ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  height: isWritingOpen ? `${writingListHeight}px` : '0px',
                }}
              >
                <ul
                  ref={writingListInnerRef}
                  className={`flex flex-col px-3.5 pt-2.5 pb-1.5 transition-[opacity,transform] sm:px-4 sm:pt-3 sm:pb-2 ${writingRevealMotion} ${
                    isWritingOpen
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-1 opacity-0'
                  }`}
                >
                  <li className="py-3 text-center">
                    <p className={joinClasses('font-serif italic text-sm', isSunMode ? 'text-sky-200/60' : 'text-zinc-500 dark:text-zinc-400')}>
                      Currently nothing.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </li>

        <li className={getSubRowClass(3)} style={rowDelay(1480)}>
          <img
            src={profilePhotoSrc}
            alt=""
            aria-hidden="true"
            className={avatarClass}
          />
          <div className={stackClass}>
            <div className={bubbleClass} style={bubbleDelay(1600)}>
              <div className="relative h-[126px] w-[calc(100vw-4.75rem)] max-w-[300px] sm:h-[150px] sm:w-[300px]">
                <div className="absolute inset-0 overflow-hidden rounded-[18px] sm:rounded-[20px]">
                  <img
                    title="Map"
                    src={lightMapImageSrc}
                    alt="Map"
                    className={mapLightClass}
                  />
                  <img
                    src={darkMapImageSrc}
                    alt="Map"
                    className={mapDarkClass}
                  />
                </div>

                <span
                  className={joinClasses(
                    'absolute top-1/2 left-1/2 z-10 -mt-6 -ml-6 block size-12 animate-[ping_2s_cubic-bezier(0,_0,_0.2,_1)_infinite] rounded-full sm:-mt-7 sm:-ml-7 sm:size-14',
                    pingClass,
                  )}
                />
                <span className="map-avatar-anchor">
                  <img
                    src={profilePhotoSrc}
                    alt={profilePhotoAlt}
                    className={mapAvatarClass}
                  />
                </span>
              </div>
            </div>

            <div className={bubbleClass} style={bubbleDelay(1780)}>
              <p className={bubblePaddingClass}>
                I&apos;m currently in{' '}
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {site.location}
                </a>{' '}
                <LocationIcon className={accentIconClass} />
              </p>
            </div>
          </div>
        </li>

        <li className={getSubRowClass(4)} style={rowDelay(2100)}>
          <img
            src={profilePhotoSrc}
            alt=""
            aria-hidden="true"
            className={avatarClass}
          />
          <div className={stackClass}>
            <div className={bubbleClass} style={bubbleDelay(2220)}>
              <p className={bubblePaddingClass}>Find me online:</p>
            </div>

            <div className={bubbleClass} style={bubbleDelay(2400)}>
              <div className={bubblePaddingClass}>
                <DiscordLine
                  presence={presence}
                  social={site.discord}
                  linkClass={linkClass}
                  isSunMode={isSunMode}
                />
              </div>
            </div>

            <div className={bubbleClass} style={bubbleDelay(2580)}>
              <div className={bubblePaddingClass}>
                <SocialLine
                  platform="github"
                  social={site.github}
                  linkClass={linkClass}
                  isSunMode={isSunMode}
                  renderIcon={(className) => <GitHubIcon className={className} />}
                />
              </div>
            </div>

            <div className={bubbleClass} style={bubbleDelay(2780)}>
              <div className={bubblePaddingClass}>
                <SocialLine
                  platform="x"
                  social={site.x}
                  linkClass={linkClass}
                  isSunMode={isSunMode}
                  renderIcon={(className) => <XIcon className={className} />}
                />
              </div>
            </div>
          </div>
        </li>
      </ul>
      </main>
      <div className="fixed right-5 bottom-5 z-20 flex gap-3">
        <a
          href={site.github.href}
          target="_blank"
          rel="noreferrer"
          title="GitHub Profile"
          className={joinClasses(
            'flex size-10 items-center justify-center rounded-full border transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40',
            isSunMode
              ? 'border-sky-400/20 bg-[rgba(9,13,28,0.92)] text-slate-300 hover:text-sky-200 shadow-[0_0_0_1px_rgba(96,165,250,0.08),0_12px_30px_rgba(0,0,0,0.35),0_0_34px_rgba(37,99,235,0.18)]'
              : 'border-zinc-200 bg-white/90 text-zinc-600 hover:text-zinc-900 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:text-zinc-200 dark:shadow-[0_8px_20px_rgba(0,0,0,0.24)]',
          )}
        >
          <span className="sr-only">GitHub Profile</span>
          <GitHubIcon className="size-[18px]" />
        </a>
        <button
          type="button"
          aria-pressed={isSunMode}
          title={isSunMode ? 'Disable sun mode' : 'Enable sun mode'}
          onClick={() => setIsSunMode((value) => !value)}
          className={joinClasses(
            'flex size-10 items-center justify-center rounded-full border transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40',
            isSunMode
              ? 'border-sky-400/20 bg-[rgba(9,13,28,0.92)] text-amber-200 shadow-[0_0_0_1px_rgba(96,165,250,0.08),0_12px_30px_rgba(0,0,0,0.35),0_0_34px_rgba(37,99,235,0.18)]'
              : 'border-zinc-200 bg-white/90 text-zinc-700 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:shadow-[0_8px_20px_rgba(0,0,0,0.24)]',
          )}
        >
          <span className="sr-only">
            {isSunMode ? 'Disable sun mode' : 'Enable sun mode'}
          </span>
          <SunIcon />
        </button>
      </div>

      <div
        className={joinClasses(
          'fixed inset-0 z-50 flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isLoading ? 'opacity-100' : 'pointer-events-none opacity-0 scale-105',
          isSunMode
            ? 'bg-[#090d1c] text-sky-200'
            : 'bg-zinc-50 text-zinc-400 dark:bg-[#111113] dark:text-zinc-500'
        )}
      >
        <span className="font-serif italic text-lg tracking-widest animate-pulse">
          ens.sh
        </span>
      </div>

      <CustomCursor />
    </>
  )
}

export default App
