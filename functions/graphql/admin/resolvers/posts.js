const { client } = require('../../../utility/algolia')

module.exports = {
    Query: {

    },
    Mutation: {
        /** example payload
       * {
          "search": "",
          "location":  {
            "lat": -6.175110,
            "lng": 106.865036
          },
          "request":{
            "timestamp": 1638249375189,
            "ratingFrom": 0,
            "ratingTo": 10
          }
        }
       */
        async searchPosts(_, { perPage = 5, page, location, range = 40, search, request }, ctx) {
            const { timestamp = new Date.now(), ratingFrom, ratingTo, status } = request;
            const lat = location?.lat;
            const lng = location?.lng;
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
            const geoLocPayload = {
            "aroundLatLng": `${lat}, ${lng}`,
            "aroundRadius": range * 1000,
            };
    
            const pagination = {
            "hitsPerPage": perPage || 10,
            "page": page || 0,
            }
            const facetFilters = []
    
            if (status) facetFilters.push([`status.active:${true}`])
            if (timestamp) facetFilters.push([`date_timestamp > ${timestamp}`])
            if (ratingFrom && ratingTo) {
            facetFilters.push([`rank: ${ratingFrom} TO ${ratingTo}`])
            }
    
            try {
                const payload = { ...defaultPayload, ...(lat && lng ? geoLocPayload : {}), ...pagination, facetFilters };
    
                return await index.search(search, payload)
            } catch (err) {
                return err
            }
        }
    }
}