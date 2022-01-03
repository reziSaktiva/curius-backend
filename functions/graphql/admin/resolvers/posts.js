const { get } = require('lodash')
const { Client } = require("@googlemaps/google-maps-services-js");
const axios = require('axios')
const { server, client } = require('../../../utility/algolia')
const { db } = require('../../../utility/admin')
const { UserInputError } = require('apollo-server-express');

const { ALGOLIA_INDEX_POSTS, ALGOLIA_INDEX_REPORT_POSTS } = require('../../../constant/post')
const { API_KEY_GEOCODE } = require('../../../utility/secret/API')

const isNullOrUndefined = data => {
  return typeof data !== undefined || data !== null
}

const getEndpointPost = (room, id, target = '') => {
  return `/${room ? `room/${room}/posts` : 'posts'}/${id}${target}`
}

module.exports = {
  Query: {
    async getReportedByIdPost(_, { idPost, lastId, perPage }, _ctx) {
      if (!idPost) UserInputError('id post is required')

      let lastDoc = null;

      if (lastId) lastDoc = await db.doc(`/reports/${lastId}/`).get()

      const reportCollection = db.collection('/reports')

      let query;
      if (lastId) query = await reportCollection.where('idPost', '==', idPost).startAfter(lastDoc).limit(perPage).get()
      else query = await reportCollection.where('idPost', '==', idPost).get();

      const parseSnapshot = query.docs.map(doc => doc.data())

      return parseSnapshot;
    },
    async getSinglePost(_, { id, room }, _ctx) {
      if (!id) throw new Error('id is Required')

      const postDocument = db.doc(getEndpointPost(room, id))
      const commentCollection = db.collection(getEndpointPost(room, id, '/comments')).orderBy('createdAt', 'asc')
      const likeCollection = db.collection(getEndpointPost(room, id, '/likes'))
      const mutedCollection = db.collection(getEndpointPost(room, id, '/muted'))
      const subscribeCollection = db.collection(getEndpointPost(room, id, '/subscribes'))

      try {
        const dataPost = await postDocument.get();
        const post = dataPost.data();

        if (!dataPost.exists) {
          throw new UserInputError('Post not found')
        } else {

          const userDocument = await db.doc(`/users/${post.owner}`).get();
          const owner = userDocument.data()

          let repost = {}
          const repostId = get(post, 'repost') || {};
          if (repostId) {
            const repostData = await db.doc(getEndpointPost(repostId.room, repostId.repost)).get();

            repost = repostData.data();
          }

          const likesPost = await likeCollection.get();
          const likes = likesPost.docs.map(doc => doc.data()) || []

          const commentsPost = await commentCollection.get();
          const comments = commentsPost.docs.map(doc => doc.data()) || [];

          const mutedPost = await mutedCollection.get();
          const muted = mutedPost.docs.map(doc => doc.data()) || [];

          const subscribePost = await subscribeCollection.get();
          const subscribe = subscribePost.docs.map(doc => doc.data()) || [];

          return {
            post: {
              ...post,
              repost,
              likes,
              comments: comments,
              muted,
              subscribe
            },
            owner
          }
        }
      }
      catch (err) {
        console.log(err)
        throw new Error(err)
      }
    },
    async searchPosts(_, { perPage = 5, page, location, range = 40, hasReported = false, useDetailLocation = false, search, filters }, _ctx) {
      const googleMapsClient = new Client({ axiosInstance: axios });
      const timestampFrom = get(filters, 'timestamp.from', '');
      const ownerPost = get(filters, 'owner', '');
      const timestampTo = get(filters, 'timestamp.to', '');
      const ratingFrom = get(filters, 'ratingFrom', 0);
      const ratingTo = get(filters, 'ratingTo', 0);
      const status = get(filters, 'status', 0);
      const media = get(filters, 'media', []);

      const index = client.initIndex(ALGOLIA_INDEX_POSTS);

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
        "aroundRadius": range * 1000,
      } : {};

      const pagination = {
        "hitsPerPage": perPage || 10,
        "page": page || 0,
      }
      const facetFilters = []

      if (ownerPost) facetFilters.push([`owner:${ownerPost}`])
      if (status) facetFilters.push([`status.active:${status == "active" ? 'true' : 'false'}`])
      if (hasReported) facetFilters.push([`reportedCount > 1`])

      if (timestampFrom) {
        const dateFrom = new Date(timestampFrom).getTime();
        const dateTo = new Date(timestampTo).getTime();

        facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);
      }
      if (ratingFrom && ratingTo) {
        facetFilters.push([`rank: ${ratingFrom} TO ${ratingTo}`])
      }

      if (media.length) {
        let queryTags = []
        if (media.includes('video')) {
          queryTags.push('has_video')
        }
        if (media.includes('image')) {
          queryTags.push('has_images')
        }

        facetFilters.push([`_tags:${queryTags.join(',')}`])
      }

      try {
        const payload = {
          ...defaultPayload,
          ...geoLocPayload,
          ...pagination
        };

        if (facetFilters.length) payload.facetFilters = facetFilters
        const searchDocs = await index.search(search, payload)

        const ids = searchDocs.hits.map(doc => doc.objectID)
        if (!ids.length) return searchDocs

        const getPosts = await db.collection('posts').where('id', 'in', ids).get()
        const posts = await getPosts.docs.map(async doc => {
          const dataParse = doc.data()
          if (!useDetailLocation) return dataParse

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
            location: {
              ...dataParse.location,
              detail: {
                ...dataParse.location.detail,
                formattedAddress: address
              }
            }
          }
        })

        return { ...searchDocs, hits: posts }
      } catch (err) {
        return err
      }
    },
  },
  Mutation: {
    async setStatusPost(_, { active, flags = [], takedown, postId }, _ctx) {
      if (!postId) throw new Error('postId is Required')

      const index = server.initIndex(ALGOLIA_INDEX_POSTS);
      const targetCollection = `/posts/${postId}`
      const data = await db.doc(targetCollection).get()
      const status = {}

      try {
        await db.doc(targetCollection)
          .get()
          .then(doc => {
            const oldPost = data.data()

            if (flags) {
              status.flag = [...(oldPost.status.flag || []), ...flags]
            }

            if (isNullOrUndefined(takedown)) {
              status.takedown = takedown
            }

            if (isNullOrUndefined(active)) {
              status.active = active
            }

            return doc.ref.update({ status })
          })

        // Update Algolia Search Posts
        await index.partialUpdateObjects([{
          objectID: postId,
          status,
        }]);

      } catch (err) {
        console.log(err)
        throw new Error(err)
      }

      return {
        ...data.data(),
        status
      }
    },
    async createReportPostById(_, { idPost, content, userIdReporter }, _ctx) {
      // TODO: makesure which level can reported post
      // const { name, level } = await adminAuthContext(context)
      if (!content) throw new UserInputError('required to fill reason this post')

      try {
        const posts = await db.doc(`/posts/${idPost}`).get().then(
          doc => {
            doc.ref.update({
              reportedCount: (doc.data().reportedCount || 0) + 1
            })

            return doc.data()
          }
        )

        const payload = {
          idPost: posts.id,
          content,
          userIdReporter
        }
        const index = server.initIndex(ALGOLIA_INDEX_REPORT_POSTS);
        const indexPost = server.initIndex(ALGOLIA_INDEX_POSTS);

        const writeRequest = await db.collection('/reports').add(payload)

        // Save index
        await index.saveObjects([payload], {
          autoGenerateObjectIDIfNotExist: true,
        })

        // Update Algolia Search Posts
        await indexPost.partialUpdateObjects([{
          objectID: posts.id,
          reportedCount: posts.reportedCount,
        }]);

        const parseSnapshot = await (await writeRequest.get()).data()

        return {
          ...parseSnapshot,
          totalReported: posts.reportedCount
        }
      } catch (err) {
        return err;
      }
    },
  }
}