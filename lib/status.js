var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
/**
 * Update Status Collection with Errors
 * @param data
 */
export const update = (data) => __awaiter(void 0, void 0, void 0, function* () {
    if (!data.id || !data.status) {
        console.log("Missing input data");
        return;
    }
    const db = admin.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const ref = db.collection("status").doc(data.id);
    const status = {
        backup: false,
        description: data.description || null,
        events: admin.firestore.FieldValue.increment(1),
        name: data.name || null,
        status: data.status,
        timestamp,
    };
    yield ref.set(status, { merge: true });
});
//# sourceMappingURL=status.js.map