import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { https, logger } from 'firebase-functions/v2';
import { FirestoreHelper } from './firestore-helper.js';
import { Media } from './media.js';
/**
 * User namespace
 */
export var User;
(function (User) {
    var _a;
    /**
     * UserHelper
     */
    class Helper {
        /**
         *
         * @param {object | null} data
         * @private
         */
        static hasData(data) {
            if (!(data && Object.keys(data).length > 0)) {
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
    _a = Helper;
    /**
     * Fail if user is unauthenticated
     *
     * @param {any} auth
     * context.auth || request.auth
     */
    Helper.authenticated = (auth) => {
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
    Helper.token = (request) => {
        _a.authenticated(request.auth);
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
     * @return {Promise<Interface>}
     */
    Helper.create = async (data) => {
        _a.hasData(data);
        _a.hasPhoneOrEmail(data);
        let userObject = await _a.get(data);
        let user;
        if (userObject) {
            user = await FirestoreHelper.Helper.getDocument({
                collection: 'user',
                document: userObject.uid,
            });
        }
        else {
            user = await _a.createUser(data);
        }
        return user;
    };
    /**
     * Create User Document from UserRecord
     * @param {any} user
     * @return {Promise<Interface>}
     */
    Helper.createDocument = async (user) => {
        const timestamp = FieldValue.serverTimestamp();
        _a.hasData(user);
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
     * On Create User format data and create document
     * @param {UserRecord} user
     * @param {string} mainUrl
     * @return {Promise<Interface>}
     */
    Helper.onCreate = async (user, mainUrl) => {
        let userDoc = {
            email: user.email ?? undefined,
            phone: user.phoneNumber ?? undefined,
            name: user.displayName ?? undefined,
            language: 'en',
            role: 'user',
        };
        try {
            const ref = getFirestore().collection('user').doc(user.uid);
            const doc = await ref.get();
            if (doc.exists) {
                userDoc = { ...userDoc, ...doc.data() };
            }
        }
        catch (e) {
            logger.error(e);
        }
        if (user.photoURL) {
            try {
                const avatarPath = `media/user/${user.uid}/avatar`;
                const avatarUrl = `${mainUrl}/${avatarPath}`;
                await Media.Helper.saveFromUrl({
                    url: user.photoURL,
                    path: avatarPath,
                });
                userDoc.avatar = avatarPath;
                await getAuth().updateUser(user.uid, {
                    photoURL: avatarUrl,
                });
            }
            catch (error) {
                logger.error(error);
            }
        }
        userDoc.id = user.uid;
        return _a.createDocument(userDoc);
    };
    /**
     * Validate if user exist
     * @param {any} data
     * @return {Promise<UserRecord | null>}
     */
    Helper.get = async (data) => {
        _a.hasData(data);
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
            // @ts-expect-error Error requires description
            logger.info(error.message);
        }
        // Recreate document with updated email and phone number
        if (_user) {
            await _a.createDocument({
                id: _user.uid,
                name: _user.displayName ?? undefined,
                email: _user.email ?? FieldValue.delete(),
                phone: _user.phoneNumber ?? FieldValue.delete(),
            });
        }
        return _user;
    };
    /**
     * Get User Role
     *
     * @param {string} uid
     * @param {string?} group
     * @return {Promise<string>}
     */
    Helper.getRole = async (uid, group) => {
        // const errorMessage = 'You don\'t have access to request this action';
        const grouped = group && group.length > 0;
        /**
         * Verify admin access on top level
         */
        const userRecord = await getAuth().getUser(uid);
        const userClaims = userRecord.customClaims ?? {};
        const userDoc = await FirestoreHelper.Helper.getDocument({
            collection: 'user',
            document: uid,
        });
        let role = userClaims.role ?? userDoc.role;
        if (grouped && (!role || role === 'user')) {
            /**
             * Verify admin access on collection level
             */
            const _roleInternal = userDoc.groups != null ? userDoc.groups[group] : null;
            if (_roleInternal) {
                role = `${group}-${_roleInternal}`;
            }
        }
        return role ?? 'user';
    };
    /**
     * User invitation function, it listens for a new connection-invite document creation, and creates the user
     * @param {any} data
     * @return {Promise<Interface>}
     */
    Helper.add = async (data) => {
        _a.hasData(data);
        const userObject = await _a.create(data);
        if (!userObject)
            throw new Error('Error creating user');
        // Update data in necessary documents to reflect user creation
        await _a.roleUpdateCall({
            type: 'add',
            id: userObject.id,
            group: data.group || undefined,
            role: data.role,
        });
        return userObject;
    };
    /**
     * Validates if user is and admin from role
     * @param {any} options
     * @return {boolean} boolean
     */
    Helper.isAdmin = (options) => {
        const _isAdmin = typeof options.role === 'string' &&
            (options.group ? (options.role.endsWith('admin') || options.role.endsWith('owner')) :
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
    Helper.remove = async (data) => {
        _a.hasData(data);
        // Data id needs to exist
        if (!data?.id) {
            throw new Error('user id is required');
        }
        try {
            const grouped = data.group && data.group.length > 0;
            // Remove user if not grouped
            if (grouped) {
                // Update the necessary documents to delete the user
                await _a.roleUpdateCall({
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
            // @ts-expect-error Error requires description
            throw new Error(`Error removing user access: ${error.message}`);
        }
    };
    /**
     * Format User Names
     * @param {Interface} data
     * @return {Interface} data
     */
    Helper.formatUserNames = (data) => {
        const { firstName, lastName } = data;
        const validNameFirst = firstName && firstName.length > 1;
        const validNameLast = lastName && lastName.length > 1;
        let correctNameFirst = validNameFirst ? firstName : undefined;
        let correctNameLast = validNameLast ? lastName : undefined;
        // Remove with spaces beginning and end
        correctNameFirst = correctNameFirst?.trim();
        correctNameLast = correctNameLast?.trim();
        // Validate First Name
        if (firstName && !validNameFirst) {
            throw new Error('First Name must be at least 2 characters');
        }
        // Validate Last Name
        if (lastName && !validNameLast) {
            throw new Error('Last Name must be at least 2 characters');
        }
        const validName = validNameFirst && validNameLast;
        // Validate First and Last Name
        if (!validName)
            throw new Error('Please add a valid First and Last Name');
        // Format User Name
        const initialNameFirst = correctNameFirst.charAt(0).toUpperCase();
        correctNameFirst = initialNameFirst + correctNameFirst.slice(1);
        const initialNameLast = correctNameLast.charAt(0).toUpperCase();
        correctNameLast = initialNameLast + correctNameLast.slice(1);
        const name = `${correctNameFirst} ${correctNameLast}`;
        const abbr = initialNameFirst + initialNameLast;
        // Create User Data
        return {
            ...data,
            // Reset User Name
            firstName: correctNameFirst,
            lastName: correctNameLast,
            name: name,
            abbr: abbr,
        };
    };
    /**
     * Update User account data
     * @param {Interface} data
     * @param {string} mainUrl
     */
    Helper.update = async (data, mainUrl) => {
        const timestamp = FieldValue.serverTimestamp();
        const { id, phone, email, avatar, language } = data;
        const db = getFirestore();
        const ref = db.collection('user').doc(id);
        let updateDataFirestore = {};
        let updateDataUser = {};
        const currentUser = await getAuth().getUser(id);
        updateDataFirestore.phone = currentUser.phoneNumber ?? null;
        updateDataFirestore.email = currentUser.email ?? null;
        if (phone && phone !== currentUser.phoneNumber) {
            updateDataUser.phoneNumber = phone;
            updateDataFirestore.phone = phone;
        }
        if (email && email !== currentUser.email) {
            updateDataUser.email = email;
            updateDataUser.emailVerified = false;
            updateDataFirestore.email = email;
        }
        if (language)
            updateDataFirestore.language = language;
        const formatNames = _a.formatUserNames(data);
        const updateName = formatNames.name !== currentUser.displayName;
        const onboarding = {};
        if (updateName) {
            updateDataUser.displayName = formatNames.name;
            updateDataFirestore.name = formatNames.name;
            updateDataFirestore.firstName = formatNames.firstName;
            updateDataFirestore.lastName = formatNames.lastName;
            updateDataFirestore.abbr = formatNames.abbr;
        }
        if (formatNames.name)
            onboarding.name = true;
        if (avatar) {
            try {
                const imgBuffer = Buffer.from(avatar, 'base64');
                const imageSize = Media.Image.sizeObjectFromImageSize(Media.ImageSize.standard);
                const imageResizeOptions = {
                    maxHeight: imageSize.height,
                    maxWidth: imageSize.width,
                    crop: 'entropy',
                    input: imgBuffer,
                    quality: 90,
                    format: Media.AvailableOutputFormats.jpeg,
                    contentType: 'image/jpeg',
                };
                const media = await Media.Image.bufferImage(imageResizeOptions);
                const avatarPath = `media/user/${id}/avatar`;
                const avatarUrl = `${mainUrl}/${avatarPath}`;
                await Media.Helper.save({
                    media: media.buffer,
                    path: avatarPath,
                    contentType: media.contentType,
                });
                updateDataFirestore.avatar = avatarPath;
                updateDataUser.photoURL = avatarUrl;
                onboarding.avatar = true;
            }
            catch (e) {
                //
            }
        }
        if (!(Object.keys(updateDataUser).length || Object.keys(updateDataFirestore).length)) {
            throw new Error('No changes detected');
        }
        updateDataFirestore.onboarding = onboarding;
        await getAuth().updateUser(id, updateDataUser);
        await ref.set({
            ...updateDataFirestore,
            updated: timestamp,
            backup: false,
        }, { merge: true });
    };
    /**
     * Update user role
     * @param {any} data
     * @param {string} mainUrl
     */
    Helper.updateRole = async (data, mainUrl) => {
        _a.hasData(data);
        // Data id needs to exist
        if (!data?.id) {
            throw new Error('User id is required');
        }
        try {
            // Update the necessary documents to reflect user role update
            await _a.roleUpdateCall({
                type: 'add',
                id: data.id,
                group: data.group || undefined,
                role: data.role,
            });
        }
        catch (error) {
            // @ts-expect-error Error requires description
            throw new Error(`Error updating user access: ${error.message}`);
        }
        // Remove avatar first
        delete data.avatar;
        // Update other user data
        await _a.update(data, mainUrl);
    };
    /**
     * Creates the user
     * @param {Interface} data
     * @return {Promise<Interface>}
     */
    Helper.createUser = async (data) => {
        _a.hasData(data);
        _a.hasPhoneOrEmail(data);
        let userData = {};
        if (data.email)
            userData.email = data.email;
        if (data.phone)
            userData.phoneNumber = data.phone;
        const formatNames = _a.formatUserNames(data);
        let user = {
            ...formatNames,
            role: 'user',
            group: undefined,
            password: undefined,
        };
        if (!user.name?.length) {
            throw new Error('First Name and Last Name are required');
        }
        userData.displayName = user.name;
        if (data.password != null && data.password.length > 0) {
            userData.password = data.password;
        }
        const created = await getAuth().createUser(userData);
        user.id = created.uid;
        await _a.createDocument(user);
        return user;
    };
    /**
     * Updates fields in a number of documents to reflect an update of a user, such as create or delete
     *
     * @param {any} data
     */
    Helper.roleUpdateCall = async (data) => {
        if (!data.id)
            throw new Error('id is required to update user role');
        const timestamp = FieldValue.serverTimestamp();
        const db = getFirestore();
        let updateGroup = null; // Action for the group
        if (data.group && data.group.length == 0)
            throw new Error('group can\'t be empty for group roles');
        const grouped = data.group && data.group.length > 0;
        const refUser = db.collection('user').doc(data.id);
        const _role = data.role ?? 'user';
        const userRecord = await getAuth().getUser(data.id);
        let userData = {
            backup: false,
            updated: timestamp,
            created: timestamp,
            name: userRecord.displayName ?? undefined,
            email: userRecord.email ?? FieldValue.delete(),
            phone: userRecord.phoneNumber ?? FieldValue.delete(),
        };
        const userDoc = await FirestoreHelper.Helper.getDocument({
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
                collectionClaims = userDoc.groups;
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
    };
    User.Helper = Helper;
})(User || (User = {}));
//# sourceMappingURL=user.js.map