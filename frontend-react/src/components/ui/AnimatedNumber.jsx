import { useEffect, useState } from 'react'

// Port of the old animateCounters(): 900ms cubic-ease-out count-up from 0 to value.
export default function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (typeof value !== 'number') return
    let raf
    const duration = 900
    const start = performance.now()
    function step(now) {
      // requestAnimationFrame reports the timestamp of the frame it belongs
      // to, which can predate the performance.now() captured above when the
      // effect runs during that same frame. Without the lower clamp that
      // makes `progress` negative, the ease-out curve flips past 1, and the
      // card briefly renders a negative count (e.g. "-61" for a value of 163).
      const progress = Math.min(Math.max((now - start) / duration, 0), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return typeof value === 'number' ? display.toLocaleString() : value
}
