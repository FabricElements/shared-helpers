/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
/**
 * User namespace
 */
export declare namespace User {
    interface InterfaceUserAds {
        adsense?: {
            client: string;
            slot: string;
        };
    }
    interface InterfaceUserLinks {
        behance?: string;
        dribbble?: string;
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        tiktok?: string;
        twitter?: string;
        website?: string;
        youtube?: string;
    }
    interface InterfaceUser {
        backup?: boolean;
        ads?: InterfaceUserAds;
        avatar?: boolean | string | any;
        created?: Date | FieldValue | String;
        id?: string;
        language?: string;
        links?: InterfaceUserLinks;
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
        role?: string;
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
        [key: string]: any;
    }
    /**
     * UserHelper
     */
    class Helper {
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
        static authenticated: (auth: any) => void;
        /**
         * Return user token from context
         *
         * @param {CallableRequest} request
         * @return {string}
         */
        static token: (request: CallableRequest) => string;
        /**
         * Gets the user object with email or phone number or create the user if not exists
         * @param {any} data
         * @return {Promise<InterfaceUser>}
         */
        static create: (data: InterfaceUser) => Promise<InterfaceUser>;
        /**
         * Create User Document from UserRecord
         * @param {any} user
         * @return {Promise<InterfaceUser>}
         */
        static createDocument: (user: InterfaceUser) => Promise<InterfaceUser>;
        /**
         * On Create User format data and create document
         * @param {UserRecord} user
         * @param {string} mainUrl
         * @return {Promise<InterfaceUser>}
         */
        static onCreate: (user: UserRecord, mainUrl: string) => Promise<InterfaceUser>;
        /**
         * Validate if user exist
         * @param {any} data
         */
        static get: (data: {
            email?: string;
            phone?: string;
            id?: string;
        }) => Promise<UserRecord | null>;
        /**
         * Get User Role
         *
         * @param {string} uid
         * @param {string?} group
         */
        static getRole: (uid: string, group?: string) => Promise<any>;
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         * @param {any} data
         */
        static add: (data: InterfaceUser) => Promise<void>;
        /**
         * Validates if user is and admin from role
         * @param {any} options
         * @return {boolean} boolean
         */
        static isAdmin: (options: {
            group?: string;
            fail?: boolean;
            role: string;
        }) => boolean;
        /**
         * Remove a user
         * @param {any} data
         */
        static remove: (data: InterfaceUser) => Promise<void>;
        /**
         * Update User account data
         * @param {InterfaceUser} data
         * @param {string} mainUrl
         */
        static update: (data: InterfaceUser, mainUrl: string) => Promise<void>;
        /**
         * Update user role
         * @param {any} data
         * @param {string} mainUrl
         */
        static updateRole: (data: {
            [key: string]: any;
            group?: string;
            role?: string;
            id?: string;
        }, mainUrl: string) => Promise<void>;
        /**
         * Creates the user
         * @param {InterfaceUser} data
         * @return {Promise<InterfaceUser>}
         */
        private static createUser;
        /**
         * Updates fields in a number of documents to reflect an update of a user, such as create or delete
         *
         * @param {any} data
         */
        private static roleUpdateCall;
    }
}
