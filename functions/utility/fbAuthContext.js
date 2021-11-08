const { AuthenticationError } = require('apollo-server-express');
const { admin, db } = require('./admin')

module.exports = async (context) => {
    const AuthHeader = context.connection ? context.connection.context.Authorization : context.req.headers.authorization;

    if (AuthHeader) {
        const token = AuthHeader.split('Bearer ')[1]

        if (token) {
            try {
                let user;

                await admin.auth().verifyIdToken(token)
                    .then(decodedToken => {
                        user = decodedToken
                        return db.collection('users').where('id', '==', user.uid).limit(1).get()
                    })
                    .then(async data => {
                        user.username = data.docs[0].data().username
                        const likes = await db.collection(`/users/${user.username}/liked`).get()
                        user.likes = likes.docs.map(doc => doc.data())
                    })

                return user
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