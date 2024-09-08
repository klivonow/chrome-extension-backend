const { metricsMiddleware } = require("./monitoring/setup");
const promClient = require("prom-client");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const youTubeRoutes = require('./routes/youtubeRoutes');
const instagramRoutes = require('./routes/instagramRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
// app.use(metricsMiddleware);
app.use(morgan('combined', { stream: logger.stream }));

// health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Mic check. All systems narmal'
    })
});

// Metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    promClient.register.metrics().then(data => res.send(data));
});

// Routes
app.use('/api/v1/youtube', youTubeRoutes);
app.use('/api/v1/instagram', instagramRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;