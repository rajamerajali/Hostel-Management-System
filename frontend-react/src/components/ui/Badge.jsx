import { statusColor } from '../../utils/colors'

// Single correct color-lookup used everywhere a status/priority pill is shown.
// (Fixes the old ComplaintModal bug where priority was colored from the wrong
// vocabulary map and was always blue.)
export default function Badge({ label, color }) {
  const c = color || statusColor(label)
  return (
    <span className="badge" style={{ background: `${c}22`, color: c }}>
      {label}
    </span>
  )
}
