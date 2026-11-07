import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import SkeletonRows from '../../components/ui/SkeletonRows'
import { EmptyRow, EmptyCard } from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import VisitorModal from '../../components/modals/VisitorModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { formatDate } from '../../utils/format'
import { listContainer, listRow } from '../../utils/motion'

// Warden-exclusive feature — no admin equivalent existed to port from, so
// empty/error states are built deliberately with the shared EmptyState
// primitives rather than inherited "for free" from an existing component.
export default function Visitors() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/visitors')
  const [selected, setSelected] = useState(null)

  const pending = data.filter((v) => v.status === 'pending')

  const updateVisitor = async (id, status) => {
    try {
      await api(`/visitors/${id}`, { method: 'PUT', body: { status } })
      toast(status === 'inside' ? '✓ Visitor checked in!' : status === 'completed' ? '✓ Visitor checked out!' : 'Visitor denied.', status === 'denied' ? 'error' : 'success')
      reload()
    } catch {
      toast('Update failed.', 'error')
    }
  }

  return (
    <>
      <SectionHeader title="Visitor Management" />

      {!loading && !error && pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}>
            <div className="card-title">Pending Approval ({pending.length})</div>
          </div>
          <motion.div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }} variants={listContainer} initial="hidden" animate="visible">
            {pending.map((v) => (
              <motion.div key={v._id} variants={listRow} style={{ padding: 14, borderRadius: 10, background: 'var(--hover)', border: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar initials={(v.name || v.student?.name || 'V')[0]} color="#63b3ed" size={28} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v.name || v.student?.name || 'Visitor'}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{v.purpose} · Room {v.room || '—'}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline-green" style={{ flex: 1 }} onClick={() => updateVisitor(v._id, 'inside')}>✓ Approve</button>
                  <button className="btn btn-sm btn-outline-red" style={{ flex: 1 }} onClick={() => updateVisitor(v._id, 'denied')}>✗ Deny</button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">All Visitors</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Purpose</th><th>Room</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <SkeletonRows cols={6} />}
              {!loading && error && <EmptyRow colSpan={6} message="Could not load visitors" tone="error" />}
              {!loading && !error && data.length === 0 && <EmptyRow colSpan={6} message="No visitors yet" />}
              {!loading && !error && data.map((v) => (
                <motion.tr key={v._id} variants={listRow} onClick={() => setSelected(v)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={(v.name || v.student?.name || 'V')[0]} color="#63b3ed" size={26} /><span style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name || v.student?.name || 'Visitor'}</span></div></td>
                  <td style={{ color: 'var(--text-sec)' }}>{v.purpose}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{v.room || '—'}</td>
                  <td><Badge label={v.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(v.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {v.status === 'inside' && <button className="btn btn-sm btn-outline-blue" onClick={() => updateVisitor(v._id, 'completed')}>Check Out</button>}
                    {v.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-icon btn-sm btn-outline-green" title="Approve" onClick={() => updateVisitor(v._id, 'inside')}>✓</button>
                        <button className="btn btn-icon btn-sm btn-outline-red" title="Deny" onClick={() => updateVisitor(v._id, 'denied')}>✗</button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <VisitorModal
        open={!!selected}
        visitor={selected}
        onClose={() => setSelected(null)}
        onApprove={(id) => updateVisitor(id, 'inside')}
        onDeny={(id) => updateVisitor(id, 'denied')}
      />
    </>
  )
}
