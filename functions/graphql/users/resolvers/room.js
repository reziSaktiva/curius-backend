const { db } = require('../../../utility/admin')
const { client, server } = require('../../../utility/algolia')
const { computeDistanceBetween, LatLng } = require('spherical-geometry-js')
const { ALGOLIA_INDEX_ROOMS } = require('../../../constant/post')

module.exports = {
    Query: {
        async getNearRooms(_, { lat, lng }, _context) {
            const getRooms = await db.collection('room').get()
            try {
                let nearRoom = []

                getRooms.docs.forEach(doc => {
                    const { location } = doc.data();

                    const currentLatlng = new LatLng(parseFloat(location.lat), parseFloat(location.lng));
                    const contentLocation = new LatLng(parseFloat(lat), parseFloat(lng));

                    const distance = computeDistanceBetween(currentLatlng, contentLocation)
                    if ((distance / 1000) <= location.range) {
                        nearRoom.push(doc.data());
                    }
                })
                return nearRoom
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