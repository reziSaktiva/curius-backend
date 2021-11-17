const adminResolvers = require('./admin')
const usersResolvers = require('./users')

module.exports = {
    Query: {
        ...adminResolvers.Query,
    },
    Mutation: {
        ...adminResolvers.Mutation,
        ...usersResolvers.Mutation
    }
}