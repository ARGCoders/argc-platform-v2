import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { nodeEvents as nodeEventsCopy } from '@/lib/content'
import { ProposeEventClient } from './propose-event-client'

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const fetchMock = vi.fn()

function stubRouteResponse(response: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(response))
}

/**
 * renderWithProviders drives the AuthProvider, which stubs global `fetch`
 * itself (test/auth-harness.tsx). It settles its session during render, so
 * the route stub can only be installed *after* render returns — otherwise the
 * harness's own stub clobbers ours (see the harness's bare `vi.stubGlobal`).
 */
function renderClient() {
  renderWithProviders(<ProposeEventClient />)
  return userEvent.setup()
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.title.label), {
    target: { value: 'Hack Night' },
  })
  await user.selectOptions(
    screen.getByLabelText(nodeEventsCopy.propose.fields.type.label),
    'hackathon',
  )
  fireEvent.change(screen.getByLabelText(nodeEventsCopy.propose.fields.starts_at.label), {
    target: { value: '2099-09-14T09:30' },
  })
}

describe('ProposeEventClient', () => {
  afterEach(() => {
    fetchMock.mockReset()
  })

  it('POSTs the whitelisted payload to the route and reports success', async () => {
    const user = renderClient()
    stubRouteResponse(jsonResponse(201, { data: {} }))

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined
    expect(call).toBeDefined()
    const [url, init] = call ?? []
    expect(url).toBe('/api/dashboard/node/events')
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
    expect(JSON.parse((init as { body: string }).body)).toMatchObject({
      title: 'Hack Night',
      type: 'hackathon',
      is_public: false,
    })

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        nodeEventsCopy.propose.success,
      ),
    )
  })

  it('maps the route’s future-date rejection to the form’s past copy', async () => {
    const user = renderClient()
    stubRouteResponse(
      jsonResponse(400, { error: { message: 'starts_at must be in the future' } }),
    )

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.inPast,
      ),
    )
  })

  it('maps any other validation rejection to the generic invalid copy', async () => {
    const user = renderClient()
    stubRouteResponse(jsonResponse(400, { error: { message: 'Invalid type' } }))

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.invalid,
      ),
    )
  })

  it('maps a server failure to the default copy', async () => {
    const user = renderClient()
    stubRouteResponse(jsonResponse(500, { error: { message: 'Server error' } }))

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: nodeEventsCopy.propose.submit }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        nodeEventsCopy.propose.errors.default,
      ),
    )
  })
})
