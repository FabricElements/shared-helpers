/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {UserIdentifier} from 'firebase-admin/auth';
import {getAuth, UserRecord} from 'firebase-admin/auth';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {https, logger} from 'firebase-functions/v2';
import type {CallableRequest} from 'firebase-functions/v2/https';
import {FirestoreHelper} from './firestore-helper.js';
import {Media} from './media.js';

/**
 * User namespace
 */
export namespace User {
  export interface InterfaceAds {
    adsense?: {
      client: string;
      slot: string;
    },
  }

  /**
   * User links
   */
  export interface InterfaceLinks {
    behance?: string;
    dribbble?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
    x?: string;
    youtube?: string;
    website?: string;
  }

  /**
   * User interface
   */
  export interface Interface {
    backup?: boolean;
    ads?: InterfaceAds;
    avatar?: boolean | string | any;
    created?: Date | FieldValue | String;
    id?: string;
    language?: string;
    links?: InterfaceLinks,
    name?: string;
    firstName?: string;
    abbr?: string;
    lastName?: string;
    path?: string;
    referrer?: string;
    updated?: Date | FieldValue | String;
    url?: string;
    username?: string;
    phone?: string;
    email?: string;
    password?: string;
    role?: string;
    // Use [group] to create / update user group
    group?: string;
    groups?: {
      [key: string]: string | number;
    };
    ping?: any;
    fcm?: string;
    /**
     * Billing Customer ID
     */
    bcId?: string;
    /**
     * Billing Subscription ID
     */
    bsId?: string;
    /**
     * Billing Subscription Item ID to track events
     */
    bsiId?: string;
    /**
     * Billing Subscription Time
     */
    bst?: any;
    /**
     * Billing usage time
     */
    but?: any;
    /**
     * Billing usage quantity
     */
    buq?: number;

    // Accept other keys
    [key: string]: any;
  }

  /**
   * UserHelper
   */
  export class Helper {
    /**
     *
     * @param {any} data
     * @private
     */
    private static hasData(data: any) {
      if (!(data && !data.isEmpty)) {
        throw new Error('Request is empty');
      }
    }

    /**
     * Validate if data object has Phone Or Email
     * @param {any} data
     * @private
     */
    private static hasPhoneOrEmail(data: any) {
      if (!(data && (data.phone || data.email))) {
        throw new Error('Incomplete message data');
      }
    }

    /**
     * Fail if user is unauthenticated
     *
     * @param {any} auth
     * context.auth || request.auth
     */
    public static authenticated = (auth: any) => {
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
    public static token = (request: CallableRequest): string => {
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
     * @return {Promise<Interface>}
     */
    public static create = async (data: Interface): Promise<Interface> => {
      Helper.hasData(data);
      Helper.hasPhoneOrEmail(data);
      let userObject = await this.get(data);
      let user: Interface = data;
      if (userObject) {
        user.id = userObject.uid;
      } else {
        user = await Helper.createUser(data);
      }
      return user;
    };

    /**
     * Create User Document from UserRecord
     * @param {any} user
     * @return {Promise<Interface>}
     */
    public static createDocument = async (user: Interface): Promise<Interface> => {
      const timestamp = FieldValue.serverTimestamp();
      Helper.hasData(user);
      const baseData: Interface = {
        ...user,
        backup: false,
        created: timestamp,
        updated: timestamp,
        id: undefined,
      };
      const db = getFirestore();
      const docRef = db.collection('user').doc(user.id);
      await docRef.set(baseData, {merge: true});
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
    public static onCreate = async (user: UserRecord, mainUrl: string) => {
      let userDoc: Interface = {
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
          userDoc = {...userDoc, ...doc.data() as Interface};
        }
      } catch (e) {
        logger.error(e.toString());
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
        } catch (error) {
          logger.error(error);
        }
      }
      userDoc.id = user.uid;
      return this.createDocument(userDoc);
    };

    /**
     * Validate if user exist
     * @param {any} data
     */
    public static get = async (data: {
      email?: string;
      phone?: string;
      id?: string;
    }): Promise<UserRecord | null> => {
      Helper.hasData(data);
      const hasAnyOption = data.phone || data.email || data.id;
      if (!hasAnyOption) {
        throw new Error('Please enter a any valid options: phone, email or id');
      }
      let _user = null;
      try {
        let identifiers: UserIdentifier[] = [];
        if (data.id) identifiers.push({uid: data.id});
        if (data.email) identifiers.push({email: data.email});
        if (data.phone) identifiers.push({phoneNumber: data.phone});
        const users = await getAuth().getUsers(identifiers);
        if (users.users.length > 0) _user = users.users[0];
      } catch (error) {
        // @ts-ignore
        logger.info(error.message);
      }
      return _user;
    };

    /**
     * Get User Role
     *
     * @param {string} uid
     * @param {string?} group
     */
    public static getRole = async (uid: string, group?: string) => {
      // const errorMessage = 'You don\'t have access to request this action';
      const grouped = group && group.length > 0;
      /**
       * Verify admin access on top level
       */
      const userRecord = await getAuth().getUser(uid);
      const userClaims: any = userRecord.customClaims ?? {};
      let role = userClaims.role ?? null;
      const userDoc: Interface = await FirestoreHelper.getDocument({
        collection: 'user',
        document: uid,
      });
      if (!role) {
        role = userDoc.role;
      }
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
    public static add = async (data: Interface): Promise<Interface> => {
      Helper.hasData(data);
      try {
        const userObject = await this.create(data);
        if (!userObject) throw new Error('Error creating user');
        // Update data in necessary documents to reflect user creation
        await this.roleUpdateCall({
          type: 'add',
          id: userObject.id,
          group: data.group || undefined,
          role: data.role,
        });
        return userObject;
      } catch (error) {
        // @ts-ignore
        throw new Error(error.message);
      }
    };

    /**
     * Validates if user is and admin from role
     * @param {any} options
     * @return {boolean} boolean
     */
    public static isAdmin = (options: {
      group?: string,
      fail?: boolean,
      role: string,
    }): boolean => {
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
    public static remove = async (data: Interface) => {
      Helper.hasData(data);
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
        } else {
          // Remove user document and reference if is not grouped
          await getAuth().deleteUser(data.id);
          const db = getFirestore();
          const refUser = db.collection('user').doc(data.id);
          await refUser.delete();
        }
      } catch (error) {
        // @ts-ignore
        throw new Error(`Error removing user access: ${error.message}`);
      }
    };

    /**
     * Format User Names
     * @param {Interface} data
     * @return {Interface} data
     */
    static formatUserNames = (data: Interface): Interface => {
      const {firstName, lastName} = data;
      const validNameFirst = firstName && firstName.length > 1;
      const validNameLast = lastName && lastName.length > 1;
      let correctNameFirst: string = validNameFirst ? firstName : undefined;
      let correctNameLast: string = validNameLast ? lastName : undefined;
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
      if ((validNameFirst || validNameLast) && !validName) {
        throw new Error('Please add a valid First and Last Name');
      }
      let userData: Interface = {
        ...data,
        // Reset User Name
        firstName: undefined,
        lastName: undefined,
        name: undefined,
        abbr: undefined,
      };
      if (validName) {
        // Format User Name
        const initialNameFirst = correctNameFirst.charAt(0).toUpperCase();
        correctNameFirst = initialNameFirst + correctNameFirst.slice(1);
        const initialNameLast = correctNameLast.charAt(0).toUpperCase();
        correctNameLast = initialNameLast + correctNameLast.slice(1);
        const name = `${correctNameFirst} ${correctNameLast}`;
        const abbr = initialNameFirst + initialNameLast;
        userData.firstName = correctNameFirst;
        userData.lastName = correctNameLast;
        userData.name = name;
        userData.abbr = abbr;
      }
      return userData;
    };

    /**
     * Update User account data
     * @param {Interface} data
     * @param {string} mainUrl
     */
    public static update = async (data: Interface, mainUrl: string) => {
      const timestamp = FieldValue.serverTimestamp();
      const {id, phone, email, avatar, language} = data;
      const db = getFirestore();
      const ref = db.collection('user').doc(id);
      let updateDataFirestore: Interface = {};
      let updateDataUser: any = {};
      const currentUser = await getAuth().getUser(id);
      if (phone && phone !== currentUser.phoneNumber) {
        updateDataUser.phoneNumber = phone;
        updateDataFirestore.phoneNumber = phone;
      }
      if (email && email !== currentUser.email) {
        updateDataUser.email = email;
        updateDataUser.emailVerified = false;
        updateDataFirestore.email = email;
      }
      if (language) updateDataFirestore.language = language;
      const formatNames = this.formatUserNames(data);
      const updateName = formatNames.name !== currentUser.displayName;
      const onboarding: any = {};
      if (updateName) {
        updateDataUser.displayName = formatNames.name;
        updateDataFirestore.name = formatNames.name;
        updateDataFirestore.firstName = formatNames.firstName;
        updateDataFirestore.lastName = formatNames.lastName;
        updateDataFirestore.abbr = formatNames.abbr;
      }
      if (formatNames.name) onboarding.name = true;
      if (avatar) {
        try {
          const imgBuffer = Buffer.from(avatar, 'base64');
          const imageSize = Media.Image.size('standard');
          const imageResizeOptions: Media.InterfaceImageResize = {
            maxHeight: imageSize.height,
            maxWidth: imageSize.width,
            crop: 'entropy',
            input: imgBuffer,
            quality: 90,
            format: 'jpeg',
            contentType: 'image/jpeg',
          };
          const media = await Media.Image.bufferImage(imageResizeOptions);
          const avatarPath = `media/user/${id}/avatar`;
          const avatarUrl = `${mainUrl}/${avatarPath}`;
          await Media.Helper.save({
            media,
            path: avatarPath,
            contentType: 'image/jpeg',
          });
          updateDataFirestore.avatar = avatarPath;
          updateDataUser.photoURL = avatarUrl;
          onboarding.avatar = true;
        } catch (e) {
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
      }, {merge: true});
    };

    /**
     * Update user role
     * @param {any} data
     * @param {string} mainUrl
     */
    public static updateRole = async (data: {
      [key: string]: any,
      group?: string;
      role?: string;
      id?: string;
    }, mainUrl: string) => {
      Helper.hasData(data);
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
      } catch (error) {
        // @ts-ignore
        throw new Error(`Error updating user access: ${error.message}`);
      }
      // Remove avatar first
      delete data.avatar;
      // Update other user data
      await Helper.update(data, mainUrl);
    };

    /**
     * Creates the user
     * @param {Interface} data
     * @return {Promise<Interface>}
     */
    private static createUser = async (data: Interface): Promise<Interface> => {
      Helper.hasData(data);
      Helper.hasPhoneOrEmail(data);
      let userData: any = {};
      if (data.email) userData.email = data.email;
      if (data.phone) userData.phoneNumber = data.phone;
      const formatNames = this.formatUserNames(data);
      let user: Interface = {
        ...formatNames,
        role: 'user',
        group: undefined,
        password: undefined,
      };
      if (!user.name || !user.name.length) {
        throw new Error('First Name and Last Name are required');
      }
      userData.displayName = user.name;
      if (data.password != null && data.password.length > 0) {
        userData.password = data.password;
      }
      const created = await getAuth().createUser(userData);
      user.id = created.uid;
      await this.createDocument(user);
      return user;
    };

    /**
     * Updates fields in a number of documents to reflect an update of a user, such as create or delete
     *
     * @param {any} data
     */
    private static roleUpdateCall = async (data: {
      group?: string,
      id: string,
      role?: string,
      type: 'add' | 'remove',
    }) => {
      if (!data.id) throw new Error('id is required to update user role');
      const timestamp = FieldValue.serverTimestamp();
      const db = getFirestore();
      let updateGroup = null; // Action for the group
      if (data.group && data.group.length == 0) throw new Error('group can\'t be empty for group roles');
      const grouped = data.group && data.group.length > 0;
      const refUser = db.collection('user').doc(data.id);
      const _role = data.role ?? 'user';
      const userRecord = await getAuth().getUser(data.id);
      let userData: any = {
        backup: false,
        updated: timestamp,
        created: timestamp,
      };
      const userDoc = await FirestoreHelper.getDocument({
        collection: 'user',
        document: data.id,
      });
      userData.created = userDoc.created ?? timestamp;
      let userClaims: any = userRecord.customClaims ?? {};
      let updateClaims = false;
      if (!grouped) {
        /**
         * Only update user custom claims `role` key on admin level.
         * Collection level users should not use custom claims to set the `role` key,
         * or this value will overwrite the admin level users, and you'll have security issues.
         */
        if (data.type === 'remove') {
          delete userClaims.role;
        } else {
          userClaims = {...userClaims, role: _role};
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
      await refUser.set(userData, {merge: true});
      /**
       * Update custom claims
       */
      let collectionClaims: any = null;
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
  }
}
