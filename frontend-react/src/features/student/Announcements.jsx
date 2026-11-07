import { useEffect } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyCard } from '../../components/ui/EmptyState'
import { useApiData } from '../../hooks/useApiData'
import { useNotifications } from '../../contexts/NotificationsContext'
import { PRI_COLORS, CAT_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { listContainer, listRow } from '../../utils/motion'

// Read-only for students — posting/editing/deleting is admin/warden-only.
export default function StudentAnnouncements() {
  const { data, loading, error } = useApiData('/announcements')
  const { markSectionRead } = useNotifications()

  useEffect(() => { markSectionRead('announcements') }, [markSectionRead])

  return (
    <>
      <SectionHeader title="Notices & Announcements" />

      {!loading && error && <EmptyCard message="Could not load announcements" tone="error" />}
      {!loading && !error && data.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No announcements yet</div>
      )}
      <motion.div variants={listContainer} initial="hidden" animate="visible">
      {!loading && !error && data.map((a) => (
        <motion.div key={a._id} variants={listRow} className="card" style={{ marginBottom: 14, padding: '20px 22px' }}>
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
        </motion.div>
      ))}
      </motion.div>
    </>
  )
}
