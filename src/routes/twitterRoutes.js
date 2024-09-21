const express = require('express');
const twitterController = require('../controllers/twitterController');

const router = express.Router();

router.get('/user/:username', twitterController.getTwitterUserDetailsWithMetrics);

module.exports = router;