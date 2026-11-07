import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyRow } from '../../components/ui/EmptyState'
import FeeModal from '../../components/modals/FeeModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { exportToExcel } from '../../utils/exportHelpers'
import { formatCurrency, formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

export default function Fees() {
  const toast = useToast()
  const { data: fees, loading, error, reload } = useApiData('/fees')
  const [modalOpen, setModalOpen] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

  const collected = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  const pending = fees.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0)

  const markPaid = async (id) => {
    try {
      await api(`/fees/${id}/pay`, { method: 'PUT', body: {} })
      toast('Fee marked as paid!', 'success')
      reload()
    } catch (err) {
      toast(err.message || 'Failed to mark as paid.', 'error')
    }
  }

  // Same job the daily Vercel Cron runs on its own (see backend/vercel.json)
  // — one email per student covering everything of theirs due within 3 days
  // or already overdue, so this button is really just "run today's round
  // right now" rather than a separate notification path.
  const sendReminders = async () => {
    setSendingReminders(true)
    try {
      const res = await api('/fees/send-reminders', { method: 'POST' })
      const { studentsEmailed, studentsFailed, feesReminded } = res.data
      if (feesReminded === 0) toast('No bills are due soon — nothing to remind.', 'warning')
      else toast(`Reminder emails sent to ${studentsEmailed} student${studentsEmailed === 1 ? '' : 's'}.` + (studentsFailed ? ` (${studentsFailed} failed — check server logs.)` : ''), studentsFailed ? 'warning' : 'success')
    } catch (err) {
      toast(err.message || 'Failed to send reminders.', 'error')
    }
    setSendingReminders(false)
  }

  const exportFees = () => {
    if (!fees.length) { toast('No fee records to export.', 'warning'); return }
    const rows = fees.map((f) => ({
      Student: f.student?.name || '', 'Roll No': f.student?.rollNo || '', Month: f.month, Year: f.year,
      Type: f.type, Amount: f.amount, Status: f.status, 'Due Date': f.dueDate ? formatDate(f.dueDate) : '',
    }))
    exportToExcel(rows, [22, 12, 12, 8, 14, 12, 12, 14], 'Fees', `Fees_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast('Fees exported to Excel!', 'success')
  }

  return (
    <>
      <SectionHeader
        title="Fee Management"
        actions={(
          <>
            <button className="btn btn-outline-green" onClick={exportFees}>⬇ Export Excel</button>
            <button className="btn btn-outline-amber" onClick={sendReminders} disabled={sendingReminders}>{sendingReminders ? 'Sending...' : '✉ Send Due Reminders'}</button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Create Fee Bill</button>
          </>
        )}
      />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }} variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: 'Total Collected', val: formatCurrency(collected), color: '#68d391' },
          { label: 'Total Pending', val: formatCurrency(pending), color: '#fc8181' },
          { label: 'Total Bills', val: fees.length, color: '#63b3ed' },
        ].map((s) => (
          <motion.div key={s.label} className="card" variants={staggerItem} style={{ padding: 18, borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">Fee Records</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Month</th><th>Type</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <EmptyRow colSpan={7} message="Loading..." />}
              {!loading && error && <EmptyRow colSpan={7} message="Could not load fee records" tone="error" />}
              {!loading && !error && fees.length === 0 && <EmptyRow colSpan={7} message="No fee bills yet — click + Create Fee Bill to add one" />}
              {!loading && !error && fees.map((f) => (
                <motion.tr key={f._id} variants={listRow}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{f.student?.name || 'Unknown'}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{f.month} {f.year}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{f.type}</td>
                  <td style={{ color: 'var(--text)' }}>{formatCurrency(f.amount)}</td>
                  <td><Badge label={f.status === 'pending' ? 'due' : f.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{f.dueDate ? formatDate(f.dueDate) : '—'}</td>
                  <td>
                    {f.status !== 'paid' && (
                      <button className="btn btn-sm btn-outline-green" onClick={() => markPaid(f._id)}>✓ Mark Paid</button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <FeeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />
    </>
  )
}
