import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { evaluations as evaluationsCopy } from '@/lib/content'
import {
  EvaluationScheduleForm,
  type ScheduleEvaluationInput,
  type ScheduleEvaluationResult,
} from './evaluation-schedule-form'

const EVALUATEE = { id: 'u-amos', display_name: 'Amos Weintraub' }
const EVALUATORS = [
  { id: 'u-beth', display_name: 'Beth Lamont' },
  { id: 'u-clare', display_name: 'Clare Osei' },
]

function renderForm(options?: {
  evaluators?: Array<{ id: string; display_name: string }>
  onSchedule?: (input: ScheduleEvaluationInput) => Promise<ScheduleEvaluationResult>
}) {
  const onSchedule =
    options?.onSchedule ??
    vi.fn(async (): Promise<ScheduleEvaluationResult> => ({ ok: true }))
  renderWithProviders(
    <EvaluationScheduleForm
      evaluatee={EVALUATEE}
      evaluators={options?.evaluators ?? EVALUATORS}
      onSchedule={onSchedule}
    />,
  )
  return { onSchedule }
}

async function fillValidSchedule(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText(evaluationsCopy.schedule.date.label), {
    target: { value: '2026-09-14T09:30' },
  })
  await user.selectOptions(
    screen.getByLabelText(evaluationsCopy.schedule.evaluator.label),
    'u-beth',
  )
}

describe('EvaluationScheduleForm', () => {
  it('renders the title and names the evaluatee in the intro', () => {
    renderForm()

    expect(screen.getByText(evaluationsCopy.schedule.title)).toBeInTheDocument()
    expect(
      screen.getByText(
        evaluationsCopy.schedule.intro.replace('{name}', EVALUATEE.display_name),
      ),
    ).toBeInTheDocument()
  })

  it('lists candidate evaluators but always excludes the evaluatee', () => {
    renderForm({ evaluators: [...EVALUATORS, EVALUATEE] })

    const select = screen.getByLabelText(evaluationsCopy.schedule.evaluator.label)
    expect(select).toHaveTextContent('Beth Lamont')
    expect(select).toHaveTextContent('Clare Osei')
    expect(select).not.toHaveTextContent(EVALUATEE.display_name)
  })

  it('defaults to an unassigned evaluator', () => {
    renderForm()

    expect(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(evaluationsCopy.schedule.evaluator.label)).toHaveValue(
      '',
    )
  })

  it('blocks submission without a date', async () => {
    const user = userEvent.setup()
    const { onSchedule } = renderForm()

    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      evaluationsCopy.schedule.date.required,
    )
    expect(onSchedule).not.toHaveBeenCalled()
  })

  it('schedules with an assigned evaluator, reporting success and resetting', async () => {
    const user = userEvent.setup()
    const { onSchedule } = renderForm()

    await fillValidSchedule(user)
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    await waitFor(() => expect(onSchedule).toHaveBeenCalledTimes(1))
    expect(onSchedule).toHaveBeenCalledWith({
      scheduled_at: new Date('2026-09-14T09:30').toISOString(),
      evaluator_id: 'u-beth',
    })

    expect(screen.getByRole('status')).toHaveTextContent(evaluationsCopy.schedule.success)
    expect(screen.getByLabelText(evaluationsCopy.schedule.date.label)).toHaveValue('')
  })

  it('schedules with no evaluator, sending evaluator_id null', async () => {
    const user = userEvent.setup()
    const { onSchedule } = renderForm()

    fireEvent.change(screen.getByLabelText(evaluationsCopy.schedule.date.label), {
      target: { value: '2026-09-14T09:30' },
    })
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    expect(onSchedule).toHaveBeenCalledWith({
      scheduled_at: new Date('2026-09-14T09:30').toISOString(),
      evaluator_id: null,
    })
  })

  it('maps a conflict rejection to its copy', async () => {
    const user = userEvent.setup()
    renderForm({
      onSchedule: vi.fn(async (): Promise<ScheduleEvaluationResult> => ({
        ok: false,
        reason: 'conflict',
      })),
    })

    await fillValidSchedule(user)
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        evaluationsCopy.schedule.errors.conflict,
      ),
    )
  })

  it('maps an invalid rejection to its copy', async () => {
    const user = userEvent.setup()
    renderForm({
      onSchedule: vi.fn(async (): Promise<ScheduleEvaluationResult> => ({
        ok: false,
        reason: 'invalid',
      })),
    })

    await fillValidSchedule(user)
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        evaluationsCopy.schedule.errors.invalid,
      ),
    )
  })

  it('recovers when scheduling throws, without hanging the form', async () => {
    const user = userEvent.setup()
    const { onSchedule } = renderForm({
      onSchedule: vi.fn(async (): Promise<ScheduleEvaluationResult> => {
        throw new Error('network down')
      }),
    })

    await fillValidSchedule(user)
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        evaluationsCopy.schedule.errors.default,
      ),
    )
    expect(onSchedule).toHaveBeenCalledTimes(1)

    // Not stuck: a retry submits again.
    await user.click(
      screen.getByRole('button', { name: evaluationsCopy.schedule.submit }),
    )
    await waitFor(() => expect(onSchedule).toHaveBeenCalledTimes(2))
  })
})
