const { UserInputError } = require('apollo-server-express')
const { ALGOLIA_INDEX_ROOMS } = require('../../../constant/post')
const { db } = require('../../../utility/admin')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { client } = require('../../../utility/algolia')

module.exports = {
    Mutation: {
        async createRoom(_, { roomName, description, startingDate, tillDate, displayPicture, location, range }, context) {
            const { name, level } = await adminAuthContext(context)
            const index = client.initIndex(ALGOLIA_INDEX_ROOMS)

            const data = {
                roomName,
                description,
                startingDate,
                tillDate,
                location: {
                    ...location,
                    range
                },
                displayPicture,
                createdBy: name,
                createdAt: new Date().toISOString()
            }

            try {
                if (name) {
                    await db.collection('room').add(data)
                        .then(doc => {
                            const newRoomPayload = {
                                ...data,
                                id: doc.id,
                                objectID: doc.id,
                                _geoloc: {
                                    lat: '',
                                    lng: ''
                                },
                                // field algolia
                                date_timestamp: Date.now()
                            };
                            index.saveObjects([newRoomPayload], { autoGenerateObjectIDIfNotExist: false })
                            doc.update({ id: doc.id })
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