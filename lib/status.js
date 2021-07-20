"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = __importStar(require("firebase-admin"));
/**
 * Update Status Collection with Errors
 * @param data
 */
const update = (data) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.update = update;
//# sourceMappingURL=status.js.map