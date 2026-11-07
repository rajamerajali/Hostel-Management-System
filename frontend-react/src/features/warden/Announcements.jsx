import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyCard } from '../../components/ui/EmptyState'
import AnnouncementModal from '../../components/modals/AnnouncementModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { PRI_COLORS, CAT_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { listContainer, listRow } from '../../utils/motion'

// Same as admin's Announcements.jsx (identical capability for both roles).
export default function WardenAnnouncements() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/announcements')
  const [modalOpen, setModalOpen] = useState(false)
  const { markSectionRead, reload: reloadNotifs } = useNotifications()

  useEffect(() => { markSectionRead('announcements') }, [markSectionRead])

  const deleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await api(`/announcements/${id}`, { method: 'DELETE' })
      toast('Announcement deleted.', 'error')
      reload()
      reloadNotifs()
    } catch {
      toast('Delete failed.', 'error')
    }
  }

  const handleCreated = () => {
    reload()
    reloadNotifs()
  }

  return (
    <>
      <SectionHeader title="Notices & Announcements" actions={<button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New Notice</button>} />

      {!loading && error && <EmptyCard message="Could not load announcements" tone="error" />}
      {!loading && !error && data.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No announcements yet</div>
      )}
      <motion.div variants={listContainer} initial="hidden" animate="visible">
      {!loading && !error && data.map((a) => (
        <motion.div key={a._id} variants={listRow} className="card" style={{ marginBottom: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {a.pinned && <span style={{ fontSize: 10, fontWeight: 700, color: '#f6c35a' }}>📌 PINNED</span>}
                <Badge label={(a.priority || 'normal').toUpperCase()} color={PRI_COLORS[a.priority] || '#63b3ed'} />
                <Badge label={a.category || 'General'} color={CAT_COLORS[a.category] || '#63b3ed'} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{a.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>{a.content}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Posted by <span style={{ fontWeight: 600, color: 'var(--text-sec)' }}>{a.author?.name || 'Unknown'}</span>
                {a.author?.role && ` (${a.author.role})`} · {formatDate(a.createdAt)}
              </div>
            </div>
            <button
              onClick={() => deleteAnnouncement(a._id)}
              style={{ padding: 7, borderRadius: 8, background: 'rgba(252,129,129,.1)', border: '1px solid rgba(252,129,129,.3)', cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fc8181" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            </button>
          </div>
        </motion.div>
      ))}
      </motion.div>

      <AnnouncementModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </>
  )
}
