import { Doughnut } from 'react-chartjs-2'

// Reports widget — one of only two charts on the whole page wired to live data.
export default function FeeStatusDoughnutChart({ feePaid, feePartial, feeDue }) {
  const data = {
    labels: ['Paid', 'Partial', 'Due'],
    datasets: [{ data: [feePaid, feePartial, feeDue], backgroundColor: ['#68d391cc', '#f6c35acc', '#fc8181cc'], borderColor: 'transparent', hoverOffset: 4 }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 }, usePointStyle: true, padding: 14 } } },
  }
  return <Doughnut data={data} options={options} />
}
