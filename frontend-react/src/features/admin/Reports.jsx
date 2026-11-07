import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import SectionHeader from '../../components/ui/SectionHeader'
import CategoryBarChart from '../../components/charts/CategoryBarChart'
import FeeStatusDoughnutChart from '../../components/charts/FeeStatusDoughnutChart'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

function computeReport(students, complaints, requests) {
  const feePaid = students.filter((s) => s.feeStatus === 'paid').length
  const feePartial = students.filter((s) => s.feeStatus === 'partial').length
  const feeDue = students.filter((s) => s.feeStatus === 'due' || !s.feeStatus).length
  const recovery = students.length ? Math.round((feePaid / students.length) * 100) : 0

  const resolved = complaints.filter((c) => c.status === 'Resolved').length
  const resRate = complaints.length ? Math.round((resolved / complaints.length) * 100) : 0
  const pendingReq = requests.filter((r) => r.status === 'pending').length

  const catCount = {}
  complaints.forEach((c) => { const k = c.category || 'Other'; catCount[k] = (catCount[k] || 0) + 1 })

  return { students, complaints, requests, feePaid, feePartial, feeDue, recovery, resolved, resRate, pendingReq, catCount }
}

function buildInsights(d) {
  const insights = []
  if (d.students.length) {
    insights.push(d.recovery >= 70
      ? `Fee recovery is healthy at ${d.recovery}% — ${d.feePaid} of ${d.students.length} students have cleared dues.`
      : `Fee recovery is low at ${d.recovery}%. ${d.feeDue} students still have pending dues — consider sending reminders.`)
  }
  if (d.complaints.length) {
    insights.push(d.resRate >= 60
      ? `Complaint resolution is strong — ${d.resRate}% of ${d.complaints.length} complaints resolved.`
      : `Only ${d.resRate}% of complaints resolved. ${d.complaints.length - d.resolved} still open — needs attention.`)
    const topCat = Object.entries(d.catCount).sort((a, b) => b[1] - a[1])[0]
    if (topCat) insights.push(`Most complaints fall under "${topCat[0]}" (${topCat[1]} cases) — a recurring problem area.`)
  }
  if (d.pendingReq > 0) insights.push(`${d.pendingReq} room change request${d.pendingReq > 1 ? 's are' : ' is'} awaiting review.`)
  if (!insights.length) insights.push('Not enough data yet to generate insights. Add students and complaints to see analytics.')
  return insights
}

export default function Reports() {
  const toast = useToast()

  // Query keys match the plain path strings used elsewhere (e.g. admin
  // Students.jsx's '/users?role=student', admin Complaints.jsx's
  // '/complaints'), so this shares its cache with those pages instead of
  // double-fetching. Each query resolves to [] on failure (matching the old
  // fetchSafe behavior) so one bad endpoint doesn't block the other two.
  const studentsQuery = useQuery({ queryKey: ['/users?role=student'], queryFn: () => api('/users?role=student').then((r) => r.data || []).catch(() => []) })
  const complaintsQuery = useQuery({ queryKey: ['/complaints'], queryFn: () => api('/complaints').then((r) => r.data || []).catch(() => []) })
  const requestsQuery = useQuery({ queryKey: ['/room-change-requests'], queryFn: () => api('/room-change-requests').then((r) => r.data || []).catch(() => []) })

  const loading = studentsQuery.isLoading || complaintsQuery.isLoading || requestsQuery.isLoading
  const reportData = loading ? null : computeReport(studentsQuery.data || [], complaintsQuery.data || [], requestsQuery.data || [])

  const downloadFullReport = () => {
    if (!reportData) { toast('Open Reports first.', 'warning'); return }
    const d = reportData
    const doc = new jsPDF()

    doc.setFontSize(20); doc.setTextColor(40)
    doc.text('SmartHostel ERP', 14, 18)
    doc.setFontSize(13); doc.setTextColor(90)
    doc.text('Analytics Report', 14, 26)
    doc.setFontSize(10); doc.setTextColor(120)
    doc.text('Generated: ' + new Date().toLocaleString('en-PK'), 14, 33)

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Students', String(d.students.length)],
        ['Fees Paid', String(d.feePaid)],
        ['Fees Partial', String(d.feePartial)],
        ['Fees Due', String(d.feeDue)],
        ['Fee Recovery Rate', d.recovery + '%'],
        ['Total Complaints', String(d.complaints.length)],
        ['Resolved Complaints', String(d.resolved)],
        ['Resolution Rate', d.resRate + '%'],
        ['Pending Room Requests', String(d.pendingReq)],
      ],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [127, 156, 245], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      margin: { left: 14, right: 14 },
    })

    doc.save('Analytics_Report_' + new Date().toISOString().slice(0, 10) + '.pdf')
    toast('Full report downloaded!', 'success')
  }

  const kpis = reportData ? [
    { label: 'Fee Recovery Rate', val: reportData.recovery + '%', color: '#68d391' },
    { label: 'Total Complaints', val: reportData.complaints.length, color: '#63b3ed' },
    { label: 'Resolution Rate', val: reportData.resRate + '%', color: '#4fd1c5' },
    { label: 'Pending Requests', val: reportData.pendingReq, color: '#f6c35a' },
  ] : []

  return (
    <>
      <SectionHeader title="Reports & Analytics" actions={<button className="btn btn-outline-red" onClick={downloadFullReport}>⬇ Download Full Report (PDF)</button>} />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }} variants={staggerContainer} initial="hidden" animate="visible">
        {kpis.map((k) => (
          <motion.div key={k.label} className="card" variants={staggerItem} style={{ padding: 18, borderTop: `2px solid ${k.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="grid-2" style={{ marginBottom: 16 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card accent-top-amber" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Complaints by Category</div></div>
            <div style={{ height: 240, position: 'relative' }}>
              {reportData && <CategoryBarChart catCount={reportData.catCount} />}
            </div>
          </div>
        </motion.div>
        <motion.div className="card accent-top-green" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Fee Status Breakdown</div></div>
            <div style={{ height: 240, position: 'relative' }}>
              {reportData && <FeeStatusDoughnutChart feePaid={reportData.feePaid} feePartial={reportData.feePartial} feeDue={reportData.feeDue} />}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div className="card-title">💡 Smart Insights</div>
            <span className="badge" style={{ background: '#7f9cf522', color: '#7f9cf5' }}>Auto-generated</span>
          </div>
        </div>
        <motion.div style={{ padding: '8px 20px 16px' }} variants={listContainer} initial="hidden" animate="visible">
          {reportData && buildInsights(reportData).map((t, i) => (
            <motion.div key={i} variants={listRow} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ color: '#7f9cf5', flexShrink: 0, fontSize: 14 }}>▸</div>
              <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5 }}>{t}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  )
}
