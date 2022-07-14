const { UserInputError } = require('apollo-server-express')
const { db, storage } = require('../../../utility/admin')
const { client, server } = require('../../../utility/algolia')
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

    return { update: dataNeedUpdateNouns, newData: newDataNouns }
}

const getPathStorageFromUrl = (url) => {
    const baseUrl = "https://firebasestorage.googleapis.com/v0/b/insvire-curious-app.appspot.com/o/";
    let imagePath = url.replace(baseUrl, "");

    const indexOfEndPath = imagePath.indexOf("?");

    imagePath = imagePath.substring(0, indexOfEndPath);
    imagePath = imagePath.replace("%2F", "/");
    imagePath = imagePath.replace("%2F", "/");

    return imagePath;
}

module.exports = {
    Query: {
        async getAdmin(_, { page, perPage }) {
            const index = client.initIndex('admin');

            const pagination = {
                "hitsPerPage": perPage || 10,
                "page": page || 0,
            };

            const defaultPayload = {
                "attributesToRetrieve": "*",
                "attributesToSnippet": "*:20",
                "snippetEllipsisText": "…",
                "responseFields": "*",
                "getRankingInfo": true,
                "analytics": false,
                "enableABTest": false,
                "explain": "*",
                "facets": ["*"]
            };
            const payload = {
                ...defaultPayload,
                ...pagination
            }

            const searchDocs = await index.search('', payload)

            const ids = await searchDocs.hits.map(({ objectID }) => objectID);

            const newHits = await db.collection('admin').where('id', 'in', ids).get()
            const newDataParse = newHits.docs.map(doc => doc.data());

            try {
                return { ...searchDocs, hits: newDataParse }
            }
            catch (err) {
                return err
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
            const index = server.initIndex('admin');

            const getAdmin = await db.collection('admin')
                .where('email', '==', email)
                .where('accessCode', '==', accessCode)
                .get()

            try {
                if (!!getAdmin.docs[0].data().isBanned) return { valid: !getAdmin.empty, isBanned: true }
                if (!getAdmin.empty) {
                    return db.doc(`/admin/${getAdmin.docs[0].id}`).get()
                        .then(doc => {
                            if (!doc.data().id && !doc.data().name) {
                                doc.ref.update({ id, name })

                                index.saveObject({
                                    ...doc.data(),
                                    objectID: id,
                                    name
                                }, { autoGenerateObjectIDIfNotExist: false })
                            }
                            if (doc.data().id !== id) {
                                doc.ref.update({ id })

                                console.log({
                                    ...doc.data(),
                                    objectID: id
                                });

                                index.saveObject({
                                    ...doc.data(),
                                    objectID: id
                                }, { autoGenerateObjectIDIfNotExist: false })
                            }
                            return { valid: !getAdmin.empty, isBanned: false }
                        })
                } else {
                    return { valid: !getAdmin.empty, isBanned: false }
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
                await db.collection('admin')
                    .where('id', '==', adminId)
                    .get().then(
                        (data) => {
                            const oldData = data.docs[0].data();
                            const payload = oldData

                            if (isActive !== undefined && isActive) {
                                payload.isActive = true;
                                payload.isBanned = false;
                            }

                            if (isBanned !== undefined && isBanned) {
                                payload.isActive = false;
                                payload.isBanned = true;
                            }

                            newDataAdmin = { id: adminId, ...payload };
                            data.docs[0].ref.update({ ...oldData, isActive: payload.isActive, isBanned: payload.isBanned })
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
        async createNewTheme(_, { name, colors = [], adjective = [], nouns = [] }, context) {
            const { name: adminName, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage
            if (adminName && (level !== 1)) throw new Error('Access Denied')
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

                return await db.collection('/themes').add(payload).then(async (doc) => {
                    doc.update({ id: doc.id })

                    const parseSnapshot = await doc.get()

                    return {
                        id: doc.id,
                        ...parseSnapshot.data()
                    }
                })
            } catch (err) {
                return err;
            }
        },
        async deleteAdminAccount(_, { id }, context) {
            const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage
            if (name && (level !== 1)) throw new Error('Access Denied')

            try {
                await db.doc(`/admin/${id}`).delete()

                return {
                    id,
                    status: 'Success',
                    message: 'Success Delete admin ' + id
                }
            } catch (err) {
                return err
            }
        },
        async deleteThemeById(_, { id }, context) {
            const { name, level } = await adminAuthContext(context) // TODO: add condition action only for some privilage
            if (name && (level !== 1)) throw new Error('Access Denied')

            try {
                const oldData = await db.doc(`/themes/${id}`).get();
                await storage.bucket().deleteFiles({
                    prefix: `avatars/${oldData.data().name}/`
                })

                await db.doc(`/themes/${id}`).delete();
                return {
                    id,
                    status: 'Success',
                    message: 'Success Delete theme ' + id
                }
            } catch (err) {
                return err
            }
        },
        async deleteConfigThemesById(_, { attr = '', id: idAttr, themeId }, ctx) {
            const attribute = ['colors', 'adjective', 'nouns']
            if (!attribute.includes(attr)) throw new Error('attribute does not exists')

            try {
                let newDataTheme = {}
                await db.doc(`/themes/${themeId}`).get().then(
                    async doc => {
                        const oldData = doc.data();

                        const currentData = (oldData[attr] || []).filter(({ id }) => id === idAttr);
                        newDataTheme[attr] = (oldData[attr] || []).filter(({ id }) => id !== idAttr)
                        if (currentData[0].avatarUrl) {
                            await storage.bucket().file(
                                getPathStorageFromUrl(
                                    currentData[0].avatarUrl
                                )
                            ).delete();
                        }

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
                            if (newData.length) newThemes.colors = [...newThemes.colors, ...newData]
                        }

                        if (adjective && adjective.length) {
                            const { update, newData } = separateNewAndUpdateData(oldData, adjective, 'adjective')

                            newThemes.adjective = (oldData.adjective || []).map(updateNewDataArray(update))
                            if (newData.length) newThemes.adjective = [...newThemes.adjective, ...newData]
                        }

                        if (nouns && nouns.length) {
                            const { update, newData } = separateNewAndUpdateData(oldData, nouns, 'nouns')

                            newThemes.nouns = (oldData.nouns || []).map(updateNewDataArray(update))
                            if (newData.length) newThemes.nouns = [...newThemes.nouns, ...newData]
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
        },
        async getAdminLogin(_, { }, context) {
            const adminData = await adminAuthContext(context)

            return adminData
        },
    }
}
