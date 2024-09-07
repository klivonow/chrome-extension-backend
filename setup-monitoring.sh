#!/bin/bash

# Install dependencies
npm install prom-client express-prom-bundle winston

# Create a new directory for monitoring
mkdir -p src/monitoring

# Create the monitoring setup file
cat << EOF > src/monitoring/setup.js
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
  logger.info(\`Extension interaction: \${actionType}\`);
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
EOF

# Update app.js to include monitoring
sed -i '1i const { metricsMiddleware } = require("./monitoring/setup");' src/app.js
sed -i '/app.use(morgan/i app.use(metricsMiddleware);' src/app.js

# Add a metrics endpoint
echo "
// Metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  promClient.register.metrics().then(data => res.send(data));
});" >> src/app.js


# Create a docker-compose file for Prometheus and Grafana
cat << EOF > docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - 9090:9090
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana
    ports:
      - 3000:3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secret
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
EOF

# Create a Prometheus configuration file
cat << EOF > prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nodejs'
    static_configs:
      - targets: ['host.docker.internal:3000']
EOF

echo "Monitoring infrastructure setup complete!"
EOF