const { UserInputError } = require('apollo-server-express')
const { db } = require('./admin')

module.exports = async (username, postId, room) => {
    const benda = [
    "Hammer", "Ball", "Cow","Monkey","Dolphin",
    "Horse", "Bowl", "Scissor","Camera","Glass",
    "Tree", "Clover", "Star", "Rabbit", "Diamonds",
    "Cat","Spades","Battery","Bear","Butterfly", 
    "Donuts", "Eight", "Five","Flower","Foot", 
    "Four", "Gifts","Headphones", "Heart", "Koala", 
    "Moon", "Mushroom", "Nine","One", "Panda", 
    "Pants","Pig", "Seven", "Six", "Socks",
    "Sunglasses", "Strawberry", "T-shirt","Pumpkin", "Three",
    "Tiger", "Two", "Unicorn", "X", "Zero" 
]
    const warna = [
        {
            namaWarna: "Yellow",
            kode: "#FFFF00"
        },
        {
            namaWarna: "Green",
            kode: "#008000"
        },
        {
            namaWarna: "Red",
            kode: "#FF0000"
        },
        {
            namaWarna: "Blue",
            kode: "#0000FF"
        },
        {
            namaWarna: "Black",
            kode: "#010821"
        },
        {
            namaWarna: "Purple",
            kode: "#9370db"
        },
        {
            namaWarna: "Muddy",
            kode: "#cfb997"
        },
        {
            namaWarna: "Aqua",
            kode: "#00FFFF"
        },
        {
            namaWarna: "Chocolate",
            kode: "#8B4513"
        },
        {
            namaWarna: "Grey",
            kode: "#8F8F8F"
        },
        {
            namaWarna: "Lime",
            kode: "#BFFF00"
        },
        {
            namaWarna: "Pink",
            kode: "#FF3E96"
        },
        {
            namaWarna: "Fuchsia",
            kode: "#FF00FF"
        },
        {
            namaWarna: "Beige",
            kode: "#F5F5DC"
        },
        {
            namaWarna: "Khaki",
            kode: "#ADA96E"
        },
        {
            namaWarna: "Maroon",
            kode: "#8B1C62"
        },
        {
            namaWarna: "Gold",
            kode: "#CFB53B"
        },
        {
            namaWarna: "Violet",
            kode: "#EE82EE"
        },
        {
            namaWarna: "Coffee",
            kode: "#AA5303"
        },
        {
            namaWarna: "Scarlet",
            kode: "#FF2400"
        },
        {
            namaWarna: "Lilac",
            kode: "#C8A2C8"
        },
        {
            namaWarna: "Pearl",
            kode: "#FDEEF4"
        },
        {
            namaWarna: "Rust",
            kode: "#C36241"
        },
        {
            namaWarna: "Cyan",
            kode: "#97FFFF"
        },
        {
            namaWarna: "Dark",
            kode: "#424242"
        },
        {
            namaWarna: "Bronze",
            kode: "#CD7F32"
        },
        {
            namaWarna: "Orange",
            kode: "#0000FF"
        },
        {
            namaWarna: "Mustard",
            kode: "#FFDB58"
        },
        {
            namaWarna: "Cooper",
            kode: "#B87333"
        },
        {
            namaWarna: "Vanilla",
            kode: "#F3E5AB"
        },
        {
            namaWarna: "Turquoise",
            kode: "#43C6DB"
        }
    ]
    const ajektif = ["Smelly", "Fat", "Broken", "Tall", "Short", 
     "Grumpy", "Cute", "Adorable", "Stiff", "Chubby", "Annoying", "Disturbing",
      "Big", "Small", "Calm", "Chaotic", "Disgusting", "Smart", "Crazy", "Beautiful", "Wise", "Rotten", "Bitter", "Fluffy", "Creepy", "Elegant",
      "Unstable", "Arrogant", "Dying", "Chewy", "Happy", "Sad", "Crying", "Ripped", "Fake", "Shining", "Pierced", "Flat", "Cheap", "Suspicious",
       "Coward", "Spooky", "Dirty", "Delicious", "Naughty", "Hansome", "Perfect", "Fast", "Slow", "Itchy" 
    ]

    const randomNumber = Math.floor(Math.random() * 50)
    const randomNumberWarna = Math.floor(Math.random() * 31)

    const bendaRandom = benda[randomNumber]
    const warnaRandom = warna[randomNumberWarna]

    const randomNama = `${ajektif[randomNumber]} ${warnaRandom.namaWarna} ${bendaRandom}`

    const postDocument = db.doc(`/${room ? `room/${room}/posts` : 'posts'}/${postId}`)
    const randomNameCollection = db.collection(`/${room ? `room/${room}/posts` : 'posts'}/${postId}/randomizedData`)
    const randomNameData = {
        displayName: '',
        owner: username
    }
    try {
        let name;
        let displayImage;
        let colorCode;

        await randomNameCollection.where('owner', '==', username).limit(1).get()
            .then(data => {
                if (data.empty) {
                    return postDocument.get()
                        .then(doc => {
                            if(!doc.exists){
                                throw new UserInputError('Postingan tidak ditemukan/sudah dihapus')
                            } else {
                                if (username === doc.data().owner) {
                                    randomNameData.displayName = 'Author'
                                    randomNameData.colorCode = warnaRandom.kode
                                    randomNameData.displayImage = `https://firebasestorage.googleapis.com/v0/b/insvire-curious-app.appspot.com/o/images%2FAuthor.png?alt=media`
                                } else {
                                    randomNameData.displayName = randomNama
                                    randomNameData.colorCode = warnaRandom.kode
                                    randomNameData.displayImage =  `https://firebasestorage.googleapis.com/v0/b/insvire-curious-app.appspot.com/o/images%2F${bendaRandom}.png?alt=media`
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