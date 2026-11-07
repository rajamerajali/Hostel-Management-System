import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyRow } from '../../components/ui/EmptyState'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../auth/AuthContext'
import { REQUEST_STATUS_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

const REASONS = ['Medical Reasons', 'Roommate Issues', 'Noise Disturbance', 'Closer to Department', 'Other']
const BLOCKS = ['A', 'B', 'C', 'D']

export default function StudentRoom() {
  const { user } = useAuth()
  const toast = useToast()
  const { data: requests, loading, error, reload } = useApiData('/room-change-requests/my')
  const [reason, setReason] = useState(REASONS[0])
  const [preferredBlock, setPreferredBlock] = useState(BLOCKS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const room = user?.room || 'A-101'
  const block = user?.block || 'A'

  const submit = async (e) => {
    e.preventDefault()
    if (!details.trim()) { toast('Please add details for your request.', 'warning'); return }
    setSubmitting(true)
    try {
      await api('/room-change-requests', { method: 'POST', body: { reason, preferredBlock, details: details.trim() } })
      setJustSubmitted(true)
      setDetails('')
      setTimeout(() => setJustSubmitted(false), 3000)
      reload()
    } catch {
      toast('Server se connect nahi hua. Try again.', 'error')
    }
    setSubmitting(false)
  }

  return (
    <>
      <SectionHeader title="My Room" />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div className="card-header"><div className="card-title">Room Details</div></div>
          <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} variants={staggerContainer} initial="hidden" animate="visible">
            {[['Room Number', room], ['Block', block], ['Type', 'Double'], ['Rent', 'Rs 7,000 / month']].map(([l, v]) => (
              <motion.div key={l} variants={staggerItem} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--hover)', border: '1px solid var(--divider)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div className="card-header"><div className="card-title">Request Room Change</div></div>
          <form onSubmit={submit}>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Block</label>
                <select className="form-select" value={preferredBlock} onChange={(e) => setPreferredBlock(e.target.value)}>
                  {BLOCKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Details</label>
              <textarea className="form-textarea" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explain your request..." />
            </div>
            <button
              type="submit"
              className={justSubmitted ? 'btn btn-full' : 'btn btn-primary btn-full'}
              disabled={submitting}
              style={justSubmitted ? { background: '#68d391', color: '#fff' } : undefined}
            >
              {justSubmitted ? '✓ Request Submitted' : submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">My Request History</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reason</th><th>Preferred Block</th><th>Status</th><th>Review Note</th><th>Date</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <EmptyRow colSpan={5} message="Loading..." />}
              {!loading && error && <EmptyRow colSpan={5} message="Could not load requests" tone="error" />}
              {!loading && !error && requests.length === 0 && <EmptyRow colSpan={5} message="No room change requests yet" />}
              {!loading && !error && requests.map((r) => (
                <motion.tr key={r._id} variants={listRow}>
                  <td style={{ color: 'var(--text)' }}>{r.reason}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{r.preferredBlock}</td>
                  <td><Badge label={r.status} color={REQUEST_STATUS_COLORS[r.status]} /></td>
                  <td style={{ color: 'var(--text-sec)' }}>{r.reviewNote || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </>
  )
}
