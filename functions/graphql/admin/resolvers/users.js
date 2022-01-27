const { ref, set } = require("firebase/database");
const { db, client: dbClient } = require('../../../utility/admin')
const { client, server } = require('../../../utility/algolia')
const { ALGOLIA_INDEX_USERS } = require('../../../constant/post')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { createLogs, hasAccessPriv, LIST_OF_PRIVILEGE } = require('../usecase/admin');

module.exports = {
    Query: {
        async searchUser(_, { search, status, perPage, page, filters = {} }, _context) {
            const index = client.initIndex(ALGOLIA_INDEX_USERS);
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
            const _tags = []
            console.log('filters: ', filters)
            if (status) facetFilters.push([`status:${status}`])
            if (filters?.hasEmail) _tags.push(`has_email`)
            if (filters?.hasPhoneNumber) _tags.push(`has_phone_number`)
            if (filters?.isSuspend) facetFilters.push([`status:suspended`])

            if (_tags.length) facetFilters.push([`_tags:${_tags.join(',')}`])

            try {
                return new Promise(async (resolve, reject) => {
                    const payload = { ...defaultPayload, ...pagination }

                    if (facetFilters.length) payload.facetFilters = facetFilters

                    console.log('payload: ', payload);
                    index.search(search, payload)
                        .then(async res => {
                            const { hits, page: nbPage, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;
                            const userIds = [];
                            if (hits.length) {
                                hits.forEach(async data => {
                                    userIds.push(data.objectID);
                                })
                            }

                            if (userIds.length) {
                                const getUsers = await db.collection('users').where('id', 'in', userIds).get()
                                const users = getUsers.docs.map(doc => doc.data())

                                // return following structure data algolia
                                resolve({ hits: users, page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS })
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
    },
    Mutation: {
        async changeUserStatus(_, { status, username }, _context) {
            const { name, level, id, levelName } = await adminAuthContext(_context)
            // only level 3 should be ask for review update user status
            const listStatus = ['active', 'banned', 'delete', 'cancel'];

            const includeStatus = listStatus.includes(status)

            if (status === 'banned' && !hasAccessPriv({ id: level, action: LIST_OF_PRIVILEGE.BAN_USER })) throw new Error('Permission Denied')

            if (!includeStatus) {
                return {
                    status: `Error, please use status one of ${listStatus.join(',')}`
                }
            }

            try {
                const index = server.initIndex(ALGOLIA_INDEX_USERS);
                if (status === 'banned' && level === 3) {
                    const getUsers = await db.collection('notifications')
                        .where('type', '==', 'users')
                        .where('data.username', '==', username)
                        .where('approve', '==', false)
                        .get()
                    const users = getUsers.docs.map(doc => doc.data())

                    if (!users.length) {
                        await db.collection('/notifications').add({
                            type: 'users',
                            data: { username },
                            isVerify: false,
                            adminName: name,
                            adminRole: levelName,
                            action: "Banned",
                            isRead: false
                        })
                    }
                } else {
                    await db.doc(`/users/${username}`)
                        .get()
                        .then(doc => {
                            return doc.ref.update({ status })
                        })
                }

                const user = await db.doc(`/users/${username}`).get()
                const userData = user.data()

                await index.partialUpdateObjects([{
                    objectID: userData.id,
                    status
                }])

                await createLogs({
                    adminId: id,
                    role: level,
                    message: `Admin ${name} request approval to super-admin for change status user ${username} to ${status}`,
                    name
                })

                return status !== 'banned' ? {
                    ...userData,
                    status,
                    message: 'success'
                } : { ...userData, status: 'active', message: 'waiting approval from super admin'}
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
        },
        async approveAdminAction(_, { notifId, approve }, _context) {
            const { name, level, id } = await adminAuthContext(_context)
            const hasAccess = level === 1 || level === 2
            if (!hasAccess) throw new Error("Permission Denied")
            
            let notifData = {}
            await db.doc(`/notifications/${notifId}`)
                .get()
                .then(doc => {
                    notifData = doc.data()
                    if (notifData.type === 'users' && notifData.action === 'Banned') {
                        return doc.ref.update({ isVerify: true, approve })
                    }

                    return doc
                })

            if (!approve) {
                console.log('decline log')
                await createLogs({
                    adminId: id,
                    role: level,
                    message: `Admin ${name} has decline ${notifData.adminName} request for status user ${notifData.data.username} to Banned`,
                    name
                })
    
                return "Success Decline admin action"
            }

            if (notifData.type === "users") {
                if (notifData.action === "Banned") {
                    await db.doc(`/users/${notifData.data.username}`)
                        .get()
                        .then(doc => {
                            return doc.ref.update({ status: 'banned' })
                        })
        
                    console.log('approve log')
                    await createLogs({
                        adminId: id,
                        role: level,
                        message: `Admin ${name} has approved ${notifData.adminName} request for status user ${notifData.data.username} to Banned`,
                        name
                    })
        
                    return "Success Approve admin action"
                }
            }   

            return "Please use the types and actions has been registered"
        },
        async syncAlogliaFirebase(_, { }, _context) {
            const index = server.initIndex(ALGOLIA_INDEX_USERS);
            const pagination = {
                "hitsPerPage": 1000,
                "page": 0,
            };
    
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
            
            const searchDocs = await index.search('', { ...pagination, ...defaultPayload })
            
            const newHits = await searchDocs.hits.map(async ({ dob, joinDate, objectID, ...rest }) => {
                const fbdata = await db.doc(`/users/${rest.username}`).get()
                const dataParse = await fbdata.data()
                console.log('res: ', dataParse)
                return ({
                    ...rest,
                    status: dataParse.status,
                    dob,
                    objectID,
                    dob_timestamp: new Date(dob).getTime(),
                    date_timestamp: new Date(joinDate).getTime()
                })
            })

            const parseAwait = await Promise.all(newHits)

            await index.partialUpdateObjects(parseAwait)
        }
    }
}