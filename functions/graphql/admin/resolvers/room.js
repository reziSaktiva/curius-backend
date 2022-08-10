const { UserInputError } = require('apollo-server-express')
const { Client } = require("@googlemaps/google-maps-services-js");
const axios = require('axios')

const { ALGOLIA_INDEX_ROOMS, ALGOLIA_INDEX_ROOMS_ASC, ALGOLIA_INDEX_ROOMS_DESC } = require('../../../constant/post')
const { db } = require('../../../utility/admin')
const { createLogs } = require('../usecase/admin');

const adminAuthContext = require('../../../utility/adminAuthContext')
const { client, server } = require('../../../utility/algolia')
const { API_KEY_GEOCODE } = require('../../../utility/secret/API')
const { hasAccessPriv, LIST_OF_PRIVILEGE } = require('../usecase/admin');
const room = require('../../users/resolvers/room');

module.exports = {
  Query: {
    async searchRoom(_, { name, location, useDetailLocation, perPage, page, isDeactive, sortBy = 'desc', useExport = false }, context) {
      let indexKey = ALGOLIA_INDEX_ROOMS
      if (sortBy === 'asc') indexKey = ALGOLIA_INDEX_ROOMS_ASC
      if (sortBy === 'desc') indexKey = ALGOLIA_INDEX_ROOMS_DESC

      const index = client.initIndex(indexKey);
      const googleMapsClient = new Client({ axiosInstance: axios });

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

      let aroundLatLng = '';
      if (location) {
        const getPlaces = await googleMapsClient.findPlaceFromText({
          params: {
            input: location,
            inputtype: 'textquery',
            key: API_KEY_GEOCODE,
            fields: ["place_id", "name", "formatted_address", "geometry"]
          },
          timeout: 5000
        }, axios)

        const candidates = get(getPlaces, 'data.candidates', [])
        const detailplaces = candidates.map(({ geometry }) => {
          const loc = get(geometry, 'location', {})
          return ({
            lat: loc.lat,
            lng: loc.lng,
          })
        })

        // TODO: need to makesure filter with multiple geolocation
        aroundLatLng = `${detailplaces[0].lat}, ${detailplaces[0].lng}`
      }

      const geoLocPayload = location && aroundLatLng ? {
        "aroundLatLng": aroundLatLng,
      } : {};

      const totalRoom = await index.search('', { "hitsPerPage": 1 })

      const pagination = {
        "hitsPerPage": useExport ? totalRoom.nbHits || 0 : perPage || 10,
        "page": page || 0,
      }

      try {
        const payload = {
          ...defaultPayload,
          ...geoLocPayload,
          ...pagination,
          ...(isDeactive !== undefined ? { facetFilters: [[`isDeactive:${isDeactive}`]] } : {})
        };
        const searchDocs = await index.search(name, payload)

        const rooms = searchDocs.hits.map(async doc => {
          const room = await db.doc(`/room/${doc.objectID}`).get()

          const dataParse = room.data()
          if (!useDetailLocation || !dataParse?.location?.lat) return dataParse

          const request = await googleMapsClient
            .reverseGeocode({
              params: {
                latlng: `${dataParse?.location?.lat}, ${dataParse?.location?.lng}`,
                language: 'en',
                result_type: 'street_address|administrative_area_level_4',
                location_type: 'APPROXIMATE',
                key: API_KEY_GEOCODE
              },
              timeout: 5000 // milliseconds
            }, axios)

          const address = request.data.results[0].formatted_address

          return {
            ...dataParse,
            address
          }
        })

        // Will enable if data firebase and algolia not sync (special case)
        // const ids = searchDocs.hits.map(doc => doc.objectID)
        // if (!ids.length) return searchDocs

        // const getRooms = await db.collection('room').where('id', 'in', ids).get()
        // const rooms = await getRooms.docs.map(async (doc, idx) => {
        //   const dataParse = doc.data()
        //   if (!useDetailLocation || !dataParse?.location?.lat) return dataParse

        //   const request = await googleMapsClient
        //     .reverseGeocode({
        //       params: {
        //         latlng: `${dataParse?.location?.lat}, ${dataParse?.location?.lng}`,
        //         language: 'en',
        //         result_type: 'street_address|administrative_area_level_4',
        //         location_type: 'APPROXIMATE',
        //         key: API_KEY_GEOCODE
        //       },
        //       timeout: 5000 // milliseconds
        //     }, axios)

        //   const address = request.data.results[0].formatted_address

        //   return {
        //     ...dataParse,
        //     address
        //   }
        // })

        return { ...searchDocs, hits: rooms }
      } catch (err) {
        return err
      }
    },
    async getRoomById(_, { id }) {
      const getRooms = await db.collection('room').where('id', '==', id).get()
      const rooms = await getRooms.docs.map(async doc => doc.data())

      return rooms[0]
    }
  },
  Mutation: {
    async createRoom(_, { roomName, description, startingDate, tillDate, displayPicture, location, range }, context) {
      const { name, level } = await adminAuthContext(context);

      if (!hasAccessPriv({ id: level, action: LIST_OF_PRIVILEGE.CREATE_ROOM })) throw new Error('Permission Denied');

      const index = server.initIndex(ALGOLIA_INDEX_ROOMS)

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
        totalPosts: 0,
        isDeactive: new Date(startingDate).getTime() < Date.now() && new Date(tillDate).getTime() > Date.now(),
        createdBy: name,
        createdAt: new Date().toISOString()
      }

      try {
        if (name) {
          return await db.collection('room').add(data)
            .then(async doc => {
              const newRoomPayload = {
                ...data,
                id: doc.id,
                objectID: doc.id,
                _geoloc: {
                  lat: location.lat,
                  lng: location.lng
                },
                isDeactive: new Date(data.startingDate).getTime() < Date.now() && new Date(data.tillDate).getTime() > Date.now(),
                // field algolia
                date_timestamp: Date.now()
              };
              await index.saveObjects([newRoomPayload], { autoGenerateObjectIDIfNotExist: false })
              doc.update({ id: doc.id })

              return {
                ...data,
                id: doc.id,
              }
            })
        } else {
          throw new UserInputError("please login first")
        }
      }
      catch (err) {
        throw new Error(err)
      }
    },
    async deleteRoom(_, { roomId }, context) {
      const { name, level, id } = await adminAuthContext(context)
      try {

        const index = server.initIndex(ALGOLIA_INDEX_ROOMS)

        const targetCollection = `/room/${roomId}`
        await db.doc(targetCollection).delete();
        await index.deleteObject(roomId);

        await db.collection('posts').where('room', '==', roomId).get()
          .then(data => {
            data.docs.forEach(doc => {
              doc.ref.delete()
            })
          })

        await createLogs({
          adminId: id,
          role: level,
          message: `Admin ${name} has been delete roomId ${roomId}`,
          name
        });

        return {
          id: roomId,
          message: 'Success delete roomId ' + roomId
        }
      } catch (err) {
        return {
          id: roomId,
          status: 'Error',
          message: err
        }
      }
    },
    async updateRoom(_, props, context) {
      const { isDeactive, roomId, roomName, description, startingDate, tillDate, displayPicture, location, range } = props
      const { name } = await adminAuthContext(context)
      if (!roomId) throw new Error('Room ID is requred')
      if (!name) throw new Error('Access Denied')
      const index = server.initIndex(ALGOLIA_INDEX_ROOMS)

      const targetCollection = `/room/${roomId}`

      try {
        let newData = {}
        await db.doc(targetCollection).get().then(
          doc => {
            const payload = doc.data()

            if (roomName) payload.roomName = roomName
            if (description) payload.description = description
            if (startingDate) payload.startingDate = startingDate
            if (tillDate) payload.tillDate = tillDate
            if (displayPicture) payload.displayPicture = displayPicture
            if (location && location.lat && location.lng) payload.location = { ...payload.location, ...location }
            if (range) payload.location = { ...payload.location, range }
            if (isDeactive !== null || isDeactive !== undefined) {
              if (isDeactive) payload.isDeactive = true
              else payload.isDeactive = false
            }

            newData = { id: doc.id, ...doc.data(), ...payload }
            return doc.ref.update(payload)
          }
        )


        await index.partialUpdateObjects([{
          objectID: roomId,
          ...newData
        }]);

        return newData
      } catch (err) {
        return err
      }
    }
  }
}