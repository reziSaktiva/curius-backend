const adminResolvers = require('./admin')
const usersResolvers = require('./users')
const postsResolvers = require('./posts')
const roomResolvers = require('./room')

module.exports = {
    Query: {
        ...adminResolvers.Query,
    },
    Mutation: {
        ...adminResolvers.Mutation,
        ...usersResolvers.Mutation,
        ...postsResolvers.Mutation,
        ...roomResolvers.Mutation
    }
}