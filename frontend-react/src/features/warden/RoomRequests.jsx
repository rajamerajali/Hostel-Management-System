import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { REQUEST_STATUS_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { listContainer, listRow } from '../../utils/motion'

function RequestCard({ r, showActions, onReview }) {
  const [note, setNote] = useState('')
  const sc = REQUEST_STATUS_COLORS[r.status] || '#f6c35a'
  const initials = (r.student?.name || 'S').split(' ').map((w) => w[0]).slice(0, 2).join('')

  return (
    <motion.div variants={listRow} style={{ padding: 18, borderRadius: 12, background: 'var(--hover)', border: '1px solid var(--divider)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f687b333', border: '1.5px solid #f687b355', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f687b3', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.student?.name || 'Unknown'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.student?.rollNo || ''} · {r.student?.room || ''} · {r.student?.phone || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Badge label={r.status} color={sc} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(r.createdAt)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Current Room</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{r.currentRoom}</div>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Wants Block</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>{r.preferredBlock}</div>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Reason</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{r.reason}</div>
        </div>
      </div>

      {r.details && (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--divider)', marginBottom: 12, fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.5, fontStyle: 'italic' }}>
          "{r.details}"
        </div>
      )}
      {r.reviewNote && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: `${sc}12`, border: `1px solid ${sc}33`, marginBottom: 12, fontSize: 11, color: sc }}>
          📝 {r.reviewNote}
        </div>
      )}

      {showActions ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Add review note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--input-bdr)', color: 'var(--text)', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none' }}
          />
          <button onClick={() => onReview(r._id, 'approved', note)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #68d39140', background: '#68d39120', color: '#68d391', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' }}>✓ Approve</button>
          <button onClick={() => onReview(r._id, 'rejected', note)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fc818140', background: '#fc818120', color: '#fc8181', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' }}>✗ Reject</button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reviewed by {r.reviewedBy?.name || 'Warden'} on {formatDate(r.reviewedAt)}</div>
      )}
    </motion.div>
  )
}

export default function WardenRoomRequests() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/room-change-requests')
  const { markSectionRead } = useNotifications()

  useEffect(() => { markSectionRead('room-requests') }, [markSectionRead])

  const pending = data.filter((r) => r.status === 'pending')
  const reviewed = data.filter((r) => r.status !== 'pending')

  const reviewRoomChange = async (id, status, note) => {
    try {
      await api(`/room-change-requests/${id}`, { method: 'PUT', body: { status, reviewNote: note || '' } })
      toast(status === 'approved' ? '✓ Request approved!' : '✗ Request rejected.', status === 'approved' ? 'success' : 'error')
      reload()
    } catch {
      toast('Failed to update.', 'error')
    }
  }

  return (
    <>
      <SectionHeader
        title="Room Change Requests"
        actions={(
          <span className="badge" style={{ background: pending.length > 0 ? '#f6c35a22' : '#68d39122', color: pending.length > 0 ? '#f6c35a' : '#68d391', fontSize: 12, padding: '4px 12px' }}>
            {loading ? 'Loading...' : pending.length > 0 ? `${pending.length} Pending` : 'All Reviewed'}
          </span>
        )}
      />

      {loading && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading...</div>}
      {!loading && error && <div style={{ textAlign: 'center', padding: 20, color: 'var(--red)' }}>Could not load requests.</div>}
      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>No room change requests</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Students can submit requests from their dashboard</div>
        </div>
      )}

      {!loading && !error && pending.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>⏳ Pending ({pending.length})</div>
          <motion.div variants={listContainer} initial="hidden" animate="visible">
            {pending.map((r) => <RequestCard key={r._id} r={r} showActions onReview={reviewRoomChange} />)}
          </motion.div>
        </>
      )}
      {!loading && !error && reviewed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', margin: '20px 0 12px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Earlier Requests</div>
          <motion.div variants={listContainer} initial="hidden" animate="visible">
            {reviewed.map((r) => <RequestCard key={r._id} r={r} showActions={false} onReview={reviewRoomChange} />)}
          </motion.div>
        </>
      )}
    </>
  )
}
