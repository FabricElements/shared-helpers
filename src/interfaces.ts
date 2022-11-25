/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
export interface InterfaceUserAds {
  adsense?: {
    client: string;
    slot: string;
  },
}

export interface InterfaceUserLinks {
  behance?: string;
  dribbble?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;
  youtube?: string;
}

export interface InterfaceUser {
  ads?: InterfaceUserAds;
  avatar?: boolean | string;
  created?: Date;
  id?: string;
  language?: string;
  links?: InterfaceUserLinks,
  name?: string;
  firstName?: string;
  abbr?: string;
  lastName?: string;
  path?: string;
  referrer?: string;
  updated?: Date;
  url?: string;
  username?: string;

  [x: string]: any;
}

export type linkType = 'instagram' | 'link' | 'youtube' | 'twitter' | 'tiktok' | 'vimeo' | string;

export interface InterfaceFormatLink {
  active?: boolean;
  category?: string;
  created?: Date;
  description?: string;
  featured?: boolean;
  hashtags?: string,
  id?: string;
  image?: string;
  keywords?: string[];
  language?: string;
  link?: string;
  media?: string;
  path?: string;
  safe?: boolean;
  source?: string;
  title?: string;
  type?: linkType;
  updated?: Date;
  url?: string;
  user?: string;
}

export interface InterfaceImageResize {
  crop?: string; // force proportions and cut
  dpr?: number;
  fileName?: string;
  format?: 'jpeg' | 'png' | 'gif';
  input?: Buffer | string | any;
  maxHeight?: number;
  maxWidth?: number;
  quality?: number;
  contentType?: string; // Only for internal use, it will be returned from storage
}

export type imageSizesType = null | string | 'thumbnail' | 'small' | 'medium' | 'standard' | 'high' | 'max';

export type fetchResponse = null | 'json' | 'text' | 'raw' | 'arrayBuffer' | 'formData' | 'blob';

export interface InterfaceAPIRequest {
  body?: any,
  credentials?: string,
  headers?: any,
  method?: 'GET' | 'POST' | 'PUT',
  path?: string,
  raw?: boolean,
  scheme?: 'Basic' | 'Bearer' | 'Digest' | 'OAuth',
  as?: fetchResponse,
}
