const { db, docsId } = require('../../../utility/admin')
const { get } = require('lodash')
const moment = require('moment');
const { client, server } = require('../../../utility/algolia')
const { ALGOLIA_INDEX_USERS, ALGOLIA_INDEX_USERS_DESC, ALGOLIA_INDEX_USERS_ASC } = require('../../../constant/post')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { createLogs, hasAccessPriv, LIST_OF_PRIVILEGE } = require('../usecase/admin');

module.exports = {
    Query: {
        async searchUser(_, { search, status, perPage, page, filters = {}, sortBy, useExport = false }, _context) {
            let indexKey = ALGOLIA_INDEX_USERS;
            if (sortBy == 'asc') indexKey = ALGOLIA_INDEX_USERS_ASC
            if (sortBy == 'desc') indexKey = ALGOLIA_INDEX_USERS_DESC

            const index = client.initIndex(indexKey);
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

            const totalUsers = await index.search('', { "hitsPerPage": 1 })

            const pagination = {
                "hitsPerPage": useExport ? totalUsers.nbHits || 0 : perPage || 10,
                "page": page || 0,
            }
            const timestampFrom = get(filters, 'timestamp.from', '');
            const timestampTo = get(filters, 'timestamp.to', '');
            let facetFilters = []
            let newFilters = ``
            const _tags = []

            if (status) facetFilters.push([`status:${status}`])
            if (filters?.hasEmail) _tags.push(`has_email`)
            if (filters?.hasPhoneNumber) _tags.push(`has_phone_number`)
            if (filters?.isSuspend) facetFilters.push([`status:suspended`])

            if (_tags.length) facetFilters.push([`_tags:${_tags.join(',')}`])
            if (timestampFrom) {
                const dateFrom = moment(timestampFrom).startOf('day').valueOf();
                const dateTo = moment(timestampTo).endOf('day').valueOf();

                newFilters = `date_timestamp:${dateFrom} TO ${dateTo}`
            }

            console.log('[log] facetFilter: ', facetFilters);
            try {
                return new Promise(async (resolve, reject) => {
                    const payload = { ...defaultPayload, ...pagination }

                    if (facetFilters.length) payload.facetFilters = facetFilters
                    if (newFilters) payload.filters = newFilters

                    index.search(search, payload)
                        .then(async res => {
                            const { hits, page: nbPage, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;
                            // const userIds = [];
                            // const batches = [];

                            // if (hits.length) {
                            //     hits.forEach(async data => {
                            //         userIds.push(data.username);
                            //     })
                            // }

                            /** Matching data to firebase with multiple requests */
                            // userIds.forEach(username => {
                            //     batches.push(
                            //         db.doc(`/users/${username}`).get().then(doc => doc.data())
                            //     )
                            // })
                            // const newHits = Promise.all(batches).then(content => content.flat());

                            /** Matching data to firebase with separate query by splice 10 data */
                            // while (userIds.length) {
                            //     // const batch = userIds.splice(0, 10);
                            //     // console.log('userIds: ',userIds)

                            //     batches.push(
                            //         db.collection('users')
                            //           .where(
                            //             'id',
                            //             'in',
                            //             userIds
                            //           )
                            //           .get()
                            //           .then(results => results.docs.map(result => {
                            //               console.log('result: ', result.data())
                            //               return ({ /* id: result.id, */ ...result.data() })
                            //             }))
                            //     )
                            // }

                            resolve({ hits, page: nbPage, nbHits, nbPages: nbPages - 1, hitsPerPage, processingTimeMS })
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
            const { name, level, id, levelName } = await adminAuthContext(_context);
            // only level 3 should be ask for review update user status
            const listStatus = ['active', 'banned', 'delete', 'cancel'];

            const includeStatus = listStatus.includes(status);
            const shouldBeRequestApproval = !!(status && level === 3);

            if (!hasAccessPriv({ id: level, action: LIST_OF_PRIVILEGE.BAN_USER })) throw new Error('Permission Denied')

            if (!includeStatus) {
                return {
                    status: `Error, please use status one of ${listStatus.join(',')}`
                }
            }

            const user = await db.doc(`/users/${username}`).get()
            const userData = user.data()

            try {
                const index = server.initIndex(ALGOLIA_INDEX_USERS);
                if (shouldBeRequestApproval) {
                    console.log('send request approval');
                    const getUsers = await db.collection('notifications')
                        .where('type', '==', 'users')
                        .where('data.username', '==', username)
                        .where('isVerify', '==', false)
                        .get()
                    const users = getUsers.docs.map(doc => doc.data())

                    if (users.length) {
                        // return {
                        //     ...userData,
                        //     status: userData.status,
                        //     message: "You or other admin already request to change status for this user"
                        // }
                        throw new Error('You or other admin already request to change status for this user')
                    }
                    await db.collection('/notifications').add({
                        type: 'users',
                        data: {
                            username,
                            profilePicture: userData.profilePicture
                        },
                        isVerify: false,
                        adminName: name,
                        adminRole: levelName,
                        action: status,
                        isRead: false,
                        status: userData.status
                    })

                } else {
                    await db.doc(`/users/${username}`)
                        .get()
                        .then(doc => {
                            return doc.ref.update({ status })
                        })
                }

                if (!shouldBeRequestApproval) {
                    await index.partialUpdateObject({
                        objectID: userData.id,
                        status
                    })
                }

                await createLogs({
                    adminId: id,
                    role: level,
                    message: shouldBeRequestApproval
                        ? `Admin ${name} request approval to super-admin for change status user ${username} to ${status}`
                        : `Admin approve request to change status user ${username} to ${status}`,
                    name
                })

                const message = shouldBeRequestApproval ? 'waiting approval from super admin' : 'success'
                const response = {
                    ...userData,
                    status: shouldBeRequestApproval ? userData.status : status,
                    message
                }

                return response;

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
                    if (notifData.type === 'users' && notifData.action) {
                        return doc.ref.update({ isVerify: true, approve })
                    }

                    if (notifData.type === 'posts' && notifData.action) {
                        return doc.ref.update({ isVerify: true, approve })
                    }

                    if (notifData.type === 'comments' && notifData.action) {
                        return doc.ref.update({ isVerify: true, approve })
                    }

                    return doc
                })
            const userData = await db.doc(`/users/${notifData.data.username}`).get()
            const dataParse = userData.data();
            const handleCreateLog = async (position) => {
                await createLogs({
                    adminId: id,
                    role: level,
                    message: `Admin ${name} has approved ${notifData.adminName} request for status ${position} ${notifData.data.username} to ${notifData.action}`,
                    name
                })
            }

            if (!approve) {
                await createLogs({
                    adminId: id,
                    role: level,
                    message: `Admin ${name} has decline ${notifData.adminName} request for status ${notifData.type} ${notifData.data.username} to ${notifData.action}`,
                    name
                })

                return {
                    id: dataParse.id,
                    status: dataParse.status, // still return previous data status
                    message: "Success Decline admin action"
                }
            }

            if (notifData.type === 'posts') {
                const postsData = await db.doc(`/posts/${notifData.data.postId}`).get()
                const postsParse = postsData.data();
                let status = postsParse?.status;
                let flags = postsParse?.status.flag || [];

                if (notifData.action === LIST_OF_PRIVILEGE.TAKEDOWN) {
                    status = {
                        ...status,
                        active: false,
                        takedown: true,
                        deleted: false
                    }
                }
                if (notifData.action === LIST_OF_PRIVILEGE.ACTIVE_POSTS) {
                    status = {
                        ...status,
                        active: true,
                        takedown: false,
                        deleted: false
                    }
                }

                if (notifData.action === LIST_OF_PRIVILEGE.DELETE_POSTS) {
                    status = {
                        ...status,
                        active: false,
                        takedown: false,
                        deleted: true
                    }
                }

                if (notifData.action === LIST_OF_PRIVILEGE.SET_FLAGS) {
                    status = {
                        ...status,
                        flags: [...flags, ...notifData.data.flags || []]
                    }

                }

                if (notifData.action === LIST_OF_PRIVILEGE.REMOVE_FLAGS) {
                    status = {
                        ...status,
                        flags: []
                    }
                }

                await db.doc(`/posts/${notifData.data.postId}`).get()
                    .then(doc => {
                        doc.ref.update({ status })
                    })
                handleCreateLog('post')
                return {
                    id: postsParse.id,
                    status: notifData.action,
                    message: `Success Approve to action ${notifData.action} post`
                }
            }

            if (notifData.type === 'comments') {
                const CommentData = await db.doc(`/posts/${notifData.data.postId}/comments/${notifData.data.commentId}`).get()
                const commentParse = CommentData.data();
                let status = commentParse?.status;
                let flags = commentParse?.status.flag || [];

                if (notifData.action === LIST_OF_PRIVILEGE.TAKEDOWN) {
                    status = {
                        ...status,
                        active: false,
                        takedown: true,
                        deleted: false
                    }
                }
                if (notifData.action === LIST_OF_PRIVILEGE.ACTIVE_POSTS) {
                    status = {
                        ...status,
                        active: true,
                        takedown: false,
                        deleted: false
                    }
                }

                if (notifData.action === LIST_OF_PRIVILEGE.DELETE_POSTS) {
                    status = {
                        ...status,
                        active: false,
                        takedown: false,
                        deleted: true
                    }
                }

                if (notifData.action === LIST_OF_PRIVILEGE.SET_FLAGS) {
                    status = {
                        ...status,
                        flags: [...notifData.data.flags]
                    }

                }

                if (notifData.action === LIST_OF_PRIVILEGE.REMOVE_FLAGS) {
                    status = {
                        ...status,
                        flags: []
                    }
                }

                const index = server.initIndex('comments');

                await index.getObject(CommentData.id)
                    .then(async data => {
                        await index.partialUpdateObject({
                            ...data,
                            objectID: CommentData.id,
                            status: newData.status,
                        })
                    }).catch(() => console.log('err'))

                await db.doc(`/posts/${notifData.data.postId}/comments/${notifData.data.commentId}`).get()
                    .then(doc => {
                        doc.ref.update({ status })
                    })

                handleCreateLog('comment')

                return {
                    id: commentParse.id,
                    status: notifData.action,
                    message: `Success Approve to action ${notifData.action} Comment`
                }
            }

            if (notifData.type === "users") {
                await db.doc(`/users/${notifData.data.username}`)
                    .get()
                    .then(doc => {
                        return doc.ref.update({ status: notifData.action === 'banned' ? 'banned' : 'active' })
                    })

                handleCreateLog('user')

                return {
                    id: dataParse.id,
                    status: notifData.action, // still return previous data status
                    message: "Success Approve admin action"
                }
            } else {
                return {
                    id: dataParse.id,
                    status: notifData.action, // still return previous data status
                    message: "payload notifId or approve is required"
                }
            }
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