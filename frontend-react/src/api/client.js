// Clean-room port of frontend/js/app.js's api() helper. Independent of the
// old static site — no shared runtime.
import { queryClient } from './queryClient'

// VITE_API_BASE is set per-environment in Vercel's project dashboard (no
// code change needed once the real backend URL is known); falls back to the
// local backend for `npm run dev`, or the known-good production backend if
// a deployment somehow ships without VITE_API_BASE set.
const API_BASE = import.meta.env.VITE_API_BASE
  || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5000/api' : 'https://smart-hostel-erp.vercel.app/api')

export async function api(path, options = {}) {
  const token = localStorage.getItem('hostel_token')
  const method = options.method || 'GET'
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')

  // The dashboard reads from one aggregated endpoint rather than the same
  // per-resource endpoints the feature pages use, so a page refetching its
  // own list after a write (allocating a room, resolving a complaint, taking
  // a fee payment...) would otherwise leave the dashboard showing stale
  // numbers. Marking it stale here — one place, instead of every mutation
  // site — means it refetches the next time the dashboard is opened.
  if (method !== 'GET') {
    queryClient.invalidateQueries({ queryKey: ['/dashboard-summary'] })
  }
  return data
}
