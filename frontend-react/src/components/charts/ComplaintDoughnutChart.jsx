import { Doughnut } from 'react-chartjs-2'

const cpLabels = ['Resolved', 'In Progress', 'Pending', 'Escalated']
const cpColors = ['#68d391', '#63b3ed', '#f6c35a', '#fc8181']

// Real counts, computed by the caller from the same complaints list already
// fetched for the "Recent Complaints" table — no separate API call needed.
export default function ComplaintDoughnutChart({ counts }) {
  const cpValues = cpLabels.map((l) => counts?.[l] || 0)
  const data = { labels: cpLabels, datasets: [{ data: cpValues, backgroundColor: cpColors.map((c) => c + 'cc'), borderColor: 'transparent', hoverOffset: 4 }] }
  const options = { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } } }

  return (
    <>
      <div style={{ height: 180, position: 'relative' }}>
        <Doughnut data={data} options={options} />
      </div>
      <div style={{ marginTop: 12 }}>
        {cpLabels.map((l, i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: cpColors[i] }} />
              <span style={{ fontSize: 11, color: 'var(--text-sec)' }}>{l}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{cpValues[i]}</span>
          </div>
        ))}
      </div>
    </>
  )
}
