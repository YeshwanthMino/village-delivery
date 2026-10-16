# App events

App code calls `analytics.track`, `analytics.identify`, and `analytics.setUserProperties` from `src/base/services/analytics`. The typed event vocabulary and property allowlists live in `src/base/services/analytics/events.ts`. Provider selection is in `provider.native.ts` and `provider.web.ts`; no screen or store imports a Firebase SDK. To switch to MoEngage or another provider, implement `AnalyticsProvider` and change those selection files.

Events cover screen visits, catalog and promotion discovery, searches (length and result count only), product and variant interest, cart and favorite changes, checkout, completed orders, authentication, delivery area/address selection, order history and VIP membership. Cart events are emitted only after a real store change; order completion is emitted only when the server returns an order ID. Search text, phone numbers, names, address text/IDs, coordinates, tokens, and full profile objects are excluded. Firebase user identity uses only the backend's opaque user ID and is reset on sign-out.

## Recommendation signals

| Signal | Event and properties | Trigger |
| --- | --- | --- |
| Visible catalog product | `product_impression`: `product_id`, `list_id`, `source`, one-based `position` | At least half of a card is visible in a category, sale, search, Top Picks, home/category rail, or similar-products rail. FlatList viewability is used for grids and horizontal rails; rails also check vertical screen position. Duplicates are suppressed per list/position while a screen remains mounted. |
| Product interest | `product_selected` and `product_viewed`: product ID plus placement context | Card tap and product-detail load. Card context crosses the route into detail. |
| Add/purchase attribution | `cart_item_added` and `product_purchased`: product/variant, quantity, placement context | Accepted cart add and server-confirmed order. The cart retains the most recent add placement for each line across app restarts. |
| Search and sort | `search_performed`: query length, result count, scope, optional selected category ID; `product_sort_changed`: sort key | Settled search and Top Picks sort choice. Raw query text is never sent. |
| Similar products | `recommendation_served`, `product_impression`, then attributed click/add/purchase | The "You might also like" rail. `list_id` is `similar:<parent product ID>`. If the product-detail API supplies `recommendation.requestId` and `recommendation.modelVersion`, they become `recommendation_id` and `model_version` on the serve event, impressions, and downstream actions. |
| Final order outcome | `order_outcome_observed` and `product_outcome_observed`: order ID, status, product ID, quantity | When order list/detail API reports delivered, cancelled, or refunded. The app keeps a bounded per-user device record to avoid repeat events for the same status. A later change from delivered to refunded emits a new outcome. |

The client sees order outcomes only when the customer opens or refreshes order history, and its deduplication is per device. It does not mark outcomes observed while the selected provider is unavailable. For complete, timely outcomes and refunds, the backend should emit the same provider-independent events from its order status and refund handlers with a shared event ID for deduplication. The current product-detail API supplies similar products but no recommendation request or model metadata; those fields are optional until the recommendation service sends them. Native event delivery starts after Firebase configuration is supplied and the app is rebuilt.

## Activate Firebase

1. In Firebase, register Android and iOS apps using `in.villagedelivery.consumer` as the package/bundle ID. Download `google-services.json` and `GoogleService-Info.plist`.
2. Put both files at the project root for local builds, or set `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST` to their paths. The root filenames are git-ignored. For EAS Build, configure both as file environment variables and make them available to the build profile. `app.config.ts` enables the native Firebase config plugins when both files exist.
3. Rebuild the native app after adding the files. React Native Firebase Analytics requires native code, so Expo Go and older development builds cannot deliver events. For local generated projects, regenerate native files with `npx expo prebuild --clean`, then run `npx expo run:android` or `npx expo run:ios`.
4. For web delivery, register a Firebase web app and fill in the `EXPO_PUBLIC_FIREBASE_*` values in `.env.example` (or the equivalent build environment). Without a complete web config, the web provider stays inactive.

The facade safely accepts events before configuration, but it does not store them for later replay. Once Firebase is configured and the app is rebuilt, use Firebase Analytics DebugView to verify live delivery and event parameters on a device.

On web, Firebase's Analytics API can clear the user ID and user properties at sign-out, but it does not expose the native `resetAnalyticsData()` method; Firebase retains its anonymous browser client ID.

References: [Expo Firebase guide](https://docs.expo.dev/guides/using-firebase/), [React Native Firebase setup](https://rnfirebase.io/), [Firebase Analytics](https://rnfirebase.io/analytics/usage).
