// Structured JSON logger — one line per event so log aggregators (Vercel,
// CloudWatch, Loki, ...) can parse them without regex. Never log secrets,
// tokens, passwords or raw request bodies here.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const configured = process.env.LOG_LEVEL && LEVELS[process.env.LOG_LEVEL];
const threshold = configured ? LEVELS[process.env.LOG_LEVEL] : LEVELS.info;

function emit(level, message, context) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...(context && typeof context === 'object' ? context : {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (message, context) => emit('debug', message, context),
  info: (message, context) => emit('info', message, context),
  warn: (message, context) => emit('warn', message, context),
  error: (message, context) => emit('error', message, context),
};
