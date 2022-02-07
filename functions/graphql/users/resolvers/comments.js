const { db, NOTIFICATION_ADDED, pubSub } = require('../../../utility/admin')
const { UserInputError } = require('apollo-server-express');

const fbAuthContext = require('../../../utility/fbAuthContext')
const randomGenerator = require('../../../utility/randomGenerator')

module.exports = {
    Mutation: {
        async getMoreChild(_, { postId, commentId, lastChildId }, _context) {
            const commentChildCollections = db.collection(`/posts/${postId}/comments`).where("reply.id", '==', commentId)

            try {
                // if (lastChildId) {
                //     // const lastDocument = await db.doc(`/posts/${postId}/comments/${lastChildId}`).get()

                //     return commentChildCollections.get()
                //         .then(doc => doc.docs.map(doc => doc.data()))
                // }
                let comments = await commentChildCollections.get()
                    .then(doc => doc.docs.map(doc => doc.data()))

                comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                comments.pop()

                return comments
            }
            catch (err) {
                throw new Error(err)
            }
        },
        async getMoreComments(_, { postId, lastCommentId }, _context) {
            const commentCommentCollections = db.collection(`/posts/${postId}/comments`).where("reply.id", '==', null).where("status.active", '==', true).orderBy('createdAt', 'asc')

            try {
                const lastDocument = await db.doc(`/posts/${postId}/comments/${lastCommentId}`).get()

                return commentCommentCollections.limit(2).startAfter(lastDocument).get()
                    .then(doc => doc.docs.map(doc => doc.data()))
            }
            catch (err) {
                throw new Error(err)
            }
        },
        async createComment(_, { id, textContent, reply, media }, context) {
            const { username } = await fbAuthContext(context)
            const { name, displayImage, colorCode } = await randomGenerator(username, id)
            const postDocument = db.doc(`/posts/${id}`)
            const commentCollection = db.collection(`/posts/${id}/comments`)
            const subscribeCollection = db.collection(`/posts/${id}/subscribes`)

            if (textContent.trim() === '' && !media.content) {
                throw new UserInputError('kamu tidak bisa membuat comment tanpa text', { error: { textContent: 'kamu tidak bisa membuat comment tanpa text' } })
            }
            try {
                const replyCount = 0

                let newComment = {
                    owner: username,
                    createdAt: new Date().toISOString(),
                    textContent,
                    reply,
                    media,
                    status: {
                        active: true,
                        flags: [],
                        takedown: false
                    },
                    reportedCount: 0,
                }

                let postOwner;

                await postDocument.get()
                    .then(doc => {
                        if (!doc.exists) {
                            throw new UserInputError('Postingan tidak ditemukan/sudah dihapus')
                        } else {
                            postOwner = doc.data().owner;

                            if (!reply.id) {
                                newComment = {
                                    ...newComment,
                                    replyCount,
                                    children: []
                                }
                            }

                            doc.ref.update({ commentCount: doc.data().commentCount + 1, rank: doc.data().rank + 1 })
                            return commentCollection.add(newComment)
                        }
                    })
                    .then(doc => {
                        newComment.id = doc.id
                        newComment.displayName = name
                        newComment.displayImage = displayImage
                        newComment.colorCode = colorCode

                        if (reply.id) {
                            db.doc(`/posts/${id}/comments/${reply.id}`).get()
                                .then(doc => {
                                    doc.ref.update({ replyCount: doc.data().replyCount + 1, children: [newComment] })
                                })
                        }

                        doc.update({ id: doc.id, displayName: name, displayImage: displayImage, colorCode })

                        if (newComment.reply.username && newComment.reply.id && newComment.reply.username !== username) {
                            const notifReply = {
                                owner: newComment.reply.username,
                                recipient: newComment.reply.username,
                                sender: username,
                                read: false,
                                postId: id,
                                type: 'REPLY_COMMENT',
                                createdAt: new Date().toISOString(),
                                displayName: name,
                                displayImage,
                                colorCode
                            }
                            return db.collection(`/users/${newComment.reply.username}/notifications`).add(notifReply)
                                .then(data => {
                                    data.update({ id: data.id })
                                    pubSub.publish(NOTIFICATION_ADDED, { notificationAdded: { ...notifReply, id: data.id } })

                                    return subscribeCollection.get()
                                        .then(data => {
                                            if (!data.empty) {
                                                return data.docs.forEach(doc => {
                                                    if (doc.data().owner !== username) {
                                                        // FIX ME
                                                        const notifSubscribe = {
                                                            owner: doc.data().owner,
                                                            recipient: postOwner,
                                                            sender: username,
                                                            read: false,
                                                            postId: id,
                                                            type: 'COMMENT',
                                                            createdAt: new Date().toISOString(),
                                                            displayName: name,
                                                            displayImage,
                                                            colorCode
                                                        }
                                                        return db.collection(`/users/${doc.data().owner}/notifications`).add(notifSubscribe)
                                                            .then(data => {
                                                                data.update({ id: data.id })
                                                            })
                                                    }
                                                })
                                            }
                                        })
                                })

                        }

                        if (postOwner !== username) {
                            // FIX ME (done)
                            const notifData = {
                                owner: postOwner,
                                recipient: postOwner,
                                sender: username,
                                read: false,
                                postId: id,
                                type: 'COMMENT',
                                createdAt: new Date().toISOString(),
                                displayName: name,
                                displayImage,
                                colorCode
                            }
                            return db.collection(`/users/${postOwner}/notifications`).add(notifData)
                                .then(data => {
                                    data.update({ id: data.id })

                                    return subscribeCollection.get()
                                        .then(data => {
                                            if (!data.empty) {
                                                return data.docs.forEach(doc => {
                                                    if (doc.data().owner !== username) {
                                                        // FIX ME
                                                        const notifSubscribe = {
                                                            owner: doc.data().owner,
                                                            recipient: postOwner,
                                                            sender: username,
                                                            read: false,
                                                            postId: id,
                                                            type: 'COMMENT',
                                                            createdAt: new Date().toISOString(),
                                                            displayName: name,
                                                            displayImage,
                                                            colorCode
                                                        }
                                                        return db.collection(`/users/${doc.data().owner}/notifications`).add(notifSubscribe)
                                                            .then(data => {
                                                                data.update({ id: data.id })
                                                            })
                                                    }
                                                })
                                            }
                                        })
                                })
                        }
                    })
                return newComment
            }
            catch (err) {
                throw new Error(err)
            }
        },
        async deleteComment(_, { postId, commentId }, context) {
            const { username } = await fbAuthContext(context)
            const postDocument = await db.doc(`/posts/${postId}`).get()
            const getCommentDoc = await db.doc(`/posts/${postId}/comments/${commentId}`).get()
            const subscribeCollection = await db.collection(`/posts/${postId}/subscribes`).get()

            try {
                if (!getCommentDoc.exists) throw new UserInputError("Comment tidak di temukan/sudah di hapus")
                else {
                    if (username !== getCommentDoc.data().owner) throw new UserInputError("comment is not yours")

                    if (getCommentDoc.data().reply.id) {
                        const parentComment = await db.doc(`/posts/${postId}/comments/${getCommentDoc.data().reply.id}`).get()
                        if (getCommentDoc.id === parentComment.data().children[0].id) {
                            const children = await db.collection(`/posts/${postId}/comments`).where("reply.id", '==', parentComment.id).where("status.active", '==', true).orderBy('createdAt', 'asc').get()

                            const lastChildren = children.docs[children.docs.length - 2];
                            const dataChildren = children.docs.length <= 1 ? [] : [lastChildren.data()]

                            parentComment.ref.update({ children: dataChildren, replyCount: parentComment.data().replyCount - 1 })
                        } else {
                            parentComment.ref.update({ replyCount: parentComment.data().replyCount - 1 })
                        }
                        postDocument.ref.update({ commentCount: postDocument.data().commentCount - 1, rank: postDocument.data().rank - 1 })
                    } else {
                        const children = await db.collection(`/posts/${postId}/comments`).where('reply.id', '==', commentId).get()

                        children.forEach(doc => {
                            doc.ref.delete()
                        })

                        const lengthData = children.docs.length + 1
                        postDocument.ref.update({ commentCount: postDocument.data().commentCount - lengthData, rank: postDocument.data().rank - lengthData })
                    }

                    getCommentDoc.ref.delete()

                    if (!subscribeCollection.empty) {
                        subscribeCollection.docs.forEach(doc => {
                            return db.collection(`/users/${doc.data().owner}/notifications`)
                                .where('postId', "==", postId)
                                .where('owner', '==', doc.data().owner)
                                .get()
                                .then(data => {
                                    return data.docs.forEach(doc => {
                                        db.doc(`/users/${doc.data().owner}/notifications/${doc.data().id}`).delete()

                                        if (postOwner !== username) {
                                            return db.collection(`/users/${postOwner}/notifications`)
                                                .where('type', '==', "COMMENT")
                                                .where('sender', '==', username).get()
                                                .then(data => {
                                                    db.doc(`/users/${postOwner}/notifications/${data.docs[0].id}`).delete()
                                                })
                                        }

                                    })
                                })
                        })
                    }

                }

                return getCommentDoc.data()
            }
            catch (err) {
                throw new Error(err)
            }
        }
    }
}