## Import module for development or server deployment

## Tech Stack

- **Runtime:** Node.js `>=22`.
- **Firebase:** `firebase-admin` `^13`, `firebase-functions` `^7` (Gen-2 SDK).
- **Auth trigger:** `functions/src/user/events.ts` uses the Gen-2 blocking function
  `beforeUserCreated` (`firebase-functions/v2/identity`) instead of the legacy
  `functions.runWith().auth.user().onCreate()` Gen-1 trigger.

## Local Testing

```json
{
  "@fabricelements/shared-helpers": "file:.."
}
```

## Deployment

```json
{
  "@fabricelements/shared-helpers": "github:FabricElements/shared-helpers"
}
```
