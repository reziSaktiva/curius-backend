const { db } = require('../../../utility/admin')
const { client, server } = require('../../../utility/algolia')
const { ALGOLIA_INDEX_ROOMS } = require('../../../constant/post')

module.exports = {
    Query: {
        async getAllRoom(_, _args, _context) {
            const getRooms = await db.collection('room').get()
            try {

            }
            catch (err) {
                console.log(err);
                throw new Error(err)
            }
        },
        async searchRoom(_, { search, perPage, page }, context) {
            const index = client.initIndex(ALGOLIA_INDEX_ROOMS);

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
                    const payload = { ...defaultPayload, ...pagination };

                    index.search(search, payload)
                        .then(async res => {
                            const { hits, page: nbPage, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;
                            const roomIds = [];
                            if (hits.length) {
                                hits.forEach(async data => {
                                    roomIds.push(data.objectID);
                                })
                            }
                            if (roomIds.length) {
                                const getRooms = await db.collection('room').where('id', 'in', roomIds).get()
                                const rooms = getRooms.docs.map(doc => doc.data())
                                console.log(rooms);
                                // return following structure data algo lia
                                resolve({ hits: rooms, page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS })
                                return;
                            }

                            resolve({ hits: [], page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS })
                        }).catch(err => {
                            reject(err)
                        })
                })
            }
            catch (err) {
                console.log(err);
                throw new Error(err)
            }
        }
    }
}