const app = require('./app');
const config = require('../config');
const logger = require('./utils/logger');
const redisClient = require('./redis/redisClient');

const PORT = config.port;

app.listen(PORT, () => {
    redisClient.connect();
    logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});