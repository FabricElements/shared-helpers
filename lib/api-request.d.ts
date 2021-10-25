declare const _default: (options: {
    body: any;
    method: "POST" | "GET";
    parameters: string;
    path: string;
    scheme: "Basic" | "Bearer" | "Digest" | "OAuth";
}) => Promise<any>;
/**
 * Call firebase project base API
 * @param options
 */
export default _default;
