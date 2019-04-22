/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * Replace special character to regular gsm character.
 *
 * @param {string|null} text
 */
export default (text: string | null): string => { // Definition of function and Input and Output Types.
  let finalText = text && typeof text === "string" && text.length > 0 ? text : "";
  const charactersChange2 = {
    0: {original: "", replace: ""},
    3: {original: "", replace: ""},
    4: {original: "", replace: ""},
    9: {original: "", replace: ""},
    16: {original: "", replace: ""},
    17: {original: "", replace: ""},
    18: {original: "", replace: ""},
    19: {original: "", replace: ""},
    20: {original: "", replace: ""},
    23: {original: "", replace: ""},
    25: {original: "", replace: ""},
    96: {original: "`", replace: ""},
    128: {original: "", replace: ""},
    141: {original: "", replace: ""},
    144: {original: "", replace: ""},
    155: {original: "", replace: ""},
    159: {original: "", replace: ""},
    160: {original: "", replace: "'"},
    171: {original: "«", replace: '"'},
    180: {original: "́", replace: "'"},
    187: {original: "»", replace: '"'},
    188: {original: "1⁄4", replace: "43469"},
    189: {original: "1⁄2", replace: "43467"},
    190: {original: "3⁄4", replace: "43528"},
    192: {original: "À", replace: "A"},
    193: {original: "Á", replace: "A"},
    194: {original: "Â", replace: "A"},
    195: {original: "Ã", replace: "A"},
    200: {original: "È", replace: "E"},
    202: {original: "Ê", replace: "E"},
    203: {original: "Ë", replace: "E"},
    204: {original: "Ì", replace: "I"},
    205: {original: "Í", replace: "I"},
    206: {original: "Î", replace: "I"},
    207: {original: "Ï", replace: "I"},
    210: {original: "Ò", replace: "O"},
    211: {original: "Ó", replace: "O"},
    212: {original: "Ô", replace: "O"},
    213: {original: "Õ", replace: "O"},
    217: {original: "Ù", replace: "U"},
    218: {original: "Ú", replace: "U"},
    219: {original: "Û", replace: "U"},
    225: {original: "á", replace: "a"},
    226: {original: "â", replace: "a"},
    227: {original: "ã", replace: "a"},
    233: {original: "é", replace: "e"},
    234: {original: "ê", replace: "e"},
    235: {original: "ë", replace: "e"},
    237: {original: "í", replace: "i"},
    238: {original: "î", replace: "i"},
    239: {original: "ï", replace: "i"},
    243: {original: "ó", replace: "o"},
    244: {original: "ô", replace: "o"},
    245: {original: "õ", replace: "o"},
    247: {original: "÷", replace: "/"},
    250: {original: "ú", replace: "u"},
    251: {original: "û", replace: "u"},
    256: {original: "Ā", replace: "A"},
    257: {original: "ā", replace: "a"},
    274: {original: "Ē", replace: "E"},
    275: {original: "ē", replace: "e"},
    278: {original: "Ė", replace: "E"},
    279: {original: "ė", replace: "e"},
    280: {original: "Ę", replace: "E"},
    281: {original: "ę", replace: "e"},
    298: {original: "Ī", replace: "I"},
    299: {original: "ī", replace: "i"},
    302: {original: "Į", replace: "I"},
    303: {original: "į", replace: "i"},
    332: {original: "Ō", replace: "O"},
    333: {original: "ō", replace: "o"},
    338: {original: "Œ", replace: "AE"},
    339: {original: "œ", replace: "ae"},
    362: {original: "Ū", replace: "U"},
    363: {original: "ū", replace: "u"},
    451: {original: "ǃ", replace: "!"},
    610: {original: "ɢ", replace: "G"},
    618: {original: "ɪ", replace: "I"},
    628: {original: "ɴ", replace: "N"},
    640: {original: "ʀ", replace: "R"},
    655: {original: "ʏ", replace: "Y"},
    665: {original: "ʙ", replace: "B"},
    668: {original: "ʜ", replace: "H"},
    671: {original: "ʟ", replace: "L"},
    697: {original: "ʹ", replace: "'"},
    698: {original: "ʺ", replace: '"'},
    699: {original: "ʻ", replace: "'"},
    700: {original: "ʼ", replace: "'"},
    701: {original: "ʽ", replace: "'"},
    710: {original: "ˆ", replace: "^"},
    712: {original: "ˈ", replace: "'"},
    714: {original: "ˊ", replace: "'"},
    715: {original: "ˋ", replace: "'"},
    720: {original: "ː", replace: ":"},
    726: {original: "˖", replace: "+"},
    732: {original: "̃", replace: "~"},
    750: {original: "ˮ", replace: '"'},
    759: {original: "˷", replace: "~"},
    760: {original: "˸", replace: ":"},
    769: {original: "́", replace: "'"},
    770: {original: "̂", replace: "^"},
    771: {original: "̃", replace: "~"},
    787: {original: "̓", replace: "'"},
    788: {original: "̔", replace: "'"},
    806: {original: "̦", replace: ","},
    816: {original: "̰", replace: "~"},
    818: {original: "̲", replace: "_"},
    819: {original: "̳", replace: "="},
    820: {original: "̴", replace: "~"},
    823: {original: "̷", replace: "/"},
    824: {original: "̸", replace: "/"},
    839: {original: "͇", replace: "="},
    7424: {original: "ᴀ", replace: "A"},
    7428: {original: "ᴄ", replace: "C"},
    7429: {original: "ᴅ", replace: "D"},
    7431: {original: "ᴇ", replace: "E"},
    7434: {original: "ᴊ", replace: "J"},
    7435: {original: "ᴋ", replace: "K"},
    7437: {original: "ᴍ", replace: "M"},
    7439: {original: "ᴏ", replace: "O"},
    7448: {original: "ᴘ", replace: "P"},
    7451: {original: "ᴛ", replace: "T"},
    7452: {original: "ᴜ", replace: "U"},
    7456: {original: "ᴠ", replace: "V"},
    7457: {original: "ᴡ", replace: "W"},
    7458: {original: "ᴢ", replace: "Z"},
    7629: {original: "᷍", replace: "^"},
    8192: {original: "", replace: "'"},
    8193: {original: "", replace: ""},
    8194: {original: "", replace: ""},
    8195: {original: "", replace: ""},
    8196: {original: "", replace: ""},
    8197: {original: "", replace: ""},
    8198: {original: "", replace: ""},
    8199: {original: "", replace: ""},
    8200: {original: "", replace: ""},
    8201: {original: "", replace: ""},
    8202: {original: "", replace: ""},
    8208: {original: "‐", replace: "-"},
    8211: {original: "–", replace: "-"},
    8212: {original: "—", replace: "-"},
    8213: {original: "―", replace: "-"},
    8215: {original: "̳", replace: "_"},
    8216: {original: "‘", replace: "'"},
    8217: {original: "’", replace: "'"},
    8218: {original: "‚", replace: ","},
    8219: {original: "‛", replace: "'"},
    8220: {original: "“", replace: '"'},
    8221: {original: "”", replace: '"'},
    8222: {original: "„", replace: '"'},
    8223: {original: "‟", replace: '"'},
    8230: {original: "...", replace: "..."},
    8232: {original: "", replace: ""},
    8233: {original: "", replace: ""},
    8239: {original: "", replace: ""},
    8249: {original: "‹", replace: ">"},
    8250: {original: "›", replace: "<"},
    8252: {original: "!!", replace: "!!"},
    8259: {original: "⁃", replace: "-"},
    8260: {original: "⁄", replace: "/"},
    8270: {original: "⁎", replace: "*"},
    8271: {original: "⁏", replace: ";"},
    8287: {original: "", replace: ""},
    8288: {original: "⁠", replace: ""},
    8402: {original: "⃒", replace: "|"},
    8403: {original: "⃓", replace: "|"},
    8421: {original: "", replace: "\\"},
    8725: {original: "∕", replace: "/"},
    8727: {original: "∗", replace: "*"},
    8739: {original: "∣", replace: "|"},
    8764: {original: "∼", replace: "~"},
    8859: {original: "⊛", replace: "*"},
    9116: {original: "⎜", replace: "|"},
    9119: {original: "⎟", replace: "|"},
    9144: {original: "⎸", replace: "|"},
    9145: {original: "⎹", replace: "|"},
    9148: {original: "⎼", replace: "-"},
    9149: {original: "⎽", replace: "-"},
    9168: {original: "⏐", replace: "|"},
    10018: {original: "✢", replace: "*"},
    10019: {original: "✣", replace: "*"},
    10020: {original: "✤", replace: "*"},
    10021: {original: "✥", replace: "*"},
    10033: {original: "✱", replace: "*"},
    10034: {original: "✲", replace: "*"},
    10035: {original: "✳", replace: "*"},
    10042: {original: "✺", replace: "*"},
    10043: {original: "✻", replace: "*"},
    10044: {original: "✼", replace: "*"},
    10045: {original: "✽", replace: "*"},
    10051: {original: "❃", replace: "*"},
    10057: {original: "❉", replace: "*"},
    10058: {original: "❊", replace: "*"},
    10059: {original: "❋", replace: "*"},
    10075: {original: "❛", replace: "'"},
    10076: {original: "❜", replace: "'"},
    10077: {original: "❝", replace: '"'},
    10078: {original: "❞", replace: '"'},
    10088: {original: "❨", replace: "("},
    10089: {original: "❩", replace: ")"},
    10090: {original: "❪", replace: "("},
    10091: {original: "❫", replace: ")"},
    10100: {original: "❴", replace: "{"},
    10101: {original: "❵", replace: "}"},
    10222: {original: "⟮", replace: "("},
    10223: {original: "⟯", replace: ")"},
    10626: {original: "⦂", replace: ":"},
    10629: {original: "⦅", replace: "("},
    10630: {original: "⦆", replace: ")"},
    10694: {original: "⧆", replace: "*"},
    10741: {original: "⧵", replace: "\\"},
    10744: {original: "⧸", replace: "/"},
    10745: {original: "⧹", replace: "\\"},
    12288: {original: "", replace: ""},
    12289: {original: "、", replace: "'"},
    12290: {original: "。", replace: "."},
    12317: {original: "〝", replace: '"'},
    12318: {original: "〞", replace: '"'},
    42800: {original: "ꜰ", replace: "F"},
    42801: {original: "ꜱ", replace: "S"},
    42889: {original: "꞉", replace: ":"},
    42890: {original: "꞊", replace: "="},
    65040: {original: ",", replace: "'"},
    65041: {original: "、", replace: "'"},
    65043: {original: ":", replace: ":"},
    65044: {original: ";", replace: ";"},
    65045: {original: "!", replace: "!"},
    65046: {original: "?", replace: "?"},
    65104: {original: ",", replace: ","},
    65105: {original: "、", replace: ","},
    65106: {original: ".", replace: "."},
    65108: {original: ";", replace: ";"},
    65110: {original: "?", replace: "?"},
    65111: {original: "!", replace: "!"},
    65113: {original: "(", replace: "("},
    65114: {original: ")", replace: ")"},
    65115: {original: "{", replace: "{"},
    65116: {original: "}", replace: "}"},
    65119: {original: "#", replace: "#"},
    65120: {original: "&", replace: "&"},
    65121: {original: "*", replace: "*"},
    65122: {original: "+", replace: "+"},
    65123: {original: "-", replace: "-"},
    65124: {original: "<", replace: "<"},
    65125: {original: ">", replace: ">"},
    65126: {original: "=", replace: "="},
    65128: {original: "\\", replace: "\\"},
    65129: {original: "$", replace: "$"},
    65130: {original: "%", replace: "%"},
    65131: {original: "@", replace: "@"},
    65281: {original: "!", replace: "!"},
    65282: {original: "\\", replace: '"'},
    65283: {original: "#", replace: "#"},
    65284: {original: "$", replace: "$"},
    65285: {original: "%", replace: "%"},
    65286: {original: "&", replace: "&"},
    65287: {original: "'", replace: "'"},
    65288: {original: "(", replace: "("},
    65289: {original: ")", replace: ")"},
    65290: {original: "*", replace: "*"},
    65291: {original: "+", replace: "+"},
    65292: {original: ",", replace: ","},
    65293: {original: "-", replace: "-"},
    65294: {original: ".", replace: "."},
    65295: {original: "/", replace: "/"},
    65296: {original: "0", replace: "0"},
    65297: {original: "1", replace: "1"},
    65298: {original: "2", replace: "2"},
    65299: {original: "3", replace: "3"},
    65300: {original: "4", replace: "4"},
    65301: {original: "5", replace: "5"},
    65302: {original: "6", replace: "6"},
    65303: {original: "7", replace: "7"},
    65304: {original: "8", replace: "8"},
    65305: {original: "9", replace: "9"},
    65306: {original: ":", replace: ":"},
    65307: {original: ";", replace: ";"},
    65308: {original: "<", replace: "<"},
    65309: {original: "=", replace: "="},
    65310: {original: ">", replace: ">"},
    65312: {original: "@", replace: "@"},
    65313: {original: "A", replace: "A"},
    65314: {original: "B", replace: "B"},
    65315: {original: "C", replace: "C"},
    65316: {original: "D", replace: "D"},
    65317: {original: "E", replace: "E"},
    65318: {original: "F", replace: "F"},
    65319: {original: "G", replace: "G"},
    65320: {original: "H", replace: "H"},
    65321: {original: "I", replace: "I"},
    65322: {original: "J", replace: "J"},
    65323: {original: "K", replace: "K"},
    65324: {original: "L", replace: "L"},
    65325: {original: "M", replace: "M"},
    65326: {original: "N", replace: "N"},
    65327: {original: "O", replace: "O"},
    65328: {original: "P", replace: "P"},
    65329: {original: "Q", replace: "Q"},
    65330: {original: "R", replace: "R"},
    65331: {original: "S", replace: "S"},
    65332: {original: "T", replace: "T"},
    65333: {original: "U", replace: "U"},
    65334: {original: "V", replace: "V"},
    65335: {original: "W", replace: "W"},
    65336: {original: "X", replace: "X"},
    65337: {original: "Y", replace: "Y"},
    65338: {original: "Z", replace: "Z"},
    65339: {original: "[", replace: "["},
    65340: {original: "\\", replace: "\\"},
    65341: {original: "]", replace: "]"},
    65342: {original: "^", replace: "^"},
    65343: {original: "_", replace: "_"},
    65371: {original: "{", replace: "{"},
    65372: {original: "|", replace: "|"},
    65373: {original: "}", replace: "}"},
    65374: {original: "~", replace: "~"},
    65377: {original: "。", replace: "."},
    65380: {original: "、", replace: ","},
  };

  for (let i of finalText) {
    let character: number = i.charCodeAt(0); // Define Char Code for letter.
    if (charactersChange2.hasOwnProperty(character)) {
      finalText = finalText.replace(i, charactersChange2[character].replace); // Replace all characters according condition.
    }
  }
  return finalText; // Return the message with changes.
};
