/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

import hashId from "./hash-id";
import {randomDomain} from "./link-domain";
import specialCharToRegular from "./special-char-to-regular";
import {toCamelCase} from "./strings";

/**
 * Replace message text
 *
 * @param {string} text
 * @param {any} data
 * @returns {string}
 */
export default (text: string, data: any = {}) => {
  let final = !!text ? text.replace(/ +(?= )/g, "") : "";
  const matches = final.match(/{(?:.*?)}/g);
  const length = matches ? matches.length : 0;
  for (let i = 0; i < length; i++) {
    const match = matches[i];
    const clean = match.toLowerCase().replace(/[{}]/gi, "");
    const key = toCamelCase(clean);
    let replaceValue = data[key] ? data[key] : "";
    switch (key) {
      case "r": // Replaces random hash Id
        replaceValue = hashId();
        break;
      case "l": // Replaces link references with a random domain
        replaceValue = randomDomain();
        break;
      default:
        replaceValue = specialCharToRegular(replaceValue);
        break;
    }

    final = final.replace(matches[i], replaceValue);
  }
  return final.replace(/[{}]/gmi, "");
};
