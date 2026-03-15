// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const logLevels = {
  ERROR: { icon: '❌', color: colors.red },
  WARN: { icon: '⚠️', color: colors.yellow },
  INFO: { icon: 'ℹ️', color: colors.blue },
  SUCCESS: { icon: '✅', color: colors.green },
  DEBUG: { icon: '🐛', color: colors.magenta },
  REQUEST: { icon: '📨', color: colors.cyan },
  RESPONSE: { icon: '📤', color: colors.green },
  DATABASE: { icon: '🗄️', color: colors.cyan },
};

const timestamp = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const logger = {
  error: (message, data = null) => {
    const level = logLevels.ERROR;
    console.error(
      `${level.color}${level.icon} [${timestamp()}] ERROR: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  warn: (message, data = null) => {
    const level = logLevels.WARN;
    console.warn(
      `${level.color}${level.icon} [${timestamp()}] WARN: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  info: (message, data = null) => {
    const level = logLevels.INFO;
    console.log(
      `${level.color}${level.icon} [${timestamp()}] INFO: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  success: (message, data = null) => {
    const level = logLevels.SUCCESS;
    console.log(
      `${level.color}${level.icon} [${timestamp()}] SUCCESS: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  debug: (message, data = null) => {
    const level = logLevels.DEBUG;
    console.debug(
      `${level.color}${level.icon} [${timestamp()}] DEBUG: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  request: (method, path, headers = null) => {
    const level = logLevels.REQUEST;
    console.log(
      `${level.color}${level.icon} [${timestamp()}] ${method} ${path}${colors.reset}`
    );
    if (headers) {
      console.log(`  Headers:`, headers);
    }
  },

  response: (method, path, status, time = null) => {
    let statusColor = colors.green;
    if (status >= 400 && status < 500) {
      statusColor = colors.yellow;
    } else if (status >= 500) {
      statusColor = colors.red;
    }
    const level = logLevels.RESPONSE;
    const timeStr = time ? ` (${time}ms)` : '';
    console.log(
      `${level.color}${level.icon} [${timestamp()}] ${method} ${path} ${statusColor}[${status}]${colors.reset}${timeStr}`
    );
  },

  database: (message, data = null) => {
    const level = logLevels.DATABASE;
    console.log(
      `${level.color}${level.icon} [${timestamp()}] DB: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  separator: (label = '') => {
    console.log(`\n${colors.dim}${'='.repeat(60)}${label ? ' ' + label + ' ' : ''}${colors.reset}\n`);
  },

  table: (data) => {
    console.table(data);
  },
};

module.exports = logger;
