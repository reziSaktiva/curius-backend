const { UserInputError } = require('apollo-server-express')
const { db } = require('../../../utility/admin')
const adminAuthContext = require('../../../utility/adminAuthContext')
const { createLogs, hasAccessPriv, LIST_OF_PRIVILEGE } = require('../usecase/admin');

const updateNewDataArray = newDataEntry => (oldData = []) => {
    const newData = newDataEntry.filter(v => v.id == oldData.id)
    if (newData.length) {
        return {
            ...oldData,
            ...newData[0]
        }
    }

    return oldData
}

const separateNewAndUpdateData = (oldData, newData, target = '') => {
    const dataNeedUpdateNouns = []
    const newDataNouns = []
    newData.filter(noun => {
        const isMatch = oldData[target].filter(old => old.id === noun.id)
        if (isMatch.length) {
            dataNeedUpdateNouns.push(noun)
        }
        else newDataNouns.push(noun)
    })

    return { update: dataNeedUpdateNouns, newData: newDataNouns}
}

module.exports = {
    Query: {
        async getAdmin() {
            const getAdmin = await db.collection('admin').get()
            const admin = getAdmin.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

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
        async checkEmail(_, { email, uid: id, name, accessCode }) {
            const getAdmin = await db.collection('admin')
                .where('email', '==', email)
                .where('accessCode', '==', accessCode)
                .get()

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
        async registerAdmin(_, { email, level: newAdminLevel, name: adminName, accessCode }, context) {
            const { name, level } = await adminAuthContext(context)
            if (!hasAccessPriv({
                id: level,
                action: LIST_OF_PRIVILEGE.ADD_OR_DELETE_ADMIN
            })) throw new Error('Permission Denied')
            
            try {
                if (level === 1) {
                    const getAdminWithSameEmail = await db.collection('admin').where('email', '==', email).get()
                    const isEmailAlreadyExist = getAdminWithSameEmail.empty

                    if (isEmailAlreadyExist) {
                        db.collection('admin').add({
                            email,
                            level: newAdminLevel,
                            name: adminName,
                            accessCode,
                            isActive: true,
                            isBanned: false
                        }).then(doc => {
                            doc.update({ id: doc.id })
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
        async setStatusAdmin(_, { adminId, isActive, isBanned }, ctx) {
            const { name, level, id } = await adminAuthContext(ctx) // TODO: add condition action only for some privilage
            if (!hasAccessPriv({
                id: level,
                action: LIST_OF_PRIVILEGE.ADD_OR_DELETE_ADMIN
            })) throw new Error('Permission Denied')
            
            if (!name) throw new Error('Access Denied')

            let newDataAdmin = {}
            try {
                await db.doc(`/admin/${adminId}`).get().then(
                    doc => {
                        const oldData = doc.data();
                        const payload = {
                            ...oldData,
                            isActive: isBanned ? false : true,
                            isBanned: isActive ? true : false
                        }
                        
                        newDataAdmin = { id: adminId, ...payload };
                        doc.ref.update({ ...oldData, isActive: isBanned ? false : true, isBanned })
                    }
                )
    
                await createLogs({
                    adminId: id,
                    role: level,
                    message: `Admin ${name} has been ${isBanned ? 'Banned' : isActive && 'Active'} Admin id ${adminId}`,
                    name
                })
                return newDataAdmin;
            } catch (err) {
                return err;
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
        async deleteConfigThemesById(_, { attr = '', id: idAttr, themeId }, ctx) {
            const attribute = ['colors', 'adjective', 'nouns']
            if (!attribute.includes(attr)) throw new Error('attribute does not exists')

            try {
                let newDataTheme = {}
                await db.doc(`/themes/${themeId}`).get().then(
                    doc => {
                        const oldData = doc.data();

                        newDataTheme[attr] = (oldData[attr] || []).filter(({ id }) => id !== idAttr)

                        newDataTheme = {
                            id: doc.id,
                            ...oldData,
                            ...newDataTheme
                        }
                        
                        return doc.ref.update(newDataTheme)
                    }
                )

                return newDataTheme
            } catch (err) {
                return err
            }
        },
        async updateThemesById(_, { id, name, colors, adjective, nouns, isDeleted, isActive }, ctx) {
            try {
                if (!id) throw new Error("Id Theme is required")

                let newThemes = {}
                await db.doc(`/themes/${id}`).get().then(
                    doc => {
                        const oldData = doc.data();
                        if (name) newThemes.name = name
                        if (isDeleted) {
                            newThemes.isDeleted = isDeleted
                            newThemes.isActive = false
                        }
                        if (isActive) {
                            newThemes.isDeleted = false;
                            newThemes.isActive = isActive
                        }
        
                        if (colors && colors.length) {
                            const { update, newData } = separateNewAndUpdateData(oldData, colors, 'colors')

                            newThemes.colors = (oldData.colors || []).map(updateNewDataArray(update))
                            if (newData.length) newThemes.colors = [ ...newThemes.colors, ...newData]
                        }
        
                        if (adjective && adjective.length) {
                            const { update, newData } = separateNewAndUpdateData(oldData, adjective, 'adjective')

                            newThemes.adjective = (oldData.adjective || []).map(updateNewDataArray(update))
                            if (newData.length) newThemes.adjective = [ ...newThemes.adjective, ...newData]
                        }
        
                        if (nouns && nouns.length) {
                            const { update, newData } = separateNewAndUpdateData(oldData, nouns, 'nouns')

                            newThemes.nouns = (oldData.nouns || []).map(updateNewDataArray(update))
                            if (newData.length) newThemes.nouns = [ ...newThemes.nouns, ...newData]
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
