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

  [x: string]: any;
  ads?: InterfaceUserAds;
  avatar?: boolean | string;
  created?: Date;
  id?: string;
  language?: string;
  links?: InterfaceUserLinks,
  name?: string;
  nameFirst?: string;
  nameInitials?: string;
  nameLast?: string;
  path?: string;
  referrer?: string;
  updated?: Date;
  url?: string;
  username?: string;
}

export type linkType = "instagram" | "link" | "youtube" | "twitter" | "tiktok" | "vimeo" | string;

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
  crop?: boolean; // force proportions and cut
  fileName?: string;
  format?: "jpeg" | "png";
  input?: Buffer | string | any;
  maxHeight?: number;
  maxWidth?: number;
  quality?: number;
}

export type imageSizesType = null | string | "thumbnail" | "small" | "medium" | "standard" | "high" | "max";
