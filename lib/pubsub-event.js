"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
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
/**
 * PubSub basic event
 * @param ps
 * @param topic
 * @param data
 * @param attributes
 * @param options
 */
exports.default = (ps, topic, data = {}, attributes = {}, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const message = JSON.stringify(data);
    const dataBuffer = Buffer.from(message);
    yield ps.topic(topic, {}).publish(dataBuffer, attributes);
});
//# sourceMappingURL=pubsub-event.js.map