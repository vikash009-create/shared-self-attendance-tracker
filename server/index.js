// server/index.js - Entrypoint wrapper for Vercel Express service
const app = require('./dist/index.js').default || require('./dist/index.js');
module.exports = app;
