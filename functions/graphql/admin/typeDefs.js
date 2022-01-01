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
        reportedCount: Int
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
        # Search
        searchUser(search: String, status: String, perPage: Int, page: Int ): SearchUser!
        searchPosts(search: String, perPage: Int, page: Int, hasReported: Boolean, range: Float, location: String, filters: RequestFilter ): SearchPosts!
        
        # Randomization
        searchThemes(name: String): [ThemeType]

        # Posts
        getSinglePost(id: ID! room: String): Post!
        getReportedByIdPost(idPost: ID!, lastId: ID, perPage: Int): [ReportPost]
    }

    type SearchPosts {
        hits: [Post]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    
    input Location {
        lat: Float
        lng: Float
        name: String
    }

    input Timestamp {
        from: String
        to: String
    }

    input Rating {
        from: Float
        to: Float
    }

    input RequestFilter {
        timestamp: Timestamp
        rating: Rating
        media: [String]
        status: String
    }

    type ReportPost {
        content: String
        idPost: ID
        userIdReporter: ID
        totalReported: Int
    }

    input Colors {
        name: String
        hex: String
    }

    type ColorsType {
        name: String
        hex: String
    }

    input Nouns {
        avatarUrl: String
        name: String
    }

    type NounsType {
        avatarUrl: String
        name: String
    }

    type ThemeType {
        id: ID
        name: String
        isDeleted: Boolean
        isActive: Boolean
        colors: [ColorsType]
        adjective: [String]
        nouns: [NounsType]
    }

    type Mutation {
        checkEmail(email: String uid: String name: String): Boolean
        registerAdmin(email: String level: Int): String
        changeUserStatus(status: String!, username: String!): User!
        setStatusPost(active: Boolean, flags: [String], takedown: Boolean, postId: String): Post!\

        # Randomization
        updateThemesById(id: ID, name: String, colors: [Colors], adjective: [String], nouns: [Nouns], isDeleted: Boolean, isActive: Boolean): ThemeType 

        # Create New Data
        createRoom(roomName: String, description: String, startingDate: String, tillDate: String, displayPicture: String): String
        reportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost!
        createReportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost
        createNewTheme(name: String, colors: [Colors], adjective: [String], nouns: [Nouns]): ThemeType
    }
`