const { get } = require('lodash');
const { computeDistanceBetween, LatLng } = require('spherical-geometry-js');
const { db, pubSub, NOTIFICATION_ADDED, geofire } = require('../../../utility/admin');
const { AuthenticationError, UserInputError } = require('apollo-server-express');

const fbAuthContext = require("../../../utility/fbAuthContext");
const randomGenerator = require("../../../utility/randomGenerator");

const { server, client } = require('../../../utility/algolia');
const { ALGOLIA_INDEX_ROOMS } = require('../../../constant/post');

module.exports = {
  Query: {
    async getPosts(_, { lat, lng, range = 1, type, page, room, username }, context) {
      const { mutedUser } = username || room ? {
        mutedUser: []
      } : await fbAuthContext(context)

      if ((!lat && !lng) && (!room && !username)) {
        throw new UserInputError('Lat and Lng is Required')
      }

      const rank = type !== "Popular" ? 'posts_date_desc' : 'posts_rank_desc'

      const index = client.initIndex(rank)

      const facetFilters = [["status.active:true"]]

      if (username) {
        facetFilters.push([`owner:${username}`])
      } else {
        if (room) {
          facetFilters.push(['_tags:has_post_room'])
          facetFilters.push([`room:${room}`])
        } else {
          facetFilters.push(['_tags:is_not_post_room'])
        }
      }

      if (mutedUser.length) {
        mutedUser.forEach(user => {
          facetFilters.push([`owner:-${user}`])
        })
      }

      const defaultPayload = {
        "getRankingInfo": true,
        "analytics": false,
        "enableABTest": false,
        "hitsPerPage": 10,
        "attributesToRetrieve": "*",
        "attributesToSnippet": "*:20",
        "snippetEllipsisText": "…",
        "responseFields": "*",
        "explain": "*",
        "maxValuesPerFacet": 100,
        "page": 0,
        "facets": [
          "*"
        ],
      };

      const geoLocPayload = room || username ? {} : lng && lat && {
        "aroundLatLng": `${lat}, ${lng}`,
        "aroundRadius": range * 1000,
      };

      const pagination = {
        "hitsPerPage": 8,
        "page": page || 0,
      }

      const filters = rank === 'posts_rank_desc' ? 'rank > 0' : ''

      try {
        return new Promise(async (resolve, reject) => {
          index.search("", { ...defaultPayload, ...geoLocPayload, ...pagination, filters, facetFilters })
            .then(async res => {
              const { hits, page, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;

              // const postIds = []
              // if (hits.length) {
              //   hits.forEach(async doc => {
              //     postIds.push(doc.objectID);
              //   })
              // }

              // if (postIds.length) {
              //   const getPosts = await db.collection('posts').where('id', 'in', postIds).orderBy(type !== "Popular" ? "createdAt" : "rank", "desc").get()
              //   const posts = getPosts.docs.map(doc => doc.data())

              const newHits = []

              hits.forEach(async data => {
                const { repost: repostId } = data;

                const repostData = async () => {
                  if (repostId) {
                    const repostData = await db.doc(`/posts/${repostId}`).get()
                    return repostData.data() || {}
                  }
                }

                //commentedBy
                const commentedBy = async () => {
                  let commentedBy = []

                  const commentCollection = await db.collection(`/posts/${data.objectID}/comments`).get()
                  commentCollection.forEach(doc => {
                    const isHas = commentedBy.find(result => result === doc.data().owner)
                    if (!isHas) {
                      commentedBy.push(doc.data().owner)
                    }
                  })
                  return commentedBy
                };

                // Likes
                const likes = async () => {
                  const likesData = await db.collection(`/posts/${data.objectID}/likes`).get()
                  const likes = likesData.docs.map(doc => doc.data())

                  return likes;
                };

                // Muted
                const muted = async () => {
                  const mutedData = await db.collection(`/posts/${data.objectID}/muted`).get();
                  return mutedData.docs.map(doc => doc.data());
                }

                const subscribe = async () => {
                  const subscribeData = await db.collection(`/posts/${data.objectID}/subscribes`).get();
                  return subscribeData.docs.map(doc => doc.data());
                }

                const newData = { ...data, id: data.objectID, commentedBy: commentedBy(), likes: likes(), muted: muted(), repost: repostData(), subscribe: subscribe() }

                newHits.push(newData)
              })

              resolve({ posts: newHits, nextPage: page + 1, hasMore: page + 1 !== nbPages })
              // }
              // resolve({ posts: [], nextPage: 0, hasMore: false })
            })
        })
      }
      catch (err) {
        throw new Error(err)
      }
    },
    async getRoomPosts(_, { room }, context) {
      const data = await db.collection(`/posts`).orderBy('createdAt', 'desc').limit(20).get()
      const docs = data.docs.map((doc) => doc.data())

      if (docs.length) {
        const nearby = []

        docs.forEach(async data => {
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/posts/${repostId}`).get()
              return repostData.data() || {}
            }
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          nearby.push(newData)
        });

        return nearby;
      }

      return [];
    },
    async getPopularPosts(_, { lat, lng, range }, context) {
      if (!lat || !lng) {
        throw new UserInputError('Lat and Lng is Required')
      }

      const center = [lat, lng]
      const radiusInM = range ? range * 1000 : 1 * 1000

      const bounds = geofire.geohashQueryBounds(center, radiusInM);
      let posts = []

      for (const b of bounds) {
        const q = db.collection('posts')
          .orderBy('geohash')
          .startAt(b[0])
          .endAt(b[1])
          .limit(20);

        posts.push(q.get());
      }

      let latest = []
      let lastId;
      try {
        const docs = await Promise.all(posts).then((snapshots) => {
          const matchingDocs = [];

          for (const snap of snapshots) {
            for (const doc of snap.docs) {
              // const lat = doc.get('location').lat;
              // const lng = doc.get('location').lng;

              // // We have to filter out a few false positives due to GeoHash
              // // accuracy, but most will match
              // const distanceInKm = geofire.distanceBetween([lat, lng], center);
              // const distanceInM = distanceInKm * 1000;
              // if (distanceInM <= radiusInM) {
              //   matchingDocs.push(doc);
              // }
              matchingDocs.push(doc);
            }
          }
          return matchingDocs;
        })

        docs.forEach(async (doc, index) => {
          const data = doc.data()
          const { repost: repostId } = data;
          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get()
              return repostData.data() || {}
            }
          }

          if (index === 19) {
            lastId = data.id
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          latest.push(newData)
        });

        latest.sort((a, b) => b.rank - a.rank)

        return {
          posts: latest,
          lastId,
          hasMore: latest.length === 20
        }
      }
      catch (err) {
        console.log(err);
      }
    },
    async getProfilePosts(_, { username: name }, context) {
      const { username } = await fbAuthContext(context)
      const data = await db.collection("posts")
        .where("owner", "==", name ? name : username)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get()

      const docs = data.docs.map((doc) => doc.data())

      if (docs.length) {
        const nearby = []

        docs.forEach(async data => {
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get()
              return repostData.data() || {}
            }
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          nearby.push(newData)
        });

        return {
          posts: nearby,
          lastId: nearby[nearby.length - 1].id,
          hasMore: nearby.length >= 20
        };
      }

      return {
        posts: [],
        lastId: null,
        hasMore: false
      };
    },
    async getProfileLikedPost(_, { username: name }, context) {
      const { username } = await fbAuthContext(context)

      const getLiked = await db.collection(`/users/${name ? name : username}/liked/`).limit(20).get()
      const liked = getLiked.docs.map(doc => doc.data())

      try {
        //fungsi ngambil postingan yang sudah di like
        const Posts = liked.map(doc => {
          return db.doc(`/posts/${doc.postId}`).get()
            .then(doc => doc.data())
        })


        //fungsi ngambil koleksi likes
        const data = await Promise.all(Posts).then(docs => {
          return docs.map(async doc => {
            if (doc) {
              const { repost: repostId } = doc;
              let repost = {}

              if (repostId) {
                const repostData = await db.doc(`/posts/${repostId}`).get()
                repost = repostData.data() || {}
              }

              const request = await db.collection(`/posts/${doc.id}/likes`).get()
              const likes = request.docs.map(doc => doc.data())

              const commentsData = await db.collection(`/posts/${doc.id}/comments`).get()
              const comments = commentsData.docs.map(doc => doc.data())

              const post = {
                ...doc,
                likes,
                comments,
                repost
              }

              return post !== null && post
            }
          })
        })

        return Posts.length ? {
          posts: data,
          hasMore: data.length >= 20,
          lastId: liked[liked.length - 1].id
        } : {
          posts: [],
          hasMore: false,
          lastId: null
        }
      } catch (error) {
        console.log(error);
      }
    },
    async setRulesSearchAlgolia(_, { rank, index }, ctx) {
      if (!index) {
        throw new UserInputError('index search is required, check index name on algolia dashboard')
      }

      if (!rank || !rank.length) {
        throw new UserInputError('rank is Required')
      }

      const algoIndex = server.initIndex(index);

      return new Promise((resolve, reject) => {
        algoIndex.setSettings({ customRanking: rank })
          .then(() => {
            resolve("Success");
          })
          .catch(() => {
            reject("Failed set rules")
          })
      })
    },
    async getPost(_, { id }, context) {
      const { username } = await fbAuthContext(context)

      const postDocument = db.doc(`/posts/${id}`)
      const commentCollection = db.collection(`/posts/${id}/comments`)
      const likeCollection = db.collection(`/posts/${id}/likes`)
      const mutedCollection = db.collection(`/posts/${id}/muted`)
      const subscribeCollection = db.collection(`/posts/${id}/subscribes`)

      if (username) {
        try {
          const dataPost = await postDocument.get();
          const post = dataPost.data();

          if (!dataPost.exists) {
            throw new UserInputError('Post not found')
          } else {
            let repost = {}
            const repostId = get(post, 'repost') || {};
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get();

              repost = repostData.data();
            }

            const commentedBy = async () => {
              let commentedBy = []

              const commentCollection = await db.collection(`/posts/${id}/comments`).get()
              commentCollection.forEach(doc => {
                const isHas = commentedBy.find(result => result === doc.data().owner)
                if (!isHas) {
                  commentedBy.push(doc.data().owner)
                }
              })
              return commentedBy
            };

            const likesPost = await likeCollection.get();
            const likes = likesPost.docs.map(doc => doc.data()) || []

            const commentsPost = await commentCollection.where("reply.id", '==', null).where("status.active", '==', true).orderBy('createdAt', 'asc').limit(8).get();
            const comments = commentsPost.docs.map(doc => doc.data()) || [];

            const mutedPost = await mutedCollection.get();
            const muted = mutedPost.docs.map(doc => doc.data()) || [];

            const subscribePost = await subscribeCollection.get();
            const subscribe = subscribePost.docs.map(doc => doc.data()) || [];

            return {
              ...post,
              repost,
              likes,
              comments: comments,
              muted,
              subscribe,
              repost,
              commentedBy: commentedBy()
            }
          }
        }
        catch (err) {
          console.log(err)
          throw new Error(err)
        }
      }
    },

    async getPostBasedOnNearestLoc(_, { lat, lng }) {
      if (!lat || !lng) {
        throw new UserInputError('Lat and Lng is Required')
      }

      const data = await db.collection('posts').orderBy('createdAt', 'desc').get()
      const docs = data.docs.map((doc) => doc.data())

      if (docs.length) {
        const nearby = []
        let repost = {}

        const { repost: repostId } = docs;

        if (repostId) {
          const repostData = await db.doc(`/posts/${repostId}`).get();

          repost = repostData.data();
        }

        docs.forEach(async data => {
          const likes = () => {
            return db
              .collection(`/posts/${data.id}/likes`)
              .get()
              .then((data) => {
                const likes = [];
                data.forEach((doc) => {
                  likes.push(doc.data());
                });
                return likes;
              });
          };

          const comments = () => {
            return db
              .collection(`/posts/${data.id}/comments`)
              .get()
              .then((data) => {
                const comments = [];
                data.forEach((doc) => {
                  comments.push(doc.data());
                });
                return comments;
              });
          };

          const muted = () => {
            return db
              .collection(`/posts/${data.id}/muted`)
              .get()
              .then((data) => {
                const muted = [];
                data.forEach((doc) => {
                  muted.push(doc.data());
                });
                return muted;
              });
          };

          const newData = { ...data, likes: likes(), comments, muted, repost }

          const { lat: lattitude, lng: longtitude } = newData.location;
          try {
            const currentLatLng = new LatLng(parseFloat(lat), parseFloat(lng));
            const contentLocation = new LatLng(parseFloat(lattitude), parseFloat(longtitude));

            const distance = computeDistanceBetween(currentLatLng, contentLocation)

            if ((distance / 1000) <= 40) { // should be show in range 40 km
              nearby.push(newData)
            }
          } catch (e) {
            console.log('error : ', e)
          }

        });

        return nearby;
      }

      return [];
    },
    async moreForYou(_, _args, _context) {
      try {
        const data = await db.collection('posts').where('rank', '>', 2).orderBy('rank', 'desc').limit(20).get()
        const docs = data.docs.map((doc) => doc.data())
        let posts = []

        if (docs.length) {
          docs.forEach(async data => {
            const { repost: repostId } = data;

            const repostData = async () => {
              if (repostId) {
                const repostData = await db.doc(`/posts/${repostId}`).get()
                return repostData.data() || {}
              }
            }

            // Likes
            const likes = async () => {

              const likesData = await db.collection(`/posts/${data.id}/likes`).get()
              const likes = likesData.docs.map(doc => doc.data())

              return likes;
            };

            // Comments
            const comments = async () => {
              const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
              return commentsData.docs.map(doc => doc.data())
            }

            // Muted
            const muted = async () => {
              const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
              return mutedData.docs.map(doc => doc.data());
            }

            const subscribe = async () => {
              const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
              return subscribeData.docs.map(doc => doc.data());
            }

            const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

            posts.push(newData)
          });
          return {
            posts,
            hasMore: posts.length === 20,
            lastId: posts[posts.length - 1].id
          }
        }
        return {
          posts: [],
          hasMore: posts.length === 20,
          lastId: null
        }
      }
      catch (err) {
        console.log(err);
      }
    }
  },
  Mutation: {
    async nextProfilePosts(_, { id, username: name }, context) {
      const { username } = await fbAuthContext(context)

      const lastPosts = await db.doc(`/posts/${id}/`).get();
      const doc = lastPosts

      const data = await db.collection("posts")
        .where("owner", "==", name ? name : username)
        .orderBy("createdAt", "desc")
        .startAfter(doc)
        .limit(10)
        .get()

      const docs = data.docs.map((doc) => doc.data())

      if (docs.length) {
        const nearby = []

        docs.forEach(async data => {
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get()
              return repostData.data() || {}
            }
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          nearby.push(newData)
        });

        return {
          posts: nearby,
          lastId: nearby[nearby.length - 1].id,
          hasMore: nearby.length >= 10
        };
      }

      return {
        posts: [],
        lastId: null,
        hasMore: false
      };
    },
    async nextProfileLikedPost(_, { username: name, id }, context) {
      const { username } = await fbAuthContext(context)

      const doc = await db.doc(`/users/${name ? name : username}/liked/${id}/`).get();

      const getLiked = await db.collection(`/users/${name ? name : username}/liked/`).startAfter(doc).limit(10).get()
      const liked = getLiked.docs.map(doc => doc.data())

      try {
        //fungsi ngambil postingan yang sudah di like
        const Posts = liked.map(doc => {
          return db.doc(`/posts/${doc.postId}`).get()
            .then(doc => doc.data())
        })


        //fungsi ngambil koleksi likes
        const data = await Promise.all(Posts).then(docs => {
          return docs.map(async doc => {
            if (doc) {
              const { repost: repostId } = doc;
              let repost = {}

              if (repostId) {
                const repostData = await db.doc(`/posts/${repostId}`).get()
                repost = repostData.data() || {}
              }

              const request = await db.collection(`/posts/${doc.id}/likes`).get()
              const likes = request.docs.map(doc => doc.data())

              const commentsData = await db.collection(`/posts/${doc.id}/comments`).get()
              const comments = commentsData.docs.map(doc => doc.data())

              const post = {
                ...doc,
                likes,
                comments,
                repost
              }

              return post !== null && post
            }
          })
        })

        return {
          posts: data,
          hasMore: data.length >= 10,
          lastId: liked.length ? liked[liked.length - 1].id : null
        }
      } catch (error) {
        console.log(error);
      }
    },
    async nextMoreForYou(_, { id }, _context) {
      try {
        const lastPosts = await db.doc(`/posts/${id}/`).get();
        const doc = lastPosts

        const data = await db.collection('posts').where('rank', '>', 2).orderBy('rank', 'desc').startAfter(doc).limit(10).get()
        const docs = data.docs.map((doc) => doc.data())
        let posts = [];

        if (docs.length) {
          docs.forEach(async data => {
            const { repost: repostId } = data;

            const repostData = async () => {
              if (repostId) {
                const repostData = await db.doc(`/posts/${repostId}`).get()
                return repostData.data() || {}
              }
            }

            // Likes
            const likes = async () => {

              const likesData = await db.collection(`/posts/${data.id}/likes`).get()
              const likes = likesData.docs.map(doc => doc.data())

              return likes;
            };

            // Comments
            const comments = async () => {
              const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
              return commentsData.docs.map(doc => doc.data())
            }

            // Muted
            const muted = async () => {
              const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
              return mutedData.docs.map(doc => doc.data());
            }

            const subscribe = async () => {
              const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
              return subscribeData.docs.map(doc => doc.data());
            }

            const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

            posts.push(newData)
          });
          return {
            posts,
            hasMore: posts.length === 10,
            lastId: posts[posts.length - 1].id
          }
        }
        return {
          posts: [],
          hasMore: posts.length === 10,
          lastId: null
        }
      }
      catch (err) {
        console.log(err);
      }
    },
    async nextPosts(_, { id, lat, lng, range }, context) {
      if (!lat || !lng) {
        throw new UserInputError('Lat and Lng is Required')
      }
      const lastPosts = await db.doc(`/posts/${id}/`).get();
      const doc = lastPosts

      const center = [lat, lng]
      const radiusInM = range ? range * 1000 : 1 * 1000

      const bounds = geofire.geohashQueryBounds(center, radiusInM);
      let posts = []

      for (const b of bounds) {
        const q = db.collection('posts')
          .orderBy('geohash')
          .orderBy("createdAt", 'desc')
          .startAfter(doc)
          .endAt(b[1])
          .limit(10)


        posts.push(q.get());
      }

      let latest = []
      let lastId;
      try {
        const docs = await Promise.all(posts).then((snapshots) => {
          const matchingDocs = [];

          snapshots.forEach((snap, index) => {
            if (index === 0) {
              snap.docs.forEach((doc) => {
                // const lat = doc.get('location').lat;
                // const lng = doc.get('location').lng;
                // // We have to filter out a few false positives due to GeoHash
                // // accuracy, but most will match
                // const distanceInKm = geofire.distanceBetween([lat, lng], center);
                // const distanceInM = distanceInKm * 1000;
                // if (distanceInM <= radiusInM) {
                //   matchingDocs.push(doc);
                // }
                matchingDocs.push(doc);
              })
            }
          })
          return matchingDocs;
        })

        docs.forEach(async (doc, index) => {
          const data = doc.data()
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get()
              return repostData.data() || {}
            }
          }

          if (index === 9) {
            lastId = data.id
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          latest.push(newData)
        });

        // latest.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        return {
          posts: latest,
          lastId,
          hasMore: lastId ? latest.length === 9 : false
        }
      }
      catch (err) {
        console.log(err);
      }
    },
    async nextRoomPosts(_, { room, id }, context) {
      if (!lat || !lng) {
        throw new UserInputError('Lat and Lng is Required')
      }
      const lastPosts = await db.doc(`/room/${room}/posts/${id}/`).get();
      const doc = lastPosts

      const data = await db.collection(`/room/${room}/posts`).orderBy("createdAt", "desc").startAfter(doc).limit(10).get()
      const docs = data.docs.map(doc => doc.data())

      if (docs.length) {
        const nearby = []

        docs.forEach(async data => {
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/room/${room}/posts/${repostId}`).get()
              return repostData.data() || {}
            }
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/room/${room}/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/room/${room}/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/room/${room}/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/room/${room}/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          nearby.push(newData);
        });

        return nearby;
      }

      return [];
    },
    async nextPopularPosts(_, { id, lat, lng, range }) {
      if (!lat || !lng) {
        throw new UserInputError('Lat and Lng is Required')
      }
      const lastPosts = await db.doc(`/posts/${id}/`).get();
      const doc = lastPosts

      const center = [lat, lng]
      const radiusInM = range ? range * 1000 : 1 * 1000

      const bounds = geofire.geohashQueryBounds(center, radiusInM);
      let posts = []

      for (const b of bounds) {
        const q = db.collection('posts')
          .orderBy('geohash')
          .orderBy('createdAt', 'desc')
          .startAfter(doc)
          .endAt(b[1])
          .limit(10)


        posts.push(q.get());
      }

      let latest = []
      let lastId;
      try {
        const docs = await Promise.all(posts).then((snapshots) => {
          const matchingDocs = [];

          snapshots.forEach((snap, index) => {
            if (index === 0) {
              snap.docs.forEach((doc) => {
                // const lat = doc.get('location').lat;
                // const lng = doc.get('location').lng;
                // // We have to filter out a few false positives due to GeoHash
                // // accuracy, but most will match
                // const distanceInKm = geofire.distanceBetween([lat, lng], center);
                // const distanceInM = distanceInKm * 1000;
                // if (distanceInM <= radiusInM) {
                //   matchingDocs.push(doc);
                // }
                matchingDocs.push(doc);
              })
            }
          })
          return matchingDocs;
        })

        docs.forEach(async (doc, index) => {
          const data = doc.data()
          const { repost: repostId } = data;

          const repostData = async () => {
            if (repostId) {
              const repostData = await db.doc(`/${repostId.room ? `room/${repostId.room}/posts` : 'posts'}/${repostId.repost}`).get()
              return repostData.data() || {}
            }
          }

          if (index === 9) {
            lastId = data.id
          }

          // Likes
          const likes = async () => {

            const likesData = await db.collection(`/posts/${data.id}/likes`).get()
            const likes = likesData.docs.map(doc => doc.data())

            return likes;
          };

          // Comments
          const comments = async () => {
            const commentsData = await db.collection(`/posts/${data.id}/comments`).get()
            return commentsData.docs.map(doc => doc.data())
          }

          // Muted
          const muted = async () => {
            const mutedData = await db.collection(`/posts/${data.id}/muted`).get();
            return mutedData.docs.map(doc => doc.data());
          }

          const subscribe = async () => {
            const subscribeData = await db.collection(`/posts/${data.id}/subscribes`).get();
            return subscribeData.docs.map(doc => doc.data());
          }

          const newData = { ...data, likes: likes(), comments: comments(), muted: muted(), repost: repostData(), subscribe: subscribe() }

          latest.push(newData)
        });

        latest.sort((a, b) => b.rank - a.rank)

        return {
          posts: latest,
          lastId,
          hasMore: lastId ? latest.length === 9 : false
        }
      }
      catch (err) {
        console.log(err);
      }
    },
    async createPost(_, { text, media, location, repostedPost, room }, context) {
      const { username } = await fbAuthContext(context);

      if (username) {
        try {
          const regexpHastag = /(\s|^)\#\w\w+\b/
          let hastags = text.match(regexpHastag) || [];
          if (hastags) {
            hastags = hastags.map((s) => s.trim());
          }

          const geohash = geofire.geohashForLocation([location.lat, location.lng])

          const newPost = room ? {
            owner: username,
            text,
            media,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
            rank: 0,
            geohash,
            location,
            commentedBy: [],
            _tags: hastags,
            status: {
              active: true,
              flag: [],
              takedown: false
            },
            room
          } : {
            owner: username,
            text,
            media,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
            rank: 0,
            geohash,
            location,
            commentedBy: [],
            status: {
              active: true,
              flag: [],
              takedown: false
            },
            _tags: hastags
          };

          if (repostedPost.idReposted) {
            newPost.repostedPost = repostedPost
          }

          await db.collection("posts")
            .add(newPost)
            .then(async (doc) => {
              newPost.id = doc.id;

              doc.update({ id: doc.id });
            });

          if (repostedPost.idReposted) {
            db.doc(`/posts/${repostedPost.idReposted}`).get()
              .then(async doc => {
                doc.ref.update({ repostCount: doc.data().repostCount + 1, rank: doc.data().rank + 1 })
                if (doc.data().owner !== username) {
                  const { name, displayImage, colorCode } = await randomGenerator(username, repost.repost, false)

                  const notification = {
                    owner: doc.data().owner,
                    recipient: doc.data().owner,
                    sender: username,
                    read: false,
                    postId: newPost.id,
                    type: "REPOST",
                    createdAt: new Date().toISOString(),
                    displayName: name,
                    displayImage,
                    colorCode,
                  }

                  db.collection(`/users/${doc.data().owner}/notifications`)
                    .add(notification)
                    .then((data) => {
                      data.update({ id: data.id });
                      pubSub.publish(NOTIFICATION_ADDED, { notificationAdded: { ...notification, id: data.id } })
                    });
                }
              })
          }

          if (Object.keys(location).length) {
            const visited = await db.collection(`/users/${username}/visited`)
              .where('lng', '==', location.lng)
              .where('lat', '==', location.lat)
              .get();
            const hasSameLocation = visited.docs.map(doc => doc.data()).length

            if (!hasSameLocation) {
              // store visited location
              await db.collection(`/users/${username}/visited`).add({
                ...location,
                createAt: new Date().toISOString()
              });
            }
          }

          return {
            ...newPost,
            likes: [],
            comments: [],
            muted: [],
            subscribe: []
          };
        } catch (err) {
          throw new Error(err);
        }
      }
    },
    async deletePost(_, { id }, context) {
      const { username } = await fbAuthContext(context);

      const document = db.doc(`/posts/${id}`);
      const commentsCollection = db.collection(`/posts/${id}/comments`);
      const likesCollection = db.collection(`/posts/${id}/likes`);
      const randomizedCollection = db.collection(`/posts/${id}/randomizedData`);
      const subcribeCollection = db.collection(`/posts/${id}/subscribes`);
      const likesData = db.collection(`/posts/${id}/likes`);

      try {
        await document.get().then(async (doc) => {
          if (!doc.exists) {
            throw new Error("Postingan tidak di temukan");
          }
          if (doc.data().owner !== username) {
            throw new AuthenticationError("Unauthorized");
          } else {
            if (doc.data().repost && doc.data().repost.repost) {
              const { repost } = doc.data()
              db.doc(`/posts/${repost.repost}`).get()
                .then(doc => doc.ref.update({ repostCount: doc.data().repostCount - 1 }))
            }
            return likesData.get()
              .then(data => {
                data.forEach(doc => {
                  db.doc(`/users/${doc.data().owner}/liked/${doc.data().id}`).delete()
                })
                return commentsCollection.get()
              })
              .then((data) => {
                data.forEach((doc) => {
                  db.doc(`/posts/${id}/comments/${doc.data().id}`).delete();
                });
                return likesCollection.get();
              })
              .then((data) => {
                data.forEach((doc) => {
                  db.doc(`/posts/${id}/likes/${doc.data().id}`).delete();
                });
                return randomizedCollection.get();
              })
              .then((data) => {
                data.forEach((doc) => {
                  db.doc(`/posts/${id}/randomizedData/${doc.data().id}`).delete();
                });
                return db
                  .collection(`/users/${username}/notifications`)
                  .where("postId", "==", id)
                  .get();
              })
              .then((data) => {
                data.forEach((doc) => {
                  db.doc(`/users/${username}/notifications/${doc.data().id}/`).delete();
                });
                return subcribeCollection.get();
              })
              .then((data) => {
                document.delete();
                return data.docs.forEach((doc) => {
                  const docOwner = doc.data().owner;
                  db.doc(`/posts/${id}/subscribes/${doc.data().id}/`).delete();
                  return db
                    .collection(`/users/${doc.data().owner}/notifications`)
                    .where("postId", "==", id)
                    .get()
                    .then((data) => {
                      data.forEach((doc) => {
                        db.doc(`/users/${docOwner}/notifications/${doc.data().id}/`).delete();
                      });
                    });
                });
              });
          }
        });
        return {
          id: document.id
        };
      } catch (err) {
        console.log(err);
        throw new Error(err);
      }
    },
    async likePost(_, { id }, context) {
      const { username } = await fbAuthContext(context);
      const { name, displayImage, colorCode } = await randomGenerator(username, id, false);

      const postDocument = db.doc(`/posts/${id}`);
      const likeCollection = db.collection(`/posts/${id}/likes`);
      const subscribeCollection = db.collection(`/posts/${id}/subscribes`);

      try {
        const { isLiked, likeId } = await likeCollection
          .where("owner", "==", username)
          .limit(1)
          .get()
          .then((data) => {
            const isLiked = data.empty;
            let likeId = "";

            if (!data.empty) {
              likeId = data.docs[0].id;
            }
            return {
              isLiked,
              likeId,
            };
          });
        let post;
        let likeData;

        await postDocument.get().then((doc) => {
          if (doc.data()) {
            post = doc.data();

            if (!isLiked) {
              // Unlike
              doc.ref.update({ likeCount: post.likeCount - 1, rank: post.rank - 1 })

              likeData = {
                owner: username,
                createdAt: new Date().toISOString(),
                id: likeId,
                postId: post.id,
                displayName: name,
                displayImage,
                colorCode
              };

              db.doc(`/posts/${id}/likes/${likeId}`).delete();
              db.doc(`/users/${username}/liked/${likeId}`).delete();

              return subscribeCollection.get().then((data) => {
                if (!data.empty) {
                  return data.docs.forEach((doc) => {
                    return db
                      .collection(`/users/${doc.data().owner}/notifications`)
                      .where("postId", "==", id)
                      .where("owner", "==", doc.data().owner)
                      .get()
                      .then((data) => {
                        return data.docs.forEach((doc) => {
                          db.doc(`/users/${doc.data().owner}/notifications/${doc.data().id}`).delete();

                          if (post.owner !== username) {
                            db.collection(`/users/${post.owner}/notifications`)
                              .where("type", "==", "LIKE")
                              .where("sender", "==", username)
                              .get()
                              .then((data) => {
                                db.doc(`/users/${post.owner}/notifications/${data.docs[0].id}`).delete();
                              });
                          }
                        });
                      });
                  });
                } else {
                  if (post.owner !== username) {
                    db.collection(`/users/${post.owner}/notifications`)
                      .where("type", "==", "LIKE")
                      .where("sender", "==", username)
                      .get()
                      .then((data) => {
                        db.doc(`/users/${post.owner}/notifications/${data.docs[0].id}`).delete();
                      });
                  }
                }
              });
            } else {
              // Like
              doc.ref.update({ likeCount: post.likeCount + 1, rank: post.rank + 1 });

              return likeCollection
                .add({
                  owner: username,
                  createdAt: new Date().toISOString(),
                  displayName: name,
                  displayImage,
                  colorCode,
                })
                .then((data) => {
                  data.update({ id: data.id });
                  likeData = {
                    owner: username,
                    createdAt: new Date().toISOString(),
                    id: data.id,
                    postId: post.id,
                    displayName: name,
                    displayImage,
                    colorCode
                  };

                  db.doc(`/users/${username}/liked/${data.id}`).set(likeData);

                  if (post.owner !== username) {
                    const notification = {
                      owner: post.owner,
                      recipient: post.owner,
                      sender: username,
                      read: false,
                      postId: post.id,
                      type: "LIKE",
                      createdAt: new Date().toISOString(),
                      displayName: name,
                      displayImage,
                      colorCode,
                    }
                    //FIX ME
                    db.collection(`/users/${post.owner}/notifications`)
                      .add(notification)
                      .then((data) => {
                        data.update({ id: data.id });
                      });
                  }

                  return subscribeCollection.get().then((data) => {
                    if (!data.empty) {
                      return data.docs.forEach((doc) => {
                        if (doc.data().owner !== username) {
                          const subNotif = {
                            owner: doc.data().owner,
                            recipient: post.owner,
                            sender: username,
                            read: false,
                            postId: post.id,
                            type: "LIKE",
                            createdAt: new Date().toISOString(),
                            owner: doc.data().owner,
                            displayName: name,
                            displayImage,
                            colorCode,
                          }

                          // FIX ME
                          return db
                            .collection(`/users/${doc.data().owner}/notifications`)
                            .add(subNotif)
                            .then((data) => {
                              data.update({ id: data.id });
                            });
                        }
                      });
                    }
                  });
                });
            }
          } else {
            throw new UserInputError("Postingan tidak di temukan");
          }
        });

        return {
          ...likeData,
          isLiked
        };
      } catch (err) {
        console.log(err);
        throw new Error(err);
      }
    }, async mutePost(_, { postId }, context) {
      const { username } = await fbAuthContext(context)
      const postDocument = db.doc(`/posts/${postId}`)
      const muteDocument = db.collection(`/posts/${postId}/muted`)

      try {
        const userData = await db.doc(`/users/${username}`).get()
        const { isMuted, muteId } = await muteDocument.where("owner", "==", username).limit(1).get()
          .then(data => {
            const isMuted = data.empty
            let muteId = '';

            if (!data.empty) {
              muteId = data.docs[0].id
            }

            return {
              isMuted,
              muteId
            }
          })

        const postData = await postDocument.get()
          .then(doc => {
            const {
              id,
              owner,
              text,
              media,
              createdAt,
              location,
              repost,
              room
            } = doc.data()



            return {
              id,
              owner,
              text,
              media,
              createdAt,
              location,
              repost,
              room
            }
          })
          .catch((err) => {
            throw new Error(err)
          })

        let mute = {
          owner: username,
          createdAt: new Date().toISOString(),
          postData
        }

        await postDocument.get()
          .then(doc => {
            if (!doc.exists) {
              throw new UserInputError('Postingan tidak di temukan')
            } else {
              if (!isMuted) {
                db.doc(`/posts/${postId}/muted/${muteId}`).delete()
                db.doc(`/users/${username}/muted/${muteId}`).delete()
                mute = {
                  ...mute,
                  mute: false,
                  id: muteId
                }
                const mutedUser = userData.data().mutedUser.filter(user => user !== doc.data().owner)
                userData.ref.update({ mutedUser })
              } else {
                return muteDocument.add({ owner: username, createdAt: new Date().toISOString(), postId })
                  .then(data => {
                    data.update({ id: data.id })
                    mute = {
                      ...mute,
                      mute: true,
                      id: data.id
                    }
                    db.doc(`/users/${username}/muted/${data.id}`).set(mute)
                    userData.ref.update({ mutedUser: [...userData.data().mutedUser, doc.data().owner] })
                  })
              }
            }
          })

        return {
          ...mute,
          postId
        }

      } catch (err) {
        throw new Error(err)
      }


    },
    async subscribePost(_, { postId }, context) {
      const { username } = await fbAuthContext(context);
      const { name, displayImage, colorCode } = await randomGenerator(
        username,
        postId,
        false
      );

      const postDocument = db.doc(`/posts/${postId}`);
      const subscribeCollection = db.collection(`/posts/${postId}/subscribes`);

      let postOwner;
      let subscribe;

      try {
        const { isSubscribed, subId } = await subscribeCollection
          .where("owner", "==", username)
          .limit(1)
          .get()
          .then((data) => {
            const isSubscribed = data.empty;
            let subId = "";

            if (!data.empty) {
              subId = data.docs[0].id;
            }
            return {
              isSubscribed,
              subId,
            };
          });

        await postDocument
          .get()
          .then((doc) => {
            if (!doc.exists) {
              throw new UserInputError("post tidak di temukan");
            } else {
              subscribe = {
                owner: username,
                createdAt: new Date().toISOString(),
                displayName: name,
                displayImage,
                colorCode,
                postId,
              };

              if (isSubscribed) {
                postOwner = doc.data().owner;

                return db
                  .collection(`/posts/${postId}/subscribes`)
                  .add(subscribe)
                  .then((data) => {
                    data.update({ id: data.id });

                    db.collection(`/users/${username}/subscribed`).add({
                      ...subscribe
                    }).then(data => {
                      data.update({ id: data.id })
                    })

                    if (postOwner !== username) {
                      const notification = {
                        owner: postOwner,
                        recipient: postOwner,
                        sender: username,
                        read: false,
                        postId: postId,
                        type: "SUBSCRIBE",
                        createdAt: new Date().toISOString(),
                        displayName: name,
                        displayImage,
                        colorCode,
                      }
                      // FIX ME
                      db.collection(`/users/${postOwner}/notifications`)
                        .add(notification)
                        .then((data) => {
                          data.update({ id: data.id });
                          pubSub.publish(NOTIFICATION_ADDED, { notificationAdded: { ...notification, id: data.id } })
                        });
                    }
                  });
              } else {
                db.doc(`/posts/${postId}/subscribes/${subId}/`).delete();
                db.collection(`/users/${username}/subscribed/`).where('postId', '==', postId).get()
                  .then(data => {
                    db.doc(`/users/${username}/subscribed/${data.docs[0].id}`).delete()
                  })
              }
            }
          });

        return {
          ...subscribe,
          isSubscribe: isSubscribed
        };
      } catch (err) {
        console.log(err);
        throw new Error(err);
      }
    },
    async textSearch(_, { search, perPage = 5, page, range = 40, location }, context) {
      const { lat, lng } = location;
      const index = client.initIndex('search_posts');

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

      return new Promise((resolve, reject) => {
        index.search(search, { ...defaultPayload, ...geoLocPayload, ...pagination })
          .then(res => {
            const { hits, page, nbHits, nbPages, hitsPerPage, processingTimeMS } = res;

            const newHits = []
            if (hits.length) {
              hits.forEach(async data => {
                // Likes
                const likes = async () => {

                  const likesData = await db.collection(`/posts/${data.id}/likes`).get()
                  const likes = likesData.docs.map(doc => doc.data())

                  return likes;
                };

                newHits.push({ ...data, likes: likes() })
              })
            }

            // return following structure data algolia
            resolve({ hits: newHits, page, nbHits, nbPages, hitsPerPage, processingTimeMS })
          }).catch(err => {
            reject(err)
            console.error(err)
          });
      });
    },
  },
};
