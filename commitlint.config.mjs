/**
 * Conventional Commits, restricted to the types AGENTS.md defines.
 *
 * AGENTS.md documents the convention; this is what enforces it. Without a
 * commit-msg hook the rule is a suggestion.
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'ci',
        'revert',
      ],
    ],
    // AGENTS.md: imperative mood, under 72 chars, no trailing period.
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    // Bodies carry the reasoning; do not cap them at the header width.
    'body-max-line-length': [0],
  },
}

export default config
