// src/services/twitterService.js
const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');

class TwitterService {
    constructor() {
        this.twitterClient = axios.create({
            baseURL: config.twitterServerUrl,
            headers: {
                'x-rapidapi-key': config.rapidApiKey,
                'x-rapidapi-host': config.twitterHost
            }
        });
    }

    async getTwitterUserDetails(username) {
        try {
            const response = await this.twitterClient.get('/user', {
                params: { username: username }
            });

            if (!response.data || !response.data.result || !response.data.result.data || !response.data.result.data.user) {
                logger.warn(`No user data found for username: ${username}`);
                return { message: `No user found for username ${username}` };
            }

            return response.data.result.data.user.result;
        } catch (error) {
            logger.error(`Error in TwitterService.getTwitterUserDetails: ${error.message}`);
            throw error;
        }
    }

    async getUserTweets(userId, count = 20) {
        try {
            const response = await this.twitterClient.get('/user-tweets', {
                params: { user: userId, count: count }
            });

            if (!response.data || !response.data.result) {
                logger.warn(`No tweets found for user ID: ${userId}`);
                return { message: `No tweets found for user ID ${userId}` };
            }

            return response.data.result;
        } catch (error) {
            logger.error(`Error in TwitterService.getUserTweets: ${error.message}`);
            throw error;
        }
    }

    async getUserDetailsWithTweets(username, tweetCount = 20) {
        try {
            const userDetails = await this.getTwitterUserDetails(username);

            if (!userDetails.rest_id) {
                return { message: `Unable to fetch details for username ${username}` };
            }

            const tweets = await this.getUserTweets(userDetails.rest_id, tweetCount);
            // calculate metrics
            const metrics = calculateMetrics(userDetails, tweets);
            return {
                userDetails,
                metrics
            };
        } catch (error) {
            logger.error(`Error in TwitterService.getUserDetailsWithTweets: ${error.message}`);
            throw error;
        }
    }
    calculateMetrics(username, tweets) {
        const totalTweets = tweets.length;
        let totalLikes = 0;
        let totalRetweets = 0;
        let totalReplies = 0;
        let totalImpressions = 0;

        tweets.forEach(tweet => {
            if (tweet.content && tweet.content.itemContent && tweet.content.itemContent.tweet_results && tweet.content.itemContent.tweet_results.result) {
                const tweetData = tweet.content.itemContent.tweet_results.result.legacy;
                totalLikes += tweetData.favorite_count;
                totalRetweets += tweetData.retweet_count;
                totalReplies += tweetData.reply_count;

                if (tweet.content.itemContent.tweet_results.result.views && tweet.content.itemContent.tweet_results.result.views.count) {
                    totalImpressions += parseInt(tweet.content.itemContent.tweet_results.result.views.count);
                }
            }
        });
        const engagementRate = totalTweets > 0 ? ((totalLikes + totalRetweets + totalReplies) / (totalTweets * userDetails.legacy.followers_count)) * 100 : 0;
        const averageImpressions = totalTweets > 0 ? totalImpressions / totalTweets : 0;

        return {
            totalTweets,
            totalLikes,
            totalRetweets,
            totalReplies,
            totalImpressions,
            engagementRate,
            averageImpressions
        }
    }
}

const twitterService = new TwitterService();
module.exports = twitterService;