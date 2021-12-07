const { ALGOLIA_ID, ALGOLIA_ADMIN_KEY, ALGOLIA_BE_KEY } = require('./secret/API')
const algoliasearch = require('algoliasearch');
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const server = algoliasearch(ALGOLIA_ID, ALGOLIA_BE_KEY);

module.exports = { client, server }