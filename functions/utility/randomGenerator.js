const { UserInputError } = require('apollo-server-express')
const { db } = require('./admin')

module.exports = async (username, postId) => {
    const postDocument = db.doc(`/posts/${postId}`)

    const randomNameCollection = db.collection(`/posts/${postId}/randomizedData`)
    const randomNameData = {
        displayName: '',
        owner: username
    }

    try {
        const { randomName, randomImage, randomCode } = await db.collection('themes').where("isActive", "==", true).get()
            .then(data => {
                const theme = data.docs[Math.floor(Math.random() * data.docs.length)].data()

                const randomAdjective = theme.adjective[Math.floor(Math.random() * theme.adjective.length)];
                const randomNoun = theme.nouns[Math.floor(Math.random() * theme.nouns.length)];
                const randomColor = theme.colors[Math.floor(Math.random() * theme.colors.length)];

                const randomName = `${randomAdjective.name} ${randomColor.name} ${randomNoun.name}`
                const randomImage = randomNoun.avatarUrl
                const randomCode = randomColor.hex

                return { randomName, randomImage, randomCode }
            })

        let name;
        let displayImage;
        let colorCode;

        await randomNameCollection.where('owner', '==', username).limit(1).get()
            .then(data => {
                if (data.empty) {
                    return postDocument.get()
                        .then(doc => {
                            if (!doc.exists) {
                                throw new UserInputError('Postingan tidak ditemukan/sudah dihapus')
                            } else {
                                if (username === doc.data().owner) {
                                    randomNameData.displayName = 'Author'
                                    randomNameData.colorCode = randomCode
                                    randomNameData.displayImage = `https://firebasestorage.googleapis.com/v0/b/insvire-curious-app.appspot.com/o/avatars%2Fauthor.png?alt=media&token=623d83c1-16e1-401d-8897-39cd485fa685`
                                } else {
                                    randomNameData.displayName = randomName
                                    randomNameData.colorCode = randomCode
                                    randomNameData.displayImage = randomImage
                                }
                                return randomNameCollection.add(randomNameData)
                            }
                        })
                        .then(data => {
                            name = randomNameData.displayName
                            displayImage = randomNameData.displayImage
                            colorCode = randomNameData.colorCode
                            data.update({ id: data.id })
                        })
                } else {
                    name = data.docs[0].data().displayName
                    displayImage = data.docs[0].data().displayImage
                    colorCode = data.docs[0].data().colorCode
                }
            })
        return { name, displayImage, colorCode }
    }
    catch (err) {
        console.log(err);
        throw new Error(err)
    }
}