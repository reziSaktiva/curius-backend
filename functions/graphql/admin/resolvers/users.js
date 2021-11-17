const { db } = require('../../../utility/admin')
const { client } = require('../../../utility/algolia')

module.exports = {
    Mutation: {
        async searchUser(_, { search, perPage, page }, _context) {
            const index = client.initIndex('users');

            const defaultPayload = {
                "attributesToRetrieve": "*",
                "attributesToSnippet": "*:20",
                "snippetEllipsisText": "…",
                "responseFields": "*",
                "getRankingInfo": true,
                "analytics": false,
                "enableABTest": false,
                "explain": "*",
                "facets": ["*"]
            };

            const pagination = {
                "hitsPerPage": perPage || 10,
                "page": page || 0,
            }

            try {
                return new Promise((resolve, reject) => {
                    index.search(search, { ...defaultPayload, ...pagination })
                        .then(async res => {
                            const { hits, page, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;

                            const userIds = [];
                            if (hits.length) {
                                hits.forEach(async data => {
                                    userIds.push(data.objectID);
                                })
                            }

                            const getUsers = await db.collection('users').where('id', 'in', userIds).get()
                            const users = getUsers.docs.map(doc => doc.data())

                            // return following structure data algolia
                            resolve({ hits: users, page, nbHits, nbPages, hitsPerPage, processingTimeMS })
                        })
                })
            }
            catch (err) {
                console.log(err);
            }
        }
    }
}