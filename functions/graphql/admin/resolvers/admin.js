const { UserInputError } = require('apollo-server-express')
const { db } = require('../../../utility/admin')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { isNullOrUndefined } = require('../../../utility/validators')

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
        },
        async searchThemes(_, { name }, context) {
            // const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage
            try {
                const collectionThemes = db.collection('themes')
                const findThemes = name
                    ? await collectionThemes.where('name', '==', name).get()
                    : await collectionThemes.get()
    
                const data = await findThemes.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
    
                return data
            } catch (err) {
                return err
            }
        }
    },
    Mutation: {
        async checkEmail(_, { email, uid: id, name }) {
            const getAdmin = await db.collection('admin').where('email', '==', email).get()

            try {
                if (!getAdmin.empty) {
                    return db.doc(`/admin/${getAdmin.docs[0].id}`).get()
                        .then(doc => {
                            console.log(!doc.data().id && !doc.data().name);
                            if (!doc.data().id && !doc.data().name) {
                                doc.ref.update({ id, name })
                            } else if (doc.data().id !== id) {
                                doc.ref.update({ id })
                            }
                            return !getAdmin.empty
                        })
                } else {
                    return !getAdmin.empty
                }
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
        },
        async createNewTheme(_, { name, colors, adjective, nouns }, context) {
            // const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage
            try {
                const payload = {
                    name,
                    isDeleted: false,
                    isActive: true,
                    colors,
                    adjective,
                    nouns
                }

                const findDataIsExists = await db.collection('themes').where('name', '==', name).get()
                const isExists = findDataIsExists.docs.map(doc => doc.data())

                if (isExists.length) throw new Error("Name is already exists")

                const writeRequest = await db.collection('/themes').add(payload)
                const parseSnapshot = await (await writeRequest.get()).data()

                return {
                    id: writeRequest.id,
                    ...parseSnapshot
                }   
            } catch (err) {
                return err;
            }
        },
        async updateThemesById(_, { id, name, colors, adjective, nouns, isDeleted, isActive }, ctx) {
            try {
                if (!id) throw new Error("Id Theme is required")

                let newThemes = {}
                await db.doc(`/themes/${id}`).get().then(
                    doc => {
                        if (name) newThemes.name = name
                        if (isDeleted) {
                            newThemes.isDeleted = isDeleted
                            newThemes.isActive = false
                        }
                        if (isActive) {
                            newThemes.isDeleted = false;
                            newThemes.isActive = isActive
                        }
        
                        if (!isNullOrUndefined(colors)) {
                            newThemes.colors = colors
                        }
        
                        if (adjective && adjective.length) {
                            newThemes.adjective = adjective
                        }
        
                        if (!isNullOrUndefined(nouns)) {
                            newThemes.nouns = nouns
                        }

                        newThemes = {
                            id: doc.id,
                            ...doc.data(),
                            ...newThemes
                        }
        
                        return doc.ref.update(newThemes)
                    }
                )


                return newThemes;
            } catch (err) {
                return err;
            }
        }
    }
}
