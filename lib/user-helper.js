"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserHelper = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const image_helper_1 = require("./image-helper");
const media_helper_1 = require("./media-helper");
if (!admin.apps.length) {
    admin.initializeApp();
}
const fieldValue = admin.firestore.FieldValue;
const timestamp = fieldValue.serverTimestamp();
class UserHelper {
    constructor(config) {
        var _a;
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
        this.create = (data) => __awaiter(this, void 0, void 0, function* () {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            let user = yield this.get(data);
            if (!user) {
                user = yield this.createUser(data);
            }
            return user;
        });
        /**
         * Create User Document from UserRecord
         * @param user
         */
        this.createDocument = (user) => __awaiter(this, void 0, void 0, function* () {
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
            yield docRef.set(baseData, { merge: true });
        });
        /**
         * Validate if user exist
         * @param data
         */
        this.get = (data) => __awaiter(this, void 0, void 0, function* () {
            UserHelper.hasData(data);
            const hasAnyOption = data.phoneNumber || data.email || data.uid;
            if (!hasAnyOption) {
                throw new Error("Please enter a any valid options");
            }
            let _user = null;
            try {
                if (data.phoneNumber) {
                    _user = yield admin.auth().getUserByPhoneNumber(data.phoneNumber);
                }
                else if (data.email) {
                    _user = yield admin.auth().getUserByEmail(data.email);
                }
                else if (data.uid) {
                    _user = yield admin.auth().getUser(data.uid);
                }
            }
            catch (e) {
                console.info(e.message);
            }
            return _user;
        });
        /**
         * Get User Role
         * @param uid
         * @param data
         */
        this.getRole = (uid, data) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            const errorMessage = "You don't have access to request this action";
            UserHelper.hasData(data);
            let grouped = data.collection && data.document;
            /**
             * Verify admin access on top level
             */
            const userRecord = yield admin.auth().getUser(uid);
            const userClaims = (_b = userRecord.customClaims) !== null && _b !== void 0 ? _b : {};
            let role = (_c = userClaims.role) !== null && _c !== void 0 ? _c : null;
            if ((!role || role === "user") && grouped) {
                /**
                 * Verify admin access on collection level
                 */
                const db = admin.firestore();
                const ref = db.collection(data.collection).doc(data.document);
                const snap = yield ref.get();
                const _data = snap.data();
                if (!_data) {
                    throw new Error(`Not found ${data.collection}/${data.document}`);
                }
                const _roleInternal = _data.hasOwnProperty("roles") && _data.roles.hasOwnProperty(uid) ? _data.roles[uid] : null;
                if (_roleInternal) {
                    role = `${data.collection}-${_roleInternal}`;
                }
            }
            return role !== null && role !== void 0 ? role : "user";
        });
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         */
        this.invite = (data) => __awaiter(this, void 0, void 0, function* () {
            UserHelper.hasData(data);
            try {
                const userObject = yield this.create(data);
                if (!userObject) {
                    return;
                }
                // Update data in necessary documents to reflect user creation
                yield this.roleUpdateCall({
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
        });
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
        this.remove = (data) => __awaiter(this, void 0, void 0, function* () {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!(data === null || data === void 0 ? void 0 : data.uid)) {
                throw new Error("uid is required");
            }
            try {
                // Update the necessary documents to delete the user
                yield this.roleUpdateCall({
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
        });
        this.update = (options) => __awaiter(this, void 0, void 0, function* () {
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
                const media = yield imageHelper.bufferImage(imageResizeOptions);
                const avatarPath = `media/avatar/${uid}.jpg`;
                yield mediaHelper.save({
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
            updateDataFirestore = Object.assign(Object.assign({}, updateDataFirestore), _data); // Merge input data
            if (!Object.keys(updateDataFirestore).length) {
                throw new Error("No changes detected");
            }
            if (updateUserObject) {
                yield admin.auth().updateUser(uid, updateDataUser);
            }
            updateDataFirestore.onboarding = onboarding;
            yield ref.set(Object.assign(Object.assign({}, updateDataFirestore), { updated: timestamp, backup: false }), { merge: true });
        });
        /**
         * Update user role
         */
        this.updateRole = (data) => __awaiter(this, void 0, void 0, function* () {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!(data === null || data === void 0 ? void 0 : data.uid)) {
                throw new Error("uid is required");
            }
            try {
                // Update the necessary documents to delete the user
                yield this.roleUpdateCall({
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
        });
        /**
         * Creates the user
         * @param {any} data
         * @returns {Promise<admin.auth.UserRecord>}
         */
        this.createUser = (data) => __awaiter(this, void 0, void 0, function* () {
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
        });
        /**
         * Updates fields in a number of documents to reflect an update of a user, such as create or delete
         *
         * @param data
         */
        this.roleUpdateCall = (data) => __awaiter(this, void 0, void 0, function* () {
            var _d, _e;
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
            let _role = (_d = data.role) !== null && _d !== void 0 ? _d : "user";
            if (data.admin && data.uid) {
                /**
                 * Only update user custom claims on admin level.
                 * Collection level users should not use custom claims to set the role,
                 * or this value will overwrite the admin level users and you'll have security issues.
                 */
                const userRecord = yield admin.auth().getUser(data.uid);
                let userClaims = (_e = userRecord.customClaims) !== null && _e !== void 0 ? _e : {};
                if (data.type === "remove") {
                    delete userClaims.role;
                }
                else {
                    userClaims = Object.assign(Object.assign({}, userClaims), { role: _role });
                }
                yield admin.auth().setCustomUserClaims(data.uid, userClaims);
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
                userData = Object.assign(Object.assign({}, userData), { [data.collection]: updateGroup });
            }
            if (data.admin) {
                userData = Object.assign(Object.assign({}, userData), { role: data.type === "remove" ? fieldValue.delete() : _role });
            }
            batch.set(refUser, userData, { merge: true });
            yield batch.commit();
            return;
        });
        if (config && Object.keys(config).length > 0) {
            this.firebaseConfig = config.firebaseConfig;
            this.isBeta = !!config.isBeta;
            this.mainUrl = (_a = config.mainUrl) !== null && _a !== void 0 ? _a : "";
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