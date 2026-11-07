import { Bar } from 'react-chartjs-2'

const tickStyle = { color: '#4a5568', font: { family: 'Outfit', size: 11 } }
const gridColor = 'rgba(255,255,255,0.04)'

const toLakhs = (rs) => Math.round((rs / 100000) * 100) / 100

// Monthly Collected/Pending totals from the Fee ledger, grouped and sorted
// server-side (month names don't sort alphabetically) and handed down by the
// dashboard's single /dashboard-summary request.
export default function FeeTrendChart({ months }) {
  if (!months) return null

  const data = {
    labels: months.map((m) => m.label),
    datasets: [
      { label: 'Collected (Rs L)', data: months.map((m) => toLakhs(m.paid)), backgroundColor: 'rgba(104,211,145,0.7)', borderRadius: 8 },
      { label: 'Pending (Rs L)', data: months.map((m) => toLakhs(m.pending)), backgroundColor: 'rgba(252,129,129,0.6)', borderRadius: 8 },
    ],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, usePointStyle: true } } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: { ...tickStyle, callback: (v) => `Rs ${v}L` }, border: { display: false } },
    },
  }
  return <Bar data={data} options={options} />
}
