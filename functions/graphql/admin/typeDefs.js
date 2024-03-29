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
        profilePicture: String
        email: String
        mobileNumber: String
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
    type UpdateUserStatus {
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
        message: String
    }
    type UpdatePostStatus {
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
        message: String
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
        textContent: String
        photoProfile: String
        photo: String
        reportedCount: Float
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
        timestamp: String
        reportedCount: Int
        status: StatusPost
        profilePicture: String
        media: Media
        idPost: ID
    }

    type SearchCommentReportedList {
        hits: [ReportPost]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float 
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

    type DetailReportedPost {
        post: Post!
        owner: User!
        commentOwner: User!
        comment: Comment!
    }

    type AdminSearch {
        hits: [Admin]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }

    type Query {
        getAdmin(page: Int, perPage: Int): AdminSearch
        getReportedListByCommentId(search: String, commentId: ID, page: Int, perPage: Int): SearchCommentReportedList
        getRoomById(id: ID!): Room!
        getDetailReportedComment(idComment: ID!, idPost: ID!): DetailReportedPost

        # Search
        searchUser(search: String, status: String, perPage: Int, page: Int, filters: RequestFilterUser, sortBy: String, useExport: Boolean ): SearchUser!
        searchPosts(search: String, perPage: Int, page: Int, useExport: Boolean, hasReported: Boolean, useDetailLocation: Boolean, range: Float, location: String, filters: RequestFilter, room: String, sortBy: String ): SearchPosts!
        searchRoom(name: String, location: String, useDetailLocation: Boolean, page: Int, perPage: Int, isDeactive: Boolean, sortBy: String, useExport: Boolean): SearchRoom
        searchCommentReported(search: String, sortBy: String, page: Int, perPage: Int, filters: RequestFilter, useExport: Boolean): SearchCommentReported
        
        # Randomization
        searchThemes(name: String): [ThemeType]

        # Posts
        getSinglePost(id: ID! room: String, commentId: ID): SinglePostDetail!
        getReportedByIdPost(idPost: ID!, lastId: ID, perPage: Int page: Int): SearchReportPost

        # Graph
        getGraphSummary(graphType: String, state: String): GraphData
        getGraphData(graphType: String, state: String): [DataStatistic]
        getAdminLogs(page: Int, perPage: Int, search: String, useExport: Boolean): SearchAdminLogs
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
        active: Int
    }

    type PostStatistic {
        total: Int
        totalReported: Int
        active: Int
        nonActive: Int
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
        isSuspend: Boolean
        timestamp: Timestamp
    }

    type ReportPost {
        content: String
        idPost: ID
        idComment:ID
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

    type CheckEmailStatus {
        valid: Boolean
        isBanned: Boolean
    }

    type ApprovalAdmin {
        status: String
        id: ID
        message: String
    }

    type BasicResponseAction {
        id: ID
        message: String
        status: String
    }

    type Mutation {
        checkEmail(email: String uid: String name: String, accessCode: String!): CheckEmailStatus
        registerAdmin(email: String! level: Int! name: String!, accessCode: String!): String
        changeUserStatus(status: String!, username: String!): UpdateUserStatus!
        setStatusComment(idComment: ID, flags: [String], removeFlags: Boolean, active: Boolean, takedown: Boolean, deleted: Boolean): CommentReported
        setStatusPost(active: Boolean, flags: [String], removeFlags: Boolean, takedown: Boolean, postId: String, deleted: Boolean): UpdatePostStatus!
        approveAdminAction(notifId: ID, approve: Boolean): BasicResponseAction

        # Randomization
        updateThemesById(id: ID, name: String, colors: [Colors], adjective: [Adjective], nouns: [Nouns], isDeleted: Boolean, isActive: Boolean): ThemeType 
        setStatusAdmin(adminId: ID, isActive: Boolean, isBanned: Boolean): Admin
        deleteConfigThemesById(attr: String!, themeId: ID! , id: ID!): ThemeType

        # Create New Data
        createRoom(roomName: String, description: String, startingDate: String, tillDate: String, displayPicture: String, location: LatLongWithRangeInput, range: Int): Room
        updateRoom(isDeactive: Boolean, roomId: ID, roomName: String, description: String, startingDate: String, tillDate: String, displayPicture: String, location: LatLongWithRangeInput, range: Int): Room
        reportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost!
        reportedComment(idComment: ID!, idPost: ID, reason: String!, roomId: ID, username: String!): String
        createReportPostById(idPost: ID!, content: String, userIdReporter: ID!): ReportPost
        createNewTheme(name: String, colors: [Colors], adjective: [Adjective], nouns: [Nouns]): ThemeType
        deleteThemeById(id: ID!): BasicResponseAction
        deleteAdminAccount(id: ID!): BasicResponseAction
        
        # Replication
        createReplicatePostAscDesc: String
        syncAlogliaFirebase: String

        # Admin
        getAdminLogin: Admin

        # Room
        deleteRoom(roomId: ID!): BasicResponseAction
    }
`