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
