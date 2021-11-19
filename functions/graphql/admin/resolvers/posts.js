const { db } = require('../../../utility/admin')
const { client } = require('../../../utility/algolia')

module.exports = {
    Query: {

    },
    Mutation: {
        async searchPost(_, { search, perPage, page }, _context) {
            const index = client.initIndex('posts');

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
                return new Promise(async (resolve, reject) => {
                    index.search(search, { ...defaultPayload, ...pagination })
                        .then(async res => {
                            const { hits, page, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;
                            const userIds = [];
                            if (hits.length) {
                                hits.forEach(async data => {
                                    userIds.push(data.objectID);
                                })
                            }
                            console.log(index);
                            const getPosts = await db.collection('posts').where('id', 'in', userIds).get()
                            const posts = getPosts.docs.map(doc => doc.data())

                            // return following structure data algolia
                            resolve({ hits: posts, page, nbHits, nbPages, hitsPerPage, processingTimeMS })
                        })
                })
            }
            catch (err) {
                console.log(err);
            }
        }
    }
}