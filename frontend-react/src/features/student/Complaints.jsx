import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import { EmptyRow } from '../../components/ui/EmptyState'
import NewComplaintModal from '../../components/modals/NewComplaintModal'
import { useApiData } from '../../hooks/useApiData'
import { formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

// GET /complaints — the backend already scopes this to the logged-in
// student's own records (complaintsRouter filters by req.user when
// role==='student'), same endpoint admin/warden use unfiltered.
export default function StudentComplaints() {
  const { data, loading, error, reload } = useApiData('/complaints')
  const [modalOpen, setModalOpen] = useState(false)

  const counts = {
    total: data.length,
    pending: data.filter((c) => c.status === 'Pending').length,
    inProgress: data.filter((c) => c.status === 'In Progress').length,
    resolved: data.filter((c) => c.status === 'Resolved').length,
  }

  return (
    <>
      <SectionHeader title="My Complaints" actions={<button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New Complaint</button>} />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }} variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: 'Total', val: counts.total, color: '#63b3ed' },
          { label: 'Pending', val: counts.pending, color: '#f6c35a' },
          { label: 'In Progress', val: counts.inProgress, color: '#63b3ed' },
          { label: 'Resolved', val: counts.resolved, color: '#68d391' },
        ].map((s) => (
          <motion.div key={s.label} className="card" variants={staggerItem} style={{ padding: 18, borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <EmptyRow colSpan={5} message="Loading..." />}
              {!loading && error && <EmptyRow colSpan={5} message="Could not load complaints" tone="error" />}
              {!loading && !error && data.length === 0 && <EmptyRow colSpan={5} message="No complaints yet — click + New Complaint to file one" />}
              {!loading && !error && data.map((c) => (
                <motion.tr key={c._id} variants={listRow}>
                  <td style={{ color: 'var(--text)', fontWeight: 600 }}>{c.title}</td>
                  <td><Chip label={c.category} /></td>
                  <td><Badge label={c.priority} /></td>
                  <td><Badge label={c.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <NewComplaintModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />
    </>
  )
}
