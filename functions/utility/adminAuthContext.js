const { AuthenticationError } = require('apollo-server-express');
const { admin, db } = require('./admin')

module.exports = async (context) => {
    const AuthHeader = context.connection ? context.connection.context.Authorization : context.req.headers.authorization;

    if (AuthHeader) {
        const token = AuthHeader.split('Bearer ')[1]

        if (token) {
            try {
                const decodeToken = await admin.auth().verifyIdToken(token).then(decodeToken => decodeToken)
                const getAdminData = await db.collection('admin').where('id', '==', decodeToken.uid).limit(1).get();
                const adminData = getAdminData.docs[0].data()

                return {
                    ...decodeToken,
                    ...adminData
                }
            }
            catch (err) {
                console.log(err);
                throw new AuthenticationError(err)
            }
        }
        throw new Error('Authentication: header harus berformat \ Bearer [token]')
    }
    throw new Error('Authorization header tidak di temukan')
}