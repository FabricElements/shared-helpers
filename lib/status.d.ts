/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
interface Data {
    id?: string;
    status?: string;
    description?: string;
    name?: string;
    [x: string]: any;
}
/**
 * Update Status Collection with Errors
 * @param {Data} data
 * @deprecated Not in use
 */
export declare const update: (data: Data) => Promise<void>;
export {};
