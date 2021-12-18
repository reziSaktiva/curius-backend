const { db } = require('../../../utility/admin')
const { isValidPhoneNumber, isValidEmail } = require('../../../utility/validators')
const { client, server } = require('../../../utility/algolia')
const { ALGOLIA_INDEX_USERS } = require('../../../constant/post')
const { getIdsFromHits } = require('../../../app/search')

module.exports = {
    Mutation: {
        async changeUserStatus(_, { status, username }, _context) {
            const listStatus = ['active', 'banned', 'delete', 'cancel'];

            const includeStatus = listStatus.includes(status)

            if (!includeStatus) {
                return {
                    status: `Error, please use status one of ${listStatus.join(',')}`
                }
            }

            try {
                const index = server.initIndex(ALGOLIA_INDEX_USERS);
                await db.doc(`/users/${username}`)
                    .get()
                    .then(doc => {
                        return doc.ref.update({ status })
                    })

                const user = await db.doc(`/users/${username}`).get()
                const userData = user.data()
                
                await index.partialUpdateObjects([{
                    objectID: userData.id,
                    status
                }])
                return {
                    ...userData,
                    status
                }
            } catch (err) {
                throw new Error(err)
            }
        },
        async searchUser(_, { search, status, perPage, page }, _context) {
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
            let facetFilters = []
            let searchableAttributes = []

            if (status) {
                facetFilters.push([`status:${status}`]);
                searchableAttributes.push('status');
            }

            if (isValidPhoneNumber(search)) {
                facetFilters.push([`mobileNumber:${search}`])
                searchableAttributes.push('mobileNumber')
            }

            if (isValidEmail(search)) {
                facetFilters.push([`email:${search}`])
                searchableAttributes.push('email')
            }
            
            try {
                const payload = { ...defaultPayload, ...pagination }
                
                if (facetFilters.length) payload.facetFilters = facetFilters;
                
                if (searchableAttributes.length) {
                    const settings = await index.getSettings();
            
                    const attribute = settings.searchableAttributes || [];
                    if (attribute.length && !attribute.includes(searchableAttributes)) {
                        await index.setSettings({ searchableAttributes })
                    }
                }

                const responseSearch = await index.search(search, payload);
                const { hits, page: nbPage, nbHits, nbPages, hitsPerPage, processingTimeMS } = responseSearch;
                
                const userIds = getIdsFromHits(hits);

                if (userIds.length) {
                    const getUsers = await db.collection('users').where('id', 'in', userIds).get()
                    const users = getUsers.docs.map(doc => doc.data())

                    // return following structure data algolia
                    return { hits: users, page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS }
                }

                return { hits: [], page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS }
            }
            catch (err) {
                console.log(err);
                return err;
            }
        }
    }
}