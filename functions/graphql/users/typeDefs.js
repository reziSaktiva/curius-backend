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
        status: StatusPost
        commentedBy: [String]
        comments: [Comment]
        likes: [Like]
        muted: [Mute]
        repost: Repost
        subscribe: [Subscribe]
        hastags: [String]
        room: String
    }
    type Room {
        id: ID
        createdAt: String
        createdBy: String
        description: String
        displayPicture: String
        roomName: String
        startingDate: String
        tillDate: String
        postsCount: Int
        location: LatLong
    }
    type StatusPost {
        active: Boolean
        flags: [String]
        takedown: Boolean
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
    type Repost {
        id: ID
        owner: String
        text: String
        media: Media
        createdAt: String
        location: LatLong
    }
    type LatLong {
        lat: Float
        lng: Float
        detail: DetailLatLong
        range: Float
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
    type IsPrivate {
        board: Boolean
        media: Boolean
        posts: Boolean
    }
    type Settings {
        theme: String,
        isPrivate: IsPrivate
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
        settings: Settings
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
        textContent: String
        photoProfile: String
        media: Media
        displayName: String
        displayImage: String
        colorCode: String
        replyCount: Int
        reply: ReplyData
        status: StatusPost
        children: [Comment]
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
        postId: String!
        isLiked: Boolean
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
        postData: Post
        postId: ID!
        mute: Boolean
    }
    type UserData {
        user: User!
        liked: [Like]
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
        nextPage: Float
        posts: [Post]
    }
    type DeleteData {
        id: ID!,
        room: String
    }
    type SearchRoom {
        hits: [Room]
        page: Int
        nbHits: Int
        nbPages: Int
        hitsPerPage: Int
        processingTimeMS: Float
    }
    type UserMedia {
        media: [String]
        nextPage: Int
        hasMore: Boolean
    }
    type Board {
        id: ID
        createdAt: String
        owner: String
        textContent: String
        recipient: String
        media: Media
        displayName: String
        displayImage: String
        colorCode: String
        replyCount: Int
        children: [Board]
        reply: ReplyData
    }
    type Query {
        """
        this query is not ready !!!
        """
        moreForYou: dataPost
        """
        this query for get all posts with any condition.
        1. on curious app you can see latest nearby and popular nearby content/posts. 
           to use this query for this condition you can set the variables with lat, lng, range (range deafult is 1) and type (you don't need to set other variables). the type you only can choose one of them => ("latest" or "Popular") depends to page condition.
        2. curious app have profile page, on profile page owner can see his/other biodata and activity content in curious, one of them is user posts. 
           to use this query for this condition, you can set the variables only with username (you don't need to set other variables if you want to get user posts). username is nickname users on curious app.
        3. room is one of feature on curious app. this feature is like group with location access (only user with near location room can access), in room users can create some posts to share. 
           if you want to get room post you can use this query, just set variables room content with id room.
        """
        getPosts(lat: Float, lng: Float, range: Float page: Int type: String, room: ID, username: String): dataPost
        """
        (NOT USED)
        """
        getPopularPosts(lat: Float, lng: Float range: Float): dataPost
        """
        (NOT READY)
        """
        getVisited: [GeoLocation]
        """
        (NOT USED)
        """
        getProfilePosts(username: String): dataPost
        """
        (NOT USED)
        """
        getRoomPosts(room: String!):[Post]!
        """
        (NOT USED)
        """
        getProfileLikedPost(username: String): dataPost
        """
        this query for get single post by idPost
        """
        getPost(id: ID!): Post!
        """
        curious app user can see his profile as posts and other activity content in curious, one of them is user biodata.
        function of this query to get owner biodata (fullname, username, id, profile picture, dob, etc)
        """
        getUserData: UserData
        """
        curious app user can see other users profile as posts and other activity content in curious, one of them is other user biodata.
        function of this query to get other users biodata (fullname, username, id, profile picture, dob, etc)
        """
        getOtherUserData(username: String): UserData
        """
        curious app user can see his profile as posts and other activity content in curious, one of them is user Media.
        function of this query to get owner biodata (fullname, username, id, profile picture, dob, etc)
        """
        getUserMedia(page: Int, username: String): UserMedia
        """
        (NOT USED)
        """
        getPostBasedOnNearestLoc(lat: String, lng: String): [Post]
        """
        room is one of feature on curious app. this feature is like group with location access (only user with near location room can access), in room users can create some posts to share.
        this query is for get near rooms avaiable/active, and this variable need lat and lng for accounting spend location room and users (depending on room range).
        """
        getNearRooms(lat: Float, lng: Float): [Room]
        searchRoom(search: String, status: String, perPage: Int, page: Int): SearchRoom
        """
        on curious users can mute some post if user don't want to to see the post.
        this query for get muted posts, this query need authentication token to get muted posts by owner account 
        """
        mutedPosts: [Post]!
        """
        on curious users can subcribe some post for notification if subscribed post have any comment or like from other users.
        this query for get subscribed posts, this query need authentication token to get subcribed posts by owner account 
        """
        getSubscribePosts: [Post]!
        """
        (NOT USED)
        """
        setRulesSearchAlgolia(index: String!, rank: [String]!): String
        """
        on curious users can explore most visited place, and this query is for get the most visited/popular place on curious app.
        """
        explorePlace: [GeoLocation]
        """
        Board is one of feature on curious app, other users can send anonymous message to any users and massage will shown on his boards in profile page. 
        this query is for get boards has been sended by other users.
        variables username content is owner profile username.
        """
        getUserBoards(username: String): [Board]
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
        profilePicture: String
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
    input DetailLocation {
        city: String
        country: String
        district: String
        formattedAddress: String
        postCode: String
        state: String
        streetName: String
        subDistrict: String
    }
    input Location {
        lat: Float
        lng: Float
        detail: DetailLocation
    }
    input Data {
        idReposted: String
        fromRoom: String
    }
    input Profile {
        newUsername: String
        url: String
        phoneNumber: String
        gender: String
        birthday: String
    }
    
    input Reply {
        username: String
        id: ID
    },
    input MediaInput {
        content: [String]
        meta: String
        type: String
    }
    type Mutation {
        # users mutation
        """
        register user is for any users create account and this mutation will return token from firebase authentication
        """
        registerUser(registerInput: RegisterInput): String 
        """
        register user is for any users login and this mutation will return token from firebase authentication
        """
        login(username: String!, password: String!): String!
        """
        this mutation is for checking username on facebook is avaiable on curious or not,
        variable username is nickname/name on authentication facebook and this mutation will return token from firebase authentication
        """
        loginWithFacebook(username: String!, token: String!): String!
        """
        this mutation is for checking email is avaiable on curious or not,
        variable email is nickname/name on authentication social media (facebook, gmail or twetter) authentication.
        """
        checkUserAccount(email: String): Boolean!
        """
        this mutation is for read notification,
        variable id is notification id.
        """
        readNotification( id: ID! ): Notification!
        """
        this mutation is for read all notification, (Need authentication token)
        """
        readAllNotification: [Notification]
        """
        this mutation is not ready
        """
        changeProfileUser( profile: Profile ): User!
        """
        this mutation is for delete all notification, (Need authentication token)
        """
        clearAllNotif: String!
        """
        this mutation is not ready
        """
        deleteAccount( id: ID! ): String!
        """
        this mutation is not ready
        """
        privateSetting: Boolean
        """
        on register curious app users need to check username, is username is taken on curious app or not.
        this mutation in for checking the username before register
        """
        checkUsername( username: String! ): Boolean
        """
        on register curious app users need to check phone number, is phone number is taken on curious app or not.
        this mutation in for checking the phone number before register
        """
        checkPhoneNumber( phoneNumber: String ): Boolean
        """
        after users user has success to register, users can choose theme (dark or light).
        and this mutation for editing user theme
        """
        setUserTheme(theme: String): String
        """
        this mutation is not ready
        """
        setPersonalInterest(interest: [String] ): [String]
        """
        this mutation is not ready
        """
        createBoard(username: String textContent: String reply: Reply media: MediaInput): Board

        # posts mutation
        """
        (NOT USED)
        """
        nextProfilePosts(id:ID! username: String): dataPost
        """
        (NOT USED)
        """
        nextProfileLikedPost( id:ID! username: String ): dataPost
        """
        this mutation is not ready
        """
        nextPosts( id:ID! lat: Float, lng: Float, range: Float ): dataPost
        """
        (NOT USED)
        """
        nextRoomPosts( id:ID!, room: String ): [Post]!
        """
        (NOT USED)
        """
        nextPopularPosts( id:ID! lat: Float, lng: Float, range: Float): dataPost
        """
        (NOT USED)
        """
        nextMoreForYou (id: ID): dataPost
        """
        this mutation is for users to create post
        """
        createPost(text:String, media: MediaInput location: Location! repostedPost: Data room: ID): Post!
        """
        this mutation is for users to subscribe post
        """
        subscribePost( postId: ID! ): Subscribe!
        """
        this mutation is for users to mute post
        """
        mutePost ( postId: ID! ): Mute!
        """
        this mutation is for users to delete post
        """
        deletePost( id: ID! ): DeleteData
        """
        this mutation is for users to like post
        """
        likePost(id: ID!): Like
        """
        on curious users can search any posts and this mutation is for search any post
        """
        textSearch(search: String, perPage: Int, page: Int, range: Float, location: Location ): Search!

        # comments mutation
        createComment( id:ID!, textContent: String!, reply: Reply, media: MediaInput ): Comment!
        deleteComment( postId: ID!, commentId: ID! ): Comment!
        getMoreChild(postId: ID, commentId: ID, lastChildId: ID): [Comment]
        getMoreComments(postId: ID, lastCommentId: ID): [Comment]
    }
`