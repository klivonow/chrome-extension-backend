require('dotenv').config();

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    ytapiHost: process.env.RAPIDAPI_YTAPI_HOST,
    ytapiServerUrl: process.env.RAPIAPI_YTAPI_SERVER_URL,
    rapidApiKey: process.env.RAPID_API_KEY,
    instaHost: process.env.RAPIDAPI_INSTAGRAM_HOST,
    instaServerUrl: process.env.RAPIDAPI_INSTAGRAM_SERVER_URL

};