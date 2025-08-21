const rateLimit = require('express-rate-limit');
const config = require('../config');

console.log('Configuring rate limiting middleware...');

const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.'
});

console.log('Rate limiting configured');

module.exports = rateLimitMiddleware;
