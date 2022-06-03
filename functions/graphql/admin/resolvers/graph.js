const { client } = require('../../../utility/algolia')
const moment = require('moment');
const { ALGOLIA_INDEX_USERS_DESC, ALGOLIA_INDEX_ADMIN_LOGS_DESC, ALGOLIA_INDEX_ADMIN_LOGS, ALGOLIA_INDEX_USERS, ALGOLIA_INDEX_POSTS, ALGOLIA_INDEX_POSTS_ASC } = require('../../../constant/post')
// const adminAuthContext = require('../../../utility/adminAuthContext')

const getPersentate = (grandTotal, current) => {
  return Math.floor(current / grandTotal * 100)
}

module.exports = {
  Query: {
    async getGraphSummary(_, { graphType, state }, context) {
      // const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage

      // if (name) {
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

      let dateTo = ''
      let dateFrom = ''

      if (graphType === 'daily') {
        dateTo = new Date().getTime();
        dateFrom = new Date().setMonth(new Date().getMonth() - 1)
      }

      if (graphType === 'monthly') {
        dateTo = new Date().getTime();
        dateFrom = moment().subtract(12, 'month').valueOf()

        // console.log('dateFrom: ', dateFrom.toString());
      }

      if (graphType === 'yearly') {
        dateTo = new Date().getTime();
        dateFrom = moment().subtract(10, 'years').valueOf();
      }

      facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);

      const payload = {
        ...defaultPayload,
        ...pagination
      }

      // Posts
      const searchDocs = await index.search('', { ...payload, facetFilters })

      const searchDocsReported = await index.search('', { ...payload, facetFilters: [ ...facetFilters, [`_tags:has_reported`]]})
      
      const searchDocsActive = await index.search('', { ...payload, facetFilters: [ ...facetFilters, [`status.active:true`]]})
      
      const searchDocsNonActive = await index.search('', { ...payload, facetFilters: [ ...facetFilters, [`status.takedown:true`]]})

      // Users
      const searchUser = await indexUser.search('', payload)
      
      const searchNewUser = await indexUser.search('', { ...payload, facetFilters })

      const activeUsers = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`status:active`]]})

      const searchDeletedUser = await indexUser.search('', { ...payload, facetFilters: [...facetFilters, [`_tags:has_deleted`]]})


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

      // console.log('before regroup: ', dataDoc.hits);

      const groups = (dataDoc.hits || []).reduce((groups, doc) => {
        const date = doc[`${parentData === 'user' ? 'joinDate':'createdAt'}`].split('T')[0];
        const parseDate = date.split('-')
        const month = parseDate[1]
        const year = parseDate[0]

        const point = `${graphType === 'monthly'
          ? `01-${month}-${year}`
          : graphType === 'yearly'? year : date}`;

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

      const sortDataByDate = groupArrays.sort((a, b) => {
        var dateA = new Date(a.date).getTime();
        var dateB = new Date(b.date).getTime();
    
        return dateA > dateB ? 1 : -1;  
      })

      let newGraph = sortDataByDate.reduce(
        (prev, curr) => {
          if (!prev.length) return [curr]; // return initial data

          const diffDuration = moment.duration(
            moment(prev[prev.length -1]?.date).diff(
                moment(curr.date)
              )
            )
          const diffDate = graphType ==='monthly' ? diffDuration.asMonths() : (graphType ==='yearly' ? diffDuration.asYears() : diffDuration.asDays());

          const differentTime = Math.floor(Math.abs(diffDate + 1));

          const missedDate = []
          
          // calculate missing data between prev and current date
          for(let i = 0; i < differentTime; i++) {
            missedDate.push({
              date: moment(curr.date).subtract(
                i+1,
                graphType ==='monthly' ? 'months' : (graphType ==='yearly' ? 'years' : 'days')
              ).format('YYYY-MM-DD'),
              total: 0
            })
          }

          const missedDateSort = missedDate.sort((a, b) => {
            var dateA = new Date(a.date).getTime();
            var dateB = new Date(b.date).getTime();
        
            return dateA > dateB ? 1 : -1;  
          });
          
          return [
            ...prev,
            ...missedDateSort,
            curr
          ]
        },
        []
      );

      if (graphType === 'yearly' || graphType === 'monthly') {
        const target = graphType === 'yearly' ? 'years' : 'months'
        const diff = moment().diff(moment(dateFrom), target, false);

        // update format date
        newGraph = newGraph.map(
          ({ total, date }) => ({
            total,
            date: moment(date).format('YYYY-MM-DD')
          })
        );

        for (let i = 0; i < diff; i++) {
          newGraph.push({
            date: moment().subtract(i+1, target).format('YYYY-MM-DD'),
            total: 0
          })
        }
      }

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
        graph: newGraph
      }
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