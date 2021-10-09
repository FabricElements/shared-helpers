# FabricElements Shared Helpers
Use `@fabricelements/shared-helpers` on Firebase projects.

------
## Installation
From NPM
```shell
$ npm i @fabricelements/shared-helpers --save
```
or from GitHub
```shell
$ npm i github:FabricElements/shared-helpers --save
```
## Examples
### Basic usage
Import only what you need
```js
import {firestore, pubSubEvent} from "@fabricelements/shared-helpers";
```
Or import everything
```js
import * as sharedHelpers from "@fabricelements/shared-helpers";
```
## Available functions

### [apiRequest](src/api-request.ts)
Call firebase project base API

### [backup](src/backup.ts)
Custom backup from Firestore to BigQuery

### [checkNumber](src/check-number.ts)
Check if number is valid and format

### [cleaner](src/cleaner.ts)
Big Query Clean Database

### [firestore](src/firestoreHelper.ts)
Google Cloud Firestore helpers

### [global](src/global.ts)
Basic and reusable helpers

### [hashId](src/hash-id.ts)
Generate randomDomain hash id with 4 characters or more

### [linkDomain](src/link-domain.ts)
Return Domain and Url

### [pubSubEvent](src/pubsub-event.ts)
Google cloud Pub/Sub event

### [replaceMessageText](src/replace-message-text.ts)
Replace message text with custom keys

### [specialCharToRegular](src/special-char-to-regular.ts)
Replace special character to regular gsm character

### [status](src/status.ts)
Update Status Collection with Errors

## Contributing

Please check [CONTRIBUTING](CONTRIBUTING.md).

## License

Released under the [BSD 3-Clause License](LICENSE.md).
