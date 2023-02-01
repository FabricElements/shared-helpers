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
         * @param {any} auth
         * context.auth || request.auth
         */
        this.authenticated = (auth) => {
            if (!auth) {
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
            this.authenticated(request.auth);
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
         * @return {Promise<InterfaceUser>}
         */
        this.create = async (data) => {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            let userObject = await this.get(data);
            let user = data;
            if (userObject) {
                user.id = userObject.uid;
            }
            else {
                user = await this.createUser(data);
            }
            return user;
        };
        /**
         * Create User Document from UserRecord
         * @param {any} user
         * @return {Promise<InterfaceUser>}
         */
        this.createDocument = async (user) => {
            const timestamp = FieldValue.serverTimestamp();
            UserHelper.hasData(user);
            const baseData = {
                ...user,
                backup: false,
                created: timestamp,
                updated: timestamp,
                id: undefined,
            };
            const db = getFirestore();
            const docRef = db.collection('user').doc(user.id);
            await docRef.set(baseData, { merge: true });
            return {
                ...baseData,
                id: user.id,
            };
        };
        /**
         * Validate if user exist
         * @param {any} data
         */
        this.get = async (data) => {
            UserHelper.hasData(data);
            const hasAnyOption = data.phone || data.email || data.id;
            if (!hasAnyOption) {
                throw new Error('Please enter a any valid options: phone, email or id');
            }
            let _user = null;
            try {
                let identifiers = [];
                if (data.id)
                    identifiers.push({ uid: data.id });
                if (data.email)
                    identifiers.push({ email: data.email });
                if (data.phone)
                    identifiers.push({ phoneNumber: data.phone });
                const users = await getAuth().getUsers(identifiers);
                if (users.users.length > 0)
                    _user = users.users[0];
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
         * @param {string} id
         * @param {any} data
         */
        this.getRole = async (id, data) => {
            // const errorMessage = 'You don\'t have access to request this action';
            UserHelper.hasData(data);
            const grouped = data.group && data.group.length > 0;
            /**
             * Verify admin access on top level
             */
            const userRecord = await getAuth().getUser(id);
            const userClaims = userRecord.customClaims ?? {};
            let role = userClaims.role ?? null;
            const userDoc = await firestore.getDocument({
                collection: 'user',
                document: id,
            });
            if (!role) {
                role = userDoc.role;
            }
            if (grouped && (!role || role === 'user')) {
                /**
                 * Verify admin access on collection level
                 */
                if (!data.id) {
                    throw new Error(`Not found user/${data.id}`);
                }
                const _roleInternal = userDoc.groups != null ? userDoc.groups[data.group] : null;
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
        this.add = async (data) => {
            UserHelper.hasData(data);
            try {
                const userObject = await this.create(data);
                if (!userObject) {
                    return;
                }
                // Update data in necessary documents to reflect user creation
                await this.roleUpdateCall({
                    type: 'add',
                    id: userObject.id,
                    group: data.group || undefined,
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
            // Data id needs to exist
            if (!data?.id) {
                throw new Error('user id is required');
            }
            try {
                const grouped = data.group && data.group.length > 0;
                // Remove user if not grouped
                if (grouped) {
                    // Update the necessary documents to delete the user
                    await this.roleUpdateCall({
                        type: 'remove',
                        id: data.id,
                        group: data.group,
                    });
                }
                else {
                    // Remove user document and reference if is not grouped
                    await getAuth().deleteUser(data.id);
                    const db = getFirestore();
                    const refUser = db.collection('user').doc(data.id);
                    await refUser.delete();
                }
            }
            catch (error) {
                // @ts-ignore
                throw new Error(`Error removing user access: ${error.message}`);
            }
        };
        /**
         * Update User
         * @param {InterfaceUser} data
         */
        this.update = async (data) => {
            const timestamp = FieldValue.serverTimestamp();
            const imageHelper = new ImageHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            const mediaHelper = new MediaHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            let updateUserObject = false;
            const { firstName, lastName, avatar, id } = data;
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
            const ref = db.collection('user').doc(id);
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
                try {
                    const imgBuffer = Buffer.from(avatar, 'base64');
                    const imageSize = imageHelper.size('standard');
                    const imageResizeOptions = {
                        maxHeight: imageSize.height,
                        maxWidth: imageSize.width,
                        crop: 'entropy',
                        input: imgBuffer,
                        quality: 90,
                        format: 'jpeg',
                        contentType: 'image/jpeg',
                    };
                    const media = await imageHelper.bufferImage(imageResizeOptions);
                    const avatarPath = `media/avatar/${id}.jpg`;
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
                catch (e) {
                    //
                }
            }
            // / Set default data values and remove keys before merging
            const _data = data;
            delete _data.username;
            delete _data.name;
            delete _data.abbr;
            delete _data.firstName;
            delete _data.lastName;
            delete _data.avatar;
            delete _data.role; // Prevents insecure implementation of roles
            delete _data.groups;
            delete _data.group;
            delete _data.phone;
            delete _data.email;
            delete _data.backup;
            delete _data.created;
            delete _data.updated;
            delete _data.ping;
            delete _data.fcm;
            delete _data.id;
            delete _data.onboarding;
            updateDataFirestore = { ..._data, ...updateDataFirestore }; // Merge input data
            if (!Object.keys(updateDataFirestore).length) {
                throw new Error('No changes detected');
            }
            if (updateUserObject) {
                await getAuth().updateUser(id, updateDataUser);
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
            // Data id needs to exist
            if (!data?.id) {
                throw new Error('User id is required');
            }
            try {
                // Update the necessary documents to delete the user
                await this.roleUpdateCall({
                    type: 'add',
                    id: data.id,
                    group: data.group || undefined,
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
         * @param {InterfaceUser} data
         * @return {Promise<InterfaceUser>}
         */
        this.createUser = async (data) => {
            UserHelper.hasData(data);
            UserHelper.hasPhoneOrEmail(data);
            let userData = {};
            if (data.email) {
                userData.email = data.email;
            }
            if (data.phone) {
                userData.phoneNumber = data.phone;
            }
            if (data.name != null || data.firstName != null || data.lastName || null) {
                userData.displayName = data.name ?? data.firstName ?? data.lastName;
            }
            if (data.password != null && data.password.length > 0) {
                userData.password = data.password;
            }
            const created = await getAuth().createUser(userData);
            const user = {
                ...data,
                id: created.uid,
                role: 'user',
                group: undefined,
                password: undefined,
            };
            await this.createDocument(user);
            return user;
        };
        /**
         * Updates fields in a number of documents to reflect an update of a user, such as create or delete
         *
         * @param {any} data
         */
        this.roleUpdateCall = async (data) => {
            if (!data.id) {
                throw new Error('id is required to update user role');
            }
            const timestamp = FieldValue.serverTimestamp();
            const db = getFirestore();
            let updateGroup = null; // Action for the group
            if (data.group && data.group.length == 0) {
                throw new Error('group can\'t be empty for group roles');
            }
            const grouped = data.group && data.group.length > 0;
            const refUser = db.collection('user').doc(data.id);
            const _role = data.role ?? 'user';
            const userRecord = await getAuth().getUser(data.id);
            let userData = {
                backup: false,
                updated: timestamp,
                created: timestamp,
            };
            const userDoc = await firestore.getDocument({
                collection: 'user',
                document: data.id,
            });
            userData.created = userDoc.created ?? timestamp;
            let userClaims = userRecord.customClaims ?? {};
            let updateClaims = false;
            if (!grouped) {
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
            switch (data.type) {
                case 'add':
                    updateGroup = {
                        [data.group]: _role,
                    };
                    break;
                case 'remove':
                    updateGroup = {
                        [data.group]: FieldValue.delete(),
                    };
                    break;
                default:
                    throw new Error('Invalid type');
            }
            if (grouped) {
                // Update user
                userData = {
                    ...userData,
                    ['groups']: updateGroup,
                };
            }
            if (!grouped) {
                userData = {
                    ...userData,
                    role: data.type === 'remove' ? FieldValue.delete() : _role,
                };
            }
            await refUser.set(userData, { merge: true });
            /**
             * Update custom claims
             */
            let collectionClaims = null;
            if (grouped) {
                if (Object.prototype.hasOwnProperty.call(userDoc, 'groups')) {
                    collectionClaims = userDoc['groups'];
                    userClaims = {
                        ...userClaims,
                        'groups': collectionClaims,
                    };
                }
                updateClaims = true;
            }
            if (updateClaims) {
                await getAuth().setCustomUserClaims(data.id, userClaims);
                await getAuth().revokeRefreshTokens(data.id);
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
        if (!(data && (data.phone || data.email))) {
            throw new Error('Incomplete message data');
        }
    }
}
//# sourceMappingURL=user-helper.js.map