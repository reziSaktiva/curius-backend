const { StreamChat } = require('stream-chat');
const { db } = require('../../../utility/admin');
const { createNewChannel, createNewUser: createUser } = require('../controllers/chats');

const API_KEY = '4kyhyuz3wtrj';
const SECRET = 'e3rbs3axfafa4jzen2esj928t74bkz7afj9zbufn2njdwj9w87c3mv8tfzmhem5t';

module.exports = {
    Query: {
        async createNewUser(_, { fullName, username }) {
            const user = await createUser({ username, fullName });

            console.log('logging: user ', user);

            return "OK"
        }
    },
    Mutation: {
        async directMessage(_, { postId, commentId }, context) {
            try {
                const { username, id } = await fbAuthContext(context);

                if (!postId || !commentId) throw new Error('post or comment id is required');
                
                const data = db.doc((postId && !commentId)
                    ? `/posts/${id}`
                    : `/posts/${postId}/comments/${commentId}`
                );

                const dataParse = (await data).data();
                if (dataParse) {
                    const payload = {
                        channelName: 'Test - 1',
                        from: username,
                        to: dataParse.owner, chatImg, token, postId, commentId };

                    createNewChannel(payload)
                }
            } catch (err){
                return err
            }
        }
    }
}