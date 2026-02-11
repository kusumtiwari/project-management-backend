const express = require('express');
const router = express.Router();

const {createTeamSetup, listTeamMembers, listTeams} = require('../controllers/teamSetupController');
const {protect} = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', listTeams);
router.post('/', createTeamSetup);
router.get('/:teamId/members', listTeamMembers);
module.exports = router;