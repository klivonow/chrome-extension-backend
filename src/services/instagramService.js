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
    // insta  user  insights
    async getComprehensiveInsights(username, maxPosts = 30) {
        try {
            const userInfo = await this.getUserInfo(username);
            const postsAndReels = await this.getUserPostsAndReelsDetails(username, maxPosts);
            const combineInsights = this.combineInsights(userInfo, postsAndReels);
            return combineInsights;
        } catch (error) {
            logger.error(`Error fetching comprehensive Instagram insights: ${error}`);
            throw error
        }
    }

    async getUserInfo(username) {
        const response = await this.instagramApiClientV1.get('v1/info', {
            params: { username_or_id_or_url: username }
        });
        return response.data.data;
    }
    async getUserPostsAndReelsDetails(username, maxPosts) {
        let allPosts = [];
        let paginationToken = null;
        let totalPostsFetched = 0;

        do {
            const response = await this.instagramApiClientV1.get('/v1.2/posts', {
                params: {
                    username_or_id_or_url: username,
                    pagination_token: paginationToken
                }
            });

            const posts = response.data.data.items;
            allPosts = allPosts.concat(posts);
            totalPostsFetched += posts.length;

            paginationToken = response.data.pagination_token;

            // Break if we've reached maxPosts or if there are no more posts
            if (totalPostsFetched >= maxPosts || !paginationToken) {
                break;
            }
        } while (true);

        const insights = allPosts.map(post => this.extractPostInsights(post));
        return {
            individualPostInsights: insights,
            aggregatedInsights: this.aggregatePostInsights(insights)
        };
    }
    extractPostInsights(post) {
        const isReel = post.media_type === 2 && post.product_type === 'clips';
        return {
            id: post.id,
            type: isReel ? 'Reel' : 'Post',
            timestamp: post.taken_at,
            likeCount: post.like_count,
            commentCount: post.comment_count,
            shareCount: post.share_count || 0,
            saveCount: post.saved_count || 0,
            playCount: isReel ? post.play_count : null,
            caption: post.caption ? post.caption.text : '',
            hashtags: this.extractHashtags(post.caption ? post.caption.text : ''),
            mentions: this.extractMentions(post.caption ? post.caption.text : ''),
            isSponsored: post.is_paid_partnership || false,
            mediaUrl: post.image_versions ? post.image_versions.items[0].url : null,

        };
    }

    aggregatePostInsights(insights) {
        const totalPosts = insights.length;
        const totalLikes = insights.reduce((sum, post) => sum + post.likeCount, 0);
        const totalComments = insights.reduce((sum, post) => sum + post.commentCount, 0);
        const totalShares = insights.reduce((sum, post) => sum + post.shareCount, 0);
        const reelsCount = insights.filter(post => post.type === 'Reel').length;
        const totalReelViews = insights.reduce((sum, post) => sum + (post.type === 'Reel' ? post.playCount : 0), 0);

        return {
            totalPosts,
            reelsCount,
            postsCount: totalPosts - reelsCount,
            averageLikesPerPost: totalLikes / totalPosts,
            averageCommentsPerPost: totalComments / totalPosts,
            averageSharesPerPost: totalShares / totalPosts,
            averageReelViews: reelsCount > 0 ? totalReelViews / reelsCount : 0,
            topHashtags: this.getTopItems(insights.flatMap(post => post.hashtags)),
            topMentions: this.getTopItems(insights.flatMap(post => post.mentions)),
            postFrequency: this.calculatePostFrequency(insights)
        };

    }

    // check tomorrow
    combineInsights(userInfo, postsAndReels) {
        const { individualPostInsights, aggregatedInsights } = postsAndReels;
        const followerCount = userInfo.follower_count;

        return {
            userMetrics: {
                username: userInfo.username,
                fullName: userInfo.full_name,
                biography: userInfo.biography,
                followerCount: followerCount,
                followingCount: userInfo.following_count,
                postCount: userInfo.media_count,
                isVerified: userInfo.is_verified,
                accountType: this.getAccountType(userInfo.account_type),
                externalUrl: userInfo.external_url,
                category: userInfo.category
            },
            contentMetrics: {
                ...aggregatedInsights,
                engagementRate: this.calculateOverallEngagementRate(aggregatedInsights, followerCount),
                audienceGrowthRate: this.calculateAudienceGrowthRate(individualPostInsights, followerCount),
                contentConsistency: this.analyzeContentConsistency(individualPostInsights),
                brandSuitability: this.assessBrandSuitability(individualPostInsights, userInfo)
            },
            qualitativeInsights: {
                contentThemes: this.identifyContentThemes(individualPostInsights),
                audienceInteraction: this.analyzeAudienceInteraction(individualPostInsights),
                brandAlignment: this.analyzeBrandAlignment(individualPostInsights, userInfo),
                influencerPersonality: this.assessInfluencerPersonality(userInfo, individualPostInsights)
            }
        };
    }

    calculateOverallEngagementRate(aggregatedInsights, followerCount) {
        const totalPosts = aggregatedInsights.totalPosts;
        const totalEngagements = (aggregatedInsights.averageLikesPerPost +
            aggregatedInsights.averageCommentsPerPost +
            aggregatedInsights.averageSharesPerPost) * totalPosts;
        return (totalEngagements / (followerCount * totalPosts)) * 100;
    }

    calculateAudienceGrowthRate(posts, currentFollowerCount) {
        // This is a simplified calculation and would be more accurate with historical follower data
        const oldestPost = posts[posts.length - 1];
        const newestPost = posts[0];
        const daysSinceOldestPost = (newestPost.timestamp - oldestPost.timestamp) / (24 * 60 * 60);
        return (currentFollowerCount / daysSinceOldestPost).toFixed(2);
    }

    analyzeContentConsistency(posts) {
        const postFrequency = this.calculatePostFrequency(posts);
        const hashtags = posts.flatMap(post => post.hashtags);
        const hashtagConsistency = new Set(hashtags).size / hashtags.length;

        return {
            postingFrequency: postFrequency,
            hashtagConsistency: hashtagConsistency,
            contentTypeDistribution: {
                posts: posts.filter(post => post.type === 'Post').length / posts.length,
                reels: posts.filter(post => post.type === 'Reel').length / posts.length
            }
        };
    }

    assessBrandSuitability(posts, userInfo) {
        const sponsoredPostsRatio = posts.filter(post => post.isSponsored).length / posts.length;
        const familyFriendlyScore = this.calculateFamilyFriendlyScore(posts);

        return {
            sponsoredContentRatio: sponsoredPostsRatio,
            familyFriendliness: familyFriendlyScore,
            niche: userInfo.category,
            audienceSize: userInfo.follower_count
        };
    }

    identifyContentThemes(posts) {
        const allHashtags = posts.flatMap(post => post.hashtags);
        const themeCounts = allHashtags.reduce((acc, hashtag) => {
            acc[hashtag] = (acc[hashtag] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(themeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([theme, count]) => ({ theme, frequency: count / posts.length }));
    }

    analyzeAudienceInteraction(posts) {
        const commentRatio = posts.reduce((sum, post) => sum + post.commentCount / post.likeCount, 0) / posts.length;
        const shareRatio = posts.reduce((sum, post) => sum + post.shareCount / post.likeCount, 0) / posts.length;

        return {
            averageCommentRatio: commentRatio,
            averageShareRatio: shareRatio,
            mostEngagingContentTypes: this.identifyMostEngagingContent(posts)
        };
    }

    analyzeBrandAlignment(posts, userInfo) {
        const mentionedBrands = this.extractMentionedBrands(posts);
        const contentStyle = this.determineContentStyle(posts);

        return {
            mentionedBrands,
            contentStyle,
            professionalFocus: userInfo.category,
            audienceDemographic: "Inferred from content and engagement" // This would ideally come from more detailed analytics
        };
    }

    assessInfluencerPersonality(userInfo, posts) {
        return {
            tone: this.analyzeTone(posts),
            responsiveness: this.calculateResponsiveness(posts),
            consistency: this.analyzeContentConsistency(posts),
            professionalism: this.assessProfessionalism(userInfo, posts)
        };
    }

    // Helper methods
    extractHashtags(text) {
        const hashtagRegex = /#[\w]+/g;
        return text.match(hashtagRegex) || [];
    }

    extractMentions(text) {
        const mentionRegex = /@[\w]+/g;
        return text.match(mentionRegex) || [];
    }

    getTopItems(items, limit = 5) {
        const counts = items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([item, count]) => ({ item, count }));
    }

    calculatePostFrequency(posts) {
        const sortedDates = posts.map(post => post.timestamp).sort((a, b) => b - a);
        const totalDays = (sortedDates[0] - sortedDates[sortedDates.length - 1]) / (24 * 60 * 60);
        return (posts.length / (totalDays || 1)) * 7; // Posts per day
    }

    getAccountType(typeCode) {
        const types = {
            1: 'Personal',
            2: 'Business',
            3: 'Creator'
        };
        return types[typeCode] || 'Unknown';
    }

    calculateFamilyFriendlyScore(posts) {
        // This is a placeholder implementation. In reality, this would involve
        // more sophisticated content analysis, possibly using AI or predefined criteria.
        const sensitiveContentRatio = posts.filter(post =>
            post.caption.toLowerCase().includes('explicit') ||
            post.caption.toLowerCase().includes('mature')
        ).length / posts.length;
        return 1 - sensitiveContentRatio; // Higher score means more family-friendly
    }

    identifyMostEngagingContent(posts) {
        const engagementByType = posts.reduce((acc, post) => {
            const engagementScore = post.likeCount + post.commentCount * 2 + post.shareCount * 3;
            acc[post.type] = (acc[post.type] || []).concat(engagementScore);
            return acc;
        }, {});

        return Object.entries(engagementByType).map(([type, scores]) => ({
            type,
            averageEngagement: scores.reduce((sum, score) => sum + score, 0) / scores.length
        })).sort((a, b) => b.averageEngagement - a.averageEngagement);
    }

    extractMentionedBrands(posts) {
        const allMentions = posts.flatMap(post => post.mentions);
        return this.getTopItems(allMentions, 10);
    }

    determineContentStyle(posts) {
        // This is a simplified implementation. A more comprehensive analysis would involve
        // natural language processing and image analysis.
        const styles = {
            informative: 0,
            entertaining: 0,
            inspirational: 0,
            promotional: 0
        };

        posts.forEach(post => {
            if (post.caption.includes('learn') || post.caption.includes('how to')) styles.informative++;
            if (post.caption.includes('lol') || post.caption.includes('😂')) styles.entertaining++;
            if (post.caption.includes('inspire') || post.caption.includes('motivation')) styles.inspirational++;
            if (post.isSponsored || post.caption.includes('ad')) styles.promotional++;
        });

        return Object.entries(styles)
            .sort((a, b) => b[1] - a[1])
            .map(([style, count]) => ({ style, frequency: count / posts.length }));
    }

    analyzeTone(posts) {
        // This is a placeholder. A real implementation would use sentiment analysis.
        const tones = posts.map(post => {
            if (post.caption.includes('😊') || post.caption.includes('happy')) return 'positive';
            if (post.caption.includes('😢') || post.caption.includes('sad')) return 'negative';
            return 'neutral';
        });

        return {
            positive: tones.filter(tone => tone === 'positive').length / tones.length,
            negative: tones.filter(tone => tone === 'negative').length / tones.length,
            neutral: tones.filter(tone => tone === 'neutral').length / tones.length
        };
    }

    calculateResponsiveness(posts) {
        const commentResponseTime = posts.reduce((sum, post) => {
            // This assumes we have data on when comments were made and responded to
            // In reality, this data might not be available through the API
            return sum + (post.averageResponseTime || 0);
        }, 0) / posts.length;

        return {
            averageCommentResponseTime: commentResponseTime,
            responseRate: posts.filter(post => post.hasInfluencerResponses).length / posts.length
        };
    }

    assessProfessionalism(userInfo, posts) {
        return {
            accountCompletenesss: this.calculateAccountCompleteness(userInfo),
            contentQuality: this.assessContentQuality(posts),
            brandCollaborations: posts.filter(post => post.isSponsored).length / posts.length
        };
    }

    calculateAccountCompleteness(userInfo) {
        const fields = ['full_name', 'biography', 'external_url', 'profile_pic_url'];
        const filledFields = fields.filter(field => userInfo[field]).length;
        return filledFields / fields.length;
    }

    assessContentQuality(posts) {
        // This is a simplified assessment. A more comprehensive version would involve
        // image/video analysis, engagement rates, and possibly AI-driven content scoring.
        const avgCaptionLength = posts.reduce((sum, post) => sum + post.caption.length, 0) / posts.length;
        const avgEngagement = posts.reduce((sum, post) => sum + post.likeCount + post.commentCount, 0) / posts.length;

        let qualityScore = 0;
        if (avgCaptionLength > 50) qualityScore += 0.5;
        if (avgEngagement > 1000) qualityScore += 0.5; // This threshold should be adjusted based on the account size

        return qualityScore;
    }

    calculateAudienceInsights(userInfo, posts) {
        // Note: Detailed audience demographics usually require access to Instagram's API
        // or third-party analytics tools. This is a simplified version based on available data.
        const totalEngagements = posts.reduce((sum, post) => sum + post.likeCount + post.commentCount, 0);
        const engagementRate = totalEngagements / (userInfo.follower_count * posts.length);

        return {
            audienceSize: userInfo.follower_count,
            engagementRate: engagementRate,
            estimatedReach: Math.round(userInfo.follower_count * engagementRate),
            audienceGrowth: this.calculateAudienceGrowthRate(posts, userInfo.follower_count),
            topLocations: "Not available through this API", // Would typically come from Instagram Insights
            ageRange: "Not available through this API", // Would typically come from Instagram Insights
            genderSplit: "Not available through this API" // Would typically come from Instagram Insights
        };
    }

    analyzeContentStrategy(posts) {
        const postTypes = posts.reduce((acc, post) => {
            acc[post.type] = (acc[post.type] || 0) + 1;
            return acc;
        }, {});

        const postingTimes = posts.map(post => new Date(post.timestamp * 1000).getHours());
        const mostCommonPostingTime = this.mode(postingTimes);

        return {
            contentMix: Object.entries(postTypes).map(([type, count]) => ({
                type,
                percentage: (count / posts.length) * 100
            })),
            postingFrequency: this.calculatePostFrequency(posts),
            bestTimeToPost: `${mostCommonPostingTime}:00`,
            hashtagStrategy: this.analyzeHashtagStrategy(posts),
            captionStyle: this.analyzeCaptionStyle(posts)
        };
    }

    analyzeHashtagStrategy(posts) {
        const allHashtags = posts.flatMap(post => post.hashtags);
        const hashtagFrequency = allHashtags.reduce((acc, hashtag) => {
            acc[hashtag] = (acc[hashtag] || 0) + 1;
            return acc;
        }, {});

        return {
            averageHashtagsPerPost: allHashtags.length / posts.length,
            topHashtags: this.getTopItems(allHashtags, 10),
            hashtagDiversity: Object.keys(hashtagFrequency).length / allHashtags.length
        };
    }

    analyzeCaptionStyle(posts) {
        const captionLengths = posts.map(post => post.caption.length);
        return {
            averageCaptionLength: captionLengths.reduce((sum, length) => sum + length, 0) / posts.length,
            captionLengthVariability: this.standardDeviation(captionLengths),
            emojiUsage: this.analyzeEmojiUsage(posts)
        };
    }

    analyzeEmojiUsage(posts) {
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
        const allEmojis = posts.flatMap(post => post.caption.match(emojiRegex) || []);
        return {
            totalEmojiCount: allEmojis.length,
            averageEmojisPerPost: allEmojis.length / posts.length,
            topEmojis: this.getTopItems(allEmojis, 5)
        };
    }

    // Utility functions
    mode(array) {
        return array.sort((a, b) =>
            array.filter(v => v === a).length - array.filter(v => v === b).length
        ).pop();
    }

    standardDeviation(values) {
        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(squareDiffs.reduce((sum, sq) => sum + sq, 0) / values.length);
    }

}

const instagramService = new InstagramService();
module.exports = instagramService