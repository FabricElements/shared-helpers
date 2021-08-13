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
const fieldValue = admin.firestore.FieldValue;
const timestamp = fieldValue.serverTimestamp();
class UserHelper {
    /**
     * Constructor
     */
    constructor() {
        /**
         * Gets the user object with email or phone number or create the user if not exists
         * @param data
         * @returns {Promise<any>}
         */
        this.create = (data) => __awaiter(this, void 0, void 0, function* () {
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
            UserHelper.hasPhoneOrEmail(data);
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
            catch (error) {
            }
            return _user;
        });
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         */
        this.invite = (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userObject = yield this.create(data);
                if (!userObject) {
                    return;
                }
                // Update data in necessary documents to reflect user creation
                yield this.roleUpdate({
                    type: "add",
                    uid: userObject.uid,
                    collection: data.collection || undefined,
                    collectionId: data.collectionId || undefined,
                    admin: data.admin || undefined,
                    role: data.role,
                });
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        /**
         * Remove a user
         */
        this.remove = (data) => __awaiter(this, void 0, void 0, function* () {
            // Data uid needs to exist
            if (!(data === null || data === void 0 ? void 0 : data.uid)) {
                throw new Error("uid is required");
            }
            try {
                // Update the necessary documents to delete the user
                yield this.roleUpdate({
                    admin: data.admin || undefined,
                    type: "remove",
                    uid: data.uid,
                    collection: data.collection || undefined,
                    collectionId: data.collectionId || undefined,
                });
            }
            catch (error) {
                throw new Error(`Error removing user access: ${error.message}`);
            }
        });
        /**
         * Creates the user
         * @param {any} data
         * @returns {Promise<admin.auth.UserRecord>}
         */
        this.createUser = (data) => __awaiter(this, void 0, void 0, function* () {
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
        this.roleUpdate = (data) => __awaiter(this, void 0, void 0, function* () {
            const db = admin.firestore();
            let batch = db.batch();
            let clickerInternal = false; // Adds or removes a user as being a clicker
            let grouped = data.collection && data.collectionId;
            let updateGroup = null; // Action for the group
            let userUpdate = null; // Action for the user
            let userData = {
                backup: false,
                updated: timestamp,
            };
            if (data.collection && !data.collectionId) {
                throw new Error("collectionId missing");
            }
            const refUser = db.collection("user").doc(data.uid);
            if (data.admin) {
                yield admin.auth().setCustomUserClaims(data.uid, {
                    role: data.role,
                });
            }
            let roles = {};
            switch (data.type) {
                case "add":
                    updateGroup = fieldValue.arrayUnion(...[data.collectionId]);
                    userUpdate = fieldValue.arrayUnion(...[data.uid]);
                    clickerInternal = true;
                    roles = {
                        [data.uid]: data.role,
                    };
                    break;
                case "remove":
                    updateGroup = fieldValue.arrayRemove(...[data.collectionId]);
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
                const refGroup = db.collection(data.collection).doc(data.collectionId);
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
                userData = Object.assign(Object.assign({}, userData), { role: data.role });
            }
            batch.set(refUser, userData, { merge: true });
            yield batch.commit();
            return;
        });
        //
    }
    static hasPhoneOrEmail(data) {
        if (!(data && (data.phoneNumber || data.email))) {
            throw new Error("Incomplete message data");
        }
    }
}
exports.UserHelper = UserHelper;
//# sourceMappingURL=user-helper.js.map