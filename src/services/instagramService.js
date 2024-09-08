const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');

class InstagramService {
    constructor() {
        this.instagramApiClientV1 = axios.create({
            baseURL: config.instaServerUrl,
            headers: {
                'x-rapidapi-key': config.rapidApiKey,
                'x-rapidapi-host': config.instaHost
            }
        });

    }
    // User info

    async getUserDetails(username) {
        try {
            const response = await this.instagramApiClientV1.get(
                '/info', {
                params: {
                    username_or_id_or_url: username,
                    include_about: true

                }
            }
            );

            if (!response.data) {
                throw new Error('Instagram id not found')
            }
            return {
                username: response.data.username,
                full_name: response.data.full_name,
                biography: response.data.biography,
                follower_count: response.data.follower_count,
                following_count: response.data.following_count,
                media_count: response.data.media_count,
                is_verified: response.data.is_verified,
                is_business: response.data.is_business,
                is_open_to_colab: response.data.is_open_to_colab,
            }

        } catch (error) {
            logger.error(`Error in InstagramService.getUserDetails: ${error.message}`);
            throw error;
        }
    }
    // User posts and reels
}

const instagramService = new InstagramService();
module.exports = instagramService