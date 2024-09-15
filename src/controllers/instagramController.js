const logger = require('../utils/logger');
const instagramService = require('../services/instagramService');
class InstagramController {

    async getInstagramDetails(req, res, next) {
        try {
            const { username, maxPosts } = req.query;

            if (!username) {
                return res.status(400).json({
                    message: 'Instagram Username is required'
                });
            }
            const instagramDetails = await instagramService.getComprehensiveInsights(username, maxPosts);
            logger.info(`Account details fetched for username: ${username}`);
            res.json(instagramDetails);

        } catch (error) {
            logger.error(`Error fetching instagram account details: ${error.message}`);
            next(error);

        }
    }
}
const instagramController = new InstagramController();
module.exports = instagramController;