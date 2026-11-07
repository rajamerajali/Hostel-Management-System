import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import { formatDate, formatTime } from '../../utils/format'

// Read-only visitor detail + Approve (check-in) / Deny actions. Warden-only
// feature, no admin equivalent to port from.
export default function VisitorModal({ open, visitor, onClose, onApprove, onDeny }) {
  // See ProfileModal.jsx for why this caches the last non-null value.
  const [cached, setCached] = useState(visitor)
  if (visitor && visitor !== cached) setCached(visitor)
  const v = cached
  if (!v) return null
  return (
    <Modal open={open} onClose={onClose} title="Visitor Details" maxWidth={440}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{v.name || v.student?.name || 'Visitor'}</div>
        <div style={{ marginTop: 8 }}><Badge label={v.status} /></div>
      </div>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {[
          ['Purpose', v.purpose || '—'],
          ['Visiting Student', v.student?.name || '—'],
          ['Room', v.room || '—'],
          ['Entry Time', v.entryTime ? formatTime(v.entryTime) : '—'],
          ['Exit Time', v.exitTime ? formatTime(v.exitTime) : '—'],
          ['Date', formatDate(v.createdAt)],
        ].map(([l, val], i, arr) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{val}</span>
          </div>
        ))}
      </div>
      {v.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline-green" style={{ flex: 1 }} onClick={() => { onApprove(v._id); onClose() }}>✓ Approve & Check In</button>
          <button className="btn btn-outline-red" style={{ flex: 1 }} onClick={() => { onDeny(v._id); onClose() }}>✗ Deny</button>
        </div>
      )}
    </Modal>
  )
}
