const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {

    constructor(
        port = 6379,
        host = 'localhost',
        options = {}
    ) {
        this.client = null;
        this.port = port;
        this.host = host;
        this.options = options
    }
    async connect() {
        try {
            this.client = redis.createClient({
                url: `redis://${this.host}:${this.port}`,
                ...this.options
            });
            this.client.on('error', (err) => {
                logger.error('Redis Client Error', err);
            });
            this.client.on('ready', () => {
                logger.info('Redis Client is ready')
            });
            await this.client.connect();
            await this.client.ping();
            logger.info('Successfully connected to redis');
        } catch (error) {
            logger.error('Failed to connect to Redis', error);
            throw error;
        }
    }

}
const redisClient = new RedisClient();
module.exports = redisClient;