const ACTIVITY_FACTOR = 1.2

export function computeTdee(user) {
  if (!user?.weight || !user?.height || !user?.age) return null
  const w = Number(user.weight)
  const h = Number(user.height)
  const a = Number(user.age)
  if (Number.isNaN(w) || Number.isNaN(h) || Number.isNaN(a)) return null

  const isFemale = String(user.gender || '').toUpperCase() === 'F'
  const bmr = isFemale
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5

  return Math.round(Math.max(0, bmr * ACTIVITY_FACTOR) * 10) / 10
}
