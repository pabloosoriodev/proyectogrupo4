const config = require('./config');
const logger = require('./logger');
const db = require('./db');

module.exports = {
  ...config,
  logger,
  ...db,
};
