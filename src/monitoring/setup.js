const promBundle = require("express-prom-bundle");
const promClient = require("prom-client");
const logger = require("../utils/logger");

// Create a custom metric for extension interactions
const extensionInteractions = new promClient.Counter({
  name: 'extension_interactions_total',
  help: 'Total number of interactions with the extension',
  labelNames: ['action_type']
});

// Create a custom metric for API response times
const apiResponseTime = new promClient.Histogram({
  name: 'api_response_time_seconds',
  help: 'Response time of API calls in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to collect default metrics
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project_name: 'chrome_extension_backend' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 1000
    }
  }
});

// Function to log and increment extension interactions
const logInteraction = (actionType) => {
  extensionInteractions.inc({ action_type: actionType });
  logger.info(`Extension interaction: ${actionType}`);
};

// Function to measure and record API response time
const measureApiResponseTime = (endpoint, startTime) => {
  const responseTime = (Date.now() - startTime) / 1000;
  apiResponseTime.observe({ endpoint }, responseTime);
};

module.exports = {
  metricsMiddleware,
  logInteraction,
  measureApiResponseTime
};
