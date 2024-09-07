
const express = require('express');
const youTubeController = require('../controllers/youtubeController');

const router = express.Router();

router.get('/channel', youTubeController.getChannelDetails);

module.exports = router;
