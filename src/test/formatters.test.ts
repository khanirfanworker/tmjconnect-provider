import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatTime,
  formatDateTime,
  timeAgo,
  formatDuration,
  formatCategory,
  STATUS_CLASSES,
  URGENCY_CLASSES,
  URGENCY_LABEL,
} from '@/utils/formatters'

// ── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    const result = formatDate('2026-04-18T10:30:00Z')
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/18/)
    expect(result).toMatch(/2026/)
  })

  it('formats different months correctly', () => {
    expect(formatDate('2026-01-01T00:00:00Z')).toMatch(/Jan/)
    expect(formatDate('2026-12-25T00:00:00Z')).toMatch(/Dec/)
  })
})

// ── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats ISO time to h:mm AM/PM', () => {
    const result = formatTime('2026-04-18T14:30:00Z')
    expect(result).toMatch(/\d+:\d{2}/)
    expect(result).toMatch(/AM|PM/)
  })

  it('pads minutes with zero', () => {
    const result = formatTime('2026-04-18T10:05:00Z')
    expect(result).toMatch(/:\d{2}/)
  })
})

// ── formatDateTime ──────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('returns em dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('returns em dash for empty string', () => {
    expect(formatDateTime('')).toBe('—')
  })

  it('returns em dash for invalid date', () => {
    expect(formatDateTime('not-a-date')).toBe('—')
  })

  it('formats valid ISO string with "at" separator', () => {
    const result = formatDateTime('2026-04-18T10:30:00Z')
    expect(result).toContain(' at ')
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/AM|PM/)
  })
})

// ── formatDuration ──────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats seconds to m:ss', () => {
    expect(formatDuration(134)).toBe('2:14')
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(45)).toBe('0:45')
    expect(formatDuration(278)).toBe('4:38')
  })

  it('pads single-digit seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(601)).toBe('10:01')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('handles exact minutes', () => {
    expect(formatDuration(120)).toBe('2:00')
    expect(formatDuration(300)).toBe('5:00')
  })

  it('handles large values', () => {
    expect(formatDuration(3600)).toBe('60:00')
  })
})

// ── formatCategory ──────────────────────────────────────────────────────────

describe('formatCategory', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatCategory('jaw_mobility')).toBe('Jaw Mobility')
    expect(formatCategory('muscle_relaxation')).toBe('Muscle Relaxation')
  })

  it('handles single word', () => {
    expect(formatCategory('stretching' as any)).toBe('Stretching')
  })

  it('handles multi-word snake_case', () => {
    expect(formatCategory('strengthening' as any)).toBe('Strengthening')
  })
})

// ── timeAgo ─────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 1 minute', () => {
    expect(timeAgo(new Date('2026-04-18T11:59:30Z').toISOString())).toBe('just now')
    expect(timeAgo(new Date('2026-04-18T12:00:00Z').toISOString())).toBe('just now')
  })

  it('returns minutes ago for < 1 hour', () => {
    expect(timeAgo(new Date('2026-04-18T11:30:00Z').toISOString())).toBe('30m ago')
    expect(timeAgo(new Date('2026-04-18T11:59:00Z').toISOString())).toBe('1m ago')
  })

  it('returns hours ago for < 24 hours', () => {
    expect(timeAgo(new Date('2026-04-18T10:00:00Z').toISOString())).toBe('2h ago')
    expect(timeAgo(new Date('2026-04-18T01:00:00Z').toISOString())).toBe('11h ago')
  })

  it('returns days ago for < 7 days', () => {
    expect(timeAgo(new Date('2026-04-15T12:00:00Z').toISOString())).toBe('3d ago')
    expect(timeAgo(new Date('2026-04-12T12:00:00Z').toISOString())).toBe('6d ago')
  })

  it('returns formatted date for >= 7 days', () => {
    const result = timeAgo(new Date('2026-04-10T12:00:00Z').toISOString())
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/2026/)
  })
})

// ── STATUS_CLASSES ───────────────────────────────────────────────────────────

describe('STATUS_CLASSES', () => {
  it('covers all three patient statuses', () => {
    expect(STATUS_CLASSES.stable).toBeDefined()
    expect(STATUS_CLASSES.moderate).toBeDefined()
    expect(STATUS_CLASSES.urgent).toBeDefined()
  })

  it('each entry has dot, badge and label', () => {
    for (const entry of Object.values(STATUS_CLASSES)) {
      expect(entry).toHaveProperty('dot')
      expect(entry).toHaveProperty('badge')
      expect(entry).toHaveProperty('label')
    }
  })

  it('stable has green colors', () => {
    expect(STATUS_CLASSES.stable.dot).toContain('green')
    expect(STATUS_CLASSES.stable.badge).toContain('green')
  })

  it('moderate has amber colors', () => {
    expect(STATUS_CLASSES.moderate.dot).toContain('amber')
  })

  it('urgent has red colors', () => {
    expect(STATUS_CLASSES.urgent.dot).toContain('red')
    expect(STATUS_CLASSES.urgent.badge).toContain('red')
  })

  it('labels match status name', () => {
    expect(STATUS_CLASSES.stable.label).toBe('Stable')
    expect(STATUS_CLASSES.moderate.label).toBe('Moderate')
    expect(STATUS_CLASSES.urgent.label).toBe('Urgent')
  })
})

// ── URGENCY_CLASSES ──────────────────────────────────────────────────────────

describe('URGENCY_CLASSES', () => {
  it('covers all urgency levels', () => {
    expect(URGENCY_CLASSES.urgent).toBeDefined()
    expect(URGENCY_CLASSES.concerning).toBeDefined()
    expect(URGENCY_CLASSES.routine).toBeDefined()
  })

  it('each entry has badge and border', () => {
    for (const entry of Object.values(URGENCY_CLASSES)) {
      expect(entry).toHaveProperty('badge')
      expect(entry).toHaveProperty('border')
    }
  })

  it('urgent has red border', () => {
    expect(URGENCY_CLASSES.urgent.border).toContain('red')
  })

  it('concerning has amber border', () => {
    expect(URGENCY_CLASSES.concerning.border).toContain('amber')
  })

  it('routine has slate border', () => {
    expect(URGENCY_CLASSES.routine.border).toContain('slate')
  })
})

// ── URGENCY_LABEL ────────────────────────────────────────────────────────────

describe('URGENCY_LABEL', () => {
  it('maps all urgency levels to human labels', () => {
    expect(URGENCY_LABEL.urgent).toBe('Urgent')
    expect(URGENCY_LABEL.concerning).toBe('Concerning')
    expect(URGENCY_LABEL.routine).toBe('Routine')
  })
})
