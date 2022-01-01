# curius-backend

- [x] create actions for user (active/nonactive, banned, delete)
- [ ] create getPosts for search with filter 
  - [x] timeStamp
  - [ ] w-video, w-photo, w-voiceNote, with-gif
  - [x] location
  - [x] rating
  - [x] status active
- [ ] create actions for post 
  - [x] active/nonactive
  - [x] takedown
  - [ ] setRating
  - [x] setFlag
  - [ ] Delete - for takedown, delete
  - [ ] and setFlag send notif to owner
- [x] search for all

&nbsp;

------
## Mutation Docs

### ChangeUserStatus

```javascript
mutation ChangeUserStatus($status: String!, $username: String!) {
  changeUserStatus(status:$status, username:$username) {
  	email
    id
  }
}
```

Payload
```json
{
  "status": "active",
  "username": "tester"
}
```
&nbsp;

### ChangePostStatus

```javascript
mutation ChangePostStatus($active: Boolean, $flags: [String], $postId: String, $takedown:Boolean){
  setStatusPost(active: $active, flags: $flags, takedown: $takedown, postId: $postId) {
    	id
    	media {
        type
      }
      comments{
        displayName
      }
  }
}
```

Payload
```json
{
  "active":  true,
  "postId": "snSirsm6KJb4ftWXWvfM",
  "flags":  [],
  "takedown": false
}
```
&nbsp;

### Search Posts

```javascript
mutation SearchPost($search: String, $perPage: Int, $page: Int, $range: Float, $location:String, $request: RequestFilter) {
  searchPosts(search:$search, perPage:$perPage, page:$page, range:$range, request: $request, location:$location) {
    hits {
      id
      text
      createdAt
      rank
      likeCount
      commentCount
      repostCount
      reportedCount
      room
      hastags
      location{
        lat
      }
      media {
        content
      }
    }
  }
}
```

Payload
```json
{
  "search": "",
  "page": 0,
  "perPage": 10,
  "location":  "bandung",
 "request":{
    "timestamp": "10-01-2022",
    "ratingFrom": 0,
    "ratingTo": 10
  }
}
```


### Create Report Post 

```javascript
mutation createReportPost($postId: ID!, $content: String, $userIdReporter: ID!) {
  createReportPostById(idPost: $postId, content: $content, userIdReporter:  $userIdReporter) {
    content
    userIdReporter
    idPost
  }
}
```

Payload
```json
{
  "postId": "3IKxgYE7bZvV1IqOn3G1",
  "content": "Test Report 7",
  "userIdReporter": "oEmHbr7adFd5p5j7OAQf34HZXAw1"
}
```

### Get Single Post

```javascript
query getSinglePost($id: ID!, $room: String) {
  getSinglePost(id: $id, room: $room) {
    id
    text
    repost {
      id
    }
    media {
      content
    }
    comments {
      displayName
    }
  }
}
```

Payload
```json
{
  "id": "Q1pXUsZaigyB1QwQWoGb",
  "room": ""
}
```


### Get Reported By Id

```javascript
query getPostReportedById($idPost: ID!, $lastId: ID){
  getReportedByIdPost(idPost: $idPost, lastId: $lastId) {
    content
    userIdReporter
    idPost
  }
}
```

Payload
```json
{
  "idPost": "3IKxgYE7bZvV1IqOn3G1"
}
```


### Create new Theme

```javascript
mutation CreateNewTheme($name: String, $colors: [Colors], $adjective: [String], $nouns: [Nouns]) {
  createNewTheme(name: $name, colors: $colors, adjective: $adjective, nouns: $nouns) {
    name
    id
    colors {
      name
      hex
    }
    nouns {
      avatarUrl
      name
    }
    isDeleted
    isActive
    adjective
  }
}
```

Payload
```json
{
  "name": "Test2",
  "colors": [{
    "name": "testColor",
    "hex": "white"
  }],
  "adjective": ["A"],
  "nouns": [{
    "avatarUrl": "https://curious.app.com",
    "name": "A"
  }]
}
```


### Update new Theme

```javascript
mutation UpdateNewTheme($id: ID, $name: String, $colors: [Colors], $adjective: [String], $nouns: [Nouns]) {
  updateThemesById(id: $id, name: $name, colors: $colors, adjective: $adjective, nouns: $nouns) {
    name
    id
    colors {
      name
      hex
    }
    nouns {
      avatarUrl
      name
    }
    isDeleted
    isActive
    adjective
  }
}
```

Payload
```json
{
 "id": "af8bD6HAepEo80JBc5Ez",
  "adjective": ["A","B"]
}
```


### Search Themes

```javascript
query SearchThemes($name: String) {
  searchThemes(name: $name) {
    id
    name
    isActive
    isDeleted
  }
}
```

Payload
```json
{
  "name": "Test2"
}
```

