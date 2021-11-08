const { db } = require('../../../utility/admin')
const { client } = require('../../../utility/algolia')

module.exports = {
    Query: {
        async getAdmin() {
            const getAdmin = await db.collection('admin').get()
            const admin = getAdmin.docs.map(doc => doc.data())

            try {
                return admin
            }
            catch (err) {
                console.log(err);
            }
        }
    },
    Mutation: {
        async checkEmail(_, { email }) {
            const getAdmin = await db.collection('admin').where('email', '==', email).get()

            try {
                return !getAdmin.empty
            }
            catch (err) {
                console.log(err);
            }
        },
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

                            console.log(users);
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