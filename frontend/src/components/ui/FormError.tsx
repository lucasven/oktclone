export function FormError({ message }: Readonly<{ message?: string }>) {
  if (message === undefined) {
    return null
  }
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  )
}
