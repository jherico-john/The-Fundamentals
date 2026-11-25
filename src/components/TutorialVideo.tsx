'use client';
// TutorialVideo — v6. Embedded YouTube tutorial near the top of every checkout page.
// Uses the privacy-enhanced domain (youtube-nocookie.com) and loads lazily so it
// never slows the first paint. Set NEXT_PUBLIC_TUTORIAL_VIDEO_URL (link or id).
import { getTutorialVideoId } from '@/lib/video';

const VIDEO_ID = getTutorialVideoId();

export default function TutorialVideo() {
  if (!VIDEO_ID) {
    // Production: render nothing rather than an empty box. Development: say what is missing.
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <section className="mb-10 section-anchor" aria-label="Video tutorial (not configured)">
        <div className="alert alert-info text-center">
          Video tutorial not set. Add <code>NEXT_PUBLIC_TUTORIAL_VIDEO_URL</code> to your environment file (a YouTube link or the 11-character video id).
        </div>
      </section>
    );
  }
  return (
    <section className="mb-10 section-anchor" id="video-tutorial" aria-labelledby="video-heading" data-testid="tutorial-video">
      <div className="text-center mb-4">
        <h2 id="video-heading" className="text-2xl font-bold text-fg">Watch this first</h2>
        <p className="text-fg2 mt-1">A short video that shows the whole process from start to finish.</p>
      </div>
      <div className="max-w-3xl mx-auto">
        <div className="video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0&modestbranding=1&playsinline=1`}
            title="How to pay and get your download — video tutorial"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
