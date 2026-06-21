import { create } from 'zustand'

/**
 * Ephemeral product-tour UI state — NOT persisted.
 * Whether a given provider has already completed the tour lives in authStore
 * (tourCompletedIds), which IS persisted.
 */
interface TourState {
  active: boolean
  stepIndex: number
  start: () => void
  next: () => void
  back: () => void
  close: () => void
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  stepIndex: 0,
  start: () => set({ active: true, stepIndex: 0 }),
  next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),
  back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  close: () => set({ active: false }),
}))
