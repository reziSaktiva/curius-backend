const STATUS_POSTS = {
  ACTIVE: 'ACTIVE',
  TAKEDOWN: 'TAKEDOWN',
  FLAG: 'FLAG'
}

const ALGOLIA_INDEX_POSTS = "posts"
const ALGOLIA_INDEX_USERS = "users"
const ALGOLIA_INDEX_USERS_DESC = "users_date_desc"
const ALGOLIA_INDEX_ROOMS = "rooms"
const ALGOLIA_INDEX_POSTS_ROOMS = "posts_room"
const ALGOLIA_INDEX_REPORT_POSTS = "report_posts"
const ALGOLIA_INDEX_POSTS_ASC = "posts_date_asc"
const ALGOLIA_INDEX_POSTS_DESC = "posts_date_desc"
const ALGOLIA_INDEX_ADMIN_LOGS = "admin_logs"

module.exports = {
  STATUS_POSTS,
  ALGOLIA_INDEX_POSTS,
  ALGOLIA_INDEX_USERS_DESC,
  ALGOLIA_INDEX_USERS,
  ALGOLIA_INDEX_ROOMS,
  ALGOLIA_INDEX_POSTS_ROOMS,
  ALGOLIA_INDEX_REPORT_POSTS,
  ALGOLIA_INDEX_POSTS_ASC,
  ALGOLIA_INDEX_POSTS_DESC,
  ALGOLIA_INDEX_ADMIN_LOGS
}