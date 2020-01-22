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
 * @param {any} options
 * @returns {string}
 */
export default (options: {
  data?: {},
  domains?: string[],
  text: string,
}) => {
  let final = !!options.text ? options.text.replace(/ +(?= )/g, "") : "";
  const matches = final.match(/{(?:.*?)}/g);
  const length = matches ? matches.length : 0;
  for (let i = 0; i < length; i++) {
    const match = matches[i];
    const clean = match.toLowerCase().replace(/[{}]/gi, "");
    const key = toCamelCase(clean);
    let replaceValue = options.data[key] ? options.data[key] : "";
    switch (key) {
      case "r": // Replaces random hash Id
        replaceValue = hashId();
        break;
      case "link": // Replaces link references with a random domain
        replaceValue = randomDomain({domains: options.domains});
        break;
      default:
        replaceValue = specialCharToRegular(replaceValue);
        break;
    }
    final = final.replace(matches[i], replaceValue);
  }
  return final.replace(/[{}]/gmi, "");
};
