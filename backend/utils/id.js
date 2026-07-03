// Collision-resistant id generator: `<prefix>-<timestamp>-<random>`.
// The random suffix avoids duplicate ids when several records are created
// within the same millisecond.
export function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default newId;
