'use client'

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

type Surface = 'dark' | 'light'

/**
 * `dark` = on maroon/navy (register, blog submit). `light` = on paper.
 * Both use hard edges and a mono uppercase label, per the brand rules.
 *
 * Border weights are set for WCAG 2.1 SC 1.4.11: the boundary identifying an
 * input must reach 3:1 against its background. `border-input` is the token
 * tuned for that; V1's `eng-navy/20` and `hero-ink/25` were far below it.
 * Placeholders are likewise not decorative — they carry the only hint of what
 * the field wants — so they sit above the 4.5:1 text threshold.
 */
function controlClasses(surface: Surface, readOnly?: boolean) {
  return cn(
    'w-full bg-transparent rounded-none px-4 py-3',
    'font-sans text-[0.9375rem] outline-none transition-colors duration-150',
    'aria-[invalid=true]:border-destructive',
    surface === 'light'
      ? 'border border-input text-eng-navy placeholder:text-ink-muted focus:border-eng-navy'
      : 'border border-hero-ink/55 text-hero-ink placeholder:text-hero-ink/65 focus:border-hero-ink',
    readOnly && 'opacity-50 cursor-default select-none',
  )
}

interface FieldWrapperProps {
  label: string
  id: string
  error?: string
  required?: boolean
  surface?: Surface
  children: ReactNode
}

export function FieldWrapper({
  label,
  id,
  error,
  required,
  surface = 'dark',
  children,
}: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={cn(
          'font-mono text-[0.72rem] tracking-[0.08em] uppercase',
          surface === 'light' ? 'text-eng-navy/50' : 'text-hero-ink/60',
        )}
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className={cn(
              'ml-1',
              surface === 'light' ? 'text-argc-maroon' : 'text-argc-maroon-lt',
            )}
          >
            *
          </span>
        )}
      </label>

      {children}

      {/* The id must exist for the control's aria-describedby to resolve.
          V1 pointed at `${id}-error` but never rendered the id. */}
      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          className="font-mono text-[0.7rem] tracking-[0.04em] text-destructive"
        >
          {error}
        </span>
      )}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  surface?: Surface
}

export const Field = forwardRef<HTMLInputElement, InputProps>(function Field(
  { label, error, id, required, surface = 'dark', readOnly, ...rest },
  ref,
) {
  // useId avoids the collisions V1's label-slug approach produced when two
  // fields on a page shared a label.
  const generated = useId()
  const fieldId = id ?? generated

  return (
    <FieldWrapper
      label={label}
      id={fieldId}
      error={error}
      required={required}
      surface={surface}
    >
      <input
        ref={ref}
        id={fieldId}
        required={required}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={controlClasses(surface, readOnly)}
        {...rest}
      />
    </FieldWrapper>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
  surface?: Surface
}

export const FieldArea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function FieldArea({ label, error, id, required, surface = 'dark', ...rest }, ref) {
    const generated = useId()
    const fieldId = id ?? generated

    return (
      <FieldWrapper
        label={label}
        id={fieldId}
        error={error}
        required={required}
        surface={surface}
      >
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(controlClasses(surface), 'resize-none min-h-[120px]')}
          {...rest}
        />
      </FieldWrapper>
    )
  },
)
