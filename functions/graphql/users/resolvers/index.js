const userResolvers = require('./users')
const postResolvers = require('./posts')
const commentResolvers = require('./comments')
const roomResolvers = require('./room')

module.exports = {
    Query: {
        ...postResolvers.Query,
        ...userResolvers.Query,
        ...roomResolvers.Query,
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...postResolvers.Mutation,
        ...commentResolvers.Mutation
    }
}