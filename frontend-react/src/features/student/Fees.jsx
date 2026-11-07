import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyRow } from '../../components/ui/EmptyState'
import { useApiData } from '../../hooks/useApiData'
import { useToast } from '../../contexts/ToastContext'
import { generateFeeReceipt } from '../../utils/exportHelpers'
import { formatCurrency, formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

export default function StudentFees() {
  const toast = useToast()
  const { data: fees, loading, error } = useApiData('/fees')

  const totalPaid = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  const pending = fees.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0)
  const nextDue = fees
    .filter((f) => f.status !== 'paid' && f.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]

  const downloadReceipt = (fee) => {
    if (fee.status !== 'paid') { toast('Receipt is only available for paid fees.', 'warning'); return }
    generateFeeReceipt(fee, fee.student)
  }

  return (
    <>
      <SectionHeader title="Fee Details" />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #68d391' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Total Paid</div><div style={{ fontSize: 20, fontWeight: 800, color: '#68d391' }}>{formatCurrency(totalPaid)}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #f6c35a' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Pending</div><div style={{ fontSize: 20, fontWeight: 800, color: '#f6c35a' }}>{formatCurrency(pending)}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #63b3ed' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Next Due</div><div style={{ fontSize: 20, fontWeight: 800, color: '#63b3ed' }}>{nextDue ? formatDate(nextDue.dueDate) : '—'}</div></motion.div>
      </motion.div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">Fee History</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Type</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Receipt</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <EmptyRow colSpan={6} message="Loading..." />}
              {!loading && error && <EmptyRow colSpan={6} message="Could not load fee records" tone="error" />}
              {!loading && !error && fees.length === 0 && <EmptyRow colSpan={6} message="No fee bills yet" />}
              {!loading && !error && fees.map((f) => (
                <motion.tr key={f._id} variants={listRow}>
                  <td style={{ color: 'var(--text)', fontWeight: 600 }}>{f.month} {f.year}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{f.type}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{formatCurrency(f.amount)}</td>
                  <td><Badge label={f.status === 'pending' ? 'due' : f.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{f.dueDate ? formatDate(f.dueDate) : '—'}</td>
                  <td>
                    {f.status === 'paid'
                      ? <button className="btn btn-sm btn-outline-blue" onClick={() => downloadReceipt(f)}>⬇ Download</button>
                      : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </>
  )
}
