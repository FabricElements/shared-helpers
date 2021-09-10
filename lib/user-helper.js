"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserHelper = void 0;
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = (0, tslib_1.__importStar)(require("firebase-admin"));
const functions = (0, tslib_1.__importStar)(require("firebase-functions"));
const image_helper_1 = require("./image-helper");
const media_helper_1 = require("./media-helper");
if (!admin.apps.length) {
    admin.initializeApp();
}
const fieldValue = admin.firestore.FieldValue;
const timestamp = fieldValue.serverTimestamp();
class UserHelper {
    constructor(config) {
        /**
         * Fail if user is unauthenticated
         * @param context
         */
        this.authenticated = (context) => {
            if (!context.auth) {
                throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
            }
        };
        /**
         * Gets the user object with email or phone number or create the user if not exists
         * @param data
         * @returns {Promise<any>}
         */
        this.create = async (data) => {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            let user = await this.get(data);
            if (!user) {
                user = await this.createUser(data);
            }
            return user;
        };
        /**
         * Create User Document from UserRecord
         * @param user
         */
        this.createDocument = async (user) => {
            UserHelper.hasData(user);
            const baseData = {
                backup: false,
                created: timestamp,
                name: user.displayName || null,
                updated: timestamp,
                email: user.email || null,
                phone: user.phoneNumber || null,
                avatar: user.photoURL || null,
            };
            const db = admin.firestore();
            const docRef = db.collection("user").doc(user.uid);
            await docRef.set(baseData, { merge: true });
        };
        /**
         * Validate if user exist
         * @param data
         */
        this.get = async (data) => {
            UserHelper.hasData(data);
            const hasAnyOption = data.phoneNumber || data.email || data.uid;
            if (!hasAnyOption) {
                throw new Error("Please enter a any valid options");
            }
            let _user = null;
            try {
                if (data.phoneNumber) {
                    _user = await admin.auth().getUserByPhoneNumber(data.phoneNumber);
                }
                else if (data.email) {
                    _user = await admin.auth().getUserByEmail(data.email);
                }
                else if (data.uid) {
                    _user = await admin.auth().getUser(data.uid);
                }
            }
            catch (e) {
                console.info(e.message);
            }
            return _user;
        };
        /**
         * Get User Role
         * @param uid
         * @param data
         */
        this.getRole = async (uid, data) => {
            const errorMessage = "You don't have access to request this action";
            UserHelper.hasData(data);
            let grouped = data.collection && data.document;
            /**
             * Verify admin access on top level
             */
            const userRecord = await admin.auth().getUser(uid);
            const userClaims = userRecord.customClaims ?? {};
            let role = userClaims.role ?? null;
            if ((!role || role === "user") && grouped) {
                /**
                 * Verify admin access on collection level
                 */
                const db = admin.firestore();
                const ref = db.collection(data.collection).doc(data.document);
                const snap = await ref.get();
                const _data = snap.data();
                if (!_data) {
                    throw new Error(`Not found ${data.collection}/${data.document}`);
                }
                const _roleInternal = _data.hasOwnProperty("roles") && _data.roles.hasOwnProperty(uid) ? _data.roles[uid] : null;
                if (_roleInternal) {
                    role = `${data.collection}-${_roleInternal}`;
                }
            }
            return role ?? "user";
        };
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         */
        this.invite = async (data) => {
            UserHelper.hasData(data);
            try {
                const userObject = await this.create(data);
                if (!userObject) {
                    return;
                }
                // Update data in necessary documents to reflect user creation
                await this.roleUpdateCall({
                    type: "add",
                    uid: userObject.uid,
                    collection: data.collection || undefined,
                    document: data.document || undefined,
                    admin: data.admin || undefined,
                    role: data.role,
                });
            }
            catch (error) {
                throw new Error(error.message);
            }
        };
        /**
         * Validates if user is and admin from role
         * @param options
         */
        this.isAdmin = (options) => {
            const _isAdmin = typeof options.role === "string"
                && (options.collection ? options.role.endsWith("admin") : options.role === "admin");
            if (!_isAdmin && options.fail) {
                throw new Error("You are not an Admin");
            }
            return _isAdmin;
        };
        /**
         * Remove a user
         */
        this.remove = async (data) => {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!data?.uid) {
                throw new Error("uid is required");
            }
            try {
                // Update the necessary documents to delete the user
                await this.roleUpdateCall({
                    admin: data.admin || undefined,
                    type: "remove",
                    uid: data.uid,
                    collection: data.collection || undefined,
                    document: data.document || undefined,
                });
            }
            catch (error) {
                throw new Error(`Error removing user access: ${error.message}`);
            }
        };
        this.update = async (options) => {
            const imageHelper = new image_helper_1.ImageHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            const mediaHelper = new media_helper_1.MediaHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            let { uid, data } = options;
            let updateUserObject = false;
            let { nameFirst, nameLast, avatar } = data;
            const validNameFirst = nameFirst && nameFirst.length > 2;
            const validNameLast = nameLast && nameLast.length > 2;
            let correctNameFirst = nameFirst && nameFirst.length > 2 ? nameFirst : undefined;
            let correctNameLast = nameLast && nameLast.length > 2 ? nameLast : undefined;
            const updateName = correctNameFirst && correctNameLast;
            if (nameFirst) {
                if (!validNameFirst) {
                    throw new Error("First Name must be at least 3 characters");
                }
            }
            if (nameLast) {
                if (!validNameLast) {
                    throw new Error("Last Name must be at least 3 characters");
                }
            }
            const db = admin.firestore();
            const ref = db.collection("user").doc(uid);
            let updateDataFirestore = {};
            let updateDataUser = {};
            let onboarding = {};
            if (updateName) {
                /**
                 * Format User Name
                 */
                const initialNameFirst = correctNameFirst.charAt(0).toUpperCase();
                correctNameFirst = initialNameFirst + correctNameFirst.slice(1);
                const initialNameLast = correctNameLast.charAt(0).toUpperCase();
                correctNameLast = initialNameLast + correctNameLast.slice(1);
                let name = `${correctNameFirst} ${correctNameLast}`;
                let nameInitials = initialNameFirst + initialNameLast;
                updateUserObject = true;
                updateDataFirestore = {
                    name,
                    nameFirst: correctNameFirst,
                    nameLast: correctNameLast,
                    nameInitials,
                };
                updateDataUser = {
                    displayName: name,
                };
                onboarding.name = true;
            }
            if (avatar) {
                let imgBuffer = Buffer.from(avatar, "base64");
                const imageSize = imageHelper.size("standard");
                let imageResizeOptions = {
                    maxHeight: imageSize.height,
                    maxWidth: imageSize.width,
                    crop: "entropy",
                    input: imgBuffer,
                    quality: 90,
                    format: "jpeg",
                };
                const media = await imageHelper.bufferImage(imageResizeOptions);
                const avatarPath = `media/avatar/${uid}.jpg`;
                await mediaHelper.save({
                    media,
                    path: avatarPath,
                    contentType: "image/jpeg",
                });
                const avatarUrl = `${this.mainUrl}/${avatarPath}`;
                updateDataFirestore.avatar = avatarUrl;
                updateDataUser.photoURL = avatarUrl;
                updateUserObject = true;
                onboarding.avatar = true;
            }
            /// Set default data values and remove keys before merging
            let _data = data;
            delete _data.name;
            delete _data.nameInitials;
            delete _data.nameFirst;
            delete _data.nameLast;
            delete _data.avatar;
            delete _data.role; // Prevents insecure implementation of roles
            delete _data.created;
            delete _data.updated;
            updateDataFirestore = { ...updateDataFirestore, ..._data }; // Merge input data
            if (!Object.keys(updateDataFirestore).length) {
                throw new Error("No changes detected");
            }
            if (updateUserObject) {
                await admin.auth().updateUser(uid, updateDataUser);
            }
            updateDataFirestore.onboarding = onboarding;
            await ref.set({
                ...updateDataFirestore,
                updated: timestamp,
                backup: false,
            }, { merge: true });
        };
        /**
         * Update user role
         */
        this.updateRole = async (data) => {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!data?.uid) {
                throw new Error("uid is required");
            }
            try {
                // Update the necessary documents to delete the user
                await this.roleUpdateCall({
                    admin: data.admin || undefined,
                    type: "add",
                    uid: data.uid,
                    collection: data.collection || undefined,
                    document: data.document || undefined,
                    role: data.role,
                });
            }
            catch (error) {
                throw new Error(`Error updating user access: ${error.message}`);
            }
        };
        /**
         * Creates the user
         * @param {any} data
         * @returns {Promise<admin.auth.UserRecord>}
         */
        this.createUser = async (data) => {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            let userData = {};
            if (data.email) {
                userData.email = data.email;
            }
            if (data.phoneNumber) {
                userData.phoneNumber = data.phoneNumber;
            }
            return admin.auth().createUser(userData);
        };
        /**
         * Updates fields in a number of documents to reflect an update of a user, such as create or delete
         *
         * @param data
         */
        this.roleUpdateCall = async (data) => {
            const db = admin.firestore();
            let batch = db.batch();
            let clickerInternal = false; // Adds or removes a user as being a clicker
            let grouped = data.collection && data.document;
            let updateGroup = null; // Action for the group
            let userUpdate = null; // Action for the user
            let userData = {
                backup: false,
                updated: timestamp,
            };
            if (data.collection && !data.document) {
                throw new Error("document missing");
            }
            const refUser = db.collection("user").doc(data.uid);
            let _role = data.role ?? "user";
            if (data.admin && data.uid) {
                /**
                 * Only update user custom claims on admin level.
                 * Collection level users should not use custom claims to set the role,
                 * or this value will overwrite the admin level users and you'll have security issues.
                 */
                const userRecord = await admin.auth().getUser(data.uid);
                let userClaims = userRecord.customClaims ?? {};
                if (data.type === "remove") {
                    delete userClaims.role;
                }
                else {
                    userClaims = { ...userClaims, role: _role };
                }
                await admin.auth().setCustomUserClaims(data.uid, userClaims);
            }
            let roles = {};
            switch (data.type) {
                case "add":
                    updateGroup = fieldValue.arrayUnion(...[data.document]);
                    userUpdate = fieldValue.arrayUnion(...[data.uid]);
                    clickerInternal = true;
                    roles = {
                        [data.uid]: _role,
                    };
                    break;
                case "remove":
                    updateGroup = fieldValue.arrayRemove(...[data.document]);
                    userUpdate = fieldValue.arrayRemove(...[data.uid]);
                    clickerInternal = false;
                    roles = {
                        [data.uid]: fieldValue.delete(),
                    };
                    break;
                default:
                    throw new Error("Invalid type");
            }
            if (grouped) {
                const refGroup = db.collection(data.collection).doc(data.document);
                batch.set(refGroup, {
                    roles,
                    users: userUpdate,
                    backup: false,
                    updated: timestamp,
                }, { merge: true });
                // Update user
                userData = {
                    ...userData,
                    [data.collection]: updateGroup
                };
            }
            if (data.admin) {
                userData = {
                    ...userData,
                    role: data.type === "remove" ? fieldValue.delete() : _role,
                };
            }
            batch.set(refUser, userData, { merge: true });
            await batch.commit();
            return;
        };
        if (config && Object.keys(config).length > 0) {
            this.firebaseConfig = config.firebaseConfig;
            this.isBeta = !!config.isBeta;
            this.mainUrl = config.mainUrl ?? "";
        }
    }
    static hasData(data) {
        if (!(data && !data.isEmpty)) {
            throw new Error("Request is empty");
        }
    }
    static hasPhoneOrEmail(data) {
        if (!(data && (data.phoneNumber || data.email))) {
            throw new Error("Incomplete message data");
        }
    }
}
exports.UserHelper = UserHelper;
//# sourceMappingURL=user-helper.js.map