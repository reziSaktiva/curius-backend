const userResolvers = require('./users')
const postResolvers = require('./posts')
const commentResolvers = require('./comments')

module.exports = {
    Query:{
        ...postResolvers.Query,
        ...userResolvers.Query
    },
    Mutation:{
        ...userResolvers.Mutation,
        ...postResolvers.Mutation,
        ...commentResolvers.Mutation
    }
}