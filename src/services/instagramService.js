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
            const response = await this.instagramApiClientV1.get('/v1/info', { params: { username_or_id_or_url: username } });
            console.log(response.data)
            if (!response.data) {
                throw new Error('Instagram id not found')
            }
            return {
                username: response.data.data.username,
                fullname: response.data.data.full_name,
                biography: response.data.data.biography,
                profilePicUrl: response.data.data.profile_pic_url,
                followerCount: response.data.data.follower_count,
                followingCount: response.data.data.following_count,
                mediaCount: response.data.data.media_count,
                contactNumber: response.data.data.contact_phone_number,
                isVerified: response.data.data.is_verified,
                isBusiness: response.data.data.is_business,
                isOpenToColab: response.data.data.is_open_to_colab,
                isFavourite: response.data.data.is_favorite,
                isFavouriteForClips: response.data.data.is_favorite_for_clips,
                isFavouriteForStories: response.data.data.is_favorite_for_stories,
                locationData: response.data.data.location_data,

            }

        } catch (error) {
            logger.error(`Error in InstagramService.getUserDetails: ${error.message}`);
            throw error;
        }
    }
    // User posts and reels
    async getUserPostandReelsDetails(username) {
        try {
            const response = await this.instagramApiClientV1.get('')
        } catch (error) {

        }
    }
}

const instagramService = new InstagramService();
module.exports = instagramService