const { client } = require('../../../utility/algolia')
const moment = require('moment');
const { ALGOLIA_INDEX_POSTS_DESC, ALGOLIA_INDEX_USERS_DESC, ALGOLIA_INDEX_ADMIN_LOGS, ALGOLIA_INDEX_USERS } = require('../../../constant/post')
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

      return searchDocs
    },
    async getStaticUserByAge(_, { }, context) {
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
        "hitsPerPage": 1000,
        "page": 0,
      };

      const thirdteenYearAgo = moment().subtract(13, 'years').unix()
      const seventeenYearAgo = moment().subtract(17, 'years').unix()

      // Static 2
      const eightteenYearAgo = moment().subtract(18, 'years').unix()
      const twentytwoYearAgo = moment().subtract(22, 'years').unix()

      // Static 3
      const twentythreeYearAgo = moment().subtract(23, 'years').unix()
      const twentysevenYearAgo = moment().subtract(27, 'years').unix()

      // Static 3
      const twentyEightYearAgo = moment().subtract(23, 'years').unix()
      const thirtytwoYearAgo = moment().subtract(27, 'years').unix()
      
      const index = client.initIndex(ALGOLIA_INDEX_USERS)

      const payload = {
        ...defaultPayload,
        ...pagination
      };
      
      console.log(`dob_timestamp:${twentytwoYearAgo * 1000} TO ${eightteenYearAgo * 1000}`)
      console.log(`dob_timestamp:${twentysevenYearAgo * 1000} TO ${twentythreeYearAgo * 1000}`)
      const searchDocsParameterOne = await index.search('', { ...payload, filters: `dob_timestamp:${seventeenYearAgo * 1000} TO ${thirdteenYearAgo * 1000}` })
      const staticOne = searchDocsParameterOne?.nbHits || 0;


      const searchDocsParameterTwo = await index.search('', { ...payload, filters: `dob_timestamp:${twentytwoYearAgo * 1000} TO ${eightteenYearAgo * 1000}` })
      const staticTwo = searchDocsParameterTwo?.nbHits || 0;

      const searchDocsParameterThree = await index.search('', { ...payload, filters: `dob_timestamp:${twentysevenYearAgo * 1000} TO ${twentytwoYearAgo * 1000}` })
      const staticThree = searchDocsParameterThree?.nbHits || 0;

      const searchDocsParameterFour = await index.search('', { ...payload, filters: `dob_timestamp:${thirtytwoYearAgo * 1000} TO ${twentysevenYearAgo * 1000}` })
      const staticFour = searchDocsParameterFour?.nbHits || 0;

      return [
        { label: '13 - 17 years', total: staticOne },
        { label: '18 - 22 years', total: staticTwo },
        { label: '23 - 27 years', total: staticThree },
        { label: '27 - 32 years', total: staticFour },
      ]
    }
  }
}