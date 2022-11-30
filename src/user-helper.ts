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

const firestore = new FirestoreHelper();

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
   * @param {CallableRequest} request
   */
  public authenticated = (request: CallableRequest) => {
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
  public token = (request: CallableRequest): string => {
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
    group?: string;
    groupId?: string;
  }) => {
    // const errorMessage = 'You don\'t have access to request this action';
    UserHelper.hasData(data);
    const grouped = data.group && data.groupId;
    /**
     * Verify admin access on top level
     */
    const userRecord = await getAuth().getUser(id);
    const userClaims: any = userRecord.customClaims ?? {};
    let role = userClaims.role ?? null;
    if (!role) {
      const userDoc: InterfaceUser = await firestore.getDocument({
        collection: 'user',
        document: id,
      });
      role = userDoc.role;
    }
    if (grouped && (!role || role === 'user')) {
      /**
       * Verify admin access on collection level
       */
      const db = getFirestore();
      const ref = db.collection(data.group).doc(data.groupId);
      const snap = await ref.get();
      const _data: any = snap.data();
      if (!_data) {
        throw new Error(`Not found ${data.group}/${data.groupId}`);
      }
      const _roleInternal = Object.prototype.hasOwnProperty.call(_data, 'roles') && Object.prototype.hasOwnProperty.call(_data.roles, id) ? _data.roles[id] : null;
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
  public invite = async (data: InterfaceUser) => {
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
        groupId: data.groupId || undefined,
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
    group?: boolean,
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
      // Update the necessary documents to delete the user
      await this.roleUpdateCall({
        type: 'remove',
        id: data.id,
        group: data.group || undefined,
        groupId: data.groupId || undefined,
      });
    } catch (error) {
      // @ts-ignore
      throw new Error(`Error removing user access: ${error.message}`);
    }
  };

  /**
   * Update User
   * @param {any} options
   */
  public update = async (options: { data: InterfaceUser, id: string }) => {
    const timestamp = FieldValue.serverTimestamp();
    const imageHelper = new ImageHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    const mediaHelper = new MediaHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    const {id, data} = options;
    let updateUserObject = false;
    const {firstName, lastName, avatar} = data;
    const validNameFirst = firstName && firstName.length > 2;
    const validNameLast = lastName && lastName.length > 2;
    let correctNameFirst: string = firstName && firstName.length > 2 ? firstName : undefined;
    let correctNameLast: string = lastName && lastName.length > 2 ? lastName : undefined;
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
    let updateDataFirestore: any = {};
    let updateDataUser: any = {};
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
      const imageResizeOptions: InterfaceImageResize = {
        maxHeight: imageSize.height,
        maxWidth: imageSize.width,
        crop: 'entropy',
        input: imgBuffer,
        quality: 90,
        format: 'jpeg',
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
    updateDataFirestore = {...updateDataFirestore, ..._data}; // Merge input data
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
    }, {merge: true});
  };

  /**
   * Update user role
   * @param {any} data
   */
  public updateRole = async (data: {
    [key: string]: any,
    group?: string;
    groupId?: string;
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
        groupId: data.groupId || undefined,
        role: data.role,
      });
    } catch (error) {
      // @ts-ignore
      throw new Error(`Error updating user access: ${error.message}`);
    }
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
      groupId: undefined,
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
    groupId?: string,
    id: string,
    role?: string,
    type: 'add' | 'remove',
  }) => {
    if (!data.id) {
      throw new Error('id is required to update user role');
    }
    const timestamp = FieldValue.serverTimestamp();
    const db = getFirestore();
    const batch = db.batch();
    // let clickerInternal = false; // Adds or removes a user as being a clicker
    let updateGroup = null; // Action for the group
    let userUpdate = null; // Action for the user
    let userData: any = {
      backup: false,
      updated: timestamp,
    };
    if ((data.group || data.groupId) && !(data.group && data.groupId)) {
      throw new Error('group and groupId are required for group roles');
    }
    const grouped = data.group && data.groupId;
    const refUser = db.collection('user').doc(data.id);
    const _role = data.role ?? 'user';
    const userRecord = await getAuth().getUser(data.id);
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
    let roles = {};
    switch (data.type) {
      case 'add':
        updateGroup = {
          [data.groupId]: _role,
        };
        userUpdate = FieldValue.arrayUnion(...[data.id]);
        // clickerInternal = true;
        roles = {
          [data.id]: _role,
        };
        break;
      case 'remove':
        updateGroup = {
          [data.groupId]: FieldValue.delete(),
        };
        userUpdate = FieldValue.arrayRemove(...[data.id]);
        // clickerInternal = false;
        roles = {
          [data.id]: FieldValue.delete(),
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
      }, {merge: true});
      // Update user
      userData = {
        ...userData,
        [data.group]: updateGroup,
      };
    }
    if (!grouped) {
      userData = {
        ...userData,
        role: data.type === 'remove' ? FieldValue.delete() : _role,
      };
    }
    batch.set(refUser, userData, {merge: true});
    await batch.commit();

    /**
     * Update custom claims
     */
    let collectionClaims: any = null;
    if (grouped) {
      const userDoc: InterfaceUser = await firestore.getDocument({
        collection: 'user',
        document: data.id,
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
      await getAuth().setCustomUserClaims(data.id, userClaims);
      await getAuth().revokeRefreshTokens(data.id);
    }
    return;
  };
}
