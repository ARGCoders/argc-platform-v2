import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { nodeEvents as nodeEventsCopy } from '@/lib/content'
import {
  EventProposeForm,
  type ProposeEventInput,
  type ProposeEventResult,
} from './event-propose-form'

function renderForm(options?: {
  onPropose?: (input: ProposeEventInput) => Promise<ProposeEventResult>
}) {
  const onPropose =
    options?.onPropose ?? vi.fn(async (): Promise<ProposeEventResult> => ({ ok: true }))
  renderWithProviders(<EventProposeForm onPropose={onPropose} />)
  return { onPropose }
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { type?: string } = {},
) {
  const type = overrides.type ?? 'hackathon'
  fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.title.label), {
    target: { value: 'Hack Night' },
  })
  await user.selectOptions(
    screen.getByLabelText(nodeEventsCopy.propose.fields.type.label),
    type,
  )
  fireEvent.change(
    screen.getByLabelText(nodeEventsCopy.propose.fields.description.label),
    { target: { value: '  A night of pair coding.  ' } },
  )
  fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.starts_at.label), {
    target: { value: '2099-09-14T09:30' },
  })
  fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.location.label), {
    target: { value: 'ASU Library' },
  })
}

describe('EventProposeForm', () => {
  it('names the surface and the pipeline it files to', () => {
    renderForm()

    expect(screen.getByText(nodeEventsCopy.propose.title)).toBeInTheDocument()
    expect(screen.getByText(nodeEventsCopy.propose.intro)).toBeInTheDocument()
  })

  it('renders every event type from copy', () => {
    renderForm()

    const select = screen.getByLabelText(nodeEventsCopy.propose.fields.type.label)
    expect(select).toHaveTextContent('Hackathon')
    expect(select).toHaveTextContent('Knowledge session')
    expect(select).toHaveTextContent('Workshop')
    expect(select).toHaveTextContent('Community')
    expect(select).toHaveTextContent('Cross-node')
  })

  it('blocks submission until the required fields are filled', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm()

    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(
      screen.getByText(nodeEventsCopy.propose.errors.titleRequired),
    ).toBeInTheDocument()
    expect(
      screen.getByText(nodeEventsCopy.propose.errors.typeRequired),
    ).toBeInTheDocument()
    expect(
      screen.getByText(nodeEventsCopy.propose.errors.startsAtRequired),
    ).toBeInTheDocument()
    expect(onPropose).not.toHaveBeenCalled()
  })

  it('flags a start time in the past before hitting the server', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm()

    fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.title.label), {
      target: { value: 'Hack Night' },
    })
    await user.selectOptions(
      screen.getByLabelText(nodeEventsCopy.propose.fields.type.label),
      'hackathon',
    )
    fireEvent.change(
      screen.getByLabelText(nodeEventsCopy.propose.fields.starts_at.label),
      { target: { value: '2020-01-01T09:30' } },
    )
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    expect(screen.getByText(nodeEventsCopy.propose.errors.inPast)).toBeInTheDocument()
    expect(onPropose).not.toHaveBeenCalled()
  })

  it('sends a trimmed, null-safe payload and reports success', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() => expect(onPropose).toHaveBeenCalledTimes(1))
    expect(onPropose).toHaveBeenCalledWith({
      title: 'Hack Night',
      type: 'hackathon',
      description: 'A night of pair coding.',
      starts_at: new Date('2099-09-14T09:30').toISOString(),
      location: 'ASU Library',
      is_public: false,
    })

    expect(screen.getByRole('status')).toHaveTextContent(nodeEventsCopy.propose.success)
    expect(screen.getByLabelText(nodeEventsCopy.propose.fields.title.label)).toHaveValue(
      '',
    )
  })

  it('sends null description/location when blank', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm()

    fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.title.label), {
      target: { value: 'Hack Night' },
    })
    await user.selectOptions(
      screen.getByLabelText(nodeEventsCopy.propose.fields.type.label),
      'workshop',
    )
    fireEvent.change(
      screen.getByLabelText(nodeEventsCopy.propose.fields.starts_at.label),
      {
        target: { value: '2099-10-01T18:00' },
      },
    )
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, location: null }),
    )
  })

  it('flags an event as public when the checkbox is checked', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm()

    await fillValidForm(user)
    await user.click(screen.getByLabelText(nodeEventsCopy.propose.fields.is_public.label))
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() => expect(onPropose).toHaveBeenCalledTimes(1))
    expect(onPropose).toHaveBeenCalledWith(expect.objectContaining({ is_public: true }))
  })

  it('maps an invalid rejection to its copy', async () => {
    const user = userEvent.setup()
    renderForm({
      onPropose: vi.fn(async (): Promise<ProposeEventResult> => ({
        ok: false,
        reason: 'invalid',
      })),
    })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.invalid,
      ),
    )
  })

  it('maps a past-date rejection to its copy', async () => {
    const user = userEvent.setup()
    renderForm({
      onPropose: vi.fn(async (): Promise<ProposeEventResult> => ({
        ok: false,
        reason: 'past',
      })),
    })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.inPast,
      ),
    )
  })

  it('recovers from a thrown rejection without hanging the form', async () => {
    const user = userEvent.setup()
    const { onPropose } = renderForm({
      onPropose: vi.fn(async (): Promise<ProposeEventResult> => {
        throw new Error('network down')
      }),
    })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.default,
      ),
    )
    expect(onPropose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))
    await waitFor(() => expect(onPropose).toHaveBeenCalledTimes(2))
  })
})
