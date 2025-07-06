const express = require('express');
const router = express.Router();

const {createTeamSetup} = require('../controllers/teamSetupController');
const {protect} = require('../middleware/authMiddleware')

router.post('/', createTeamSetup);
module.exports = router;