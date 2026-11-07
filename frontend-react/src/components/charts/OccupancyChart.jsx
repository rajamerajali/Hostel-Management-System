import { Bar } from 'react-chartjs-2'

const tickStyle = { color: '#4a5568', font: { family: 'Outfit', size: 11 } }
const gridColor = 'rgba(255,255,255,0.04)'

// Current occupancy per block, aggregated server-side and handed down by the
// dashboard (which fetches everything in one /dashboard-summary request) —
// this used to pull the entire room collection itself just to derive these
// eight numbers in the browser.
export default function OccupancyChart({ byBlock }) {
  if (!byBlock) return null

  const data = {
    labels: byBlock.map((b) => `Block ${b.block}`),
    datasets: [
      { label: 'Occupied', data: byBlock.map((b) => b.occupied), backgroundColor: '#63b3ed', borderRadius: 4 },
      { label: 'Available', data: byBlock.map((b) => b.available), backgroundColor: '#68d391', borderRadius: 4 },
    ],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, usePointStyle: true } } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: { ...tickStyle, precision: 0 }, border: { display: false }, beginAtZero: true },
    },
  }
  return <Bar data={data} options={options} />
}
