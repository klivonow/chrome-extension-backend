// src/services/twitterService.js
const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');
const redisClient = require('../redis/redisClient');

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

    calculateMetrics(userDetails, tweets) {
        const totalTweets = tweets.length;
        let totalLikes = 0;
        let totalRetweets = 0;
        let totalReplies = 0;
        let totalImpressions = 0;
        let totalQuotes = 0;
        let tweetsWithUrls = 0;
        let tweetsWithMedia = 0;
        let totalHashtags = 0;
        let totalMentions = 0;

        tweets.forEach(tweet => {
            if (tweet.content && tweet.content.itemContent && tweet.content.itemContent.tweet_results && tweet.content.itemContent.tweet_results.result) {
                const tweetData = tweet.content.itemContent.tweet_results.result.legacy;
                totalLikes += tweetData.favorite_count;
                totalRetweets += tweetData.retweet_count;
                totalReplies += tweetData.reply_count;
                totalQuotes += tweetData.quote_count;

                if (tweet.content.itemContent.tweet_results.result.views && tweet.content.itemContent.tweet_results.result.views.count) {
                    totalImpressions += parseInt(tweet.content.itemContent.tweet_results.result.views.count);
                }

                if (tweetData.entities.urls && tweetData.entities.urls.length > 0) {
                    tweetsWithUrls++;
                }

                if (tweetData.entities.media && tweetData.entities.media.length > 0) {
                    tweetsWithMedia++;
                }

                if (tweetData.entities.hashtags) {
                    totalHashtags += tweetData.entities.hashtags.length;
                }

                if (tweetData.entities.user_mentions) {
                    totalMentions += tweetData.entities.user_mentions.length;
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
            totalQuotes,
            totalImpressions,
            engagementRate,
            averageImpressions,
            hashtagUsageRate: totalTweets > 0 ? totalHashtags / totalTweets : 0,
            mentionRate: totalTweets > 0 ? totalMentions / totalTweets : 0,
            urlShareRate: (tweetsWithUrls / totalTweets) * 100,
            mediaShareRate: (tweetsWithMedia / totalTweets) * 100,
            quoteTweetRate: (totalQuotes / totalTweets) * 100,
            followerToFollowingRatio: userDetails.legacy.followers_count / userDetails.legacy.friends_count,
            engagementToFollowerRatio: (totalLikes + totalRetweets + totalReplies) / userDetails.legacy.followers_count,
            viralityScore: totalImpressions > 0 ? ((totalRetweets + totalQuotes) / totalImpressions) * 100 : 0,
            favoriteToRetweetRatio: totalRetweets > 0 ? totalLikes / totalRetweets : 0,
            replyRate: (totalReplies / totalTweets) * 100,
            averageLikesPerTweet: totalTweets > 0 ? totalLikes / totalTweets : 0,
            averageRetweetsPerTweet: totalTweets > 0 ? totalRetweets / totalTweets : 0,
            averageRepliesPerTweet: totalTweets > 0 ? totalReplies / totalTweets : 0,
        };
    }

    async getTwitterUserDetails(username) {
        const cacheKey = `twitter:user:${username}`;
        try {
            // fetch from redis first
            // const cachedData = await redisClient.get(cacheKey);
            // if (cachedData && Object.keys(cachedData).length > 0) {
            //     logger.info(`Cache hit for user: ${username}`);
            //     return cachedData;
            // }
            // if not in cache, fetch from API
            const response = await this.twitterClient.get('/user', {
                params: { username: username }
            });

            if (!response.data || !response.data.result || !response.data.result.data || !response.data.result.data.user) {
                logger.warn(`No user data found for username: ${username}`);
                return { message: `No user found for username ${username}` };
            }
            const userData = response.data.result.data.user.result;
            // cache the result
            // await redisClient.set(cacheKey, userData);
            return userData;
        } catch (error) {
            logger.error(`Error in TwitterService.getTwitterUserDetails: ${error.message}`);
            throw error;
        }
    }

    async getUserTweets(userId, count = 20) {
        // const cacheKey = `twitter:tweets:${userId}:${count}`;
        try {
            // try to get the data from the cache
            // const cachedData = await redisClient.get(cacheKey);
            // if (cachedData && Object.keys(cachedData).length > 0) {
            //     logger.info(`Cache hit for tweets of user: ${userId}`);
            //     return cachedData;
            // }
            // if not fetch from cache
            const response = await this.twitterClient.get('/user-tweets', {
                params: { user: userId, count: count }
            });

            if (!response.data || !response.data.result) {
                logger.warn(`No tweets found for user ID: ${userId}`);
                return { message: `No tweets found for user ID ${userId}` };
            }

            let tweetList = [];
            const instructions = response.data.result.timeline.instructions;

            if (instructions.length === 3) {
                tweetList = instructions[2].entries;
            } else if (instructions.length > 1) {
                tweetList = instructions[1].entries;
            }

            // const result = { tweetList: JSON.stringify(tweetList) };
            // store in the cache
            // await redisClient.set(cacheKey, result);
            return tweetList;
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
            const metrics = this.calculateMetrics(userDetails, tweets);
            return {
                userDetails: {
                    id: userDetails.rest_id,
                    name: userDetails.legacy.name,
                    username: userDetails.legacy.screen_name,
                    followers_count: userDetails.legacy.followers_count,
                    following_count: userDetails.legacy.friends_count,
                    media_count: userDetails.legacy.media_count,
                },
                metrics
            };
        } catch (error) {
            logger.error(`Error in TwitterService.getUserDetailsWithTweets: ${error.message}`);
            throw error;
        }
    }

}

const twitterService = new TwitterService();
module.exports = twitterService;