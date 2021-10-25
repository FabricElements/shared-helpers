declare const _default: (options: {
    body: any;
    credentials: string;
    method: "GET" | "POST" | "PUT";
    path: string;
    scheme: "Basic" | "Bearer" | "Digest" | "OAuth";
}) => Promise<any>;
/**
 * Call firebase project base API
 * @param options
 */
export default _default;
