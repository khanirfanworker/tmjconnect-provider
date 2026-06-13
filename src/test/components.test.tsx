import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Sparkline } from '@/components/ui/Sparkline'
import { StatusBadge } from '@/components/ui/Badge'

// ─── Button ────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Sign in securely</Button>)
    expect(screen.getByText('Sign in securely')).toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop passed', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('does not call onClick when disabled', () => {
    let clicked = false
    render(<Button disabled onClick={() => { clicked = true }}>Disabled</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(false)
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Full width</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  it('renders all variants without crashing', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger', 'outline'] as const
    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByText(variant)).toBeInTheDocument()
      unmount()
    })
  })
})

// ─── Input ─────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email address" />)
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Enter a valid email" />)
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
  })

  it('shows hint when no error', () => {
    render(<Input label="NPI" hint="10 digit number" />)
    expect(screen.getByText('10 digit number')).toBeInTheDocument()
  })

  it('does not show hint when error present', () => {
    render(<Input label="NPI" hint="10 digit number" error="Required" />)
    expect(screen.queryByText('10 digit number')).not.toBeInTheDocument()
  })

  it('shows password toggle for type=password', () => {
    render(<Input label="Password" type="password" />)
    expect(screen.getByLabelText('Show password')).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(<Input label="Password" type="password" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByLabelText('Show password'))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByLabelText('Hide password'))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('sets aria-invalid when error present', () => {
    render(<Input label="Email" error="Invalid" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})

// ─── Alert ─────────────────────────────────────────────────────────────────

describe('Alert', () => {
  it('renders message', () => {
    render(<Alert message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Alert title="Session expired" message="Please log in again" />)
    expect(screen.getByText('Session expired')).toBeInTheDocument()
    expect(screen.getByText('Please log in again')).toBeInTheDocument()
  })

  it('calls onDismiss when X clicked', () => {
    let dismissed = false
    render(<Alert message="Error" onDismiss={() => { dismissed = true }} />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(dismissed).toBe(true)
  })

  it('has role=alert for accessibility', () => {
    render(<Alert message="Error occurred" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

// ─── StatusBadge ───────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('renders URGENT for urgent status', () => {
    render(<StatusBadge status="urgent" />)
    expect(screen.getByText('URGENT')).toBeInTheDocument()
  })

  it('renders MODERATE for moderate status', () => {
    render(<StatusBadge status="moderate" />)
    expect(screen.getByText('MODERATE')).toBeInTheDocument()
  })

  it('renders STABLE for stable status', () => {
    render(<StatusBadge status="stable" />)
    expect(screen.getByText('STABLE')).toBeInTheDocument()
  })
})

// ─── Sparkline ─────────────────────────────────────────────────────────────

describe('Sparkline', () => {
  const mockData = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-04-${(i + 1).toString().padStart(2, '0')}`,
    painLevel: 5 + Math.sin(i) * 2,
  }))

  it('renders SVG element', () => {
    const { container } = render(<Sparkline data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders polyline', () => {
    const { container } = render(<Sparkline data={mockData} />)
    expect(container.querySelector('polyline')).toBeInTheDocument()
  })

  it('renders end-point dot', () => {
    const { container } = render(<Sparkline data={mockData} />)
    expect(container.querySelector('circle')).toBeInTheDocument()
  })

  it('returns null for insufficient data', () => {
    const { container } = render(<Sparkline data={[{ date: '2026-04-01', painLevel: 5 }]} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
