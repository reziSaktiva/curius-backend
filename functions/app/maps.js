const axios = require('axios')
const { get } = require('lodash')
const { Client } = require("@googlemaps/google-maps-services-js");

const { API_KEY_GEOCODE } = require('../utility/secret/API')

/**
 * getDetailLocationsByLatLng
 * @param {String} location input locations
 * @returns {Array} list of detail locations
 */
const getDetailLocationsByLatLng = async (location) => {
  const googleMapsClient = new Client({ axiosInstance: axios });

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

  return detailplaces;
}

module.exports = {
  getDetailLocationsByLatLng  
}