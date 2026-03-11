import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Proper utility to merge Tailwind classes with conditional logic.
 * Must be used in a shadcn/tailwind project.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

