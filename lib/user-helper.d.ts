/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
export declare class UserHelper {
    /**
     * Constructor
     */
    constructor();
    private static hasData;
    private static hasPhoneOrEmail;
    /**
     * Gets the user object with email or phone number or create the user if not exists
     * @param data
     * @returns {Promise<any>}
     */
    create: (data: {
        [key: string]: any;
        email?: string;
        phoneNumber?: string;
    }) => Promise<admin.auth.UserRecord>;
    /**
     * Create User Document from UserRecord
     * @param user
     */
    createDocument: (user: any) => Promise<void>;
    /**
     * Validate if user exist
     * @param data
     */
    get: (data: {
        [key: string]: any;
        email?: string;
        phoneNumber?: string;
        uid?: string;
    }) => Promise<admin.auth.UserRecord | null>;
    /**
     * Get User Role
     * @param uid
     * @param data
     */
    getRole: (uid: string, data: {
        collection?: string;
        document?: string;
    }) => Promise<any>;
    /**
     * User invitation function, it listens for a new connection-invite document creation, and creates the user
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
     * @param options
     */
    isAdmin: (options: {
        collection?: boolean;
        fail?: boolean;
        role: string;
    }) => boolean;
    /**
     * Remove a user
     */
    remove: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        document?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Update user role
     */
    updateRole: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        document?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Creates the user
     * @param {any} data
     * @returns {Promise<admin.auth.UserRecord>}
     */
    private createUser;
    /**
     * Updates fields in a number of documents to reflect an update of a user, such as create or delete
     *
     * @param data
     */
    private roleUpdateCall;
}
