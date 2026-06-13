import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/cn'

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('joins multiple classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c')
  })

  it('handles conditional with boolean', () => {
    const active = true
    expect(cn('base', active && 'active')).toBe('base active')
    expect(cn('base', !active && 'active')).toBe('base')
  })

  it('merges conflicting Tailwind classes — last one wins', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('merges height conflicts', () => {
    expect(cn('h-10', 'h-14')).toBe('h-14')
  })

  it('handles array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })

  it('handles object inputs', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('returns empty string for all falsy', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('does not duplicate classes', () => {
    const result = cn('flex', 'flex')
    expect(result).toBe('flex')
  })
})
