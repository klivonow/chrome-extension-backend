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
        this.MAX_VIDEOS = 100; // Maximum number of videos to fetch for small channels
    }

    async getChannelDetails(ytUrl) {
        try {
            const channelId = await this.getChannelIdFromUrl(ytUrl);
            const channelInfo = await this.getChannelInfo(channelId);
            const subscriberCount = parseInt(channelInfo.subscriberCount);

            let allVideos = [];
            let continuationToken = null;

            do {
                const channelVideos = await this.getChannelVideos(channelId, continuationToken);
                allVideos = allVideos.concat(channelVideos.data);
                continuationToken = channelVideos.continuation;

                // Break if subscriber count is 100,000 or more, or if we've reached MAX_VIDEOS
                if (subscriberCount >= 100000 || allVideos.length >= this.MAX_VIDEOS) {
                    break;
                }
            } while (continuationToken && allVideos.length < this.MAX_VIDEOS);

            const videoDetails = await this.getVideoDetailsInBatches(allVideos.map(video => video.videoId));
            const metrics = this.calculateMetrics(channelInfo, allVideos, videoDetails);

            return {
                channelId: channelInfo.channelId,
                title: channelInfo.title,
                channelHandle: channelInfo.channelHandle,
                subscriberCountText: channelInfo.subscriberCountText,
                subscriberCount: channelInfo.subscriberCount,
                videosCountText: channelInfo.videosCountText,
                videosCount: parseInt(channelInfo.videosCount),
                isVerified: channelInfo.isVerified,
                keywords: channelInfo.keywords,
                isFamilySafe: channelInfo.isFamilySafe,


                videoList: allVideos.map(video => ({
                    videoId: video.videoId,
                    title: video.title,
                    viewCount: video.viewCount,
                })).slice(0, 10),
                latestVideoCount: allVideos.length,
                metrics
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

    async getChannelVideos(channelId, continuationToken = null) {
        try {
            const params = { id: channelId, sort_by: 'newest' };
            if (continuationToken) {
                params.token = continuationToken;
            }
            const response = await this.rapidApiClient.get('/channel/videos', { params });
            // if (!response.data.data || !response.data.meta) {
            //     throw new Error('Channel videos not found or invalid response');
            // }
            return {
                data: response.data.data,
                continuation: response.data.continuation
            };
        } catch (error) {
            logger.error(`Error in YouTubeService.getChannelVideos: ${error.message}`);
            throw error;
        }
    }

    async getChannelInfo(channelId) {
        try {
            const response = await this.rapidApiClient.get('/channel/about', {
                params: { id: channelId }
            });
            if (!response.data) {
                throw new Error('Channel info not found or invalid response');
            }
            return response.data;
        } catch (error) {
            logger.error(`Error in YouTubeService.getChannelInfo: ${error.message}`);
            throw error;
        }
    }

    async getVideoDetailsInBatches(videoIds, batchSize = 10) {
        const batches = this.chunkArray(videoIds, batchSize);
        const allVideoDetails = [];

        for (const batch of batches) {
            const batchDetails = await Promise.all(
                batch.map(id => this.getVideoInfo(id))
            );
            allVideoDetails.push(...batchDetails);
        }

        return allVideoDetails;
    }

    async getVideoInfo(videoId) {
        try {
            const response = await this.rapidApiClient.get('/video/info', {
                params: { id: videoId, extend: '2' }
            });
            return response.data;
        } catch (error) {
            logger.error(`Error in YouTubeService.getVideoInfo: ${error.message}`);
            throw error;
        }
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    calculateMetrics(channelInfo, videosList, videoDetails) {
        const totalViews = videoDetails.reduce((sum, video) => sum + parseInt(video.viewCount), 0);
        const totalLikes = videoDetails.reduce((sum, video) => sum + parseInt(video.likeCount), 0);
        const totalComments = videoDetails.reduce((sum, video) => sum + parseInt(video.commentCount), 0);

        const averageViews = totalViews / videoDetails.length;
        const averageLikes = totalLikes / videoDetails.length;
        const averageComments = totalComments / videoDetails.length;

        const engagementRate = ((totalLikes + totalComments) / totalViews) * 100;

        const videoCategories = this.categorizeVideos(videoDetails);
        const uploadFrequency = this.calculateUploadFrequency(videoDetails);
        const viewsGrowthRate = this.calculateViewsGrowthRate(videoDetails);
        const topVideos = this.getTopVideos(videoDetails, 5);
        const keywordAnalysis = this.analyzeKeywords(videoDetails);

        return {
            totalSubscribers: parseInt(channelInfo.subscriberCount),
            totalViews,
            totalVideos: videoDetails.length,
            averageViews,
            averageLikes,
            averageComments,
            engagementRate,
            videoCategories,
            uploadFrequency,
            viewsGrowthRate,
            topVideos,
            keywordAnalysis
        };
    }

    categorizeVideos(videos) {
        const categories = {};
        videos.forEach(video => {
            if (!categories[video.category]) {
                categories[video.category] = 0;
            }
            categories[video.category]++;
        });
        return categories;
    }

    calculateUploadFrequency(videos) {
        const sortedDates = videos.map(v => new Date(v.publishDate)).sort((a, b) => b - a);
        const daysBetweenUploads = [];
        for (let i = 1; i < sortedDates.length; i++) {
            const days = (sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24);
            daysBetweenUploads.push(days);
        }
        return {
            averageDaysBetweenUploads: daysBetweenUploads.reduce((a, b) => a + b, 0) / daysBetweenUploads.length,
            totalDays: (sortedDates[0] - sortedDates[sortedDates.length - 1]) / (1000 * 60 * 60 * 24)
        };
    }

    calculateViewsGrowthRate(videos) {
        const sortedVideos = videos.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        const recentVideos = sortedVideos.slice(0, 10);
        const olderVideos = sortedVideos.slice(-10);

        const recentAvgViews = recentVideos.reduce((sum, video) => sum + parseInt(video.viewCount), 0) / recentVideos.length;
        const olderAvgViews = olderVideos.reduce((sum, video) => sum + parseInt(video.viewCount), 0) / olderVideos.length;

        return ((recentAvgViews - olderAvgViews) / olderAvgViews) * 100;
    }

    getTopVideos(videos, count) {
        return videos
            .sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount))
            .slice(0, count)
            .map(video => ({
                title: video.title,
                views: parseInt(video.viewCount),
                likes: parseInt(video.likeCount),
                comments: parseInt(video.commentCount),
                publishDate: video.publishDate
            }));
    }

    analyzeKeywords(videos) {
        const keywordCounts = {};
        videos.forEach(video => {
            if (video.keywords) {
                video.keywords.forEach(keyword => {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                });
            }
        });

        return Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
    }
}

const youTubeService = new YouTubeService();
module.exports = youTubeService;