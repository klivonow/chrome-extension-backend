const logger = require('../utils/logger');
const twitterService = require('../services/twitterService');

class TwitterController {
    async getTwitterUserDetailsWithMetrics(req, res, next) {
        const { username } = req.params;
        const tweetCount = req.query.tweetCount || 20;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        try {
            const result = await twitterService.getUserDetailsWithTweets(username, tweetCount);
            res.json(result);
        } catch (error) {
            logger.error(`Error occurred while fetching Twitter data for ${username}: ${error.message}`);

            if (error.response && error.response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            }

            res.status(500).json({ error: 'An error occurred while processing your request.' });
            next(error)
        }

    }
}

const twitterController = new TwitterController();
module.exports = twitterController;