<!-- Original menu movie, font provenance and reproducible local verification. -->
# Main menu video and typography

The reference uses Fira Sans Condensed, medium 500 at 13px, for menu controls.
The same Latin 500/700 WOFF2 fonts are bundled under OFL 1.1; the font license is
also emitted into dist. Chinese uses the existing system fallback. Main-menu text
scales with the fitted 800px-wide composition; the native ESC rail stays at 13px.

The installer contains `language.mix/ra2ts_l.bik`: a 632×570, 15 fps, 28.73-second
movie including the metal CRT surround, original RA2 logo and moving red radar.
Both preparation paths convert it to muted VP8 WebM. No original movie or frame
is committed or emitted into dist. Rust Alarm remains the project title beneath
the original logo. The separate entry splash retains its 3-second maximum.

The movie loops without playback controls. Leaving the mode menu releases the
video source. Hidden documents pause; reduced-motion users receive a still frame.
If media fails, the existing CSS monitor remains usable. The readiness contract
requires the video, and the service worker supports byte-range video requests.

## Checks

```sh
npm test
npm run build
npm run repo:check
node --import tsx scripts/check-source-only.ts --build
node scripts/browser_menu_video.mjs
RA2_BROWSER_URL=http://127.0.0.1:4229/ node scripts/browser_menu_cache.mjs
RA2_TEST_VIDEO_CONVERTER=1 node scripts/browser_menu_video.mjs
```

The optional encoding check requires the original Bink fixture at ignored
`.cache/menu-video/ra2ts_l.bik`. It passes real Bink bytes into a nested module
worker and verifies the returned WebM's dimensions and duration through browser
decoding. It does not substitute an already converted movie.

Local results: 133 unit tests pass, native conversion succeeds, and real browser
conversion returns a playable 632×570, 28.734-second movie. Browser checks verify
font loading/weight, advancing playback, looping, exit cleanup, reduced motion and
failed-media fallback. Evidence is `.cache/menu-video/main-menu-video.png`.

Production desktop Lighthouse on the separate local-originals fixture: performance
94, accessibility 100, best practices 100, SEO 100. The original movie adds about
4 MB to local playback; it remains absent from the audited dist. Build and tracked
source isolation checks pass. The font OFL notice is present in dist.

Hosted entry now connects the service worker and validates originals before mode
selection. Missing/old caches open preparation instead of silently showing CSS
fallback chrome. The installer still requires consent or a local file; localhost
storage is separate from the production domain. The hosted-cache regression fails
on 3d128d1 and uses real local menu media with synthetic readiness padding for
unrelated gameplay files. It never uploads media or substitutes host-served originals.
Serve `dist` with a static server for this check. Vite preview adds `Vary: Origin`,
which prevents its precached script response from matching offline module requests.
The fixed entry passes this regression, the existing playback suite and 133 unit
tests. Static-host entry Lighthouse scores are 100 in all four categories.
