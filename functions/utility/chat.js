const { StreamChat } = require('stream-chat');

const serverClient = StreamChat.getInstance(
  'hebvn3ajcqy3',
  'exytvrmbudvvzcdg8de9533h5dvn4f8rj7u33nmfxmbxscwb6q8gfm3cb9a587kb'
); 

const CreateUser = async ({ username, gender, email }) => {
  const response = await serverClient.user(username).create({
    name: username,
    id: username,
    gender,
    email
  });

  return response;
};

module.exports = {
  CreateUser
}