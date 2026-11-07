// Consolidates the color-lookup maps that were scattered across app.js and
// admin.html's inline script into one module used by every component.

export const STATUS_COLORS = {
  paid: '#68d391', due: '#fc8181', partial: '#f6c35a',
  resolved: '#68d391', 'in progress': '#63b3ed', pending: '#f6c35a', escalated: '#fc8181',
  critical: '#fc8181', high: '#f6c35a', medium: '#63b3ed', low: '#94a3b8',
  available: '#68d391', occupied: '#63b3ed', maintenance: '#f6c35a',
  completed: '#68d391', inside: '#4fd1c5', denied: '#fc8181',
  normal: '#63b3ed', urgent: '#fc8181',
}

export function statusColor(s) {
  return STATUS_COLORS[s?.toLowerCase()] || '#94a3b8'
}

export const AVATAR_COLORS = ['#4299e1', '#ed64a6', '#48bb78', '#9f7aea', '#f6ad55', '#fc8181', '#4fd1c5', '#76e4f7']

// Gradient partner used for stat-card top accent bars.
export const GRAD = {
  '#60a5fa': '#818cf8', '#22d3ee': '#60a5fa', '#4ade80': '#22d3ee',
  '#fbbf24': '#f87171', '#a78bfa': '#f472b6', '#f472b6': '#a78bfa',
}

export const PRI_COLORS = { urgent: '#fc8181', high: '#f6c35a', normal: '#63b3ed' }
export const CAT_COLORS = { Event: '#b794f4', Finance: '#68d391', Mess: '#4fd1c5', Rules: '#f6c35a', General: '#63b3ed' }
export const ROOM_STATUS_COLORS = { available: '#68d391', occupied: '#63b3ed', maintenance: '#f6c35a' }
export const REQUEST_STATUS_COLORS = { approved: '#68d391', rejected: '#fc8181', pending: '#f6c35a' }
