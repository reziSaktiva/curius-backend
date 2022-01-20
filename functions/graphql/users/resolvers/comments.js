const { db, NOTIFICATION_ADDED, pubSub } = require('../../../utility/admin')
const { UserInputError } = require('apollo-server-express');

const fbAuthContext = require('../../../utility/fbAuthContext')
const randomGenerator = require('../../../utility/randomGenerator')

module.exports = {
    Mutation: {
        async getMoreChild(_, { postId, commentId, lastChildId }, _context) {
            const commentChildCollections = db.collection(`/posts/${postId}/comments/${commentId}/childrenStorage`).orderBy('createdAt', 'asc')
            try {
                if (lastChildId) {
                    const lastDocument = await db.doc(`/posts/${postId}/comments/${commentId}/childrenStorage/${lastChildId}`).get()

                    return commentChildCollections.limit(2).startAfter(lastDocument).get()
                        .then(doc => doc.docs.map(doc => doc.data()))
                }
                return commentChildCollections.limit(2).get()
                    .then(doc => doc.docs.map(doc => doc.data()))
            }
            catch (err) {
                throw new Error(err)
            }
        },
        async createComment(_, { id, text, reply, photo }, context) {
            const { username } = await fbAuthContext(context)
            const { name, displayImage, colorCode } = await randomGenerator(username, id)
            const pathCommentCollection = reply.id ? `/posts/${id}/comments/${reply.id}/childrenStorage` : `/posts/${id}/comments`
            const postDocument = db.doc(`/posts/${id}`)
            const commentCollection = db.collection(pathCommentCollection)
            const subscribeCollection = db.collection(`/posts/${id}/subscribes`)

            if (text.trim() === '' && !photo) {
                throw new UserInputError('kamu tidak bisa membuat comment tanpa text', { error: { text: 'kamu tidak bisa membuat comment tanpa text' } })
            }
            try {
                const replyCount = 0

                let newComment = {
                    owner: username,
                    createdAt: new Date().toISOString(),
                    text,
                    reply,
                    photo,
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
                            const isUserHasComment = doc.data().commentedBy.find(owner => owner === username)
                            if (!isUserHasComment) {
                                doc.ref.update({ commentCount: doc.data().commentCount + 1, rank: doc.data().rank + 1, commentedBy: [...doc.data().commentedBy, username] })
                            } else {
                                doc.ref.update({ commentCount: doc.data().commentCount + 1, rank: doc.data().rank + 1 })
                            }

                            postOwner = doc.data().owner;

                            if (!reply.id) {
                                newComment = {
                                    ...newComment,
                                    replyCount,
                                    children: []
                                }
                            }


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
                console.log(err);
                throw new Error(err)
            }
        },
        async deleteComment(_, { postId, commentId, childrenId }, context) {
            const { username } = await fbAuthContext(context)
            const postDocument = await db.doc(`/posts/${postId}`).get()
            const getCommentDoc = await db.doc(childrenId ? `/posts/${postId}/comments/${commentId}/childrenStorage/${childrenId}` : `/posts/${postId}/comments/${commentId}`).get()
            const childrenStorageCollection = await db.collection(`/posts/${postId}/comments/${commentId}/childrenStorage`).get()
            const subscribeCollection = await db.collection(`/posts/${postId}/subscribes`).get()

            try {
                if (!getCommentDoc.exists) throw new UserInputError("Comment tidak di temukan/sudah di hapus")
                else {
                    if (username !== getCommentDoc.data().owner) throw new UserInputError("comment is not yours")

                    getCommentDoc.ref.delete()
                    if (!childrenId) {
                        if (!childrenStorageCollection.empty) {
                            const lengthData = childrenStorageCollection.docs.length + 1
                            childrenStorageCollection.forEach(doc => {
                                doc.ref.delete()
                            })
                            postDocument.ref.update({ commentCount: postDocument.data().commentCount - lengthData, rank: postDocument.data().rank - lengthData })
                        } else {
                            postDocument.ref.update({ commentCount: postDocument.data().commentCount - 1, rank: postDocument.data().rank - 1 })
                        }
                    } else {
                        postDocument.ref.update({ commentCount: postDocument.data().commentCount - 1, rank: postDocument.data().rank - 1 })

                    }


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