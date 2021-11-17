const { db } = require('../../../utility/admin')

module.exports = {
    Query: {
        async getAdmin() {
            const getAdmin = await db.collection('admin').get()
            const admin = getAdmin.docs.map(doc => doc.data())

            try {
                return admin
            }
            catch (err) {
                console.log(err);
            }
        }
    },
    Mutation: {
        async checkEmail(_, { email }) {
            const getAdmin = await db.collection('admin').where('email', '==', email).get()

            try {
                return !getAdmin.empty
            }
            catch (err) {
                console.log(err);
            }
        }
    }
}