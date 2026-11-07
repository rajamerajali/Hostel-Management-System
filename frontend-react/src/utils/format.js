export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

export function formatCurrency(n) {
  return 'Rs ' + Number(n).toLocaleString('en-PK')
}

export function initials(name) {
  return name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U'
}

export function timeAgo(d) {
  if (!d) return ''
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
