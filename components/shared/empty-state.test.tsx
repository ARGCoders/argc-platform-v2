import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState title="No members found" description="Invite someone to your node." />,
    )
    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.getByText('Invite someone to your node.')).toBeInTheDocument()
  })

  it('omits the description when not provided', () => {
    render(<EmptyState title="No members found" />)
    expect(screen.getByText('No members found')).toBeInTheDocument()
  })

  it('renders the action slot when provided', () => {
    render(<EmptyState title="No members found" action={<button>Invite</button>} />)
    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument()
  })

  // Regression guard: `text-foreground`/`text-muted-foreground`/`border-border`
  // and the dashboard's `bg-sidebar` resolve to the same oklch value in light
  // mode (no `.dark` class is ever applied), so a dashboard consumer must
  // render the sidebar-foreground family, not the ambient Paper-mode tokens,
  // or the empty state renders invisible on Terminal Navy.
  it('defaults to the light-surface (ambient) palette', () => {
    render(<EmptyState title="No members found" description="Invite someone." />)
    expect(screen.getByText('No members found').className).toContain('text-foreground')
    expect(screen.getByText('No members found').className).not.toContain(
      'sidebar-foreground',
    )
    expect(screen.getByText('Invite someone.').className).toContain(
      'text-muted-foreground',
    )
  })

  it('uses the dark-surface palette when surface="dark"', () => {
    render(
      <EmptyState
        title="No members found"
        description="Invite someone."
        surface="dark"
      />,
    )
    expect(screen.getByText('No members found').className).toContain(
      'text-sidebar-foreground',
    )
    expect(screen.getByText('No members found').className).not.toContain(
      'text-foreground',
    )
    expect(screen.getByText('Invite someone.').className).toContain(
      'sidebar-foreground/60',
    )
  })
})
