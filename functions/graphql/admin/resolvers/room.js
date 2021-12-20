const { UserInputError } = require('apollo-server-express')
const { ALGOLIA_INDEX_ROOMS } = require('../../../constant/post')
const { db } = require('../../../utility/admin')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { server, client } = require('../../../utility/algolia')

module.exports = {
    Mutation: {
        async createRoom(_, { roomName, description, startingDate, tillDate, displayPicture }, context) {
            const { name, level } = await adminAuthContext(context)
            const index = client.initIndex(ALGOLIA_INDEX_ROOMS)

            const data = {
                roomName,
                description,
                startingDate,
                tillDate,
                displayPicture,
                createdAt: new Date().toISOString()
            }

            try {
                if (name) {
                    db.doc(`/room/${roomName}`).set(data)

                    await db.doc(`/room/${roomName}`).get()
                        .then(doc => {
                            const newRoomPayload = {
                                ...data,
                                objectID: doc.id,
                                _geoloc: {
                                    lat: '',
                                    lng: ''
                                },
                                // field algolia
                                date_timestamp: Date.now()
                            };

                            index.saveObjects([newRoomPayload], { autoGenerateObjectIDIfNotExist: false })
                        })

                    return `room ${roomName} has been created by ${name}`
                } else {
                    throw new UserInputError("please login first")
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
    }
}