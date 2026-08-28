import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { vote as voteCopy } from '@/lib/content'
import { VoteCastForm, type CastVoteInput, type CastVoteResult } from './vote-cast-form'

// next/navigation has no router in jsdom.
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/vote',
}))

const ELIGIBLE = [
  {
    id: 'u-other',
    display_name: 'Other Member',
    avatar_url: '',
    node: { id: 'n-beta', name: 'Beta' },
  },
  {
    id: 'u-second',
    display_name: 'Second Member',
    avatar_url: '',
    node: { id: 'n-gamma', name: 'Gamma' },
  },
]

function goodReason() {
  return 'consistent, high-quality work all cycle'
}

function renderForm(options?: {
  myVotes?: { polarity: 'positive' | 'negative' }[]
  onCast?: (input: CastVoteInput) => Promise<CastVoteResult>
}) {
  const onCast =
    options?.onCast ?? vi.fn(async (): Promise<CastVoteResult> => ({ ok: true }))
  renderWithProviders(
    <VoteCastForm eligible={ELIGIBLE} myVotes={options?.myVotes ?? []} onCast={onCast} />,
  )
  return { onCast }
}

async function fillValidVote(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /Other Member/ }))
  await user.click(screen.getByRole('button', { name: voteCopy.polarity.positive }))
  await user.type(screen.getByLabelText(voteCopy.reason.label), goodReason())
}

describe('VoteCastForm', () => {
  it('lists every eligible member as a selectable subject', async () => {
    renderForm()

    for (const member of ELIGIBLE) {
      expect(
        screen.getByRole('radio', { name: new RegExp(member.display_name) }),
      ).toBeInTheDocument()
    }
  })

  it('shows an empty state when nobody is eligible', () => {
    renderWithProviders(<VoteCastForm eligible={[]} myVotes={[]} onCast={vi.fn()} />)

    expect(screen.getByText(voteCopy.subject.empty)).toBeInTheDocument()
  })

  it('blocks a reason shorter than the 10-character minimum with an inline error', async () => {
    const user = userEvent.setup()
    const onCast = vi.fn(async (): Promise<CastVoteResult> => ({ ok: true }))
    renderForm({ onCast })

    await user.click(screen.getByRole('radio', { name: /Other Member/ }))
    await user.click(screen.getByRole('button', { name: voteCopy.polarity.positive }))
    await user.type(screen.getByLabelText(voteCopy.reason.label), 'short')

    const place = screen.getByRole('button', { name: voteCopy.submit })
    await user.click(place)

    expect(screen.getByRole('alert')).toHaveTextContent(voteCopy.reason.tooShort)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onCast).not.toHaveBeenCalled()
  })

  it('caps the reason at 500 characters so it can never exceed the server bound', async () => {
    const user = userEvent.setup()
    const { onCast } = renderForm()

    const reason = screen.getByLabelText(voteCopy.reason.label)
    await user.type(reason, 'x'.repeat(501))

    // maxLength hard-caps client entry at the same bound the POST route enforces.
    expect(reason).toHaveValue('x'.repeat(500))
    expect(onCast).not.toHaveBeenCalled()
  })

  it('casts through the confirmation step and reports success', async () => {
    const user = userEvent.setup()
    const { onCast } = renderForm()

    expect(screen.getByRole('button', { name: voteCopy.submit })).toBeDisabled()

    await fillValidVote(user)

    const place = screen.getByRole('button', { name: voteCopy.submit })
    expect(place).toBeEnabled()
    await user.click(place)

    // Confirmation step shows the fully interpolated summary.
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(voteCopy.confirm.title)
    expect(dialog).toHaveTextContent(
      voteCopy.confirm.body
        .replace('{polarity}', 'positive')
        .replace('{name}', 'Other Member'),
    )

    await user.click(screen.getByRole('button', { name: voteCopy.confirm.confirm }))

    expect(onCast).toHaveBeenCalledWith({
      subject: 'u-other',
      polarity: 'positive',
      reason: goodReason(),
    })
    expect(screen.getByRole('status')).toHaveTextContent(voteCopy.success)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('maps a rejection from casting to the generic server error', async () => {
    const user = userEvent.setup()
    const { onCast } = renderForm({
      onCast: vi.fn(async (): Promise<CastVoteResult> => ({
        ok: false,
        reason: 'unknown',
      })),
    })

    await fillValidVote(user)
    await user.click(screen.getByRole('button', { name: voteCopy.submit }))
    await user.click(screen.getByRole('button', { name: voteCopy.confirm.confirm }))

    expect(onCast).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent(voteCopy.errors.default)
  })

  it('recovers when casting throws, without hanging the form mid-submit', async () => {
    const user = userEvent.setup()
    const { onCast } = renderForm({
      onCast: vi.fn(async (): Promise<CastVoteResult> => {
        throw new Error('network down')
      }),
    })

    await fillValidVote(user)
    await user.click(screen.getByRole('button', { name: voteCopy.submit }))
    await user.click(screen.getByRole('button', { name: voteCopy.confirm.confirm }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(voteCopy.errors.default),
    )
    expect(onCast).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()

    // The confirmation flow is not stuck: it can be re-opened and retried.
    await user.click(screen.getByRole('button', { name: voteCopy.submit }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: voteCopy.confirm.confirm })).toBeEnabled()
  })

  it('shows the conflict message when the vote budget is already spent', async () => {
    const user = userEvent.setup()
    renderForm({
      onCast: vi.fn(async (): Promise<CastVoteResult> => ({
        ok: false,
        reason: 'conflict',
      })),
    })

    await fillValidVote(user)
    await user.click(screen.getByRole('button', { name: voteCopy.submit }))
    await user.click(screen.getByRole('button', { name: voteCopy.confirm.confirm }))

    expect(screen.getByRole('alert')).toHaveTextContent(voteCopy.errors.conflict)
  })

  it('disables a polarity already spent this cycle', async () => {
    renderForm({ myVotes: [{ polarity: 'positive' }] })

    expect(
      screen.getByRole('button', { name: voteCopy.polarity.positive }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: voteCopy.polarity.negative })).toBeEnabled()
  })
})
