import { Bar } from 'react-chartjs-2'

const tickStyle = { color: '#4a5568', font: { family: 'Outfit', size: 11 } }
const STATUS_COLOR = { present: 'rgba(79,209,197,0.75)', absent: 'rgba(252,129,129,0.7)', leave: 'rgba(246,195,90,0.7)' }
const STATUS_LABEL = { present: 'Present', absent: 'Absent', leave: 'Leave' }

function lastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

// Real last-7-days chart — one bar per day, colored by that day's actual
// status (a day only ever has one status, so this reads as a proper
// present/absent/leave calendar strip instead of 3 mostly-empty bars).
export default function StudentAttendanceChart({ records }) {
  const days = lastNDays(7)
  const byDate = Object.fromEntries((records || []).map((r) => [r.date, r.status]))
  const labels = days.map((d) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short' }))
  const values = days.map((d) => (byDate[d] ? 1 : 0))
  const colors = days.map((d) => STATUS_COLOR[byDate[d]] || 'rgba(255,255,255,0.06)')

  const data = {
    labels,
    datasets: [{ data: values, backgroundColor: colors, borderRadius: 6 }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => STATUS_LABEL[byDate[days[ctx.dataIndex]]] || 'No record' } },
    },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { display: false, min: 0, max: 1 },
    },
  }
  return <Bar data={data} options={options} />
}
