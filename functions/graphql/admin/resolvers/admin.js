const { UserInputError } = require('apollo-server-express')
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
        async registerAdmin(_, { email, level: newAdminLevel }, context) {
            const { name, level } = await adminAuthContext(context)

            try {
                if (level === 1) {
                    const getAdminWithSameEmail = await db.collection('admin').where('email', '==', email).get()
                    const isEmailAlreadyExist = getAdminWithSameEmail.empty

                    if (isEmailAlreadyExist) {
                        db.collection('admin').add({
                            email,
                            level: newAdminLevel
                        })
                        return `new admin has been created by ${name}`
                    }
                    throw new UserInputError("email already used")
                }
                throw new UserInputError("you can't register a new admin")
            }
            catch (err) {
                throw new Error(err)
            }
        }
    }
}