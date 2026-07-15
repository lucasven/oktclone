interface TextFieldProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function TextField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
}: Readonly<TextFieldProps>) {
  const inputId = `field-${name}`
  const errorId = `${inputId}-error`
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="field-input"
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
      />
      {error === undefined ? null : (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
