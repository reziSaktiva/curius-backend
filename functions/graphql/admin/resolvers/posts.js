const { server } = require('../../../utility/algolia')
const { db } = require('../../../utility/admin')
const { get } = require('lodash')

const { ALGOLIA_INDEX_POSTS } = require('../../../constant/post')

// Functions reusable
const { getDetailLocationsByLatLng } = require('../../../app/maps')
const { constructQuerySearchPost } = require('../../../app/search')

const isNullOrUndefined = data => {
  return typeof data !== undefined || data !== null
}

module.exports = {
  Query: {

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
    async searchPosts(_, { perPage = 5, page, location, range = 40, search, filters }, _ctx) {
      const { name } = await adminAuthContext(_ctx);

      // TODO: Need to specific user level
      if (!name) throw new Error('Permission Denied');

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
        const detailplaces = await getDetailLocationsByLatLng(location);

        // TODO: need to makesure filter with multiple geolocation
        aroundLatLng = `${detailplaces[0].lat}, ${detailplaces[0].lng}`;
      }

      const geoLocPayload = location && aroundLatLng ? {
        "aroundLatLng": aroundLatLng,
        "aroundRadius": range * 1000,
      } : {};

      const pagination = {
        "hitsPerPage": perPage || 10,
        "page": page || 0,
      }

      const { facetFilters, attributesForFaceting } = constructQuerySearchPost({
        useStatus: status === 'active',
        useTimestamp: { timestampFrom, timestampTo },
        useRating: { ratingFrom, ratingTo },
        useMedia: media
      });

      try {
        const payload = {
          ...defaultPayload,
          ...geoLocPayload,
          ...pagination
        };

        if (facetFilters.length) payload.facetFilters = facetFilters

        if (attributesForFaceting.length) {
          const settings = await index.getSettings();

          const attribute = settings.attributesForFaceting || [];
          if (attribute.length && !attribute.includes(attributesForFaceting)) {
            await index.setSettings({ attributesForFaceting })
          }
        }

        return await index.search(search, payload)
      } catch (err) {
        return err
      }
    }
  }
}