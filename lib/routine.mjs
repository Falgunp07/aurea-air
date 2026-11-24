// Match explicit clock statements only. Ambiguous or repeated times need
// clarification, so the standard plan leaves those routines conditional.
const clockTime = /(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*[ap]m\b|(?:[01]\d|2[0-3]):[0-5]\d\b/i
const pickupTime = new RegExp(
  String.raw`\bpick[ -]?up\s+(?:is\s+)?(?:fixed\s+)?(?:at\s+)?(${clockTime.source})`,
  'gi',
)
const closingTime = new RegExp(
  String.raw`\b(?:shop|store|market)\s+closes\s+(?:at\s+)?(${clockTime.source})`,
  'gi',
)

function statedMinutes(routine, expression) {
  const matches = Array.from((routine ?? '').matchAll(expression))
  if (matches.length !== 1) return null
  const clausePrefix = routine
    .slice(0, matches[0].index)
    .split(/[.,;!?]/)
    .at(-1)
  if (/\b(?:no|not|cancelled|canceled)\s+(?:(?:a|the|school)\s+)*$/i.test(clausePrefix)) return null
  if (/^\s+(?:or|instead of)\s+\d/i.test(routine.slice(matches[0].index + matches[0][0].length)))
    return null
  const [hours, minutes = '0', period] = matches[0][1]
    .match(/^(\d{1,2})(?::(\d\d))?\s*([ap]m)?$/i)
    .slice(1)
  const hour = period
    ? (Number(hours) % 12) + (period.toLowerCase() === 'pm' ? 12 : 0)
    : Number(hours)
  return hour * 60 + Number(minutes)
}

export function closingMinutes(routine) {
  return statedMinutes(routine, closingTime)
}

export function pickupMinutes(routine) {
  return statedMinutes(routine, pickupTime)
}
