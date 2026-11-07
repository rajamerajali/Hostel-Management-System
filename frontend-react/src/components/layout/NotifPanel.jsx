import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../ui/Icon'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useAuth } from '../../auth/AuthContext'
import { formatDate } from '../../utils/format'
import { panelSlide } from '../../utils/motion'

export default function NotifPanel({ open, onClose }) {
  const { notifs, readIds, unreadCount, markRead, markAllRead } = useNotifications()
  const { user } = useAuth()
  const navigate = useNavigate()

  const unread = notifs.filter((n) => !readIds.includes(n.id))
  const read = notifs.filter((n) => readIds.includes(n.id))

  const handleClick = (n) => {
    markRead(n.id)
    onClose()
    navigate(`/${user.role}/${n.section}`)
  }

  return (
    <AnimatePresence>
      {open && (
    <motion.div id="notif-panel" variants={panelSlide} initial="hidden" animate="visible" exit="exit">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#fc818122', color: '#fc8181' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unreadCount > 0 && (
            <span onClick={markAllRead} style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
          )}
          <div style={{ cursor: 'pointer' }} onClick={onClose}><Icon name="x" size={16} color="var(--text-sec)" /></div>
        </div>
      </div>

      {unread.length === 0 && read.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notifications</div>
        </div>
      )}

      {unread.length > 0 && (
        <>
          <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.5px', textTransform: 'uppercase' }}>New</div>
          {unread.map((n) => (
            <div key={n.id} className="notif-item" onClick={() => handleClick(n)} style={{ background: `${n.color}08`, borderLeft: `2px solid ${n.color}` }}>
              <div className="notif-dot-item" style={{ background: n.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-sec)' }}>{n.body}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tap to view →</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.time ? formatDate(n.time) : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {read.length > 0 && (
        <>
          <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.5px', textTransform: 'uppercase' }}>Earlier</div>
          {read.map((n) => (
            <div key={n.id} className="notif-item" onClick={() => handleClick(n)} style={{ opacity: 0.6 }}>
              <div className="notif-dot-item" style={{ background: 'var(--divider)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-sec)' }}>{n.body}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>✓ Read</div>
            </div>
          ))}
        </>
      )}
    </motion.div>
      )}
    </AnimatePresence>
  )
}
