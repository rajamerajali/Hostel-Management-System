import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import SkeletonRows from '../../components/ui/SkeletonRows'
import { EmptyRow } from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import ComplaintModal from '../../components/modals/ComplaintModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { AVATAR_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { exportToExcel, exportToPDF } from '../../utils/exportHelpers'
import { listContainer, listRow } from '../../utils/motion'

export default function Complaints() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/complaints')
  const [selected, setSelected] = useState(null)
  const { markSectionRead } = useNotifications()

  useEffect(() => { markSectionRead('complaints') }, [markSectionRead])

  const updateComplaint = async (id, status) => {
    try {
      await api(`/complaints/${id}`, { method: 'PUT', body: { status } })
      toast(`Complaint marked as ${status}`)
      reload()
    } catch {
      toast('Update failed.', 'error')
    }
  }

  const deleteComplaint = async (id) => {
    if (!confirm('Delete this complaint? This cannot be undone.')) return
    try {
      await api(`/complaints/${id}`, { method: 'DELETE' })
      toast('Complaint deleted.', 'error')
      reload()
    } catch {
      toast('Delete failed.', 'error')
    }
  }

  const exportComplaints = () => {
    if (!data.length) { toast('No complaints to export.', 'warning'); return }
    const rows = data.map((c) => ({
      ID: c._id ? c._id.slice(-5).toUpperCase() : '', Student: c.student?.name || 'Unknown', Room: c.room || '',
      Title: c.title || '', Category: c.category || '', Priority: c.priority || '', Status: c.status || '',
      Date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PK') : '',
    }))
    exportToExcel(rows, [8, 20, 10, 30, 14, 10, 14, 14], 'Complaints', `Complaints_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast('Complaints exported to Excel!', 'success')
  }

  const exportComplaintsPDF = () => {
    if (!data.length) { toast('No complaints to export.', 'warning'); return }
    const body = data.map((c) => [c._id ? c._id.slice(-5).toUpperCase() : '', c.student?.name || 'Unknown', c.room || '-', c.title || '', c.category || '', c.priority || '', c.status || ''])
    exportToPDF({
      title: 'SmartHostel ERP - Complaints Report', totalLabel: 'Total Complaints', totalCount: data.length,
      head: ['ID', 'Student', 'Room', 'Title', 'Category', 'Priority', 'Status'], body,
      filename: `Complaints_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    })
    toast('PDF report downloaded!', 'success')
  }

  return (
    <>
      <SectionHeader
        title="All Complaints"
        actions={(
          <>
            <button className="btn btn-outline-green" onClick={exportComplaints}>⬇ Excel</button>
            <button className="btn btn-outline-red" onClick={exportComplaintsPDF}>⬇ PDF</button>
          </>
        )}
      />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Student</th><th>Room</th><th>Issue</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <SkeletonRows cols={9} />}
              {!loading && error && <EmptyRow colSpan={9} message="Could not load complaints" tone="error" />}
              {!loading && !error && data.length === 0 && <EmptyRow colSpan={9} message="No complaints found" />}
              {!loading && !error && data.map((c, i) => {
                const av = c.student?.name ? c.student.name.split(' ').map((w) => w[0]).join('').toUpperCase() : 'S'
                return (
                  <motion.tr key={c._id} variants={listRow} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{c._id?.slice(-5).toUpperCase() || i + 1}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={av} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size={26} /><span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.student?.name || '—'}</span></div></td>
                    <td style={{ color: 'var(--text-sec)' }}>{c.room || '—'}</td>
                    <td style={{ color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td><Chip label={c.category} /></td>
                    <td><Badge label={c.priority} /></td>
                    <td><Badge label={c.status} /></td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(c.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-icon btn-sm btn-outline-green" title="Resolve" onClick={() => updateComplaint(c._id, 'Resolved')}>✓</button>
                        <button className="btn btn-icon btn-sm btn-outline-amber" title="In Progress" onClick={() => updateComplaint(c._id, 'In Progress')}>↻</button>
                        <button className="btn btn-icon btn-sm btn-outline-red" title="Delete" onClick={() => deleteComplaint(c._id)}>🗑</button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </table>
        </div>
      </div>

      <ComplaintModal
        open={!!selected}
        complaint={selected}
        onClose={() => setSelected(null)}
        onResolve={(id) => updateComplaint(id, 'Resolved')}
        onInProgress={(id) => updateComplaint(id, 'In Progress')}
        onDelete={deleteComplaint}
      />
    </>
  )
}
