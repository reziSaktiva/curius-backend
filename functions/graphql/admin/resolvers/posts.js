const { get } = require('lodash')
const { Client } = require("@googlemaps/google-maps-services-js");
const axios = require('axios')
const { server, client } = require('../../../utility/algolia')
const { db } = require('../../../utility/admin')
const { UserInputError } = require('apollo-server-express');
const adminAuthContext = require('../../../utility/adminAuthContext')

const { ALGOLIA_INDEX_POSTS, ALGOLIA_INDEX_REPORT_POSTS, ALGOLIA_INDEX_POSTS_ASC, ALGOLIA_INDEX_POSTS_DESC } = require('../../../constant/post')
const { API_KEY_GEOCODE } = require('../../../utility/secret/API');
const { createLogs } = require('../usecase/admin');

const getEndpointPost = (room, id, target = '') => {
  return `/${room ? `room/${room}/posts` : 'posts'}/${id}${target}`
}

module.exports = {
  Query: {
    async getReportedByIdPost(_, { idPost, perPage, page }, _ctx) {
      if (!idPost) UserInputError('id post is required')

      const index = client.initIndex('report_posts');

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

      const searchDocs = await index.search('', payload);

      const ids = searchDocs.hits.reduce((prev, curr) => {
        if (!prev.includes(curr.userIdReporter)) return [...prev, curr.userIdReporter]
        return prev
      }, [])
      
      const getUserReported = await db.collection('users').where('id', 'in', ids).get()
      const userReporter = await getUserReported.docs.map(doc => doc.data());

      const list = searchDocs.hits.map(doc => {
        const username = userReporter.filter(v => v.id === doc.userIdReporter)[0].username

        return { ...doc, username }
      })

      return { ...searchDocs, hits: list }
    },
    async getSinglePost(_, { id, room, commentId }, _ctx) {
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

          const userDocument = await db.doc(`/users/${post.owner}`).get();
          const owner = userDocument.data()

          let repost = {}
          const repostId = get(post, 'repost') || {};
          if (repostId) {
            const repostData = await db.doc(getEndpointPost(repostId.room, repostId.repost)).get();

            repost = repostData.data();
          }

          const likesPost = await likeCollection.get();
          const likes = likesPost.docs.map(doc => doc.data()) || []

          const commentsPost = await commentCollection.get();
          let comments = commentsPost.docs.map(doc => ({ ...doc.data(), id: doc.id })) || [];
          if (commentId) comments = comments.filter(comment => comment.id === commentId)

          const mutedPost = await mutedCollection.get();
          const muted = mutedPost.docs.map(doc => doc.data()) || [];

          const subscribePost = await subscribeCollection.get();
          const subscribe = subscribePost.docs.map(doc => doc.data()) || [];

          return {
            post: {
              ...post,
              repost,
              likes,
              comments: comments,
              muted,
              subscribe
            },
            owner
          }
        }
      }
      catch (err) {
        console.log(err)
        throw new Error(err)
      }
    },
    async getReportedListByCommentId(_, { search = "", commentId, perPage, page }, _ctx) {
      const index = client.initIndex('report_comments');
      
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
      }

      try {
        const facetFilters = []
        facetFilters.push([`idComment:${commentId}`])
        const payload = {
          ...defaultPayload,
          ...pagination
        };
        payload.facetFilters = facetFilters
        const searchDocs = await index.search(search, payload)
  
        const comments = await searchDocs.hits.map(async doc => {
          const comment = await db.doc(`/posts/${doc.idPost}/comments/${doc.idComment}`).get()
          const dataParse = await comment.data()
          console.log('entrypoint: ', `/posts/${doc.idPost}/comments/${doc.idComment}`)
          console.log('dataParse: ', dataParse)
          return ({
            text: dataParse.text,
            owner: dataParse.owner,
            id: doc.idComment,
            timestamp: dataParse.timestamp,
            reportedCount: dataParse.reportedCount,
            status: dataParse.status.active ? 'Active' : (dataParse.status.takedown && 'Takedown')
          })
        })
  
        console.log(await comments)
        return {
          ...searchDocs,
          hits: comments
        }
      } catch (err) {
        return err
      }
    },
    async searchPosts(_, {
      perPage = 5, page, location, range = 40, hasReported = false,
      useDetailLocation = false, search, filters, room, sortBy = 'desc'
    }, _ctx) {
      const googleMapsClient = new Client({ axiosInstance: axios });
      const timestampFrom = get(filters, 'timestamp.from', '');
      const ownerPost = get(filters, 'owner', '');
      const timestampTo = get(filters, 'timestamp.to', '');
      const ratingFrom = get(filters, 'ratingFrom', 0);
      const ratingTo = get(filters, 'ratingTo', 0);
      const status = get(filters, 'status', 0);
      const media = get(filters, 'media', []);

      let indexKey = ALGOLIA_INDEX_POSTS
      if (sortBy === 'desc') indexKey = ALGOLIA_INDEX_POSTS_DESC
      if (sortBy === 'asc') indexKey = ALGOLIA_INDEX_POSTS_ASC

      const index = client.initIndex(indexKey);

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

      if (ownerPost) facetFilters.push([`owner:${ownerPost}`])
      if (room) facetFilters.push([`room:${room}`])
      if (status) facetFilters.push([`status.active:${status == "active" ? 'true' : 'false'}`])
      // if (hasReported) facetFilters.push([`reportedCount > 1`])

      if (timestampFrom) {
        const dateFrom = new Date(timestampFrom).getTime();
        const dateTo = new Date(timestampTo).getTime();

        facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);
      }
      if (ratingFrom && ratingTo) {
        facetFilters.push([`rank: ${ratingFrom} TO ${ratingTo}`])
      }

      let queryTags = []
      if (media.length) {
        if (media.includes('video')) {
          queryTags.push('w-video')
        }
        if (media.includes('photo')) {
          queryTags.push('w-photos')
        }
        
        if (media.includes('voice-note')) {
          queryTags.push('w-voice-note')
        }

        if (media.includes('gif')) {
          queryTags.push('w-gif')
        }
      }

      if (hasReported) queryTags.push(`has_reported`)

      facetFilters.push([`_tags:${queryTags.join(',')}`])

      try {
        const payload = {
          ...defaultPayload,
          ...geoLocPayload,
          ...pagination
        };

        if (facetFilters.length) payload.facetFilters = facetFilters
        console.log(payload)
        const searchDocs = await index.search(search, payload)

        const ids = searchDocs.hits.map(doc => doc.objectID)
        if (!ids.length) return searchDocs

        const getPosts = await db.collection('posts').where('id', 'in', ids).get()
        const posts = await getPosts.docs.map(async (doc, idx) => {
          const dataParse = doc.data()
          console.log('timestamp: ', dataParse?.createdAt)
          if (!useDetailLocation) return dataParse

          const request = await googleMapsClient
            .reverseGeocode({
              params: {
                latlng: `${dataParse.location.lat}, ${dataParse.location.lng}`,
                language: 'en',
                result_type: 'street_address|administrative_area_level_4',
                location_type: 'APPROXIMATE',
                key: API_KEY_GEOCODE
              },
              timeout: 5000 // milliseconds
            }, axios)
          const address = request.data.results[0].formatted_address

          return {
            ...dataParse,
            reportedCount: searchDocs[idx].reportedCount,
            location: {
              ...dataParse.location,
              detail: {
                ...dataParse.location.detail,
                formattedAddress: address
              }
            }
          }
        })

        return { ...searchDocs, hits: posts }
      } catch (err) {
        return err
      }
    },
    async searchCommentReported(_, { search, sortBy = 'desc', page, perPage, filters }){
      const timestampTo = get(filters, 'timestamp.to', '');
      const timestampFrom = get(filters, 'timestamp.from', '');
      let indexKey = 'report_comments'
      if (sortBy === 'desc') indexKey = 'report_comments_date_desc'
      if (sortBy === 'asc') indexKey = 'report_comments_date_asc'

      const index = client.initIndex(indexKey);

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
      }
      
      const facetFilters = []

      if (timestampFrom) {
        const dateFrom = new Date(timestampFrom).getTime();
        const dateTo = new Date(timestampTo).getTime();

        facetFilters.push([`date_timestamp >= ${dateFrom} AND date_timestamp <= ${dateTo}`]);
      }

      try {
        const payload = {
          ...defaultPayload,
          ...pagination
        };
        if (facetFilters.length) payload.facetFilters = facetFilters
        // console.log('payload: ', payload)
        const searchDocs = await index.search(search, payload)

        const comments = searchDocs.hits.map(async doc => {
          const endpoint = doc.parentTypePost === 'global-posts' ? `/posts/${doc.idPost}/comments/${doc.idComment}` : `/room/${doc.idRoom}/posts/${doc.idPost}/comments/${doc.idComment}`
          const comment = await db.doc(endpoint).get()
          const dataParse = await comment.data()
          
          const getUserDetail = dataParse && await db.doc(`/users/${dataParse.owner}`).get()
          const user = dataParse && await getUserDetail.data()

          return ({
            ...doc,
            text: dataParse.text,
            owner: dataParse.username || '',
            timestamp: dataParse.createdAt,
            reportedCount: dataParse.reportedCount,
            profilePicture: user.profilePicture || '',
            id: doc.idComment,
            status: dataParse.status.active ? 'Active' : (dataParse.status.takedown && 'Takedown')
          })
        })

        return {
          ...searchDocs,
          hits: comments
        }

      } catch(err) {
        return err
      }
    },
  },
  Mutation: {
    async setStatusPost(_, { active, flags = [], takedown, postId }, _ctx) {
      const { name, level, id } = await adminAuthContext(_ctx)
      if (!postId) throw new Error('postId is Required')

      const index = server.initIndex(ALGOLIA_INDEX_POSTS);
      const targetCollection = `/posts/${postId}`
      const data = await db.doc(targetCollection).get()
      const status = {}

      const oldDocAlgolia = await index.getObject(postId, {
        attributesToRetrieve: ['_tags']
      });
      let _tags = oldDocAlgolia._tags || []

      try {
        let docId = ''
        await db.doc(targetCollection)
          .get()
          .then(doc => {
            const oldPost = data.data()

            if (flags) {
              status.flags = [...(oldPost.status.flag || []), ...flags]
            }

            if (takedown) {
              status.takedown = takedown
            }

            if (active) {
              status.active = active
            }

            docId = doc.id
            return doc.ref.update({ status })
          })
        let message = ''
        if (takedown) message = `Admin ${name} has reported Post Id ${docId}`
        if (active) message = `Admin ${name} has activate Post Id ${docId}`
        if (flags.length) message = `Admin ${name} has set flag ${flags.join(',')} to Post Id ${docId}`

        await createLogs({ adminId: id, role: level, message })
        // Update Algolia Search Posts
        await index.partialUpdateObjects([{
          objectID: postId,
          status,
          _tags
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
    async setStatusComment(_, { idComment, active, takedown, deleted }, _ctx) {
      const { name, level, id } = await adminAuthContext(_ctx)
      if (!name) throw new Error('permission denied')

      const dataReported = db.collection('/reports_comment').where('idComment', '==', idComment).get()
      const parseData = (await dataReported).docs.map(doc => doc.data())

      const type = parseData[0].parentTypePost;
      const postId = parseData[0].idPost || '';

      const index = server.initIndex('report_comments');
      const commentCollection = db.doc(`/${type === 'room' ? `room/${parseData[0].idRoom}/posts` : 'posts'}/${postId}/comments/${idComment}`)

      let newData = {}
      await commentCollection.get().then(
        doc => {
          const oldData = doc.data()
          const status = {}
          if (active) {
            status.active = true;
            status.takedown = false;
          }

          if (takedown) {
            status.active = false;
            status.takedown = true
          }

          newData = { id: doc.id, ...oldData, status }
          return doc.ref.update({ status })
        }
      )
      
      await index.saveObjects([{
        objectID: idComment,
        ...parseData[0],
        isActive: newData.status.active,
        isTakedown: newData.status.takedown,
        status: newData.status,
      }])

      let message = ''
      if (takedown) message = `Admin ${name} has reported Comment Id ${idComment}`
      if (active) message = `Admin ${name} has activate Comment Id ${idComment}`
      if (deleted) message = `Admin ${name} has deleted Comment Id ${idComment}`

      await createLogs({ adminId: id, role: level, message })

      return {
        id: newData.id,
        text: newData.text,
        owner: newData.owner,
        timestamp: newData.createAt,
        reportedCount: newData.reportedCount,
        status: newData.status.active ? 'Active': (newData.status.takedown && 'Takedown')
      }

    },
    async createReportPostById(_, { idPost, content, userIdReporter }, _ctx) {
      // TODO: makesure which level can reported post
      const { name, level, id } = await adminAuthContext(_ctx)

      if (!name) throw new Error('permission denied')

      if (!content) throw new UserInputError('required to fill reason this post')

      try {
        const posts = await db.doc(`/posts/${idPost}`).get().then(
          doc => {
            doc.ref.update({
              reportedCount: (doc.data().reportedCount || 0) + 1
            })

            return doc.data()
          }
        )

        const index = server.initIndex(ALGOLIA_INDEX_REPORT_POSTS);
        const oldDocAlgolia = await index.getObject(postId, {
          attributesToRetrieve: ['_tags']
        });
        let _tags = oldDocAlgolia._tags || []
        _tags.push('has_reported')

        const payload = {
          idPost: posts.id,
          content,
          userIdReporter
        }
        const indexPost = server.initIndex(ALGOLIA_INDEX_POSTS);

        const writeRequest = await db.collection('/reports').add(payload)

        // Save index
        await index.saveObjects([payload], {
          autoGenerateObjectIDIfNotExist: true,
        })

        // Update Algolia Search Posts
        await indexPost.partialUpdateObjects([{
          objectID: posts.id,
          reportedCount: posts.reportedCount,
          _tags,
        }]);

        let message = ''
        if (takedown) message = `Admin ${name} has reported Post Id ${posts.id}`
        if (active) message = `Admin ${name} has activate Post Id ${posts.id}`
        if (deleted) message = `Admin ${name} has deleted Post Id ${posts.id}`
  
        await createLogs({ adminId: id, role: level, message })

        const parseSnapshot = await (await writeRequest.get()).data()

        return {
          ...parseSnapshot,
          totalReported: posts.reportedCount,
          _tags,
        }
      } catch (err) {
        return err;
      }
    },
    async createReplicatePostAscDesc(_, { } , _ctx) {
      const index = server.initIndex('users');

      await index.setSettings({
        replicas: [
          'users_date_desc',
          'users_date_asc'
        ]
      })

      const replicasIndexDesc = server.initIndex('users_date_desc')
      const replicasIndexAsc = server.initIndex('users_date_asc')
      
      await replicasIndexAsc.setSettings({
        ranking: [
          "asc(date_timestamp)",
          "typo",
          "geo",
          "words",
          "filters",
          "proximity",
          "attribute",
          "exact",
          "custom"
        ]
      })

      await replicasIndexDesc.setSettings({
        ranking: [
          "desc(date_timestamp)",
          "typo",
          "geo",
          "words",
          "filters",
          "proximity",
          "attribute",
          "exact",
          "custom"
        ]
      })

      return "Success Replication Posts Index Algolia"
    },
    async reportedComment(_, { idComment, idPost, reason, roomId, username }) {
      /**
       * Get Comment 
       */
      const { name, level, id } = await adminAuthContext(_ctx)
      if (!name) throw new Error('permission denied')

      try {
        let commentText = ''
        let flagHasReportedBefore = false;
        const commentCollection = db.doc(`/${roomId ? `room/${roomId}/posts` : 'posts'}/${idPost}/comments/${idComment}`)
        await commentCollection.get().then(
          doc => {
            if (!doc.exists) throw new UserInputError('Postingan tidak ditemukan/sudah dihapus')
  
            const oldData = doc.data()
            const listOfReported = oldData.logReported || []
            const hasReportedBefore = listOfReported.filter(user => user === username)
            console.log('hasReportedBefore: ', !hasReportedBefore.length)
            flagHasReportedBefore = hasReportedBefore.length;
  
            if (!hasReportedBefore.length) {
              const increment = (oldData.reportedCount || 0) + 1
              commentText = oldData.text;
    
              return doc.ref.update({
                reportedCount: increment,
                status: { takedown: false, active: true },
                logReported: [...listOfReported, username]
              })
            }
          }
        )
  
        if (flagHasReportedBefore) return `Already reported this comment before`
  
        const payload = {
          objectID: idComment,
          idComment,
          idPost,
          idRoom: roomId,
          parentTypePost: roomId ? 'room' : 'global-posts',
          text: commentText,
          date_timestamp: new Date().getTime(),
          reason,
          totalReported: 1,
          isTakedown: false,
          isActive: true
        }

        const writeRequest = await db.collection('/reports_comment').add(payload)
        await (await writeRequest.get()).data()
  
        const index = server.initIndex('report_comments');
        await index.getObject(idComment).then(
          async () => {
            await index.partialUpdateObject({
              count: {
                _operation: 'Increment',
                value: 1
              },
              objectID:  idComment
            })


            let message = ''
            if (takedown) message = `Admin ${name} has reported Comment Id ${idComment}`
            if (active) message = `Admin ${name} has activate Comment Id ${idComment}`
            if (deleted) message = `Admin ${name} has deleted Comment Id ${idComment}`
      
            await createLogs({ adminId: id, role: level, message })
          }
        ).catch(
          async err => {
            await index.saveObjects([payload], { autoGenerateObjectIDIfNotExist: false }).catch(err => {
              console.log(err);
            })
          }
        )
  
        return `Success Reported Comment ${idComment} in Post ${idPost}`;
      } catch (err) {
        console.log(err)
        throw new Error(err)
      }
    },
  }
}

/**
 * 
 */