const { client } = require('../../../utility/algolia')
const moment = require('moment');
const { ALGOLIA_INDEX_USERS_DESC, ALGOLIA_INDEX_ADMIN_LOGS_DESC, ALGOLIA_INDEX_USERS, ALGOLIA_INDEX_POSTS } = require('../../../constant/post');
const { db } = require('../../../utility/admin');
// const adminAuthContext = require('../../../utility/adminAuthContext')

const getPersentate = (grandTotal, current) => {
  return Math.floor(current / grandTotal * 100)
}

module.exports = {
  Query: {
    // async getGraphSummary(_, { graphType, state }, context) {
    //   // const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage

    //   // if (name) {
    //   const index = client.initIndex(ALGOLIA_INDEX_POSTS);
    //   const indexUser = client.initIndex(ALGOLIA_INDEX_USERS_DESC);

    //   const facetFilters = []
    //   const pagination = {
    //     "hitsPerPage": 1000,
    //     "page": 0,
    //   };

    //   const defaultPayload = {
    //     "attributesToRetrieve": "*",
    //     "attributesToSnippet": "*:20",
    //     "snippetEllipsisText": "…",
    //     "responseFields": "*",
    //     "getRankingInfo": true,
    //     "analytics": false,
    //     "enableABTest": false,
    //     "explain": "*",
    //     "facets": ["*"]
    //   };

    //   let dateTo = ''
    //   let dateFrom = ''
    //   const today = new Date();

    //   if (graphType === 'daily') {
    //     dateTo = today.getTime();
    //     dateFrom = new Date(new Date().setDate(today.getDate() - 30)).getTime();
    //   }

    //   if (graphType === 'monthly') {
    //     dateTo = today.getTime();
    //     dateFrom = new Date(today.setFullYear(today.getFullYear() - 1)).getTime()
    //   }

    //   if (graphType === 'yearly') {
    //     dateTo = today.getTime();
    //     dateFrom = new Date(today.setFullYear(today.getFullYear() - 10)).getTime();
    //   }

    //   console.log(dateFrom, new Date(dateFrom));

    //   facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);

    //   const payload = {
    //     ...defaultPayload,
    //     ...pagination
    //   }

    //   // Posts
    //   const searchDocs = await index.search('', { ...payload, facetFilters })

    //   const searchDocsReported = await index.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_reported`]] })

    //   const searchDocsActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.active:true`]] })

    //   const searchDocsNonActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.takedown:true`]] })

    //   // Users
    //   const searchUser = await indexUser.search('', payload)

    //   const searchNewUser = await indexUser.search('', { ...payload, facetFilters })

    //   const activeUsers = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`status:active`]] })

    //   const searchDeletedUser = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_deleted`]] })


    //   const section = state.split('.');
    //   const parentData = section[0];
    //   const childData = section[1];

    //   let dataDoc = []
    //   if (parentData === 'post') {
    //     if (childData === 'total') {
    //       dataDoc = searchDocs
    //     }
    //     if (childData === 'totalReported') {
    //       dataDoc = searchDocsReported
    //     }
    //     if (childData === 'nonActive') {
    //       dataDoc = searchDocsNonActive
    //     }
    //     if (childData === 'active') {
    //       dataDoc = searchDocsActive
    //     }
    //   } else {
    //     if (childData === 'total') dataDoc = searchUser
    //     if (childData === 'deleted') dataDoc = searchDeletedUser
    //     if (childData === 'newUser') dataDoc = searchNewUser
    //     if (childData === 'active') dataDoc = activeUsers
    //   }

    //   // console.log('before regroup: ', dataDoc.hits);

    //   const groups = (dataDoc.hits || []).reduce((groups, doc) => {
    //     const date = doc[`${parentData === 'user' ? 'joinDate' : 'createdAt'}`].split('T')[0];
    //     const parseDate = date.split('-')
    //     const month = parseDate[1]
    //     const year = parseDate[0]

    //     const point = `${graphType === 'monthly'
    //       ? `01-${month}-${year}`
    //       : graphType === 'yearly' ? year : date}`;

    //     if (!groups[point]) {
    //       groups[point] = [];
    //     }
    //     groups[point].push(doc);
    //     return groups;
    //   }, {});

    //   // Edit: to add it in the array format instead
    //   const groupArrays = Object.keys(groups).map((date) => {
    //     return {
    //       date,
    //       total: groups[date].length
    //     };
    //   });

    //   const sortDataByDate = groupArrays.sort((a, b) => {
    //     var dateA = new Date(a.date).getTime();
    //     var dateB = new Date(b.date).getTime();

    //     return dateA > dateB ? 1 : -1;
    //   })

    //   let newGraph = sortDataByDate.reduce(
    //     (prev, curr) => {
    //       if (!prev.length) return [curr]; // return initial data

    //       const diffDuration = moment.duration(
    //         moment(prev[prev.length - 1]?.date).diff(
    //           moment(curr.date)
    //         )
    //       )
    //       const diffDate = graphType === 'monthly' ? diffDuration.asMonths() : (graphType === 'yearly' ? diffDuration.asYears() : diffDuration.asDays());

    //       const differentTime = Math.floor(Math.abs(diffDate + 1));

    //       const missedDate = []

    //       // calculate missing data between prev and current date
    //       for (let i = 0; i < differentTime; i++) {
    //         missedDate.push({
    //           date: moment(curr.date).subtract(
    //             i + 1,
    //             graphType === 'monthly' ? 'months' : (graphType === 'yearly' ? 'years' : 'days')
    //           ).format('YYYY-MM-DD'),
    //           total: 0
    //         })
    //       }

    //       const missedDateSort = missedDate.sort((a, b) => {
    //         var dateA = new Date(a.date).getTime();
    //         var dateB = new Date(b.date).getTime();

    //         return dateA > dateB ? 1 : -1;
    //       });

    //       return [
    //         ...prev,
    //         ...missedDateSort,
    //         curr
    //       ]
    //     },
    //     []
    //   );

    //   if (graphType === 'yearly' || graphType === 'monthly') {
    //     const target = graphType === 'yearly' ? 'years' : 'months'
    //     const diff = moment().diff(moment(dateFrom), target, false);

    //     // update format date
    //     newGraph = newGraph.map(
    //       ({ total, date }) => ({
    //         total,
    //         date: moment(date).format('YYYY-MM-DD')
    //       })
    //     );

    //     for (let i = 0; i < diff; i++) {
    //       newGraph.push({
    //         date: moment().subtract(i + 1, target).format('YYYY-MM-DD'),
    //         total: 0
    //       })
    //     }
    //   }

    //   return {
    //     summary: {
    //       user: {
    //         total: searchUser.nbHits,
    //         newUser: searchNewUser.nbHits,
    //         deleted: searchDeletedUser.nbHits,
    //         active: activeUsers.nbHits
    //       },
    //       post: {
    //         total: searchDocs.nbHits,
    //         active: searchDocsActive.nbHits,
    //         nonActive: searchDocsNonActive.nbHits,
    //         totalReported: searchDocsReported.nbHits
    //       }
    //     },
    //     graph: newGraph
    //   }
    // },
    async getGraphSummary(_, { graphType, state }, context) {
      const index = client.initIndex(ALGOLIA_INDEX_POSTS);
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

      let time = '';
      let indexTime;
      const today = new Date();

      if (graphType === 'daily') {
        indexTime = 7;
        time = 'day';
      }

      if (graphType === 'monthly') {
        indexTime = 12;
        time = 'month';
      }

      if (graphType === 'yearly') {
        indexTime = 10;
        time = 'year';
      }

      const dateTo = today.getTime();
      const dateFrom = moment().startOf(time).subtract(indexTime, time).valueOf();

      // console.log(new Date(dateFrom), new Date(dateTo));

      // facetFilters.push([`date_timestamp:${dateFrom} TO ${dateTo}`]);

      const payload = {
        ...defaultPayload,
        ...pagination,
        filters: `date_timestamp:${dateFrom} TO ${dateTo}`,
      }

      // Posts
      const searchDocs = await index.search('', { ...payload, facetFilters })

      const searchDocsReported = await index.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_reported`]] })

      const searchDocsActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.active:true`]] })

      const searchDocsNonActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.takedown:true`]] })

      // Users
      const searchUser = await indexUser.search('', payload)

      const searchNewUser = await indexUser.search('', { ...payload, facetFilters })

      const activeUsers = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`status:active`]] })

      const searchDeletedUser = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_deleted`]] })

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
        if (childData === 'nonActive') {
          dataDoc = searchDocsNonActive
        }
        if (childData === 'active') {
          dataDoc = searchDocsActive
        }
      } else {
        if (childData === 'total') dataDoc = searchUser
        if (childData === 'deleted') dataDoc = searchDeletedUser
        if (childData === 'newUser') dataDoc = searchNewUser
        if (childData === 'active') dataDoc = activeUsers
      }

      const templateGraph = [...new Array(indexTime)].map((_i, idx) => {
        let format;

        switch (time) {
          case 'year':
            format = 'YYYY'
            break;
          case 'month':
            format = 'MMMM'
            break;
          case 'day':
            format = 'DDDD'
            break;
        }

        const date = moment().startOf(time).subtract(idx, time).format(format)
        const total = dataDoc.hits.filter(doc => moment(doc.date_timestamp).format(format) == date).length;

        return {
          total,
          date: moment().startOf(time).subtract(idx, time).format('YYYY-MM-DD')
        }
      });

      templateGraph.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      })

      return {
        summary: {
          user: {
            total: searchUser.nbHits,
            newUser: searchNewUser.nbHits,
            deleted: searchDeletedUser.nbHits,
            active: activeUsers.nbHits
          },
          post: {
            total: searchDocs.nbHits,
            active: searchDocsActive.nbHits,
            nonActive: searchDocsNonActive.nbHits,
            totalReported: searchDocsReported.nbHits
          }
        },
        graph: templateGraph
      }
    },
    async getGraphData(_, { graphType, state }) {
      const index = client.initIndex(ALGOLIA_INDEX_POSTS);
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

      let time = '';
      let indexTime;
      const today = new Date();

      if (graphType === 'daily') {
        indexTime = 7;
        time = 'day';
      }

      if (graphType === 'monthly') {
        indexTime = 12;
        time = 'month';
      }

      if (graphType === 'yearly') {
        indexTime = 10;
        time = 'year';
      }

      const dateTo = today.getTime();
      const dateFrom = moment().startOf(time).subtract(indexTime, time).valueOf();

      // console.log(new Date(dateFrom), new Date(dateTo));

      // facetFilters.push([`date_timestamp:${dateFrom} TO ${dateTo}`]);

      const payload = {
        ...defaultPayload,
        ...pagination,
        filters: `date_timestamp:${dateFrom} TO ${dateTo}`,
      }

      // Posts
      const searchDocs = await index.search('', { ...payload, facetFilters })

      const searchDocsReported = await index.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_reported`]] })

      const searchDocsActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.active:true`]] })

      const searchDocsNonActive = await index.search('', { ...payload, facetFilters: [...facetFilters, [`status.takedown:true`]] })

      // Users
      const searchUser = await indexUser.search('', payload)

      const searchNewUser = await indexUser.search('', { ...payload, facetFilters })

      const activeUsers = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`status:active`]] })

      const searchDeletedUser = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_deleted`]] })

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
        if (childData === 'nonActive') {
          dataDoc = searchDocsNonActive
        }
        if (childData === 'active') {
          dataDoc = searchDocsActive
        }
      } else {
        if (childData === 'total') dataDoc = searchUser
        if (childData === 'deleted') dataDoc = searchDeletedUser
        if (childData === 'newUser') dataDoc = searchNewUser
        if (childData === 'active') dataDoc = activeUsers
      }

      const templateGraph = [...new Array(indexTime)].map((_i, idx) => {
        let format;

        switch (time) {
          case 'year':
            format = 'YYYY'
            break;
          case 'month':
            format = 'MMMM'
            break;
          case 'day':
            format = 'dddd'
            break;
          default:
            break;
        }

        const date = moment().startOf(time).subtract(idx, time).format(format)
        const total = dataDoc.hits.filter(doc => moment(doc.date_timestamp).format(format) == date).length;

        return {
          total,
          date
        }
      });

      return templateGraph
    },
    async getAdminLogs(_, { page, perPage, search = '', useExport }, context) {

      const index = client.initIndex(ALGOLIA_INDEX_ADMIN_LOGS_DESC)
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
        "hitsPerPage": useExport ? 1000 : perPage || 10,
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

      const grandTotal = staticOne + staticTwo + staticThree + staticFour;

      return [
        { label: '13 - 17 years', total: staticOne, percentage: getPersentate(grandTotal, staticOne) },
        { label: '18 - 22 years', total: staticTwo, percentage: getPersentate(grandTotal, staticTwo) },
        { label: '23 - 27 years', total: staticThree, percentage: getPersentate(grandTotal, staticThree) },
        { label: '27 - 32 years', total: staticFour, percentage: getPersentate(grandTotal, staticFour) },
      ]
    },
  }
}