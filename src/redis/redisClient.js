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
        this.options = options;
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
    async disconnect() {
        try {
            await this.client.quit();
            logger.info('Redis client disconnected');
        } catch (error) {
            logger.error('Failed to disconnect Redis', error);
            throw error;
        }
    }
    async set(key, value, expirationInSeconds = null) {
        try {
            const serlizedValue = JSON.stringify(value);
            if (expirationInSeconds) {
                await this.client.setEx(key, expirationInSeconds, serlizedValue);

            } else {
                await this.client.set(key, serlizedValue);

            }
            logger.info(`Successfully set key: ${key}`);
        } catch (error) {
            logger.error(`Error setting data in Redis for key: ${key}`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            const deserialisedValue = await this.client.get(key);
            return value ? JSON.parse(value) : null;

        } catch (error) {
            logger.error(`Error getting the data from Redis for key: ${key}`, error);
            throw error;
        }
    }

    async delete(key) {
        try {
            await this.client.del(key);
            logger.info(`Successfully deleted key: ${key}`);

        } catch (error) {
            logger.error(`Error in deleting the key: ${key}`, error);
            throw error;
        }
    }

    async exists(key) {
        try {
            return await this.client.exists(key);

        } catch (error) {
            logger.err(`Error checking the existence of Redis for key: ${key}`, error);
            throw error;
        }
    }

    async ping() {
        try {
            const response = await this.client.ping();
            logger.info('Redis Ping Response:', response);
            return response;
        } catch (error) {
            logger.error('Error pinging Redis:', error);
            throw error;
        }
    }
}
const redisClient = new RedisClient();
module.exports = redisClient;