import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { evaluations as evaluationsCopy } from '@/lib/content'
import {
  EvaluationPipelineCard,
  type PipelineEvaluation,
} from './evaluation-pipeline-card'

const MEMBER = { id: 'u-amos', display_name: 'Amos Weintraub', avatar_url: '' }

function evalFor(overrides: Partial<PipelineEvaluation>): PipelineEvaluation {
  return {
    id: 'eval-1',
    stage: 'standard_1',
    status: 'scheduled',
    evaluator: { display_name: 'Beth Lamont' },
    scheduled_at: '2026-09-10T10:00:00.000Z',
    score: null,
    ...overrides,
  }
}

describe('EvaluationPipelineCard', () => {
  it('renders the member as the card identity and the pipeline label', () => {
    renderWithProviders(<EvaluationPipelineCard member={MEMBER} evaluations={[]} />)

    expect(screen.getByText('Amos Weintraub')).toBeInTheDocument()
    expect(screen.getByText(evaluationsCopy.pipeline.title)).toBeInTheDocument()
  })

  it('renders each present stage in canonical order despite shuffled input', () => {
    const evaluations = [
      evalFor({ id: 'e-s2', stage: 'standard_2', status: 'completed', score: 88 }),
      evalFor({ id: 'e-s1', stage: 'standard_1', status: 'scheduled' }),
      evalFor({
        id: 'e-s3',
        stage: 'eval_plus_node_leader',
        status: 'pending',
        scheduled_at: null,
        evaluator: null,
      }),
    ]

    renderWithProviders(
      <EvaluationPipelineCard member={MEMBER} evaluations={evaluations} />,
    )

    const stageOne = screen.getByLabelText('Stage: Stage 1')
    const stageTwo = screen.getByLabelText('Stage: Stage 2')
    const stageThree = screen.getByLabelText('Stage: Stage 3 · Node Leader')

    expect(
      stageOne.compareDocumentPosition(stageTwo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      stageTwo.compareDocumentPosition(stageThree) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('maps evaluator, date, and score onto the stage rows', () => {
    const evaluations = [
      evalFor({
        id: 'e-s2',
        stage: 'standard_2',
        status: 'completed',
        scheduled_at: '2026-09-11T10:00:00.000Z',
        evaluator: { display_name: 'Clare Osei' },
        score: 88,
      }),
      evalFor({ id: 'e-s1', stage: 'standard_1', status: 'scheduled' }),
    ]

    renderWithProviders(
      <EvaluationPipelineCard member={MEMBER} evaluations={evaluations} />,
    )

    expect(screen.getByLabelText('Evaluator: Beth Lamont')).toBeInTheDocument()
    expect(screen.getByLabelText('Scheduled: 2026-09-10')).toBeInTheDocument()
    expect(screen.getByLabelText('Score: 88')).toBeInTheDocument()
    expect(screen.getByLabelText('Not yet scored')).toBeInTheDocument()
  })

  it('renders only the stages the platform created — never invents one', () => {
    const evaluations = [evalFor({ stage: 'standard_1' })]

    renderWithProviders(
      <EvaluationPipelineCard member={MEMBER} evaluations={evaluations} />,
    )

    expect(screen.getByLabelText('Stage: Stage 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Stage: Stage 2')).toBeNull()
    expect(screen.queryByLabelText('Stage: Stage 3 · Node Leader')).toBeNull()
  })

  it('shows the empty copy when the member has no evaluations', () => {
    renderWithProviders(<EvaluationPipelineCard member={MEMBER} evaluations={[]} />)

    expect(
      screen.getByText(new RegExp(evaluationsCopy.pipeline.empty.title)),
    ).toBeInTheDocument()
  })
})
