const admin = require('firebase-admin')

admin.initializeApp();

const db = admin.firestore()

const docsId = admin.firestore.FieldPath.documentId();
const client = admin.database()
const auth = admin.auth()
const storage = admin.storage()
db.settings({ ignoreUndefinedProperties: true })

const { PubSub, withFilter } = require('graphql-subscriptions')
const pubSub = new PubSub;

const geofire = require('geofire-common')

const NOTIFICATION_ADDED = "NOTIFICATION_ADDED"

module.exports = { db, admin, auth, docsId, NOTIFICATION_ADDED, pubSub, withFilter, geofire, client, storage }