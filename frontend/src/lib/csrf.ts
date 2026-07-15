export function getCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1))
    }
  }
  return null
}

export function csrfHeader(): Record<string, string> {
  const token = getCookie('csrftoken')
  return token === null ? {} : { 'X-CSRFToken': token }
}
