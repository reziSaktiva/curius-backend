const gql = require('graphql-tag');

module.exports = gql`
    type Admin {
        id: ID!
        email: String
        name: String
    }
    type User {
        id: ID!
        username: String
        fullName: String
        email: String
        mobileNumber: Float
        gender: String
        dob: String
        joinDate: String
        profilePicture: String
        theme: String
        interest: [String]
    }
    type SearchUser {
        hits: [User]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    type Query {
        getAdmin: [Admin]
    }
    type Mutation {
        checkEmail(email: String): Boolean

        # Search
        searchUser(search: String, perPage: Int, page: Int ): SearchUser!
    }
`