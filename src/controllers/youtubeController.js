const logger = require('../utils/logger');
const youTubeService = require('../services/youtubeService');
const { logInteraction, measureApiResponseTime } = require('../monitoring/setup');

class YouTubeController {
    async getChannelDetails(req, res, next) {
        const startTime = Date.now();
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ message: 'YouTube URL is required' });
            }

            logInteraction('youtube_channel_details');
            const channelDetails = await youTubeService.getChannelDetails(url);
            logger.info(`Channel details fetched for URL: ${url}`);
            res.json(channelDetails);
        } catch (error) {
            logger.error(`Error fetching channel details: ${error.message}`);
            next(error);
        } finally {
            measureApiResponseTime('/api/youtube/channel', startTime);
        }
    }
}

const youTubeController = new YouTubeController();
module.exports = youTubeController;