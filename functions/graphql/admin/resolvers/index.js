const adminResolvers = require('./admin')
const usersResolvers = require('./users')
const postsResolvers = require('./posts')
const roomResolvers = require('./room')
const graphResolvers = require('./graph')

module.exports = {
    Query: {
        ...adminResolvers.Query,
        ...usersResolvers.Query,
        ...postsResolvers.Query,
        ...roomResolvers.Query,
        ...graphResolvers.Query
    },
    Mutation: {
        ...adminResolvers.Mutation,
        ...usersResolvers.Mutation,
        ...postsResolvers.Mutation,
        ...roomResolvers.Mutation
    }
}