const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const requestToken = token ?? localStorage.getItem('token')
  const headers = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (requestToken) {
    headers.Authorization = `Bearer ${requestToken}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new Error('Unable to connect to the server. Please try again.')
  }

  const responseText = await response.text()
  let data = null
  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 && requestToken) {
      window.dispatchEvent(new Event('ssms:unauthorized'))
    }

    throw new ApiError(
      typeof data?.message === 'string' ? data.message : `Request failed (${response.status}).`,
      response.status,
    )
  }

  return data
}
