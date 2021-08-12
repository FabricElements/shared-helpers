/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";

const fieldValue = admin.firestore.FieldValue;
const timestamp = fieldValue.serverTimestamp();

export class UserHelper {
  /**
   * Constructor
   */
  constructor() {
    //
  }

  private static hasPhoneOrEmail(data: any) {
    if (!(data && (data.phoneNumber || data.email))) {
      throw new Error("Incomplete message data");
    }
  }

  /**
   * Gets the user object with email or phone number or create the user if not exists
   * @param data
   * @returns {Promise<any>}
   */
  public create = async (data: {
    [key: string]: any,
    email?: string;
    phoneNumber?: string;
  }) => {
    UserHelper.hasPhoneOrEmail(data);
    let user = await this.exists(data);
    if (!user) {
      user = await this.createUser(data);
    }
    return user;
  };

  /**
   * Validate if user exist
   * @param data
   */
  public exists = async (data: {
    [key: string]: any,
    email?: string;
    phoneNumber?: string;
  }) => {
    UserHelper.hasPhoneOrEmail(data);
    let _user = null;
    try {
      if (data.phoneNumber) {
        _user = await admin.auth().getUserByPhoneNumber(data.phoneNumber);
      } else if (data.email) {
        _user = await admin.auth().getUserByEmail(data.email);
      }
    } catch (error) {
      throw new Error(error.message);
    }
    return _user;
  };

  /**
   * User invitation function, it listens for a new connection-invite document creation, and creates the user
   */
  public invite = async (data: {
    [key: string]: any,
    admin?: boolean;
    collection?: string;
    collectionId?: string;
    uid?: string;
  }) => {
    try {
      const userObject = await this.create(data);
      if (!userObject) {
        return;
      }
      // Update data in necessary documents to reflect user creation
      await this.update({
        type: "add",
        uid: userObject.uid,
        collection: data.collection || undefined,
        collectionId: data.collectionId || undefined,
        admin: data.admin || undefined,
        role: data.role || "agent",
      });
    } catch (error) {
      throw new Error(error.message);
    }
  };

  /**
   * Remove a user
   */
  public remove = async (data: {
    [key: string]: any,
    admin?: boolean;
    collection?: string;
    collectionId?: string;
    uid?: string;
  }) => {
    // Data uid needs to exist
    if (!data?.uid) {
      throw new Error("uid is required");
    }
    try {
      // Update the necessary documents to delete the user
      await this.update({
        admin: data.admin || undefined,
        type: "remove",
        uid: data.uid,
        collection: data.collection || undefined,
        collectionId: data.collectionId || undefined,
      });
    } catch (error) {
      throw new Error(`Error removing user access: ${error.message}`);
    }
  };

  /**
   * Creates the user
   * @param {any} data
   * @returns {Promise<admin.auth.UserRecord>}
   */
  private createUser = async (data: {
    email?: string;
    phoneNumber?: string;
  }) => {
    UserHelper.hasPhoneOrEmail(data);
    let userData: any = {};
    if (data.email) {
      userData.email = data.email;
    }
    if (data.phoneNumber) {
      userData.phoneNumber = data.phoneNumber;
    }
    return admin.auth().createUser(userData);
  };

  /**
   * Updates fields in a number of documents to reflect an update of a user, such as create or delete
   *
   * @param data
   */
  private update = async (data: {
    admin?: boolean,
    collection?: string,
    collectionId?: string,
    role?: string,
    type: string,
    uid: string,
  }) => {
    const db = admin.firestore();
    let batch = db.batch();
    let clickerInternal = false; // Adds or removes a user as being a clicker
    let grouped = data.collection && data.collectionId;
    let updateGroup = null; // Action for the group
    let userUpdate = null; // Action for the user
    let userData: any = {
      backup: false,
      updated: timestamp,
    };
    if (data.collection && !data.collectionId) {
      throw new Error("collectionId missing");
    }
    const refUser = db.collection("user").doc(data.uid);
    if (data.admin) {
      await admin.auth().setCustomUserClaims(data.uid, {
        admin: data.type === "add",
      });
    }
    let roles = {};
    switch (data.type) {
      case "add":
        updateGroup = fieldValue.arrayUnion(...[data.collectionId]);
        userUpdate = fieldValue.arrayUnion(...[data.uid]);
        clickerInternal = true;
        roles = {
          [data.uid]: data.role,
        };
        break;
      case "remove":
        updateGroup = fieldValue.arrayRemove(...[data.collectionId]);
        userUpdate = fieldValue.arrayRemove(...[data.uid]);
        clickerInternal = false;
        roles = {
          [data.uid]: fieldValue.delete(),
        };
        break;
      default:
        throw new Error("Invalid type");
    }
    if (grouped) {
      const refGroup = db.collection(data.collection).doc(data.collectionId);
      batch.set(refGroup, {
        roles,
        users: userUpdate,
        backup: false,
        updated: timestamp,
      }, {merge: true});
    }
    // Update user
    if (grouped) {
      userData = {
        ...userData,
        [data.collection]: updateGroup
      };
    }
    if (data.admin) {
      userData = {
        ...userData,
        admin: data.type === "add",
      };
    }
    batch.set(refUser, userData, {merge: true});
    await batch.commit();
    return;
  };
}
