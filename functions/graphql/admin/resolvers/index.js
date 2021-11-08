const adminResolvers = require('./admin')

module.exports = {
    Query: {
        ...adminResolvers.Query,
    },
    Mutation: {
        ...adminResolvers.Mutation
    }
}