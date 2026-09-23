import './build-version.css';
import { BUILD_INFO } from './build-info';

/** Lives outside #app so setup, lobby, editor and battle all keep the same visible build identity. */
export function mountBuildVersion(): void {
  document.querySelector('[data-build-version]')?.remove();
  const badge = document.createElement('aside');
  badge.className = 'build-version';
  badge.dataset.buildVersion = BUILD_INFO.hash;
  badge.setAttribute('aria-label', 'Running commit');
  const version = document.createElement('span'), hash = document.createElement('code');
  hash.textContent = BUILD_INFO.hash.slice(0, 6);
  if (BUILD_INFO.hash === 'unknown') hash.textContent = 'unknown';
  version.append('commit ', hash);
  const time = document.createElement('time');
  if (BUILD_INFO.committedAt) {
    time.dateTime = BUILD_INFO.committedAt;
    time.textContent = new Date(BUILD_INFO.committedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  } else time.textContent = 'Commit time unavailable';
  badge.append(version, time);
  document.body.append(badge);
}
