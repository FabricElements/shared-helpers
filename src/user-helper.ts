/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {UserIdentifier, UserRecord} from 'firebase-admin/auth';
import {getAuth} from 'firebase-admin/auth';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {https} from 'firebase-functions/v2';
import type {CallableRequest} from 'firebase-functions/v2/https';
import {FirestoreHelper} from './firestore-helper.js';
import {ImageHelper} from './image-helper.js';
import type {InterfaceImageResize, InterfaceUser} from './interfaces.js';
import {MediaHelper} from './media-helper.js';

/**
 * UserHelper
 */
export class UserHelper {
  firebaseConfig: any;
  isBeta: boolean;
  mainUrl: string;

  /**
   * @param {any} config
   */
  constructor(config?: {
    firebaseConfig?: any;
    isBeta?: boolean,
    mainUrl?: string;
  }) {
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
  public authenticated = (auth: any) => {
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
  public token = (request: CallableRequest): string => {
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
  public create = async (data: InterfaceUser): Promise<InterfaceUser> => {
    UserHelper.hasData(data);
    UserHelper.hasPhoneOrEmail(data);
    let userObject = await this.get(data);
    let user: InterfaceUser = data;
    if (userObject) {
      user.id = userObject.uid;
    } else {
      user = await this.createUser(data);
    }
    return user;
  };

  /**
   * Create User Document from UserRecord
   * @param {any} user
   * @return {Promise<InterfaceUser>}
   */
  public createDocument = async (user: InterfaceUser): Promise<InterfaceUser> => {
    const timestamp = FieldValue.serverTimestamp();
    UserHelper.hasData(user);
    const baseData: InterfaceUser = {
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
   * Validate if user exist
   * @param {any} data
   */
  public get = async (data: {
    email?: string;
    phone?: string;
    id?: string;
  }): Promise<UserRecord | null> => {
    UserHelper.hasData(data);
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
  public getRole = async (id: string, data: {
    id?: string;
    group?: string;
  }) => {
    // const errorMessage = 'You don\'t have access to request this action';
    UserHelper.hasData(data);
    const grouped = data.group && data.group.length > 0;
    /**
     * Verify admin access on top level
     */
    const userRecord = await getAuth().getUser(id);
    const userClaims: any = userRecord.customClaims ?? {};
    let role = userClaims.role ?? null;
    const userDoc: InterfaceUser = await FirestoreHelper.getDocument({
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
  public add = async (data: InterfaceUser) => {
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
  public isAdmin = (options: {
    group?: string,
    fail?: boolean,
    role: string,
  }): boolean => {
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
  public remove = async (data: InterfaceUser) => {
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
   * Update User account data
   * @param {InterfaceUser} data
   */
  public update = async (data: InterfaceUser) => {
    const timestamp = FieldValue.serverTimestamp();
    const {id, phone, email, firstName, lastName, avatar} = data;
    const imageHelper = new ImageHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    const mediaHelper = new MediaHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    const db = getFirestore();
    const ref = db.collection('user').doc(id);
    let updateDataFirestore: InterfaceUser = {};
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
    const validNameFirst = firstName && firstName.length > 0;
    const validNameLast = lastName && lastName.length > 0;
    let correctNameFirst: string = validNameFirst ? firstName : undefined;
    let correctNameLast: string = validNameLast ? lastName : undefined;
    const updateName = correctNameFirst && correctNameLast;
    if (firstName && !validNameFirst) {
      throw new Error('First Name must be at least 3 characters');
    }
    if (lastName && !validNameLast) {
      throw new Error('Last Name must be at least 3 characters');
    }
    const onboarding: any = {};
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
      updateDataUser.displayName = name;
      updateDataFirestore.name = name;
      updateDataFirestore.firstName = correctNameFirst;
      updateDataFirestore.lastName = correctNameLast;
      updateDataFirestore.abbr = abbr;
      onboarding.name = true;
    }
    if (avatar) {
      try {
        const imgBuffer = Buffer.from(avatar, 'base64');
        const imageSize = imageHelper.size('standard');
        const imageResizeOptions: InterfaceImageResize = {
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
        onboarding.avatar = true;
      } catch (e) {
        //
      }
    }
    if (!(Object.keys(updateDataUser).length && Object.keys(updateDataFirestore).length)) {
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
   */
  public updateRole = async (data: {
    [key: string]: any,
    group?: string;
    role?: string;
    id?: string;
  }) => {
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
    } catch (error) {
      // @ts-ignore
      throw new Error(`Error updating user access: ${error.message}`);
    }
    // Remove avatar first
    delete data.avatar;
    // Update other user data
    await this.update(data);
  };

  /**
   * Creates the user
   * @param {InterfaceUser} data
   * @return {Promise<InterfaceUser>}
   */
  private createUser = async (data: InterfaceUser): Promise<InterfaceUser> => {
    UserHelper.hasData(data);
    UserHelper.hasPhoneOrEmail(data);
    let userData: any = {};
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
    const user: InterfaceUser = {
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
  private roleUpdateCall = async (data: {
    group?: string,
    id: string,
    role?: string,
    type: 'add' | 'remove',
  }) => {
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
