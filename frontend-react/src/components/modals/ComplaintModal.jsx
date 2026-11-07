import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { formatDate } from '../../utils/format'

// Read-only complaint detail + Resolve/In-Progress/Delete actions.
// Uses the shared Badge color-lookup for priority (fixes the old page's bug
// where this modal always showed a blue priority badge regardless of the
// complaint's actual Low/Medium/High/Critical priority).
export default function ComplaintModal({ open, complaint, onClose, onResolve, onInProgress, onDelete }) {
  // See ProfileModal.jsx for why this caches the last non-null value.
  const [cached, setCached] = useState(complaint)
  if (complaint && complaint !== cached) setCached(complaint)
  const c = cached
  if (!c) return null
  const av = (c.student?.name || 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Modal open={open} onClose={onClose} title="Complaint Details" maxWidth={520}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--divider)' }}>
        <Avatar initials={av} color="#f687b3" size={44} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{c.student?.name || 'Unknown'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2 }}>{c.student?.rollNo || ''} · Room: {c.room || 'Not Assigned'}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ marginBottom: 4 }}><Badge label={c.status} /></div>
          <Badge label={c.priority} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Issue Title</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{c.title}</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Full Description</div>
        <div style={{ padding: 14, borderRadius: 10, background: 'var(--hover)', border: '1px solid var(--divider)', fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.7 }}>
          {c.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 10, borderRadius: 10, background: 'var(--hover)', border: '1px solid var(--divider)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Category</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.category || '—'}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: 'var(--hover)', border: '1px solid var(--divider)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Date Filed</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{formatDate(c.createdAt)}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: 'var(--hover)', border: '1px solid var(--divider)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Resolved At</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.resolvedAt ? formatDate(c.resolvedAt) : '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outline-green btn-sm" style={{ flex: 1 }} onClick={() => { onResolve(c._id); onClose() }}>✓ Mark Resolved</button>
        <button className="btn btn-outline-amber btn-sm" style={{ flex: 1 }} onClick={() => { onInProgress(c._id); onClose() }}>↻ In Progress</button>
        <button className="btn btn-outline-red btn-sm" onClick={() => { onDelete(c._id); onClose() }}>🗑</button>
      </div>
    </Modal>
  )
}
