import { useState } from 'react'
import Modal from '../ui/Modal'

// Read-only student profile — renders from the already-fetched student row, no API call.
export default function ProfileModal({ open, onClose, student }) {
  // Cache the last non-null student so the modal keeps its content while
  // Modal.jsx plays its close animation (the caller nulls `student` and flips
  // `open` to false in the same tick, which would otherwise blank the modal
  // mid-animation).
  const [cached, setCached] = useState(student)
  if (student && student !== cached) setCached(student)
  const u = cached
  if (!u) return null
  const feeColor = u.feeStatus === 'paid' ? '#68d391' : u.feeStatus === 'partial' ? '#f6c35a' : '#fc8181'
  const att = Number(u.attendance) || 0
  const attColor = att >= 75 ? '#4fd1c5' : '#f6c35a'
  const init = (u.name || 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const rows = [
    ['Roll No', u.rollNo || '—'],
    ['Email', u.email || '—'],
    ['Phone', u.phone || '—'],
    ['Room', u.room || 'Not Assigned'],
    ['Block', u.block || '—'],
    ['Branch', u.branch || '—'],
    ['Year', u.year ? `Year ${u.year}` : '—'],
  ]

  return (
    <Modal open={open} onClose={onClose} title="Student Profile" maxWidth={520}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: '#7f9cf533', border: '1.5px solid #7f9cf555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#7f9cf5', flexShrink: 0 }}>{init}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{u.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2 }}>{u.branch || 'Student'} {u.year ? `· Year ${u.year}` : ''}</div>
          <span className="badge" style={{ background: '#f687b322', color: '#f687b3', marginTop: 6, display: 'inline-block' }}>Student</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div style={{ padding: 14, borderRadius: 12, background: `${feeColor}12`, border: `1px solid ${feeColor}33` }}>
          <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Fee Status</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: feeColor, textTransform: 'capitalize' }}>{u.feeStatus || 'due'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, background: `${attColor}12`, border: `1px solid ${attColor}33` }}>
          <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Attendance</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: attColor }}>{att}%</div>
        </div>
      </div>

      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map(([l, v], i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
