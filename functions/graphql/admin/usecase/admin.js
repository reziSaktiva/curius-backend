const { db } = require('../../../utility/admin')
const { server, client } = require('../../../utility/algolia')

const { ALGOLIA_INDEX_ADMIN_LOGS } = require('../../../constant/post')

module.exports = {
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
  }
}