import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v2';
import { FirestoreHelper } from './firestore-helper.js';
import { ImageHelper } from './image-helper.js';
import { MediaHelper } from './media-helper.js';
const firestore = new FirestoreHelper();
/**
 * UserHelper
 */
export class UserHelper {
    /**
     * @param {any} config
     */
    constructor(config) {
        /**
         * Fail if user is unauthenticated
         *
         * @param {CallableRequest} request
         */
        this.authenticated = (request) => {
            if (!request.auth) {
                throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
            }
        };
        /**
         * Return user token from context
         *
         * @param {CallableRequest} request
         * @return {string}
         */
        this.token = (request) => {
            this.authenticated(request);
            const authHeader = request.rawRequest.headers.authorization;
            // const authHeader = request.auth.token;
            if (!authHeader) {
                throw new https.HttpsError('unauthenticated', 'Missing Authorization header');
            }
            const _token = authHeader.split(' ')[1];
            if (!_token || _token.length < 5) {
                throw new https.HttpsError('unauthenticated', 'Missing or invalid token');
            }
            return _token;
        };
        /**
         * Gets the user object with email or phone number or create the user if not exists
         * @param {any} data
         * @return {Promise<any>}
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
         * @param {any} user
         */
        this.createDocument = async (user) => {
            const timestamp = FieldValue.serverTimestamp();
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
            const db = getFirestore();
            const docRef = db.collection('user').doc(user.uid);
            await docRef.set(baseData, { merge: true });
        };
        /**
         * Validate if user exist
         * @param {any} data
         */
        this.get = async (data) => {
            UserHelper.hasData(data);
            const hasAnyOption = data.phoneNumber || data.email || data.uid;
            if (!hasAnyOption) {
                throw new Error('Please enter a any valid options');
            }
            let _user = null;
            try {
                if (data.phoneNumber) {
                    _user = await getAuth().getUserByPhoneNumber(data.phoneNumber);
                }
                else if (data.email) {
                    _user = await getAuth().getUserByEmail(data.email);
                }
                else if (data.uid) {
                    _user = await getAuth().getUser(data.uid);
                }
            }
            catch (error) {
                // @ts-ignore
                console.info(error.message);
            }
            return _user;
        };
        /**
         * Get User Role
         *
         * @param {string} uid
         * @param {any} data
         */
        this.getRole = async (uid, data) => {
            // const errorMessage = 'You don\'t have access to request this action';
            UserHelper.hasData(data);
            const grouped = data.group && data.groupId;
            /**
             * Verify admin access on top level
             */
            const userRecord = await getAuth().getUser(uid);
            const userClaims = userRecord.customClaims ?? {};
            let role = userClaims.role ?? null;
            if ((!role || role === 'user') && grouped) {
                /**
                 * Verify admin access on collection level
                 */
                const db = getFirestore();
                const ref = db.collection(data.group).doc(data.groupId);
                const snap = await ref.get();
                const _data = snap.data();
                if (!_data) {
                    throw new Error(`Not found ${data.group}/${data.groupId}`);
                }
                const _roleInternal = Object.prototype.hasOwnProperty.call(_data, 'roles') && Object.prototype.hasOwnProperty.call(_data.roles, uid) ? _data.roles[uid] : null;
                if (_roleInternal) {
                    role = `${data.group}-${_roleInternal}`;
                }
            }
            return role ?? 'user';
        };
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         * @param {any} data
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
                    type: 'add',
                    uid: userObject.uid,
                    group: data.group || undefined,
                    groupId: data.groupId || undefined,
                    admin: data.admin || undefined,
                    role: data.role,
                });
            }
            catch (error) {
                // @ts-ignore
                throw new Error(error.message);
            }
        };
        /**
         * Validates if user is and admin from role
         * @param {any} options
         * @return {boolean} boolean
         */
        this.isAdmin = (options) => {
            const _isAdmin = typeof options.role === 'string' &&
                (options.group ? options.role.endsWith('admin') :
                    options.role === 'admin');
            if (!_isAdmin && options.fail) {
                throw new Error('You are not an Admin');
            }
            return _isAdmin;
        };
        /**
         * Remove a user
         * @param {any} data
         */
        this.remove = async (data) => {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!data?.uid) {
                throw new Error('uid is required');
            }
            try {
                // Update the necessary documents to delete the user
                await this.roleUpdateCall({
                    admin: data.admin || undefined,
                    type: 'remove',
                    uid: data.uid,
                    group: data.group || undefined,
                    groupId: data.groupId || undefined,
                });
            }
            catch (error) {
                // @ts-ignore
                throw new Error(`Error removing user access: ${error.message}`);
            }
        };
        /**
         * Update User
         * @param {any} options
         */
        this.update = async (options) => {
            const timestamp = FieldValue.serverTimestamp();
            const imageHelper = new ImageHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            const mediaHelper = new MediaHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            const { uid, data } = options;
            let updateUserObject = false;
            const { firstName, lastName, avatar } = data;
            const validNameFirst = firstName && firstName.length > 2;
            const validNameLast = lastName && lastName.length > 2;
            let correctNameFirst = firstName && firstName.length > 2 ? firstName : undefined;
            let correctNameLast = lastName && lastName.length > 2 ? lastName : undefined;
            const updateName = correctNameFirst && correctNameLast;
            if (firstName) {
                if (!validNameFirst) {
                    throw new Error('First Name must be at least 3 characters');
                }
            }
            if (lastName) {
                if (!validNameLast) {
                    throw new Error('Last Name must be at least 3 characters');
                }
            }
            const db = getFirestore();
            const ref = db.collection('user').doc(uid);
            let updateDataFirestore = {};
            let updateDataUser = {};
            const onboarding = {};
            if (updateName) {
                /**
                 * Format User Name
                 */
                const initialNameFirst = correctNameFirst.charAt(0).toUpperCase();
                correctNameFirst = initialNameFirst + correctNameFirst.slice(1);
                const initialNameLast = correctNameLast.charAt(0).toUpperCase();
                correctNameLast = initialNameLast + correctNameLast.slice(1);
                const name = `${correctNameFirst} ${correctNameLast}`;
                const abbr = initialNameFirst + initialNameLast;
                updateUserObject = true;
                updateDataFirestore = {
                    name,
                    firstName: correctNameFirst,
                    lastName: correctNameLast,
                    abbr,
                };
                updateDataUser = {
                    displayName: name,
                };
                onboarding.name = true;
            }
            if (avatar) {
                const imgBuffer = Buffer.from(avatar, 'base64');
                const imageSize = imageHelper.size('standard');
                const imageResizeOptions = {
                    maxHeight: imageSize.height,
                    maxWidth: imageSize.width,
                    crop: 'entropy',
                    input: imgBuffer,
                    quality: 90,
                    format: 'jpeg',
                };
                const media = await imageHelper.bufferImage(imageResizeOptions);
                const avatarPath = `media/avatar/${uid}.jpg`;
                await mediaHelper.save({
                    media,
                    path: avatarPath,
                    contentType: 'image/jpeg',
                });
                const avatarUrl = `${this.mainUrl}/${avatarPath}`;
                updateDataFirestore.avatar = avatarUrl;
                updateDataUser.photoURL = avatarUrl;
                updateUserObject = true;
                onboarding.avatar = true;
            }
            // / Set default data values and remove keys before merging
            const _data = data;
            delete _data.name;
            delete _data.abbr;
            delete _data.firstName;
            delete _data.lastName;
            delete _data.avatar;
            delete _data.role; // Prevents insecure implementation of roles
            delete _data.created;
            delete _data.updated;
            updateDataFirestore = { ...updateDataFirestore, ..._data }; // Merge input data
            if (!Object.keys(updateDataFirestore).length) {
                throw new Error('No changes detected');
            }
            if (updateUserObject) {
                await getAuth().updateUser(uid, updateDataUser);
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
         * @param {any} data
         */
        this.updateRole = async (data) => {
            UserHelper.hasData(data);
            // Data uid needs to exist
            if (!data?.uid) {
                throw new Error('uid is required');
            }
            try {
                // Update the necessary documents to delete the user
                await this.roleUpdateCall({
                    admin: data.admin || undefined,
                    type: 'add',
                    uid: data.uid,
                    group: data.group || undefined,
                    groupId: data.groupId || undefined,
                    role: data.role,
                });
            }
            catch (error) {
                // @ts-ignore
                throw new Error(`Error updating user access: ${error.message}`);
            }
        };
        /**
         * Creates the user
         * @param {any} data
         * @return {Promise<auth.UserRecord>}
         */
        this.createUser = async (data) => {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            const userData = {};
            if (data.email) {
                userData.email = data.email;
            }
            if (data.phoneNumber) {
                userData.phoneNumber = data.phoneNumber;
            }
            return getAuth().createUser(userData);
        };
        /**
         * Updates fields in a number of documents to reflect an update of a user, such as create or delete
         *
         * @param {any} data
         */
        this.roleUpdateCall = async (data) => {
            const timestamp = FieldValue.serverTimestamp();
            const db = getFirestore();
            const batch = db.batch();
            // let clickerInternal = false; // Adds or removes a user as being a clicker
            const grouped = data.group && data.groupId;
            let updateGroup = null; // Action for the group
            let userUpdate = null; // Action for the user
            let userData = {
                backup: false,
                updated: timestamp,
            };
            if (data.group && !data.groupId) {
                throw new Error('document missing');
            }
            const refUser = db.collection('user').doc(data.uid);
            const _role = data.role ?? 'user';
            const userRecord = await getAuth().getUser(data.uid);
            let userClaims = userRecord.customClaims ?? {};
            let updateClaims = false;
            if (data.admin && data.uid) {
                /**
                 * Only update user custom claims `role` key on admin level.
                 * Collection level users should not use custom claims to set the `role` key,
                 * or this value will overwrite the admin level users, and you'll have security issues.
                 */
                if (data.type === 'remove') {
                    delete userClaims.role;
                }
                else {
                    userClaims = { ...userClaims, role: _role };
                }
                updateClaims = true;
            }
            let roles = {};
            switch (data.type) {
                case 'add':
                    updateGroup = {
                        [data.groupId]: _role,
                    };
                    userUpdate = FieldValue.arrayUnion(...[data.uid]);
                    // clickerInternal = true;
                    roles = {
                        [data.uid]: _role,
                    };
                    break;
                case 'remove':
                    updateGroup = {
                        [data.groupId]: FieldValue.delete(),
                    };
                    userUpdate = FieldValue.arrayRemove(...[data.uid]);
                    // clickerInternal = false;
                    roles = {
                        [data.uid]: FieldValue.delete(),
                    };
                    break;
                default:
                    throw new Error('Invalid type');
            }
            if (grouped) {
                const refGroup = db.collection(data.group).doc(data.groupId);
                batch.set(refGroup, {
                    roles,
                    users: userUpdate,
                    backup: false,
                    updated: timestamp,
                }, { merge: true });
                // Update user
                userData = {
                    ...userData,
                    [data.group]: updateGroup,
                };
            }
            if (data.admin) {
                userData = {
                    ...userData,
                    role: data.type === 'remove' ? FieldValue.delete() : _role,
                };
            }
            batch.set(refUser, userData, { merge: true });
            await batch.commit();
            /**
             * Update custom claims
             */
            let collectionClaims = null;
            if (grouped) {
                const userDoc = await firestore.getDocument({
                    collection: 'user',
                    document: data.uid,
                });
                if (Object.prototype.hasOwnProperty.call(userDoc, data.group)) {
                    collectionClaims = userDoc[data.group];
                    userClaims = {
                        ...userClaims,
                        [data.group]: collectionClaims,
                    };
                }
                updateClaims = true;
            }
            if (updateClaims) {
                await getAuth().setCustomUserClaims(data.uid, userClaims);
                await getAuth().revokeRefreshTokens(data.uid);
            }
            return;
        };
        if (config && Object.keys(config).length > 0) {
            this.firebaseConfig = config.firebaseConfig;
            this.isBeta = !!config.isBeta;
            this.mainUrl = config.mainUrl ?? '';
        }
    }
    /**
     *
     * @param {any} data
     * @private
     */
    static hasData(data) {
        if (!(data && !data.isEmpty)) {
            throw new Error('Request is empty');
        }
    }
    /**
     * Validate if data object has Phone Or Email
     * @param {any} data
     * @private
     */
    static hasPhoneOrEmail(data) {
        if (!(data && (data.phoneNumber || data.email))) {
            throw new Error('Incomplete message data');
        }
    }
}
//# sourceMappingURL=user-helper.js.map