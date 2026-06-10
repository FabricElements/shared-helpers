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
  /**
   * Ad network configuration for a user account.
   * Currently supports Google AdSense client and slot identifiers.
   */
  export interface InterfaceAds {
    adsense?: {
      /** Google AdSense publisher client ID (e.g., `'ca-pub-XXXXXXXXXXXXXXXX'`). */
      client: string;
      /** Google AdSense ad slot ID for the placement unit. */
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
    avatar?: string;
    created?: Date | FieldValue | string;
    id?: string;
    language?: string;
    country?: string;
    links?: InterfaceLinks,
    name?: string;
    firstName?: string;
    abbr?: string;
    lastName?: string;
    path?: string;
    referrer?: string;
    updated?: Date | FieldValue | string;
    url?: string;
    username?: string;
    phone?: string;
    email?: string;
    password?: string;
    role?: string;
    /**
     * The user active account
     */
    account?: string;
    /**
     * Use [group] to create / update user group
     */
    group?: string;
    groups?: Record<string, string | number>;
    ping?: any;
    fcm?: string | string[];
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

    /**
     * Accept other keys
     */
    [key: string]: any;
  }

  /**
   * UserHelper
   */
  export class Helper {
    /**
     * Throws a Firebase `HttpsError` with code `'unauthenticated'` when the
     * caller has no auth context, enforcing authentication on callable functions.
     *
     * Pass `context.auth` or `request.auth` from the Cloud Function invocation.
     * This method is a guard — it has no return value; it either succeeds silently
     * or throws.
     *
     * @param {any} auth - The authentication context object from the callable request
     *   (`context.auth` or `request.auth`).  A falsy value triggers the error.
     */
    public static authenticated = (auth: any) => {
      if (!auth) {
        throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
      }
    };

    /**
     * Extracts the bearer token from the `Authorization` header of a callable request.
     *
     * Delegates to `authenticated` first to ensure the request has an auth context,
     * then parses the `Authorization` header to extract the raw token string.
     *
     * @param {CallableRequest} request - The Firebase callable function request object.
     * @returns {string} The raw bearer token string extracted from the `Authorization` header.
     * @throws {https.HttpsError} With code `'unauthenticated'` when the auth context is absent,
     *   the `Authorization` header is missing, or the token is shorter than 5 characters.
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
     * Returns an existing user record or creates a new one when none is found.
     *
     * Looks up the user by email or phone number via `Helper.get`.  If a matching
     * Firebase Auth record exists, the corresponding Firestore `user` document is
     * fetched and returned.  Otherwise a new Firebase Auth user and Firestore
     * document are created via `Helper.createUser`.
     *
     * @param {Interface} data - User data containing at least `email` or `phone`, and the
     *   first/last name fields required by `createUser`.
     * @returns {Promise<Interface>} A Promise resolving to the existing or newly created user
     *   data object.
     */
    public static create = async (data: Interface): Promise<Interface> => {
      Helper.hasData(data);
      Helper.hasPhoneOrEmail(data);
      let userObject = await this.get(data);
      let user: Interface;
      if (userObject) {
        user = await FirestoreHelper.Helper.getDocument({
          collection: 'user',
          document: userObject.uid,
        }) as Interface;
      } else {
        user = await Helper.createUser(data);
      }
      return user;
    };

    /**
     * Creates a Firestore `user` document from user data, merging with any existing document.
     *
     * Writes to the `user/{user.id}` Firestore path using `set` with `merge: true`,
     * injecting server-side timestamps for `created`, `updated`, and `ping` when not
     * already set.  Returns the merged data object with the document ID attached.
     *
     * @param {Interface} user - User data object including a required `id` field
     *   corresponding to the Firebase Auth UID.
     * @returns {Promise<Interface>} A Promise resolving to the written user data with `id` included.
     */
    public static createDocument = async (user: Interface): Promise<Interface> => {
      const timestamp = FieldValue.serverTimestamp();
      Helper.hasData(user);
      const baseData: Interface = {
        ...user,
        backup: false,
        created: user.created ?? timestamp,
        updated: user.updated ?? timestamp,
        ping: timestamp,
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
     * Firebase Auth `onCreate` trigger handler — populates the initial Firestore user document.
     *
     * Merges any pre-existing `user/{uid}` Firestore data with the Auth record's email and
     * phone, assigns a default role of `'user'`, and sets initial onboarding flags.  If the
     * new user has a `photoURL`, the image is downloaded from that URL and saved to
     * `media/user/{uid}/avatar` in Firebase Storage, then the Auth record's `photoURL` is
     * updated to the project's internal media URL.
     *
     * @param {UserRecord} user - The Firebase Auth `UserRecord` provided by the `onCreate` trigger.
     * @param {string} mainUrl - The base public URL of the project (e.g., `'https://example.web.app'`),
     *   used to construct the internal avatar URL stored on the Auth record.
     * @returns {Promise<Interface>} A Promise resolving to the newly created/merged user data object.
     */
    public static onCreate = async (user: UserRecord, mainUrl: string): Promise<Interface> => {
      let userDoc: Interface = {
        email: user.email ?? undefined,
        phone: user.phoneNumber ?? undefined,
        role: 'user',
        onboarding: {
          name: false,
          avatar: false,
          main: false,
        },
      };
      try {
        const ref = getFirestore().collection('user').doc(user.uid);
        const doc = await ref.get();
        if (doc.exists) {
          userDoc = {...userDoc, ...doc.data() as Interface};
        }
      } catch (e) {
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
        } catch (error) {
          logger.error(error);
        }
      }
      userDoc.id = user.uid;
      return this.createDocument(userDoc);
    };

    /**
     * Looks up a Firebase Auth user by UID, email, or phone number.
     *
     * Refreshes the corresponding Firestore `user` document with the latest
     * email and phone from the Auth record when a match is found.  Returns
     * `null` when no matching Auth user exists.
     *
     * @param {object} data - Lookup criteria; at least one field is required.
     * @param {string} [data.email] - Email address to search by.
     * @param {string} [data.phone] - Phone number to search by (E.164 format).
     * @param {string} [data.id] - Firebase Auth UID to search by.
     * @returns {Promise<UserRecord|null>} A Promise resolving to the `UserRecord` when found,
     *   or `null` when no match exists.
     * @throws {Error} When none of `email`, `phone`, or `id` are provided.
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
        // @ts-expect-error Error requires description
        logger.info(error.message);
      }
      // Recreate document with updated email and phone number
      if (_user) {
        await this.createDocument({
          id: _user.uid,
          email: _user.email ?? FieldValue.delete(),
          phone: _user.phoneNumber ?? FieldValue.delete(),
        });
      }
      return _user;
    };

    /**
     * Resolves the effective role string for a user, checking custom claims and Firestore.
     *
     * Retrieves the user's Firebase Auth custom claims and Firestore document to determine
     * their role.  When `group` is supplied and the top-level role is `'user'` or absent,
     * the group-specific role from `user.groups[group]` is returned prefixed with the group
     * name (e.g., `'myGroup-admin'`).  Falls back to `'user'` when no role is found.
     *
     * @param {string} uid - Firebase Auth UID of the user whose role to resolve.
     * @param {string} [group] - Optional collection-group identifier used to look up
     *   a group-scoped role from the user's `groups` map.
     * @returns {Promise<string>} A Promise resolving to the effective role string.
     */
    public static getRole = async (uid: string, group?: string): Promise<string> => {
      // const errorMessage = 'You don\'t have access to request this action';
      const grouped = group && group.length > 0;
      /**
       * Verify admin access on top level
       */
      const userRecord = await getAuth().getUser(uid);
      const userClaims: Record<string, any> = userRecord.customClaims ?? {};
      const userDoc: Interface = await FirestoreHelper.Helper.getDocument({
        collection: 'user',
        document: uid,
      });
      let role: string | null = userClaims.role ?? userDoc.role;
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
     * Creates or retrieves a user, then sets their role via `roleUpdateCall`.
     *
     * Combines `Helper.create` with a role assignment so that an invitation flow
     * results in a fully provisioned user with the correct role applied atomically.
     *
     * @param {Interface} data - User data including at least `email` or `phone`, name fields,
     *   and an optional `group` and `role` for the role assignment.
     * @returns {Promise<Interface>} A Promise resolving to the created or existing user data object.
     * @throws {Error} When user creation fails or `roleUpdateCall` rejects.
     */
    public static add = async (data: Interface): Promise<Interface> => {
      Helper.hasData(data);
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
    };

    /**
     * Determines whether a role string represents an administrative level.
     *
     * When `group` is provided, checks that `role` ends with `'admin'` or `'owner'`
     * (group-scoped admin check).  When `group` is absent, checks for an exact
     * match of `'admin'`.  If the check fails and `fail` is `true`, an `Error` is
     * thrown instead of returning `false`.
     *
     * @param {object} options - Admin check options.
     * @param {string} [options.group] - Optional group identifier for a group-scoped check.
     * @param {boolean} [options.fail] - When `true`, throws instead of returning `false`.
     * @param {string} options.role - The role string to evaluate.
     * @returns {boolean} `true` when the role satisfies the admin condition, `false` otherwise.
     * @throws {Error} When the role is not admin and `options.fail` is `true`.
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
     * Removes a user or their group membership depending on the `group` field.
     *
     * When `data.group` is set, only the group-scoped role is removed via
     * `roleUpdateCall`.  When `group` is absent, the Firebase Auth account and
     * the `user/{id}` Firestore document are both permanently deleted.
     *
     * @param {Interface} data - User data; `data.id` is required.  Supply `data.group`
     *   to restrict deletion to a group-level role rather than the whole account.
     * @returns {Promise<void>} A Promise that resolves when the removal is complete.
     * @throws {Error} When `data.id` is missing or the underlying Auth/Firestore
     *   delete operations fail.
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
      } catch (error: any) {
        throw `Error removing user access: ${error.message ?? error.toString()}`;
      }
    };

    /**
     * Formats and validates first and last name fields, returning the updated user object.
     *
     * Trims leading/trailing whitespace, capitalises the first letter of each name,
     * validates minimum length (2 characters), and assembles the full `name` and
     * two-initial `abbr` fields.  Throws descriptive errors for invalid inputs so
     * callers receive actionable feedback before any Firestore write occurs.
     *
     * @param {Interface} data - User data containing `firstName` and `lastName` fields.
     * @returns {Interface} The input data object augmented with validated `firstName`,
     *   `lastName`, `name`, and `abbr` fields.
     * @throws {Error} When either name is shorter than 2 characters or when both
     *   first and last names are not provided.
     */
    static formatUserNames = (data: Interface): Interface => {
      const {firstName, lastName} = data;
      const validNameFirst = firstName && firstName.length > 1;
      const validNameLast = lastName && lastName.length > 1;
      let correctNameFirst: string = validNameFirst ? firstName : undefined;
      let correctNameLast: string = validNameLast ? lastName : undefined;
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
      if (!validName) throw new Error('Please add a valid First and Last Name');

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
      } as Interface;
    };

    /**
     * Updates Firebase Auth and Firestore with changed user profile fields.
     *
     * Selectively updates phone, email, display name (derived from `firstName`/`lastName`),
     * language, country, and avatar.  The avatar is accepted as a Base64-encoded string,
     * which is decoded, resized to the `standard` image size, and saved to
     * `media/user/{id}/avatar` in Firebase Storage before the Firestore document is updated.
     * Throws when no changed fields are detected.
     *
     * @param {Interface} data - Updated user fields; must include `id`.
     * @param {string} mainUrl - Base public URL of the project used to construct the
     *   avatar public URL stored on the Auth record.
     * @returns {Promise<void>} A Promise that resolves when both Auth and Firestore writes
     *   have completed.
     * @throws {Error} When no detectable changes are present in `data`.
     */
    public static update = async (data: Interface, mainUrl: string) => {
      const timestamp = FieldValue.serverTimestamp();
      const {id, phone, email, avatar, language, country} = data;
      const db = getFirestore();
      const ref = db.collection('user').doc(id);
      let updateDataFirestore: Interface = {};
      let updateDataUser: {
        phoneNumber?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoURL?: string;
      } = {};
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
      if (language) updateDataFirestore.language = language;
      if (country) updateDataFirestore.country = country;
      let onboarding: {
        name?: boolean,
        avatar?: boolean,
      } = {};
      // Update User Name
      if (data.firstName || data.lastName) {
        const formatNames = this.formatUserNames(data);
        const updateName = formatNames.name !== currentUser.displayName;
        if (updateName) {
          updateDataUser.displayName = formatNames.name;
          updateDataFirestore.name = formatNames.name;
          updateDataFirestore.firstName = formatNames.firstName;
          updateDataFirestore.lastName = formatNames.lastName;
          updateDataFirestore.abbr = formatNames.abbr;
          onboarding.name = true;
        }
      }
      // Update Avatar
      if (avatar) {
        try {
          const imgBuffer = Buffer.from(avatar, 'base64');
          const imageSize = Media.Image.sizeObjectFromImageSize(Media.ImageSize.standard);
          const imageResizeOptions: Media.InterfaceImageResize = {
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
        } catch (e) {
          //
        }
      }
      if (!(Object.keys(updateDataUser).length || Object.keys(updateDataFirestore).length)) {
        throw new Error('No changes detected');
      }
      updateDataFirestore.onboarding = Object.keys(onboarding).length ? onboarding : undefined;
      await getAuth().updateUser(id, updateDataUser);
      await ref.set({
        ...updateDataFirestore,
        updated: timestamp,
        backup: false,
      }, {merge: true});
    };

    /**
     * Updates the role for a user (globally or within a group) and syncs other profile fields.
     *
     * Delegates role assignment to `roleUpdateCall` and then calls `Helper.update` to
     * apply any other profile changes in `data`.  The `avatar` field is stripped before
     * calling `update` to prevent accidental overwrite.
     *
     * @param {object} data - Role update payload; `data.id` is required.
     * @param {string} [data.group] - Optional group identifier for a group-scoped role update.
     * @param {string} [data.role] - The new role string to assign.
     * @param {string} [data.id] - Firebase Auth UID of the target user.
     * @param {string} mainUrl - Base public URL of the project, forwarded to `Helper.update`.
     * @returns {Promise<void>} A Promise that resolves when role and profile updates complete.
     * @throws {Error} When `data.id` is missing or role assignment fails.
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
        // Update the necessary documents to reflect user role update
        await this.roleUpdateCall({
          type: 'add',
          id: data.id,
          group: data.group || undefined,
          role: data.role,
        });
      } catch (error: any) {
        throw `Error updating user access: ${error.message}`;
      }
      // Remove avatar first
      delete data.avatar;
      // Update other user data
      await Helper.update(data, mainUrl);
    };

    /**
     * Asserts that the supplied data object is non-null and non-empty.
     *
     * @param {object|null} data - The data object to validate.
     * @throws {Error} When `data` is `null`, `undefined`, or has no own enumerable keys.
     */
    private static hasData(data: object | null) {
      if (!(data && Object.keys(data).length > 0)) {
        throw new Error('Request is empty');
      }
    }

    /**
     * Asserts that the data object contains at least a `phone` or `email` field.
     *
     * @param {any} data - The data object to check.
     * @throws {Error} When neither `phone` nor `email` is present and truthy.
     */
    private static hasPhoneOrEmail(data: any) {
      if (!(data && (data.phone || data.email))) {
        throw new Error('Incomplete message data');
      }
    }

    /**
     * Creates a Firebase Auth user account and the corresponding Firestore document.
     *
     * Validates input data, formats names via `formatUserNames`, and calls
     * `getAuth().createUser` with the prepared payload.  The resulting Auth UID is
     * written to the Firestore `user` collection via `createDocument`.
     *
     * @param {Interface} data - New user data; must include `email` or `phone`,
     *   `firstName`, and `lastName`.
     * @returns {Promise<Interface>} A Promise resolving to the newly created user data object
     *   with the Firebase Auth UID set as `id`.
     * @throws {Error} When required name fields are missing or the Auth creation fails.
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
      if (!user.name?.length) {
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
     * Applies a role change (add or remove) across Firebase Auth custom claims and Firestore.
     *
     * Updates the `user/{id}` Firestore document and the user's Auth custom claims
     * atomically.  For non-grouped roles, the `role` custom claim is set or deleted.
     * For group-scoped roles, the `groups` map on both the Firestore document and
     * custom claims is updated, preserving other group memberships.
     *
     * @param {object} data - Role update descriptor.
     * @param {string} [data.group] - Optional group identifier; when provided the update
     *   targets the `groups[group]` field rather than the top-level `role`.
     * @param {string} data.id - Firebase Auth UID of the target user (required).
     * @param {string} [data.role] - Role string to assign; defaults to `'user'`.
     * @param {'add'|'remove'} data.type - Whether to add or remove the role.
     * @returns {Promise<void>} A Promise that resolves when Firestore and Auth claims
     *   are fully updated.
     * @throws {Error} When `data.id` is missing, `data.group` is empty, or `data.type`
     *   is not `'add'` or `'remove'`.
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
      if (data.group && data.group.length == 0) throw new Error('group can\'t be empty for group roles');
      const grouped = data.group && data.group.length > 0;
      const refUser = db.collection('user').doc(data.id);
      const _role = data.role ?? 'user';
      const userRecord = await getAuth().getUser(data.id);
      let userData: any = {
        backup: false,
        updated: timestamp,
        created: timestamp,
        email: userRecord.email ?? FieldValue.delete(),
        phone: userRecord.phoneNumber ?? FieldValue.delete(),
      };
      const userDoc = await FirestoreHelper.Helper.getDocument({
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
      let updateGroup: any; // Action for the group
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
      let collectionClaims: any;
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
        // await getAuth().revokeRefreshTokens(data.id);
      }
    };
  }
}
