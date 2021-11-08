const admin = require('firebase-admin')

admin.initializeApp();

const db = admin.firestore()
const auth = admin.auth()
db.settings({ ignoreUndefinedProperties: true })

const { PubSub, withFilter } = require('graphql-subscriptions')
const pubSub = new PubSub;

const geofire = require('geofire-common')

const NOTIFICATION_ADDED = "NOTIFICATION_ADDED"

module.exports = { db, admin, auth, NOTIFICATION_ADDED, pubSub, withFilter, geofire }