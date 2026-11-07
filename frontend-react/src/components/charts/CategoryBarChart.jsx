import { Bar } from 'react-chartjs-2'

const tickStyle = { color: '#4a5568', font: { family: 'Outfit', size: 11 } }
const palette = ['#63b3ed', '#f6c35a', '#fc8181', '#b794f4', '#4fd1c5', '#68d391', '#f687b3']

// Reports widget — one of only two charts on the whole page wired to live data.
export default function CategoryBarChart({ catCount }) {
  const labels = Object.keys(catCount)
  const values = Object.values(catCount)
  const data = {
    labels: labels.length ? labels : ['No data'],
    datasets: [{ data: values.length ? values : [0], backgroundColor: labels.map((_, i) => palette[i % palette.length] + 'cc'), borderRadius: 8 }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { ...tickStyle, precision: 0 }, border: { display: false } },
    },
  }
  return <Bar data={data} options={options} />
}
