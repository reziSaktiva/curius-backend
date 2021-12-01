const gql = require('graphql-tag');

module.exports = gql`
    type Admin {
        id: ID!
        email: String
        name: String
    }
    type Post {
        id: ID
        owner: String
        text: String
        media: Media
        createdAt: String
        location: LatLong
        rank: Int
        likeCount: Int
        commentCount: Int
        repostCount: Int
        status: StatusPost
        comments: [Comment]
        likes: [Like]
        muted: [Mute]
        repost: Repost
        subscribe: [Subscribe],
        hastags: [String]
        room: String
    }
    type Media {
        content: [String]
        meta: String
        type: String
    }
    type StatusPost {
        active: Boolean
        flag: [String]
        takedown: Boolean
    }
    type User {
        id: ID!
        username: String
        fullName: String
        email: String
        mobileNumber: String
        gender: String
        dob: String
        joinDate: String
        profilePicture: String
        theme: String
        status: String
        interest: [String]
    }
    type Repost {
        id: ID
        owner: String
        text: String
        media: [String]
        createdAt: String
        location: LatLong
    }
    type LatLong {
        lat: Float
        lng: Float
        detail: DetailLatLong
    }
    type DetailLatLong {
        city: String
        country: String
        district: String
        formattedAddress: String
        postCode: String
        state: String
        streetName: String
        subDistrict: String
    }
    type Like {
        id: ID!
        owner: String!
        createdAt: String!
        displayName: String!
        displayImage: String!
        colorCode: String!
        isLike: Boolean
    },
    type Mute {
        id:ID!
        owner: String!
        createdAt: String!
        postId: ID!
        mute: Boolean
    }
    type Comment {
        id: ID
        createdAt: String
        owner: String
        text: String
        photoProfile: String
        photo: String
        displayName: String
        displayImage: String
        colorCode: String
        reply: ReplyData
        # replyList: [Comment]
    },
    type ReplyData {
        username: String
        id: ID
    },
    type Subscribe {
        owner: String!
        createdAt: String!
        postId: ID!
        displayName: String!
        displayImage: String!
        colorCode: String!
        isSubscribe: Boolean
    },
    type SearchUser {
        hits: [User]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    type SearchPost {
        hits: [Post]
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
        searchPost(search: String, perPage: Int, page: Int ): SearchPost
    }
`