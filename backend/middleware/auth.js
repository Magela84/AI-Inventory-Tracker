// Optional API-key auth.
//
// When the API_KEY env var is set, every guarded request must send a matching
// `x-api-key` header. When API_KEY is unset (e.g. local mock/dev), auth is
// disabled so the app runs friction-free.
export function apiKeyAuth(req, res, next) {
  const required = process.env.API_KEY;
  if (!required) return next(); // auth disabled

  const provided = req.get('x-api-key');
  if (provided && provided === required) return next();

  return res.status(401).json({ error: { status: 401, message: 'Unauthorized' } });
}

export default apiKeyAuth;
