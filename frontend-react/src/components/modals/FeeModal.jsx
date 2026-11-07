import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()
const AMOUNT_DEFAULTS = { Semester: '45000', Mess: '6000', Maintenance: '1500', 'Late Fine': '500' }

const emptyForm = { mode: 'all', student: '', month: CURRENT_MONTH, year: String(CURRENT_YEAR), type: 'Semester', amount: AMOUNT_DEFAULTS.Semester, dueDate: '' }

// Admin/warden create a real fee bill — either one general challan billed
// to every student at once (POST /fees/bulk, the default: this is the
// routine case — a semester or mess charge that applies hostel-wide, which
// used to mean repeating this modal once per student), or a bill for just
// one student (POST /fees, still here for one-off charges like a single
// late fine).
export default function FeeModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(emptyForm)
    setLoadingStudents(true)
    api('/users?role=student')
      .then((r) => setStudents(r.data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false))
  }, [open])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value, ...(key === 'type' ? { amount: AMOUNT_DEFAULTS[value] || f.amount } : {}) }))
  }
  const setMode = (mode) => setForm((f) => ({ ...f, mode }))

  const submit = async () => {
    if (form.mode === 'specific' && !form.student) { toast('Please select a student.', 'warning'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast('Please enter a valid amount.', 'warning'); return }
    setSubmitting(true)
    try {
      const body = {
        month: form.month, year: Number(form.year), type: form.type, amount: Number(form.amount),
        ...(form.dueDate ? { dueDate: form.dueDate } : {}),
      }
      if (form.mode === 'all') {
        const res = await api('/fees/bulk', { method: 'POST', body })
        const { billedCount, skippedCount } = res.data
        toast(
          `Fee bill created for ${billedCount} student${billedCount === 1 ? '' : 's'}!`
          + (skippedCount ? ` (${skippedCount} already billed for this month, skipped)` : ''),
          'success'
        )
      } else {
        await api('/fees', { method: 'POST', body: { ...body, student: form.student } })
        toast('Fee bill created!', 'success')
      }
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to create fee bill.', 'error')
    }
    setSubmitting(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Fee Bill">
      <div className="form-group">
        <label className="form-label">Bill</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={`btn btn-sm ${form.mode === 'all' ? 'btn-primary' : 'btn-outline-blue'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('all')}>All Students</button>
          <button type="button" className={`btn btn-sm ${form.mode === 'specific' ? 'btn-primary' : 'btn-outline-blue'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('specific')}>Specific Student</button>
        </div>
      </div>
      {form.mode === 'all' ? (
        <div className="form-group" style={{ fontSize: 12, color: 'var(--text-sec)' }}>
          {loadingStudents ? 'Loading students...' : `Will bill all ${students.length} current student${students.length === 1 ? '' : 's'}. Anyone already billed for the same month + type is skipped automatically.`}
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Student *</label>
          <select className="form-select" value={form.student} onChange={set('student')} disabled={loadingStudents}>
            <option value="">{loadingStudents ? 'Loading students...' : 'Select a student'}</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>{s.name}{s.rollNo ? ` (${s.rollNo})` : ''}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Month</label>
          <select className="form-select" value={form.month} onChange={set('month')}>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Year</label><input className="form-input" type="number" value={form.year} onChange={set('year')} /></div>
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={set('type')}>
            <option value="Semester">Semester</option>
            <option value="Mess">Mess</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Late Fine">Late Fine</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Amount (Rs) *</label><input className="form-input" type="number" min="0" value={form.amount} onChange={set('amount')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting}>
        {submitting ? 'Creating...' : form.mode === 'all' ? 'Bill All Students' : 'Create Bill'}
      </button>
    </Modal>
  )
}
