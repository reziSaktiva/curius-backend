const gql = require('graphql-tag')

module.exports = gql`
    type Post {
        id: ID!
        owner: String!
        text: String
        media: Media
        createdAt: String!
        location: LatLong
        rank: Int
        likeCount: Int
        commentCount: Int
        repostCount: Int
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
    type Search {
        hits: [Post]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    # type Repost {
    #     repost: String
    #     room: String
    # }
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
        name: String
    }
    type GeoLocation {
        administrative_area_level_4: String
        administrative_area_level_3: String
        administrative_area_level_2: String
        administrative_area_level_1: String
        country: String
        photo_reference: String
        location: LatLong
    }
    type Private {
        hash: String
        lastUpdate: String
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
        passwordUpdateHistory: [Private]
        postsCount: Int
        repostCount: Int
        likesCount: Int
    },
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
    
    input Reply {
        username: String
        id: ID
    },
    
    type ReplyData {
        username: String
        id: ID
    },
    type Like {
        id: ID!
        owner: String!
        createdAt: String!
        displayName: String!
        displayImage: String!
        colorCode: String!
        isLike: Boolean
    },
    type Notification {
        owner: String
        recipient: String!
        sender: String!
        read: Boolean!
        postId: ID!
        id: ID!
        type: String!
        createdAt: String!
        displayName: String!
        displayImage: String!
        colorCode: String!
    },
    type Mute {
        id:ID!
        owner: String!
        createdAt: String!
        postId: ID!
        mute: Boolean
    }
    type UserData {
        user: User!
        liked: [Like]
        galery: [[String]]
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
    type DataSubscribe {
        owner: String!
        createdAt: String!
        postId: ID!
        isSubscribe: Boolean
    }
    type dataPost {
        hasMore: Boolean
        lastId: ID
        posts: [Post]
    }
    type Query {
        moreForYou: dataPost
        getPosts(lat: Float, lng: Float, range: Float type: String): dataPost
        getPopularPosts(lat: Float, lng: Float range: Float): dataPost
        getVisited: [GeoLocation]
        getProfilePosts(username: String): dataPost
        getRoomPosts(room: String!):[Post]!
        getProfileLikedPost(username: String): dataPost
        getPost(id: ID! room: String): Post!
        getUserData(username: String): UserData
        getPostBasedOnNearestLoc(lat: String, lng: String): [Post]
        mutedPosts: [Post]!
        getSubscribePosts: [Post]!
        setRulesSearchAlgolia(index: String!, rank: [String]!): String
        explorePlace: [GeoLocation]
    },
    input RegisterInput {
        email: String
        mobileNumber: String
        username: String
        fullName: String
        password: String
        token: String
        dob: String
        gender: String
    },
    input FacebookData {
        id: String!
        username: String!
        email: String!
        imageUrl: String!
        token: String!
        mobileNumber: String!
        gender: String!
        birthday: String!
    },
    input GoogleData {
        id: String!
        username: String!
        email: String!
        imageUrl: String!
        token: String!
        mobileNumber: String!
        gender: String!
        birthday: String!
    },
    input Location {
        lat: Float
        lng: Float
        name: String
    }
    input Data {
        repost: String
        room: String
    }
    input Profile {
        newUsername: String
        url: String
        phoneNumber: String
        gender: String
        birthday: String
    }
    type Mutation {
        # users mutation
        registerUser(registerInput: RegisterInput): String
        login(username: String!, password: String!): String!
        loginWithFacebook(username: String!, token: String!): String!
        checkUserAccount(email: String): Boolean!
        readNotification( id: ID! ): Notification!
        readAllNotification: [Notification]
        changeProfileUser( profile: Profile ): User!
        clearAllNotif: String!
        deleteAccount( id: ID! ): String!
        privateSetting: Boolean
        checkUsername( username: String! ): Boolean
        checkPhoneNumber( phoneNumber: String ): Boolean
        setUserTheme(theme: String): String
        setPersonalInterest(interest: [String] ): [String]

        # posts mutation
        nextProfilePosts(id:ID! username: String): dataPost
        nextProfileLikedPost( id:ID! username: String ): dataPost
        nextPosts( id:ID! lat: Float, lng: Float, range: Float ): dataPost
        nextRoomPosts( id:ID!, room: String ): [Post]!
        nextPopularPosts( id:ID! lat: Float, lng: Float, range: Float): dataPost
        nextMoreForYou (id: ID): dataPost
        createPost(text:String, media: [String] location: Location! repost: Data room: String): Post!
        subscribePost( postId: ID! room: String ): Subscribe!
        mutePost ( postId: ID! room: String ): Mute!
        deletePost( id: ID! room: String ): String!
        likePost(id: ID! room:String ): Like
        textSearch(search: String, perPage: Int, page: Int, range: Float, location: Location ): Search!

        # comments mutation
        createComment( id:ID!, text: String!, reply: Reply, photo: String, room: String ): Comment!
        deleteComment( postId: ID!, commentId: ID!, room: String ): Comment!
    }
`