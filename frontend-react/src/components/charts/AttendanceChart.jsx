import { Bar } from 'react-chartjs-2'

const tickStyle = { color: '#4a5568', font: { family: 'Outfit', size: 11 } }
const gridColor = 'rgba(255,255,255,0.04)'

// Hostel-wide attendance for the last 7 days, bucketed server-side and handed
// down by the dashboard's single /dashboard-summary request — this used to
// download every attendance record ever written just to count seven days.
// Present/Absent/Leave stay as 3 distinct categories (an approved Leave is
// not the same signal as an unexplained Absent, so lumping them together
// would hide exactly the thing a warden/admin most wants to see).
export default function AttendanceChart({ weekly }) {
  if (!weekly) return null

  const data = {
    labels: weekly.days.map((d) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short' })),
    datasets: [
      { label: 'Present', data: weekly.counts.map((c) => c.present), backgroundColor: 'rgba(79,209,197,0.65)', borderRadius: 6 },
      { label: 'Absent', data: weekly.counts.map((c) => c.absent), backgroundColor: 'rgba(252,129,129,0.55)', borderRadius: 6 },
      { label: 'Leave', data: weekly.counts.map((c) => c.leave), backgroundColor: 'rgba(246,195,90,0.6)', borderRadius: 6 },
    ],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: { ...tickStyle, precision: 0 }, border: { display: false }, beginAtZero: true },
    },
  }
  return <Bar data={data} options={options} />
}
