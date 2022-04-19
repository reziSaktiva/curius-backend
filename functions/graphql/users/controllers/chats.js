// const StreamChat = require('stream-chat').StreamChat;
const stream = require('getstream'); 
const StreamChat = require('stream-chat').StreamChat; 
const { db } = require('../../../utility/admin')

const API_KEY = '4kyhyuz3wtrj';
const SECRET = 'e3rbs3axfafa4jzen2esj928t74bkz7afj9zbufn2njdwj9w87c3mv8tfzmhem5t';

const clientInit = StreamChat.getInstance(API_KEY, SECRET);
const serverInit = stream.connect(API_KEY, SECRET);

const generateTokenUserChat = async (username) => {
  try {
    if (!username) throw new Error('Access Denied');

    const user = await db.doc(`/users/${username}`).get().then(async doc => doc.data())
    const userGetStreamId = user?.getStreamUserId;

    const token = await clientInit.createToken(userGetStreamId);

    return token;
  } catch (err) {
    return err
  }
}

const createNewChannel = async ({from, to, chatImg, token, postId, commentId }) => {
  try {
    if (!from  || !to) throw new Error("sender and receiver is required");
    const channelName = [from, to].join(', ');
    const channel = clientInit.channel('messaging', channelName, { 
      members: [from, to], 
      name: channelName,
      image: chatImg || 'https://www.drupal.org/files/project-images/react.png',
      data: {
        created_by: from,
        postId,
        commentId
      }
    }, token); 

    await channel.create();

    return true
  } catch (err) {
    return err
  }
}

const createNewUser = async ({ username, fullName }) => {
  const response = await clientInit.upsertUser({  
    id: username,  
    role: 'user'
 }); 

  return response;
}

module.exports = {
  createNewChannel,
  createNewUser,
  generateTokenUserChat,
  clientInit
}