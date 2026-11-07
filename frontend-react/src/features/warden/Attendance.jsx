import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Avatar from '../../components/ui/Avatar'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AVATAR_COLORS } from '../../utils/colors'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

const STATUS_COLOR = { present: '#68d391', absent: '#fc8181', leave: '#f6c35a' }
const TODAY = new Date().toISOString().slice(0, 10)

export default function Attendance() {
  const toast = useToast()
  const { data: students, loading: sLoading } = useApiData('/users?role=student')
  const [marks, setMarks] = useState({})
  const [loadingMarks, setLoadingMarks] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill with whatever's already marked for today, so revisiting this
  // page doesn't reset anyone already marked.
  useEffect(() => {
    api(`/attendance?date=${TODAY}`)
      .then((r) => {
        const existing = {}
        for (const rec of r.data || []) existing[rec.student?._id || rec.student] = rec.status
        setMarks(existing)
      })
      .catch(() => {})
      .finally(() => setLoadingMarks(false))
  }, [])

  const mark = (id, status) => setMarks((m) => ({ ...m, [id]: status }))
  const markAllPresent = () => setMarks(Object.fromEntries(students.map((s) => [s._id, 'present'])))

  const counts = students.reduce(
    (acc, s) => { const st = marks[s._id]; if (st) acc[st] = (acc[st] || 0) + 1; return acc },
    { present: 0, absent: 0, leave: 0 }
  )

  const submit = async () => {
    if (Object.keys(marks).length < students.length) {
      toast('Please mark attendance for all students.', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const records = students.map((s) => ({ student: s._id, date: TODAY, status: marks[s._id] }))
      await api('/attendance/bulk', { method: 'POST', body: { records } })
      toast('Attendance saved successfully!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save attendance.', 'error')
    }
    setSubmitting(false)
  }

  const loading = sLoading || loadingMarks

  return (
    <>
      <SectionHeader title={`Mark Attendance — ${TODAY}`} actions={<button className="btn btn-outline-blue" onClick={markAllPresent}>Mark All Present</button>} />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #68d391' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Present</div><div style={{ fontSize: 22, fontWeight: 800, color: '#68d391' }}>{counts.present}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #fc8181' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Absent</div><div style={{ fontSize: 22, fontWeight: 800, color: '#fc8181' }}>{counts.absent}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #f6c35a' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Leave</div><div style={{ fontSize: 22, fontWeight: 800, color: '#f6c35a' }}>{counts.leave}</div></motion.div>
      </motion.div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Room</th><th>Status</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading students...</td></tr>}
              {!loading && students.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No students found</td></tr>}
              {!loading && students.map((s, i) => (
                <motion.tr key={s._id} variants={listRow}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={(s.name || 'S')[0]} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size={28} /><span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</span></div></td>
                  <td style={{ color: 'var(--text-sec)' }}>{s.room || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['present', 'absent', 'leave'].map((st) => (
                        <button
                          key={st}
                          onClick={() => mark(s._id, st)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                            border: `1px solid ${marks[s._id] === st ? STATUS_COLOR[st] : 'var(--divider)'}`,
                            background: marks[s._id] === st ? `${STATUS_COLOR[st]}22` : 'transparent',
                            color: marks[s._id] === st ? STATUS_COLOR[st] : 'var(--text-sec)',
                          }}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={submit} disabled={submitting || loading}>
        {submitting ? 'Saving...' : 'Submit Attendance'}
      </button>
    </>
  )
}
