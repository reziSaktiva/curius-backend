const { ALGOLIA_ID, ALGOLIA_ADMIN_KEY } = require('./secret/API')
const algoliasearch = require('algoliasearch');
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

module.exports = { client }