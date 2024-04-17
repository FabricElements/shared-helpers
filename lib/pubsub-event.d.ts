/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { PubSub } from '@google-cloud/pubsub';
import { Attributes, PublishOptions } from '@google-cloud/pubsub/build/src/publisher/index.js';
/**
 * PubSub basic event
 *
 * @param {PubSub} ps
 * @param {string} topic
 * @param {object} data
 * @param {any} attributes
 * @param {any} options
 */
declare const _default: (ps: PubSub, topic: string, data?: object, attributes?: Attributes, options?: PublishOptions) => Promise<void>;
export default _default;
