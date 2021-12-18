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
  "page": 1,
  "perPage": 10,
  "location":  "",
 "filters":{
    "timestamp": {
    	"from": "2021-01-01",
      "to": "2021-12-31"
    },
    "rating": {
      "from": 0,
      "to": 10
    },
  "status": "active"
  }
}
```
&nbsp;

### Search Users

```javascript
mutation SearchUsers($search: String, $status: String, $perPage: Int, $page: Int ){
  searchUser(search: $search, status: $status, perPage: $perPage, page: $page ) {
    hits {
      id
      gender
      status
      mobileNumber
      email
    }
  }
}
```

Payload
```json
{
  "search": "+6285956641969", // can adding email or phone number
  "status": "",
  "perPage": 10,
  "page": 0
}
```