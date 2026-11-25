// Tutorial video helper (v6). The checkout pages embed ONE YouTube tutorial.
// Set NEXT_PUBLIC_TUTORIAL_VIDEO_URL to a YouTube link or the 11-character id.
// Read with a LITERAL process.env access so Next inlines it into the client bundle.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string | undefined | null): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1] || null;
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
        id = m ? m[1] : null;
      }
    }
    return id && ID_RE.test(id) ? id : null;
  } catch { return null; }
}

export function getTutorialVideoId(): string | null {
  return parseYouTubeId(process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL);
}
