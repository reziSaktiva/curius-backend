const { db } = require('../../../utility/admin')
const { server } = require('../../../utility/algolia')

const { ALGOLIA_INDEX_ADMIN_LOGS } = require('../../../constant/post')

const LIST_OF_PRIVILEGE = {
  RANDOM: 'Randomization',
  EXPORT: 'Export',
  BAN_USER: 'Ban-User',
  ADD_OR_DELETE_ADMIN: 'Add-or-Delete-Admin',
  SET_FLAGS: 'Set-Flags',
  TAKEDOWN: 'Takedown',
  DELETE_POSTS: 'Delete-Posts',
  ACTIVE_POSTS: 'Active-Posts',
  CREATE_ROOM: 'Create-Room',
  CMS: 'CMS'
}

const ROLE_AND_ACCESS = [
  {
    id: 1, 
    priv: [
      LIST_OF_PRIVILEGE.RANDOM,
      LIST_OF_PRIVILEGE.EXPORT,
      LIST_OF_PRIVILEGE.BAN_USER,
      LIST_OF_PRIVILEGE.ADD_OR_DELETE_ADMIN,
      LIST_OF_PRIVILEGE.SET_FLAGS,
      LIST_OF_PRIVILEGE.TAKEDOWN,
      LIST_OF_PRIVILEGE.DELETE_POSTS,
      LIST_OF_PRIVILEGE.CREATE_ROOM,
      LIST_OF_PRIVILEGE.ACTIVE_POSTS,
      LIST_OF_PRIVILEGE.CMS
    ]
  },
  {
    id: 2,
    priv: [
      LIST_OF_PRIVILEGE.RANDOM,
      LIST_OF_PRIVILEGE.EXPORT,
      LIST_OF_PRIVILEGE.BAN_USER,
      LIST_OF_PRIVILEGE.SET_FLAGS,
      LIST_OF_PRIVILEGE.TAKEDOWN,
      LIST_OF_PRIVILEGE.DELETE_POSTS,
      LIST_OF_PRIVILEGE.CREATE_ROOM,
      LIST_OF_PRIVILEGE.ACTIVE_POSTS,
      LIST_OF_PRIVILEGE.CMS
    ]
  },
  {
    id: 3,
    priv: [
      LIST_OF_PRIVILEGE.RANDOM,
      LIST_OF_PRIVILEGE.EXPORT,
      LIST_OF_PRIVILEGE.BAN_USER
    ]
  },
  {
    id: 4,
    priv: [
      LIST_OF_PRIVILEGE.RANDOM,
      LIST_OF_PRIVILEGE.EXPORT,
      LIST_OF_PRIVILEGE.SET_FLAGS,
      LIST_OF_PRIVILEGE.TAKEDOWN,
      LIST_OF_PRIVILEGE.DELETE_POSTS
    ]
  }
]

module.exports = {
  LIST_OF_PRIVILEGE,
  createLogs: async ({ adminId, role, message, name }) => {
    const payload = {
      adminId,
      role,
      name,
      message,
      createdAt: new Date().getTime()
    };

    const index = server.initIndex(ALGOLIA_INDEX_ADMIN_LOGS);
  
    const adminData = await db.collection('/admin_logs').add(payload)
    const parseSnapshot = await (await adminData.get()).data()

    await index.saveObject({
      objectID: parseSnapshot.adminId,
      ...payload
    })

    return 'Success create log'
  },
  hasAccessPriv: ({ id: role, action }) => {
    if (!Object.values(LIST_OF_PRIVILEGE).includes(action)) return false;

    const access = ROLE_AND_ACCESS.find(({ id }) => id === role) || [];

    return !!access.priv.includes(action)
  }
}