import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleBadge } from './role-badge'
import { ROLES } from '@/types/pocketbase'
import { ROLE_LABELS } from '@/lib/constants'

describe('RoleBadge', () => {
  it.each(ROLES)('renders the label for %s', (role) => {
    render(<RoleBadge role={role} />)
    expect(screen.getByText(ROLE_LABELS[role])).toBeInTheDocument()
  })

  it('renders guest with no fill, outline only', () => {
    render(<RoleBadge role="guest" />)
    expect(screen.getByText(ROLE_LABELS.guest).className).not.toMatch(/\bbg-/)
  })

  // Regression guard for the One Signal Rule: Signal Maroon is reserved for
  // the single top rank, never shared with any role below it.
  it('reserves the Signal Maroon fill for super_admin_peer alone', () => {
    for (const role of ROLES) {
      render(<RoleBadge role={role} />)
      const badge = screen.getByText(ROLE_LABELS[role])
      if (role === 'super_admin_peer') {
        expect(badge.className).toContain('bg-sidebar-primary')
      } else {
        expect(badge.className).not.toContain('bg-sidebar-primary')
      }
    }
  })

  // Regression guard: a bare visible label doesn't tell assistive tech
  // whether it's reading a role, a tier, or a status.
  it('carries a Role-prefixed accessible name by default', () => {
    render(<RoleBadge role="super_peer" />)
    expect(screen.getByLabelText(`Role: ${ROLE_LABELS.super_peer}`)).toBeInTheDocument()
  })

  it('lets a consumer override the accessible name', () => {
    render(<RoleBadge role="super_peer" ariaLabel="Custom label" />)
    expect(screen.getByLabelText('Custom label')).toBeInTheDocument()
  })
})
