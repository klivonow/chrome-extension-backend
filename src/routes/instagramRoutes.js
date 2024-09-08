const express = require('express');
const instagramController = require('../controllers/instagramController');
const router = express.Router();

router.get('/account', instagramController.getInstagramDetails);

module.exports = router;