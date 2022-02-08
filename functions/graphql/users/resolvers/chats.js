const { StreamChat } = require('stream-chat');
const { db } = require('../../../utility/admin')

const API_KEY = '4kyhyuz3wtrj';
const SECRET = 'e3rbs3axfafa4jzen2esj928t74bkz7afj9zbufn2njdwj9w87c3mv8tfzmhem5t';

module.exports = {
    Query: {

    },
    Mutation: {
        async generateTokenUserChat(_, {}, ctx) {
            const { username } = await fbAuthContext(ctx)
            try {
                if (!username) throw new Error('Token is Expired, please relogin');
    
                const clientInit = StreamChat.getInstance(API_KEY, SECRET);
    
                const user = await db.doc(`/users/${username}`).get().then(async doc => doc.data())
                const userGetStreamId = user?.getStreamUserId;

                const token = await clientInit.createToken(userGetStreamId);

                return token;
            } catch (err) {
                return err
            }

        }
    }
}