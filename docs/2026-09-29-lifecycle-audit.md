# Screen lifecycle and codebase audit — 29–30 September 2026

Navigating away does not necessarily unmount an Expo Router screen. Several
screen-owned effects were therefore still running after their UI disappeared.
The fixes below distinguish screen focus, app foreground state, sheet visibility,
and application-wide state.

## Fixed

| Area | Finding and resulting behavior |
| --- | --- |
| HomeBannerCarousel / HeroCarousel | Auto-scroll intervals now stop on blur, background, and unmount, and restart once when active. Empty/single-slide hero carousels do not allocate timers. |
| Skeleton / CartSummaryCard | Repeating animations now explicitly cancel on blur, background, and unmount. The cart pulse does not run for an empty cart. |
| VillageBottomSheet | Keyboard listeners now exist only while the owning screen and sheet are visible. Closing removes listeners, resets the keyboard offset, cancels animations, and unmounts children on both platforms. Cancelled swipe animations cannot invoke a delayed close callback. |
| LoginBottomSheet | Each opening gets a fresh flow. Late OTP/signup responses cannot advance a closed/reopened flow or begin checkout after dismissal. The order animation timer is released on dismissal. Blurring clears the owner's visibility flag so returning cannot resubmit that checkout. Effect replay reuses an in-flight order request. |
| Auth steps / entrance animations | The OTP error-focus timeout is cleared; late SIM selection callbacks are ignored after unmount; success uses the latest completion callback and cancels all animations. Category/top-picks entrance animations and snackbar unmount cleanup stop their animations. |
| API client | Caller AbortSignals now reach fetch alongside the existing request timeout. Caller cancellation remains an AbortError, not a timeout/network error. Signal listeners and deadlines are removed on completion. |
| React Query API reads | Product/category/sale/search, village search, order, and wallet query functions consume and forward Query's cancellation signal. Reads can be aborted when their final observer unmounts or Query cancels them. The product list cache includes the store and does not convert cancellation into demo products. |
| Home/category layouts | Blur/background/unmount cancel pending loads. A newer refresh supersedes an older response. Store/branch changes clear old sections. Loading is owned by the view model, removing duplicate screen focus fetches. |
| Map picker | Blur/unmount cancel resolve requests, GPS wrapper work, and debounce deadlines. Returning re-resolves the preserved center. Pin movement invalidates old responses immediately, before the debounce, preventing an old village from being confirmed at new coordinates. Permission continuations stop after closure. |
| LocationService | Optional cancellation clears the JavaScript GPS deadline/listener and prevents late results and fallback work. The underlying Expo one-shot native GPS operation does not expose cancellation. |
| Address book | Hidden permission sheets do not fetch addresses. Reads cancel on screen/sheet closure and reject stale account responses. Deletions apply to the latest address list rather than restoring a captured list. |
| Logout | The actual profile/session-expiry logout path now disables auth immediately, removes wallet/order queries, and clears saved addresses/selection. A late startup profile response cannot repopulate the signed-out profile. The older logout mutation delegates to the same action. |
| App-owned effects | AppScreen releases store-config synchronization on unmount. The location foreground callback checks that its owner/event is still current after awaits. The store-closed notice does not evaluate on a hidden home screen. |
| Web theme providers | Changing out of system mode removes the media-query listener. The serialized browser bootstrap no longer emits an unrestricted console error. |
| Test configuration | Jest excludes unrelated nested `.worktrees` checkouts. A new cancellation test disables its own cache GC timer so the runner exits normally. |
| Repeated navigation taps | User navigation shares a short guard across controls on the same screen. Rapid taps produce one route action, callbacks from blurred screens cannot navigate, and returning to a screen releases the guard. There are no debounce timers to leak. |
| Repeated async actions | Order placement, location selection/confirmation, address selection, save, and delete now share their pending promise across repeated taps. The guard is acquired before any await/render and releases after success or failure. |
| Store-closed notice | Home evaluates once per app session after config settles. Backgrounding, refocusing, config refreshes, and home remounts do not repeat the notice. Checkout still evaluates current store hours independently when placing an order. |
| Native map events | Both map screens use the Google Maps gesture flag instead of an “ignore next settle” flag. A real drag immediately invalidates the old pin, including same-event Confirm callbacks. Camera animations cannot trigger a new lookup or swallow the next drag. |
| Camera correction | The delayed correction runs on focus/entering map mode, not every coordinate change. A gesture, blur, hidden map, or unmount cancels it. Address list mode cancels map work. |
| GPS and location races | Manual village/address/recent selections invalidate older GPS, permission, geocode, and lookup continuations. Screen/sheet GPS requests carry a cancellation signal. Duplicate GPS requests coalesce. Late hydration and branch backfills cannot overwrite a newer choice. Address selection is published after its store is persisted for API headers. |
| Location foreground listener | Ordinary app resumes no longer trigger another GPS lookup. Permission/service changes can trigger detection, while map/address routes own their pending selection. Leaving the app or entering a picker cancels listener-owned detection. |
| Village search | Losing focus clears the pending debounce and releases the active search query observer. Search text survives a normal return to the screen. |
| Back events | Screen arrows and Android Back share a focus-scoped handler, dismiss the keyboard first, and coalesce rapid presses. Handlers unsubscribe on blur/unmount. Screens without history use an explicit destination instead of issuing an unhandled Back. Dashboard Back returns to Home. |
| Address Back steps | Details → map → address list (when entered from that list) → source screen. First-time empty-address maps return directly to their source. Native stack Back/swipe respects internal steps through `usePreventRemove`; saving is protected. Late selection callbacks cannot navigate after Back. Profile management mode survives the map-search round trip. |
| Login/checkout Back | Modal Back works independently from disabled swipe dismissal. Signup returns to OTP, OTP returns to phone, and phone/error steps close. Pending verification cannot advance a flow after Back. Placing remains protected; success completes once even when Back races the success timer. |
| Completed navigation flows | Location confirmation dismisses back to the existing Home route; checkout dismisses to Orders. These paths no longer replace only the top route and leave location/checkout screens beneath a duplicate dashboard. |
| Store-notice dismissal and gestures | Startup waits for location setup and the preceding location sheet's native dismissal. Changing eligibility no longer hides an already-visible notice. Cancelled gestures snap back; successful swipes request closure immediately instead of relying on a cancellable animation callback. Hidden sheets remove children and gesture detectors while retaining a stable Modal host for native dismissal. Entrance/size changes restore the visible sheet instead of leaving it off-screen. |
| Store notice → checkout | Clearing the notice status retains its modal host. Checkout waits for iOS `onDismiss` or Android's hidden commit before presenting the login/order sheet, preventing overlapping native modal transitions. Leaving the screen cancels the pending handoff. |
| Shared sheet reopening | iOS waits for native `onDismiss` before reopening a sheet closed in the previous frame. Hidden sheets remove the backdrop, content, and gesture handlers. Repeated Back requests are coalesced, while a content-step change can explicitly reset the close guard. Keyboard height reduces the sheet's available height, and its single scroll view supports nested Android scroll and input taps. |
| Snackbar touches | StockSnackbar no longer uses a full-screen native Modal, which could intercept taps outside the visible bar. Its root surface allows touches through on iOS/Android; while a bottom sheet is open, one presenter paints it inside that sheet's native window. One root timer owns auto-dismiss. |
| Location permission sheets | Permission-denied guidance replaces content within the currently open location sheet instead of presenting another native Modal. Back, outside taps, and swipe return to the picker; cancellation remains consistent across location screens until an explicit GPS retry. |
| iOS location permission | The Expo config, generated `Info.plist`, and compiled simulator app already contain `NSLocationWhenInUseUsageDescription`. The entire current-location row now requests permission on tap. Map and add-address entry wait for navigation focus before their first request; explicit GPS actions call the native permission request directly. Map permission results update the shared store, and a fresh Settings grant clears blocked guidance and retries once. |
| Cart stock-conflict sheet | Its rows use the shared sheet's single scroll view. Retry keeps the sheet visible and protects it from Back/swipe/taps until the request finishes; stale completions cannot unlock a reopened session. Cart quantities are read from the live store after adjustment, and variant lines retain their distinct keys. |
| Checkout modal handoffs | Login remains mounted through native dismissal. Stock conflicts and address/Orders navigation wait for its `onDismiss`, so the next screen or sheet cannot present during the old native transition. A successful order reaches the login success step before dismissal. |
| Home product sheets | Product rows now share one Home-owned variant sheet. Store-closed readiness sees that sheet and its fallback load, so late store configuration cannot present a store notice over an open product sheet. Feed refreshes no longer unmount each row's own Modal. |
| Confirmation dialogs | Their scrim and children unmount immediately on hide. A quick iOS reopen waits for native dismissal; screen blur clears the owner's pending confirmation. |

## Validation

- `npm test -- --runInBand --watchman=false --silent`: **89 suites passed; 682 tests passed; 1 suite/test skipped**.
- `npx tsc --noEmit`: passed.
- `npm run lint -- --no-cache`: **0 errors, 45 warnings**, down from 2 errors and 65 warnings at the start. Remaining warnings include existing effect dependencies, unused imports, and test import style.
- `git diff --check`: passed.
- New regressions cover focus/foreground transitions, listener removal, repeating animation cancellation, request aborts, late responses, sheet reopening, map debounce races, GPS cancellation, address updates, logout isolation, shared navigation guards, repeated map confirmation, native gesture versus camera events, location ownership races, store-notice session behavior, hardware/modal Back, address/login Back steps, history-free fallbacks, profile-management return params, cancelled swipes, hidden gesture removal, and Android/iOS modal-dismissal contracts.

The initial Jest command was blocked by Watchman's filesystem permissions;
`--watchman=false` runs successfully without changing host permissions. The
initial unrestricted test discovery also included other branches in nested
worktrees; the final results apply to this checkout only. Existing user edits
were retained.

## Remaining improvements found

1. **OTP resend does not send an OTP.**
   `src/features/auth/views/login-sheet/OtpStep.tsx`, `handleResend`, only resets
   the countdown and inputs. Wire it to the existing OTP request action, expose
   request failure, and restart the cooldown after a successful request.
2. **Catalog failures/empty results become demo inventory.**
   `src/features/home/data/queries/useProductsQuery.ts` still deliberately returns
   `ALL_PRODUCTS` and caches it with infinite freshness. Replace this production
   fallback with an empty/error state or make demo mode explicit. Top Picks uses
   this query and can otherwise offer sample items when the backend has none.
3. **The inner startup gate can stay blank.**
   `src/features/initialization/views/screens/AppScreen/AppScreen.tsx` still waits
   on its own Euclid font load without handling the font error, and the startup
   promise has no final error/recovery UI. The root layout's separate font timeout
   does not bypass this inner gate. Add a fallback/retry policy.
4. **Remove unused mock auth code.**
   `src/features/auth/data/mutations/useLoginMutation.ts` produces fake tokens.
   No current callers were found, but retaining it makes accidental reuse easy.
5. **Complete device lifecycle verification.**
   Exercise iOS/Android navigation, keyboard dismissal, OS permission dialogs,
   rapid map/search round trips, and checkout navigation on devices. The automated
   checks use mocks; they do not constitute native memory/battery profiling.

## Work that legitimately survives a screen

- Cart persistence, auth state, and location/store synchronization are application
  resources. They should survive individual screen changes. The relevant root
  listener/subscription is released with its owner.
- Mounted React Query observers can still allow shared cache reads to complete
  while a screen is covered; consuming the cancellation signal cancels on the
  last observer's unmount, not every navigation blur. No recurring network
  polling was found. A requirement to suspend *all* reads on blur would need a
  separate policy for shared observers and tab data freshness.
- Already-submitted writes, especially order placement, are not cancelled merely
  because their UI closes. The server may already have committed them. UI
  continuations are guarded separately.
- Expo's one-shot native location request can finish after cancellation. Its
  result is ignored and the JavaScript deadline is cleared. Stopping the native
  operation itself would require a different location API/implementation.

Scope: repository-wide lifecycle searches across app/source/shared components,
native entry points and tooling, targeted inspection of the async/data/store
paths, and the full available test/type/lint checks. This is not a claim that
every execution path or platform behavior is bug-free.
