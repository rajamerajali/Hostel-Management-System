import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

const empty = { title: '', category: 'Event', priority: 'normal', content: '', pinned: false }

export default function AnnouncementModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)

  useEffect(() => { if (open) setForm(empty) }, [open])

  const submit = async () => {
    const title = form.title.trim()
    const content = form.content.trim()
    if (!title || !content) { toast('Please fill all fields.', 'warning'); return }
    try {
      await api('/announcements', { method: 'POST', body: { title, content, category: form.category, priority: form.priority, pinned: form.pinned } })
      toast('Announcement posted!')
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to post.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Post New Announcement">
      <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Announcement title" /></div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            <option>Event</option><option>Finance</option><option>Mess</option><option>Rules</option><option>General</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Write announcement..." /></div>
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" id="ann-pinned" style={{ width: 16, height: 16, cursor: 'pointer' }} checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
        <label htmlFor="ann-pinned" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Pin this announcement</label>
      </div>
      <button className="btn btn-primary btn-full" onClick={submit}>Post Announcement</button>
    </Modal>
  )
}
