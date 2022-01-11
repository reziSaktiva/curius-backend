const { client } = require('../../../utility/algolia')
const { ALGOLIA_INDEX_POSTS_DESC, ALGOLIA_INDEX_USERS_DESC, ALGOLIA_INDEX_ADMIN_LOGS } = require('../../../constant/post')
// const adminAuthContext = require('../../../utility/adminAuthContext')

module.exports = {
  Query: {
    async getGraphSummary(_, { graphType, state }, context) {
      // const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage

      // if (name) {
      const index = client.initIndex(ALGOLIA_INDEX_POSTS_DESC);
      const indexUser = client.initIndex(ALGOLIA_INDEX_USERS_DESC);

      const facetFilters = []
      const pagination = {
        "hitsPerPage": 1000,
        "page": 0,
      };

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

      let dateTo = ''
      let dateFrom = ''

      if (graphType === 'daily') {
        dateTo = new Date().getTime();
        dateFrom = new Date().setMonth(new Date().getMonth() - 1)
      }

      if (graphType === 'monthly') {
        dateTo = new Date().getTime();
        dateFrom = new Date().setFullYear(new Date().getFullYear() - 1)
      }

      facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);

      const payload = {
        ...defaultPayload,
        ...pagination
      }
      const searchDocs = await index.search('', { ...payload, facetFilters })

      const searchUser = await indexUser.search('', payload)
      
      const searchNewUser = await indexUser.search('', { ...payload, facetFilters })

      const searchDeletedUser = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_deleted`]]})

      const searchDocsReported = await index.search('', { ...payload, facetFilters: [ ...facetFilters, [`_tags:has_reported`]]})

      const section = state.split('.');
      const parentData = section[0];
      const childData = section[1];

      let dataDoc = []
      if (parentData === 'post') {
        if (childData === 'total') {
          dataDoc = searchDocs
        }
        if (childData === 'totalReported') {
          dataDoc = searchDocsReported
        }
      } else {
        if (childData === 'total') dataDoc = searchUser
        if (childData === 'deleted') dataDoc = searchDeletedUser
        if (childData === 'newUser') dataDoc = searchNewUser
      }

      console.log('dataDoc.hits: ', dataDoc.hits)
      const groups = dataDoc.hits.reduce((groups, doc) => {
        const date = doc[`${parentData === 'user' ? 'joinDate':'createdAt'}`].split('T')[0];
        const parseDate = date.split('-')
        const month = parseDate[1]
        const year = parseDate[0]

        const point = `${graphType === 'monthly' ? `01-${month}-${year}` : date}`;

        if (!groups[point]) {
          groups[point] = [];
        }
        groups[point].push(doc);
        return groups;
      }, {});
      
      // Edit: to add it in the array format instead
      const groupArrays = Object.keys(groups).map((date) => {
        return {
          date,
          total: groups[date].length
        };
      });

      return {
        summary: {
          user: {
            total: searchUser.nbHits,
            newUser: searchNewUser.nbHits,
            deleted: searchDeletedUser.nbHits
          },
          post: {
            total: searchDocs.nbHits,
            totalReported: searchDocsReported.nbHits
          }
        },
        graph: groupArrays
      }
    },
    async getAdminLogs(_, { page, perPage, search = '' }, context) {
      const index = client.initIndex(ALGOLIA_INDEX_ADMIN_LOGS)
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

      const pagination = {
        "hitsPerPage": perPage || 10,
        "page": page || 0,
      };

      const payload = {
        ...defaultPayload,
        ...pagination
      };

      const searchDocs = await index.search(search, payload)

      console.log(searchDocs.hits[0])
      return searchDocs
    }
    // }
  }
}