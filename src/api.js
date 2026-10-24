const BASE = (import.meta.env.VITE_API_URL || 'https://startup-evaluation-backend.onrender.com').replace(/\/+$/, '')

let auth = sessionStorage.getItem('auth') || ''

export const setAuth = (username, password) => {
  auth = username ? `Basic ${btoa(`${username}:${password}`)}` : ''
  if (auth) sessionStorage.setItem('auth', auth)
  else sessionStorage.removeItem('auth')
}

export const hasAuth = () => Boolean(auth)

async function request(path, options = {}) {
  const headers = {
    ...(auth ? { Authorization: auth } : {}),
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }
  let response
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error(`Cannot reach the backend at ${BASE}. Start the Spring Boot backend and check VITE_API_URL.`)
  }

  if (!response.ok) {
    let message = response.statusText || `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body.message || body.error || body.detail || message
    } catch {
      try { const bodyText = await response.text(); if (bodyText) message = bodyText } catch {}
    }
    if (response.status === 401) message = 'Sign-in failed. Check your username and password.'
    if (response.status === 403) message = 'This account does not have permission to perform that action.'
    if (response.status === 404) message = `Backend route not found: ${path}`
    throw new Error(message)
  }
  return response
}

const json = async (path, options) => {
  const response = await request(path, options)
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const body = await response.text()
    if (!body) return null
    try { return JSON.parse(body) } catch { return { message: body } }
  }
  return response.json()
}

const isMissingRoute = (error) => /route not found|404/i.test(error?.message || '')

async function firstWorkingJson(paths, options) {
  let lastError
  for (let i = 0; i < paths.length; i++) {
    try { return await json(paths[i], options) }
    catch (error) {
      lastError = error
      if (!isMissingRoute(error) || i === paths.length - 1) throw error
    }
  }
  throw lastError || new Error('No backend route was available.')
}

const blobDownload = async (path, filename) => {
  const response = await request(path)
  const blob = await response.blob()
  if (!blob.size) throw new Error('The server returned an empty report.')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function firstWorkingDownload(routes, filename) {
  let lastError
  for (let i = 0; i < routes.length; i++) {
    try { return await blobDownload(routes[i], filename) }
    catch (error) {
      lastError = error
      if (!isMissingRoute(error) || i === routes.length - 1) throw error
    }
  }
  throw lastError || new Error('No report route was available.')
}

export const api = {
  me: () => firstWorkingJson(['/api/auth/me', '/api/me']),
  health: () => json('/api/health'),
  steps: () => json('/api/steps'),
  startups: () => json('/api/startups'),
  createStartup: (startup) => json('/api/startups', { method: 'POST', body: JSON.stringify(startup) }),

  evaluation: (startupId) => {
    if (!startupId) return Promise.reject(new Error('No startup ID was provided.'))
    return firstWorkingJson([
      `/api/evaluations/${encodeURIComponent(startupId)}`,
      `/api/evaluation?startupId=${encodeURIComponent(startupId)}`,
      '/api/evaluation',
    ])
  },
  scorecard: (startupId) => firstWorkingJson([
    `/api/scorecard/${encodeURIComponent(startupId)}`,
    `/api/scorecard?startupId=${encodeURIComponent(startupId)}`,
    '/api/scorecard',
  ]),
  save: (evaluationId, stepNumber, answers) => firstWorkingJson([
    `/api/assessments/${encodeURIComponent(evaluationId)}/steps/${encodeURIComponent(stepNumber)}/autosave`,
    `/api/evaluation/steps/${encodeURIComponent(stepNumber)}`,
  ], { method: 'PUT', body: JSON.stringify(answers) }),
  complete: (evaluationId, stepNumber) => firstWorkingJson([
    `/api/assessments/${encodeURIComponent(evaluationId)}/steps/${encodeURIComponent(stepNumber)}/complete`,
    `/api/evaluation/steps/${encodeURIComponent(stepNumber)}/skip`,
  ], { method: 'POST', body: JSON.stringify({}) }),
  progress: (evaluationId) => firstWorkingJson([
    `/api/assessments/${encodeURIComponent(evaluationId)}/progress`,
    `/api/evaluation?progress=true`,
  ]),

  improve: (text) => json('/api/ai/improve', { method: 'POST', body: JSON.stringify({ text }) }),
  
mentor: (stepNumber, stepTitle = '') => json('/api/ai/improve', {
  method: 'POST',
  body: JSON.stringify({
    text: `Act as a practical startup mentor. Give concise, actionable guidance for assessment step ${stepNumber}${stepTitle ? ` (${stepTitle})` : ''}. Explain what a strong answer should cover and one common mistake to avoid. Do not invent facts about the startup.`
  }),
}),

  
finalEvaluation: (startupId) => json(
  `/api/ai/evaluation/${encodeURIComponent(startupId)}`
),

  pitch: (startupId, data = {}) => firstWorkingJson([
    `/api/ai/pitch/${encodeURIComponent(startupId)}`,
    '/api/ai/pitch',
  ], { method: 'POST', body: JSON.stringify(data) }),

  
upload: async (file, startupId, field = '', stepNumber = 1) => {
  if (!file) throw new Error('Choose a file first.')
  if (!startupId) throw new Error('A startup must be selected before uploading evidence.')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('step', String(stepNumber))
  formData.append('field', field)

  return json(
    `/api/evidence/${encodeURIComponent(startupId)}`,
    {
      method: 'POST',
      body: formData,
    }
  )
},

  evidence: (startupId) => firstWorkingJson([
    `/api/evidence/${encodeURIComponent(startupId)}`,
    `/api/uploads?startupId=${encodeURIComponent(startupId)}`,
    '/api/uploads',
  ]),
  download: async (id, name) => firstWorkingDownload([`/api/uploads/${encodeURIComponent(id)}`], name),
  report: async (startupId, type, format = 'pdf') => firstWorkingDownload([
    `/api/reports/${encodeURIComponent(startupId)}/${encodeURIComponent(type)}?format=${encodeURIComponent(format)}`,
    `/api/reports/${encodeURIComponent(type)}?format=${encodeURIComponent(format)}&startupId=${encodeURIComponent(startupId)}`,
  ], `${type}.${format}`),
}
