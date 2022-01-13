/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import admin from 'firebase-admin';
import functions from 'firebase-functions';
/**
 * UserHelper
 */
export declare class UserHelper {
    firebaseConfig: any;
    isBeta: boolean;
    mainUrl: string;
    /**
     * @param {any} config
     */
    constructor(config?: {
        firebaseConfig?: any;
        isBeta?: boolean;
        mainUrl?: string;
    });
    /**
     *
     * @param {any} data
     * @private
     */
    private static hasData;
    /**
     * Validate if data object has Phone Or Email
     * @param {any} data
     * @private
     */
    private static hasPhoneOrEmail;
    /**
     * Fail if user is unauthenticated
     *
     * @param {functions.https.CallableContext} context
     */
    authenticated: (context: functions.https.CallableContext) => void;
    /**
     * Gets the user object with email or phone number or create the user if not exists
     * @param {any} data
     * @return {Promise<any>}
     */
    create: (data: {
        [key: string]: any;
        email?: string;
        phoneNumber?: string;
    }) => Promise<import("firebase-admin/lib/auth/user-record").UserRecord>;
    /**
     * Create User Document from UserRecord
     * @param {any} user
     */
    createDocument: (user: any) => Promise<void>;
    /**
     * Validate if user exist
     * @param {any} data
     */
    get: (data: {
        [key: string]: any;
        email?: string;
        phoneNumber?: string;
        uid?: string;
    }) => Promise<admin.auth.UserRecord | null>;
    /**
     * Get User Role
     *
     * @param {string} uid
     * @param {any} data
     */
    getRole: (uid: string, data: {
        collection?: string;
        document?: string;
    }) => Promise<any>;
    /**
     * User invitation function, it listens for a new connection-invite document creation, and creates the user
     * @param {any} data
     */
    invite: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        document?: string;
        role?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Validates if user is and admin from role
     * @param {any} options
     * @return {boolean} boolean
     */
    isAdmin: (options: {
        collection?: boolean;
        fail?: boolean;
        role: string;
    }) => boolean;
    /**
     * Remove a user
     * @param {any} data
     */
    remove: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        document?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Update User
     * @param {any} options
     */
    update: (options: {
        data: any;
        uid: string;
    }) => Promise<void>;
    /**
     * Update user role
     * @param {any} data
     */
    updateRole: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        document?: string;
        role?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Creates the user
     * @param {any} data
     * @return {Promise<admin.auth.UserRecord>}
     */
    private createUser;
    /**
     * Updates fields in a number of documents to reflect an update of a user, such as create or delete
     *
     * @param {any} data
     */
    private roleUpdateCall;
}
