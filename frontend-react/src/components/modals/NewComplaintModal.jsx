import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

const empty = { title: '', category: 'Plumbing', priority: 'Medium', description: '' }

// Student-only: the sole complaint-creation UI in the app (admin/warden only
// view/update/delete existing complaints). Backend auto-injects student/room
// from the authenticated user — the client never sends them.
export default function NewComplaintModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)

  useEffect(() => { if (open) setForm(empty) }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) { toast('Please fill all fields.', 'warning'); return }
    try {
      await api('/complaints', { method: 'POST', body: { title: form.title.trim(), description: form.description.trim(), category: form.category, priority: form.priority } })
      toast('Complaint filed successfully!', 'success')
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to file complaint.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="File New Complaint">
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Describe the issue briefly" />
        </div>
        <div className="grid-2" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option>Plumbing</option><option>Electrical</option><option>IT</option><option>Maintenance</option><option>Food</option><option>Appliances</option><option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." />
        </div>
        <button type="submit" className="btn btn-primary btn-full">Submit Complaint</button>
      </form>
    </Modal>
  )
}
