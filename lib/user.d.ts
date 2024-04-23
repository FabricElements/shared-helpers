import { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
/**
 * User namespace
 */
export declare namespace User {
    interface InterfaceAds {
        adsense?: {
            client: string;
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
        group?: string;
        groups?: Record<string, string | number>;
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
         * @return {Promise<Interface>}
         */
        static create: (data: Interface) => Promise<Interface>;
        /**
         * Create User Document from UserRecord
         * @param {any} user
         * @return {Promise<Interface>}
         */
        static createDocument: (user: Interface) => Promise<Interface>;
        /**
         * On Create User format data and create document
         * @param {UserRecord} user
         * @param {string} mainUrl
         * @return {Promise<Interface>}
         */
        static onCreate: (user: UserRecord, mainUrl: string) => Promise<Interface>;
        /**
         * Validate if user exist
         * @param {any} data
         * @return {Promise<UserRecord | null>}
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
         * @return {Promise<string>}
         */
        static getRole: (uid: string, group?: string) => Promise<string>;
        /**
         * User invitation function, it listens for a new connection-invite document creation, and creates the user
         * @param {any} data
         * @return {Promise<Interface>}
         */
        static add: (data: Interface) => Promise<Interface>;
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
        static remove: (data: Interface) => Promise<void>;
        /**
         * Format User Names
         * @param {Interface} data
         * @return {Interface} data
         */
        static formatUserNames: (data: Interface) => Interface;
        /**
         * Update User account data
         * @param {Interface} data
         * @param {string} mainUrl
         */
        static update: (data: Interface, mainUrl: string) => Promise<void>;
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
         *
         * @param {object | null} data
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
         * Creates the user
         * @param {Interface} data
         * @return {Promise<Interface>}
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
