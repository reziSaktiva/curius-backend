const { db } = require('../../../utility/admin')
const adminAuthContext = require('../../../utility/adminAuthContext')

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
        },
        async registerAdmin(_, _regs, context) {
            const userData = adminAuthContext(context)

            try {
                console.log(userData);

                return ''
            }
            catch (err) {
                console.log(err);
            }
        }
    }
}