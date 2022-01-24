const gql = require('graphql-tag');

module.exports = gql`
    type Admin {
        id: ID!
        email: String
        name: String
        level: Int
        isBanned: Boolean
        isActive: Boolean
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
    type Room {
        id: ID
        createdAt: String
        createdBy: String
        description: String
        displayPicture: String
        totalPosts: Float
        roomName: String
        startingDate: String
        tillDate: String
        address: String
        isDeactive: Boolean
        location: LatLongWithRange
    }
    type Media {
        content: [String]
        meta: String
        type: String
    }
    type StatusPost {
        active: Boolean
        flags: [String]
        takedown: Boolean
        deleted: Boolean
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
    type LatLongWithRange {
        lat: Float
        lng: Float
        range: Float
        detail: DetailLatLong
    }
    input LatLongWithRangeInput {
        lat: Float
        lng: Float
        range: Float
        detail: DetailLatLongInput
    }

    input DetailLatLongInput {
        formattedAddress: String
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
    type SearchRoom {
        hits: [Room]
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
    type SinglePostDetail {
        owner: User
        post: Post
    }
    type CommentReported {
        id: ID
        text: String
        owner: String
        timestamp: Float
        reportedCount: Int
        status: String
        profilePicture: String
        isTakedown: Boolean
        isActive: Boolean
    }
    type SearchCommentReported {
        hits: [CommentReported]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    type StatisticUser {
        label: String
        total: Int
        percentage: Int
    }

    type Query {
        getAdmin: [Admin]
        getReportedListByCommentId(search: String, commentId: ID, page: Int, perPage: Int): SearchCommentReported
        getRoomById(id: ID!): Room!

        # Search
        searchUser(search: String, status: String, perPage: Int, page: Int, filters: RequestFilterUser ): SearchUser!
        searchPosts(search: String, perPage: Int, page: Int, hasReported: Boolean, useDetailLocation: Boolean, range: Float, location: String, filters: RequestFilter, room: String, sortBy: String ): SearchPosts!
        searchRoom(name: String, location: String, useDetailLocation: Boolean, page: Int, perPage: Int): SearchRoom
        searchCommentReported(search: String, sortBy: String, page: Int, perPage: Int, filters: RequestFilter): SearchCommentReported
        
        # Randomization
        searchThemes(name: String): [ThemeType]

        # Posts
        getSinglePost(id: ID! room: String, commentId: ID): SinglePostDetail!
        getReportedByIdPost(idPost: ID!, lastId: ID, perPage: Int): SearchReportPost

        # Graph
        getGraphSummary(graphType: String, state: String): GraphData
        getAdminLogs(page: Int, perPage: Int, search: String): SearchAdminLogs
        getStaticUserByAge: [StatisticUser]
    }

    type AdminLog {
        adminId: ID
        name: String
        message: String
        createdAt: String
        role: Int
    }

    type SearchAdminLogs {
        hits: [AdminLog]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }

    type SearchPosts {
        hits: [Post]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }

    type DataStatistic {
        date: String
        total: Int
    }

    type UserStatistic {
        total: Int
        newUser: Int
        deleted: Int 
    }

    type PostStatistic {
        total: Int
        totalReported: Int
    }

    type SummaryData {
        user: UserStatistic
        post: PostStatistic
    }

    type GraphData {
        summary: SummaryData
        graph: [DataStatistic]
    }
    
    input Location {
        lat: Float
        lng: Float
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
        owner: String
    }

    input RequestFilterUser {
        hasEmail: Boolean
        hasPhoneNumber: Boolean
    }

    type ReportPost {
        content: String
        idPost: ID
        userIdReporter: ID
        username: String
        totalReported: Int
    }

    type SearchReportPost {
        hits: [ReportPost]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }

    input Colors {
        name: String
        hex: String
        id: ID
    }

    input Adjective {
        name: String
        id: ID
    }

    type AdjectiveType {
        name: String
        id: ID
    }

    type ColorsType {
        name: String
        hex: String
        id: ID
    }

    input Nouns {
        avatarUrl: String
        name: String
        id: ID
    }

    type NounsType {
        avatarUrl: String
        name: String
        id: ID
    }

    type ThemeType {
        id: ID
        name: String
        isDeleted: Boolean
        isActive: Boolean
        colors: [ColorsType]
        adjective: [AdjectiveType]
        nouns: [NounsType]
    }

    type Mutation {
        checkEmail(email: String uid: String name: String, accessCode: String!): Boolean
        registerAdmin(email: String! level: Int! name: String!): String
        changeUserStatus(status: String!, username: String!): User!
        setStatusComment(idComment: ID, active: Boolean, takedown: Boolean, deleted: Boolean): CommentReported
        setStatusPost(active: Boolean, flags: [String], takedown: Boolean, postId: String, deleted: Boolean): Post!\

        # Randomization
        updateThemesById(id: ID, name: String, colors: [Colors], adjective: [Adjective], nouns: [Nouns], isDeleted: Boolean, isActive: Boolean): ThemeType 
        setStatusAdmin(adminId: ID, isActive: Boolean, isBanned: Boolean): Admin
        deleteConfigThemesById(attr: String!, themeId: ID! , id: ID!): ThemeType

        # Create New Data
        createRoom(roomName: String, description: String, startingDate: String, tillDate: String, displayPicture: String, location: LatLongWithRangeInput, range: Int): String
        updateRoom(isDeactive: Boolean, roomId: ID, roomName: String, description: String, startingDate: String, tillDate: String, displayPicture: String, location: LatLongWithRangeInput, range: Int): Room
        reportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost!
        reportedComment(idComment: ID!, idPost: ID, reason: String!, roomId: ID, username: String!): String
        createReportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost
        createNewTheme(name: String, colors: [Colors], adjective: [Adjective], nouns: [Nouns]): ThemeType
        
        # Replication
        createReplicatePostAscDesc: String
    }
`