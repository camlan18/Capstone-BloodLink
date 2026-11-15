import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Gộp danh sách class CSS bằng `clsx` và xử lý ghi đè class Tailwind trùng lặp bằng `tailwind-merge`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
