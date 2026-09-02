import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { makeUser } from '@/test/auth-harness'
import { RoleGate } from './role-gate'

describe('RoleGate', () => {
  it('renders children when the user meets the minimum role', async () => {
    renderWithProviders(
      <RoleGate minRole="node_leader">
        <p>Leader content</p>
      </RoleGate>,
      { user: makeUser({ role: 'super_peer' }) },
    )
    expect(await screen.findByText('Leader content')).toBeInTheDocument()
  })

  it('renders exactly at the minimum role, not just above it', async () => {
    renderWithProviders(
      <RoleGate minRole="node_leader">
        <p>Leader content</p>
      </RoleGate>,
      { user: makeUser({ role: 'node_leader' }) },
    )
    expect(await screen.findByText('Leader content')).toBeInTheDocument()
  })

  it('renders the fallback when the user role is too low', async () => {
    renderWithProviders(
      <RoleGate minRole="node_leader" fallback={<p>Hidden</p>}>
        <p>Leader content</p>
      </RoleGate>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    expect(await screen.findByText('Hidden')).toBeInTheDocument()
    expect(screen.queryByText('Leader content')).toBeNull()
  })

  it('renders nothing by default once resolved signed out', async () => {
    const { container } = renderWithProviders(
      <RoleGate minRole="node_peer">
        <p>Member content</p>
      </RoleGate>,
      { user: null },
    )
    await waitFor(() => expect(container.textContent).toBe(''))
  })
})
