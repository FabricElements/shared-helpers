import { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
/**
 * User namespace
 */
export declare namespace User {
    /**
     * Ad network configuration for a user account.
     * Currently supports Google AdSense client and slot identifiers.
     */
    interface InterfaceAds {
        adsense?: {
            /** Google AdSense publisher client ID (e.g., `'ca-pub-XXXXXXXXXXXXXXXX'`). */
            client: string;
            /** Google AdSense ad slot ID for the placement unit. */
            slot: string;
        };
    }
    /**
     * User links
     */
    interface InterfaceLinks {
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
    interface Interface {
        backup?: boolean;
        ads?: InterfaceAds;
        avatar?: string;
        created?: Date | FieldValue | string;
        id?: string;
        language?: string;
        country?: string;
        links?: InterfaceLinks;
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
    class Helper {
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
        static authenticated: (auth: any) => void;
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
        static token: (request: CallableRequest) => string;
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
        static create: (data: Interface) => Promise<Interface>;
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
        static createDocument: (user: Interface) => Promise<Interface>;
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
        static onCreate: (user: UserRecord, mainUrl: string) => Promise<Interface>;
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
        static get: (data: {
            email?: string;
            phone?: string;
            id?: string;
        }) => Promise<UserRecord | null>;
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
        static getRole: (uid: string, group?: string) => Promise<string>;
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
        static add: (data: Interface) => Promise<Interface>;
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
        static isAdmin: (options: {
            group?: string;
            fail?: boolean;
            role: string;
        }) => boolean;
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
        static remove: (data: Interface) => Promise<void>;
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
        static formatUserNames: (data: Interface) => Interface;
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
        static update: (data: Interface, mainUrl: string) => Promise<void>;
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
        static updateRole: (data: {
            [key: string]: any;
            group?: string;
            role?: string;
            id?: string;
        }, mainUrl: string) => Promise<void>;
        /**
         * Asserts that the supplied data object is non-null and non-empty.
         *
         * @param {object|null} data - The data object to validate.
         * @throws {Error} When `data` is `null`, `undefined`, or has no own enumerable keys.
         */
        private static hasData;
        /**
         * Asserts that the data object contains at least a `phone` or `email` field.
         *
         * @param {any} data - The data object to check.
         * @throws {Error} When neither `phone` nor `email` is present and truthy.
         */
        private static hasPhoneOrEmail;
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
        private static createUser;
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
        private static roleUpdateCall;
    }
}
