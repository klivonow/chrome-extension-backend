require('dotenv').config();

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    twitterApiKey: process.env.TWITTER_API_KEY,
    twitterApiSecret: process.env.TWITTER_API_SECRET,
    instagramUsername: process.env.INSTAGRAM_USERNAME,
    instagramPassword: process.env.INSTAGRAM_PASSWORD,
};