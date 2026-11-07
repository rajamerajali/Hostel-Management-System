import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

const emptyForm = { number: '', block: 'A', floor: '1', type: 'Double', capacity: '2', rent: '7000' }

export default function RoomModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
  }, [open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async () => {
    const number = form.number.trim()
    if (!number || !form.floor) { toast('Please fill room number and floor.', 'warning'); return }

    try {
      await api('/rooms', {
        method: 'POST',
        body: {
          number, block: form.block, floor: Number(form.floor), type: form.type,
          capacity: Number(form.capacity), rent: Number(form.rent),
        },
      })
      toast(`Room ${number} added successfully!`, 'success')
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to add room.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Room">
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group"><label className="form-label">Room Number *</label><input className="form-input" value={form.number} onChange={set('number')} placeholder="e.g. A-105" /></div>
        <div className="form-group">
          <label className="form-label">Block *</label>
          <select className="form-select" value={form.block} onChange={set('block')}>
            <option value="A">Block A</option><option value="B">Block B</option><option value="C">Block C</option><option value="D">Block D</option>
          </select>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group"><label className="form-label">Floor *</label><input className="form-input" type="number" min="1" value={form.floor} onChange={set('floor')} /></div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={set('type')}>
            <option value="Single">Single</option><option value="Double">Double</option><option value="Triple">Triple</option>
          </select>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group"><label className="form-label">Capacity</label><input className="form-input" type="number" min="1" value={form.capacity} onChange={set('capacity')} /></div>
        <div className="form-group"><label className="form-label">Rent (Rs/month)</label><input className="form-input" type="number" min="0" value={form.rent} onChange={set('rent')} /></div>
      </div>
      <button className="btn btn-primary btn-full" onClick={submit}>Add Room</button>
    </Modal>
  )
}
