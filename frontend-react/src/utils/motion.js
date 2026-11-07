// Shared Framer Motion variants — reused across chrome + feature pages so
// entrance/exit motion stays consistent as the redesign rolls out.

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// Lighter/faster variants for data-driven lists and tables that can have many
// rows (students, complaints, room tiles) — a big staggerChildren delay would
// make long lists feel sluggish to scan on load.
export const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

export const listRow = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
}

export const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const modalPanel = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const panelSlide = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } },
}
