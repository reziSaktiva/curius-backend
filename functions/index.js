const functions = require('firebase-functions');

const client = require('express')();
const admin = require('express')();

const { client: algoliaClient } = require('./utility/algolia')

const { ApolloServer } = require('apollo-server-express');

const typeDefsClient = require('./graphql/users/typeDefs')
const resolversClient = require('./graphql/users/resolvers/index');

const typeDefsAdmin = require('./graphql/admin/typeDefs')
const resolversAdmin = require('./graphql/admin/resolvers/index');
const { ALGOLIA_INDEX_POSTS, ALGOLIA_INDEX_POSTS_ROOMS } = require('./constant/post');

// Global Config
require('dotenv').config()

const context = async ({ req, connection }) => {
    if (req) {
        return { req }
    }
    if (connection) {
        return { connection }
    }
}

const serverUsers = new ApolloServer({
    typeDefs: typeDefsClient,
    resolvers: resolversClient,
    context // Will take request body' and forward it to the context
})

const serverAdmin = new ApolloServer({
    typeDefs: typeDefsAdmin,
    resolvers: resolversAdmin,
    context
})

serverUsers.applyMiddleware({ app: client, path: '/', cors: true })
serverAdmin.applyMiddleware({ app: admin, path: '/', cors: true })

const postsIndex = algoliaClient.initIndex(ALGOLIA_INDEX_POSTS)

exports.onPostDelete = functions.region('asia-southeast2')
    .firestore
    .document('/posts/{id}')
    .onDelete(async (_snapshot, context) => {
        try {
            postsIndex.deleteObject(context.params.id.toString())
        }
        catch (err) {
            functions.logger.log(err)
        }
    })

exports.onPostCreate = functions.region('asia-southeast2')
    .firestore
    .document('/posts/{id}')
    .onCreate(async (snapshot, context) => {
        try {
            const newData = snapshot.data();
            const id = context.params.id;
            let tags = []

            if(newData.room){
                tags.push('has_post-room')
            } else {
                tags.push('is_not_post_room')
            }

            const newPostPayload = {
                ...newData,
                objectID: id,
                _tags: tags,
                _geoloc: {
                    lat: newData.location.lat,
                    lng: newData.location.lng
                },
                // field algolia
                date_timestamp: new Date(newData.createdAt).getTime()
            }
            postsIndex.saveObjects([newPostPayload], { autoGenerateObjectIDIfNotExist: false })
        }
        catch (err) {
            functions.logger.log(err)
        }
    })

exports.onPostUpdate = functions.region('asia-southeast2')
    .firestore
    .document('/posts/{id}')
    .onUpdate(async (snapshot, _context) => {
        try {
            const newData = snapshot.after.data();
            const objectID = snapshot.after.id;

            postsIndex.saveObject({ ...newData, objectID })
        }
        catch (err) {
            functions.logger.log(err)
        }
    })

exports.graphql = functions.region('asia-southeast2').https.onRequest(client)
exports.admin = functions.region('asia-southeast2').https.onRequest(admin)