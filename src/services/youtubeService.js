// src/services/youtubeService.js
const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');

class YouTubeService {
    constructor() {
        this.rapidApiClient = axios.create({
            baseURL: config.ytapiServerUrl,
            headers: {
                'x-rapidapi-key': config.rapidApiKey,
                'x-rapidapi-host': config.ytapiHost
            }
        });
    }

    async getChannelDetails(ytUrl) {
        try {
            const channelId = await this.getChannelIdFromUrl(ytUrl);
            const response = await this.rapidApiClient.get('/channel/videos', {
                params: { id: channelId, sort_by: 'newest' }
            });

            if (!response.data || !response.data.meta) {
                throw new Error('Channel not found or invalid response');
            }
            const filteredVideoList = response.data.data?.map((video) => ({
                videoId: video.videoId,
                title: video.title,
                viewCount: video.viewCount,
            })) || []

            return {
                title: response.data.meta.title,
                channelHandle: response.data.meta.channelHandle,
                subscriberCount: response.data.meta.subscriberCount,
                videosCount: response.data.meta.videosCount,
                videoList: filteredVideoList,
                latestVideoCount: filteredVideoList.length || 0
            };
        } catch (error) {
            logger.error(`Error in YouTubeService.getChannelDetails: ${error.message}`);
            throw error;
        }
    }

    async getChannelIdFromUrl(ytUrl) {
        try {
            const response = await this.rapidApiClient.get('/resolve', {
                params: { url: ytUrl }
            });

            if (!response.data || !response.data.browseId) {
                throw new Error('Channel id not found for url');
            }

            return response.data.browseId;
        } catch (error) {
            logger.error(`Error in YouTubeService.getChannelIdFromUrl: ${error.message}`);
            throw error;
        }
    }


}

const youTubeService = new YouTubeService();
module.exports = youTubeService;