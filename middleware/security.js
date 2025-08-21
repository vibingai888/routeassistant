const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

console.log('Configuring security middleware...');

const securityMiddleware = (app) => {
  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: config.security.contentSecurityPolicy
  }));
  
  // CORS configuration
  app.use(cors());
  
  console.log('Security middleware configured');
};

module.exports = securityMiddleware;
