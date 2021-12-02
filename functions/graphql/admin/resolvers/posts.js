const { client } = require('../../../utility/algolia')
const { get } = require('lodash')
const axios = require('axios')
const { Client } = require("@googlemaps/google-maps-services-js");

const { ALGOLIA_INDEX_POSTS } = require('../../../constant/post')
const { API_KEY_GEOCODE } = require('../../../utility/secret/API')

module.exports = {
    Query: {

    },
    Mutation: {
      /** example payload
       * {
            "search": "",
            "page": 0,
            "perPage": 10,
            "location":  "bandung",
            "request":{
              "timestamp": "10-01-2022",
              "ratingFrom": 0,
              "ratingTo": 10
           }
         }
       */
      async searchPosts(_, { perPage = 5, page, location, range = 40, search, request }, ctx) {
        const googleMapsClient = new Client({ axiosInstance: axios });
        const timestamp = get(request, 'timestamp', '');
        const ratingFrom = get(request, 'ratingFrom', 0);
        const ratingTo = get(request, 'ratingTo', 0);
        const status = get(request, 'status', 0);
        
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
            params:{
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
        
        const geoLocPayload = location && aroundLatLng ?  {
          "aroundLatLng": aroundLatLng,
          "aroundRadius": range * 1000,
        } : {};

        const pagination = {
          "hitsPerPage": perPage || 10,
          "page": page || 0,
        }
        const facetFilters = []

        if (status) facetFilters.push([`status.active:${true}`])
        if (timestamp) facetFilters.push([`date_timestamp > ${new Date(timestamp).getTime()}`])
        if (ratingFrom && ratingTo) {
          facetFilters.push([`rank: ${ratingFrom} TO ${ratingTo}`])
        }

        try {
            const payload = {
              ...defaultPayload,
              ...geoLocPayload,
              ...pagination,
              facetFilters
            };

            return await index.search(search, payload)
        } catch (err) {
            return err
        }
      }
    }
}