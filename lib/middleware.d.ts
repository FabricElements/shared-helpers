export declare const middlewareErrorAPI: (error: any, request: any, response: any, next: any) => void;
export declare const middlewareErrorPage: (error: any, req: any, response: any, next: any) => any;
export declare const middlewareCookie: (request: any, response: any, next: any) => void;
export declare const middlewareSecurityChild: (request: any, response: any, next: any) => void;
export declare const middlewareSecurityMedia: ((request: any, response: any, next: any) => void)[];
