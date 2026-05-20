'use client'

import { useEffect, useState, type CSSProperties, type InputHTMLAttributes } from 'react'

// Numeric input that allows the field to be empty while you're editing.
// Standard `<input type="number">` snaps back to the parent value the instant
// onChange fires with an empty string + `|| 0` fallback — so you can't delete
// the existing 0 to type a new number.
//
// This component keeps a local string draft so you can clear/edit freely.
// Parent only sees fully-typed numbers; on blur, an empty/invalid field
// commits as 0 (or whatever `emptyValue` you pass).

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (n: number) => void
  emptyValue?: number      // value committed on blur if the field is left empty (default 0)
  selectOnFocus?: boolean  // default true
  style?: CSSProperties
}

export function NumberInput({
  value,
  onChange,
  emptyValue = 0,
  selectOnFocus = true,
  onBlur,
  onFocus,
  inputMode = 'decimal',
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string>(() => formatNumber(value))

  // If the parent value changes externally (e.g. after a server save), sync the
  // draft — but only if the user isn't mid-edit on a value that already parses
  // to the new number.
  useEffect(() => {
    const parsed = parseFloat(draft)
    if (parsed !== value && !(Number.isNaN(parsed) && Number.isNaN(value))) {
      setDraft(formatNumber(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode}
      value={draft}
      onChange={(e) => {
        const v = e.target.value
        setDraft(v)
        if (v === '' || v === '-' || v === '.') return
        const n = parseFloat(v)
        if (Number.isFinite(n)) onChange(n)
      }}
      onBlur={(e) => {
        const n = parseFloat(draft)
        if (!Number.isFinite(n)) {
          setDraft(formatNumber(emptyValue))
          onChange(emptyValue)
        } else if (draft !== formatNumber(n)) {
          // Normalize the displayed value (e.g. "1.50" -> "1.5", "01" -> "1")
          setDraft(formatNumber(n))
        }
        onBlur?.(e)
      }}
      onFocus={(e) => {
        if (selectOnFocus) e.currentTarget.select()
        onFocus?.(e)
      }}
    />
  )
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  return String(n)
}
