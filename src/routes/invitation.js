const express = require('express');
const router = express.Router();

const {sendTeamInvitation} = require('../controllers/sendTeamInvitation');

router.post('/', sendTeamInvitation);
module.exports = router;
