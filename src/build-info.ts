import { version } from '../package.json';

declare const __BUILD_INFO__: { hash: string; committedAt: string | null };

/** The running bundle retains its own identity even after the site publishes another build. */
export const BUILD_INFO = { version, ...(typeof __BUILD_INFO__ === 'undefined'
  ? { hash: 'unknown', committedAt: null } : __BUILD_INFO__) };
