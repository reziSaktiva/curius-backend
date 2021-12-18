const constructQuerySearchPost = ({ useStatus, useTimestamp, useRating, useMedia = [] }) => {
  const facetFilters = []
  const attributesForFaceting = [];

  if (useStatus) {
    facetFilters.push([`status.active:${useStatus ? 'true': 'false'}`])
    attributesForFaceting.push('status.active')
  }

  if (Object.keys(useTimestamp).length) {
    const dateFrom = new Date(useTimestamp.timestampFrom).getTime();
    const dateTo = new Date(useTimestamp.timestampTo).getTime();
    
    facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);
  }

  if (useRating.ratingFrom && useRating.ratingTo) {
    facetFilters.push([`rank: ${useRating.ratingFrom} TO ${useRating.ratingTo}`])
  }

  if (useMedia.length) {
    let queryTags = []
    if (useMedia.includes('video')) {
      queryTags.push('has_video')
    }
    if (useMedia.includes('image')) {
      queryTags.push('has_images')
    }

    facetFilters.push([`_tags:${queryTags.join(',')}`])
  }

  return { facetFilters, attributesForFaceting }
}

const getIdsFromHits = hits => {
  const userIds = [];
  if (hits.length) {
      hits.forEach(async data => {
          userIds.push(data.objectID);
      })
  }

  return userIds;
}

module.exports = {
  getIdsFromHits,
  constructQuerySearchPost
}