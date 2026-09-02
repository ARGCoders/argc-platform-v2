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
})
