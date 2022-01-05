const adminResolvers = require('./admin')
const usersResolvers = require('./users')
const postsResolvers = require('./posts')
const roomResolvers = require('./room')

module.exports = {
    Query: {
        ...adminResolvers.Query,
        ...usersResolvers.Query,
        ...postsResolvers.Query,
        ...roomResolvers.Query
    },
    Mutation: {
        ...adminResolvers.Mutation,
        ...usersResolvers.Mutation,
        ...postsResolvers.Mutation,
        ...roomResolvers.Mutation
    }
}