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
    }) => Promise<any>;
    /**
     * Validate if user exist
     * @param data
     */
    exists: (data: {
        [key: string]: any;
        email?: string;
        phoneNumber?: string;
    }) => Promise<any>;
    /**
     * User invitation function, it listens for a new connection-invite document creation, and creates the user
     */
    invite: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        collectionId?: string;
        uid?: string;
    }) => Promise<void>;
    /**
     * Remove a user
     */
    remove: (data: {
        [key: string]: any;
        admin?: boolean;
        collection?: string;
        collectionId?: string;
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
    private update;
}
