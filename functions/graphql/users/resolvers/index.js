const userResolvers = require('./users')
const postResolvers = require('./posts')
const commentResolvers = require('./comments')
const roomResolvers = require('./room')
const chatsResolvers = require('./chats')

module.exports = {
    Query: {
        ...postResolvers.Query,
        ...userResolvers.Query,
        ...roomResolvers.Query,
        ...chatsResolvers.Query
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...postResolvers.Mutation,
        ...commentResolvers.Mutation
    }
}