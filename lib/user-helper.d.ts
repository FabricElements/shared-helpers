/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { UserRecord } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { InterfaceUser } from './interfaces.js';
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
     * @param {any} auth
     * context.auth || request.auth
     */
    authenticated: (auth: any) => void;
    /**
     * Return user token from context
     *
     * @param {CallableRequest} request
     * @return {string}
     */
    token: (request: CallableRequest) => string;
    /**
     * Gets the user object with email or phone number or create the user if not exists
     * @param {any} data
     * @return {Promise<InterfaceUser>}
     */
    create: (data: InterfaceUser) => Promise<InterfaceUser>;
    /**
     * Create User Document from UserRecord
     * @param {any} user
     * @return {Promise<InterfaceUser>}
     */
    createDocument: (user: InterfaceUser) => Promise<InterfaceUser>;
    /**
     * Validate if user exist
     * @param {any} data
     */
    get: (data: {
        email?: string;
        phone?: string;
        id?: string;
    }) => Promise<UserRecord | null>;
    /**
     * Get User Role
     *
     * @param {string} id
     * @param {any} data
     */
    getRole: (id: string, data: {
        id?: string;
        group?: string;
    }) => Promise<any>;
    /**
     * User invitation function, it listens for a new connection-invite document creation, and creates the user
     * @param {any} data
     */
    add: (data: InterfaceUser) => Promise<void>;
    /**
     * Validates if user is and admin from role
     * @param {any} options
     * @return {boolean} boolean
     */
    isAdmin: (options: {
        group?: string;
        fail?: boolean;
        role: string;
    }) => boolean;
    /**
     * Remove a user
     * @param {any} data
     */
    remove: (data: InterfaceUser) => Promise<void>;
    /**
     * Update User account data
     * @param {InterfaceUser} data
     */
    update: (data: InterfaceUser) => Promise<void>;
    /**
     * Update user role
     * @param {any} data
     */
    updateRole: (data: {
        [key: string]: any;
        group?: string;
        role?: string;
        id?: string;
    }) => Promise<void>;
    /**
     * Creates the user
     * @param {InterfaceUser} data
     * @return {Promise<InterfaceUser>}
     */
    private createUser;
    /**
     * Updates fields in a number of documents to reflect an update of a user, such as create or delete
     *
     * @param {any} data
     */
    private roleUpdateCall;
}
