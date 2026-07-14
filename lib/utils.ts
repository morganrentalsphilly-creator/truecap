import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Behavior value for programmatic scrolls (scrollTo / scrollIntoView).
 *
 * The global reduced-motion CSS rule (app/globals.css) only governs scrolls
 * whose ScrollOptions omit `behavior` — an explicit `behavior: "smooth"` in
 * JS always animates, even for users who set OS-level reduced motion. Pass
 * `behavior: scrollBehavior()` instead of hardcoding "smooth" so those users
 * get an instant jump (WCAG 2.3.3) while everyone else keeps the animation.
 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'auto'
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

/**
 * Truncate a meta description at a WORD boundary within `max` chars,
 * appending an ellipsis when anything was cut. `text.slice(0, 158)` chops
 * mid-word ("6–8% Midwest / ") — a visibly broken snippet on every SERP
 * that costs CTR. Descriptions already within the limit pass through
 * untouched, so this is a no-op for hand-written copy that fits.
 */
export function truncateMetaDescription(text: string, max = 158): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  // Leave room for the ellipsis, then back up to the last full word.
  const hardCut = trimmed.slice(0, max - 1)
  const lastSpace = hardCut.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? hardCut.slice(0, lastSpace) : hardCut
  // Drop a dangling separator so we never end on "… Midwest /".
  return `${cut.replace(/[\s,;:/·—-]+$/, '')}…`
}
