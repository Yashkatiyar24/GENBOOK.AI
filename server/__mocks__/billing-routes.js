const express = require('express');
const router = express.Router();
function webhookHandler(_req, res) { return res.status(200).send('ok'); }
module.exports = { __esModule: true, default: router, webhookHandler };
