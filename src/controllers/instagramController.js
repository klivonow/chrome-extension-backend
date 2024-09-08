const logger = require('../utils/logger');
const instagramService = require('../services/instagramService');
const { logInteraction, measureApiResponseTime } = require('../monitoring/setup');

class InstagramController {

    async getInstagramDetails(req, res, next) {
        const startTime = Date.now();
        try {
            const { username } = req.query;
            console.log(username);
            if (!username) {
                return res.status(400).json({
                    message: 'Instagram Username is required'
                });
            }
            // logInteraction('instagram_account_details');
            const instagramDetails = await instagramService.getUserDetails(username);
            logger.info(`Channel details fetched for URL: ${url}`);
            res.json(instagramDetails);

        } catch (error) {
            logger.error(`Error fetching instagram account details: ${error.message}`);
            next(error);

        } finally {
            measureApiResponseTime('/api/instagram/account')

        }
    }
}
const instagramController = new InstagramController();
module.exports = instagramController;