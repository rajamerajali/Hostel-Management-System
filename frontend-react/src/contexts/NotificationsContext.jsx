import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const NotificationsContext = createContext(null)

const PRI_COLOR = { urgent: '#fc8181', high: '#f6c35a', normal: '#63b3ed' }
// Bumped from 25s — that was firing three background requests every 25
// seconds on every page, forever. 60s keeps badges reasonably live without
// hammering the API. refetchIntervalInBackground:false (per-query below)
// also skips polling entirely while the browser tab isn't focused.
const POLL_MS = 60000

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const notifKey = `hostel_notif_${user?.email || user?._id || 'guest'}`
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(notifKey) || '[]') } catch { return [] }
  })

  // One polled request for all three categories, already filtered to
  // pending/unresolved server-side — this used to be three requests that each
  // downloaded a whole collection just to count the pending rows in it.
  // The endpoint itself decides what a given role may see (students get
  // announcements only; they already see their own submissions in their own
  // sections), so there's no role branching in the request here.
  const { data, refetch } = useQuery({
    queryKey: ['/notifications-summary'],
    queryFn: () => api('/notifications-summary').then((r) => r.data),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  })

  const notifs = useMemo(() => {
    const items = []
    for (const a of data?.announcements || []) {
      items.push({
        id: a._id,
        title: a.title,
        body: (a.content || '').substring(0, 65) + ((a.content || '').length > 65 ? '…' : ''),
        color: PRI_COLOR[a.priority] || '#63b3ed',
        section: 'announcements',
        time: a.createdAt,
      })
    }
    for (const c of data?.complaints || []) {
      items.push({
        id: c._id,
        title: `New complaint: ${c.title}`,
        body: `${c.student?.name || 'A student'} · Room ${c.room || '—'}`,
        color: '#fc8181',
        section: 'complaints',
        time: c.createdAt,
      })
    }
    for (const rq of data?.roomRequests || []) {
      items.push({
        id: rq._id,
        title: 'Room change request',
        body: `${rq.student?.name || 'A student'} wants Block ${rq.preferredBlock}`,
        color: '#f6c35a',
        section: 'room-requests',
        time: rq.createdAt,
      })
    }
    return items
  }, [data])

  const reload = useCallback(() => { refetch() }, [refetch])

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem(notifKey, JSON.stringify(next))
      return next
    })
  }, [notifKey])

  const markAllRead = useCallback(() => {
    const all = notifs.map((n) => n.id)
    localStorage.setItem(notifKey, JSON.stringify(all))
    setReadIds(all)
  }, [notifs, notifKey])

  // Marks only one category read (e.g. visiting "Complaints" shouldn't also
  // clear the "Room Requests" badge).
  const markSectionRead = useCallback((section) => {
    setReadIds((prev) => {
      const sectionIds = notifs.filter((n) => n.section === section).map((n) => n.id)
      if (sectionIds.every((id) => prev.includes(id))) return prev
      const next = Array.from(new Set([...prev, ...sectionIds]))
      localStorage.setItem(notifKey, JSON.stringify(next))
      return next
    })
  }, [notifs, notifKey])

  const unreadCount = useMemo(
    () => notifs.filter((n) => !readIds.includes(n.id)).length,
    [notifs, readIds]
  )

  // Per-section counts, e.g. { announcements: 2, complaints: 9, 'room-requests': 1 } —
  // drives the sidebar's per-nav-item badges.
  const unreadBySection = useMemo(() => {
    const map = {}
    for (const n of notifs) {
      if (!readIds.includes(n.id)) map[n.section] = (map[n.section] || 0) + 1
    }
    return map
  }, [notifs, readIds])

  return (
    <NotificationsContext.Provider value={{ notifs, readIds, unreadCount, unreadBySection, markRead, markAllRead, markSectionRead, reload }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
