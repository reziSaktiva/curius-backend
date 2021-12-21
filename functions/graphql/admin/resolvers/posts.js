const { UserInputError } = require('apollo-server-express');
const { server } = require('../../../utility/algolia')
const { db } = require('../../../utility/admin')
const { get } = require('lodash')
const axios = require('axios')
const { Client } = require("@googlemaps/google-maps-services-js");

const { ALGOLIA_INDEX_POSTS } = require('../../../constant/post')
const { API_KEY_GEOCODE } = require('../../../utility/secret/API')

const isNullOrUndefined = data => {
  return typeof data !== undefined || data !== null
}

const getEndpointPost = (room, id, target = '') => {
  return `/${room ? `room/${room}/posts` : 'posts'}/${id}${target}`
}

module.exports = {
  Query: {
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
            ...post,
            repost,
            likes,
            comments: comments,
            muted,
            subscribe
          }
        }
      }
      catch (err) {
        console.log(err)
        throw new Error(err)
      }
    }
  },
  Mutation: {
    /** example payload
     * {
          "search": "",
          "page": 0,
          "perPage": 10,
          "location":  "bandung",
          "filters":{
            "timestamp": "10-01-2022",
            "ratingFrom": 0,
            "ratingTo": 10
         }
       }
     */
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
    async searchPosts(_, { perPage = 5, page, location, range = 40, search, filters }, _ctx) {
      const googleMapsClient = new Client({ axiosInstance: axios });
      const timestampFrom = get(filters, 'timestamp.from', '');
      const timestampTo = get(filters, 'timestamp.to', '');
      const ratingFrom = get(filters, 'ratingFrom', 0);
      const ratingTo = get(filters, 'ratingTo', 0);
      const status = get(filters, 'status', 0);
      const media = get(filters, 'media', []);

      const index = server.initIndex(ALGOLIA_INDEX_POSTS);

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

      if (status) facetFilters.push([`status.active:${status == "active" ? 'true': 'false'}`])

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

        console.log(facetFilters)

        if (facetFilters.length) payload.facetFilters = facetFilters

        return await index.search(search, payload)
      } catch (err) {
        return err
      }
    }
  }
}