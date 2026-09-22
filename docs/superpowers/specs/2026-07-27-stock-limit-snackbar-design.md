# Stock-limit snackbar

## Problem

Quantity steppers (`CompactStepper`, `FullWidthStepper`, `ProductCartBar`) disable the
`+` button once `count === maxQuantity`. A disabled `TouchableOpacity` doesn't fire
`onPress`, so tapping `+` at the stock cap gives the user zero feedback — it just looks
broken. We want a bottom snackbar, matching the attached reference screenshot, telling
the user how many units are actually left.

## Scope

Applies to all three stepper components in the app: `CompactStepper`, `FullWidthStepper`,
and the PDP's `ProductCartBar`.

## Architecture

### New store: `src/core/store/useSnackbarStore.ts`

A standalone zustand store, separate from `useVillageStore` (this is transient UI state,
not persisted domain/cart data):

```ts
type SnackbarState = {
  message: string | null;
  key: number;          // bumped on every show() call; resets the auto-dismiss timer
  bottomOffset: number; // px to float above whatever occupies the bottom of the screen
};

type SnackbarActions = {
  show: (message: string, bottomOffset?: number) => void;
  hide: () => void;
};
```

`show()` always sets `message` and increments `key`, even if a message is already
showing — this is what makes repeat taps reset the auto-dismiss countdown.

### New component: `src/shared/components/StockSnackbar.tsx`

- Subscribes to `useSnackbarStore`; renders `null` when `message` is `null`.
- Slide-up/fade-in animation via `Animated` (consistent with existing animated
  components in the codebase).
- `useEffect` keyed on `key`: starts a 2.5s `setTimeout` calling `hide()`. Because the
  effect re-runs whenever `key` changes, a repeat `show()` call restarts the timer.
- Tapping the "Ok" action calls `hide()` immediately, clearing any pending timeout.
- Absolutely positioned: `position: 'absolute', left: 0, right: 0, bottom: bottomOffset`.

### Mounting

Mounted once in `app/_layout.tsx`, inside `GluestackUIProvider`, as a sibling to
`AppScreen`. This is the single global instance — no screen needs to render it itself.

## Trigger points

Each stepper already computes `canAdd = count < maxQuantity`. Currently the `+` button
is `disabled` when `!canAdd`. We change it to stay enabled, moving the check into the
press handler instead:

```ts
const handleIncrement = () => {
  if (!canAdd) {
    useSnackbarStore
      .getState()
      .show(t('stock_limit_reached', { n: maxQuantity }), bottomOffset);
    return;
  }
  onAdd();
};
```

Applied in:
- `src/shared/components/CompactStepper.tsx`
- `src/shared/components/FullWidthStepper.tsx`
- `src/features/product/views/components/ProductCartBar.tsx`

### `bottomOffset` per call site

- `ProductCartBar` (PDP): passes its own rendered bar height. The PDP route
  (`app/product.tsx`) is a top-level Stack screen with no tab bar mounted beneath it,
  so the snackbar floats directly above the cart bar.
- `CompactStepper` / `FullWidthStepper` (home cards, cart list, etc.): pass the
  dashboard's `TAB_BAR_CONTENT_HEIGHT` + bottom safe-area inset when rendered inside
  the `(dashboard)` tab group, else `0`.

## Copy

New i18n key in `src/base/constants/translations.ts`, following the existing
`order_mod_only_left` pattern:

```ts
stock_limit_reached: {
  en: 'We only have {n} piece{s} left at the moment',
  te: 'ప్రస్తుతం మాకు {n} మాత్రమే మిగిలి ఉన్నాయి',
}
```

Simple pluralization: `{s}` substitutes to `''` when `n === 1`, else `'s'` — same
substitution mechanism already used for `{n}` in `order_mod_only_left`.

## Visual style

Full-width bar, rounded top corners only (bottom edge flush with the screen edge),
pink/magenta background (closest Tailwind token to the reference screenshot, e.g.
`bg-pink-600`), bold white message text. Left side: a plain emoji pair (e.g. 🧺✨) —
no mascot illustration asset exists in this codebase, so no new asset is introduced by
this feature. Right side: "Ok" as a pressable text element that calls `hide()`.
Font weight follows the `ConfirmDialog` convention (`font-extrabold` for message text).

## Error handling / edge cases

- Repeated `+` taps while the snackbar is already showing: `show()` is idempotent-safe
  to call repeatedly — it just bumps `key`, restarting the dismiss timer, and message
  content is re-set to the same string (a no-op visually, but keeps the user's most
  recent tap "acknowledged").
- Navigating away while the snackbar is visible: since the host is mounted at the app
  root (not per-screen), the snackbar persists across navigation until it dismisses.
  This is an accepted tradeoff of the global-singleton approach — out of scope to special
  case per-route dismissal.
- `maxQuantity === 0` (out of stock at page load): `ProductCartBar` already renders a
  distinct disabled grey bar with `out_of_stock` copy in this case instead of a stepper,
  so `handleIncrement`'s snackbar path is unreachable here — no double-messaging.

## Testing

- `useSnackbarStore.test.ts`: `show()`/`hide()` behavior, `key` increments on repeated
  `show()`, `message` clears on `hide()`.
- `StockSnackbar.test.tsx`: renders `null` with no message; renders message + "Ok";
  "Ok" press calls `hide()`; auto-dismiss fires via fake timers; a repeat `show()`
  before the timeout resets the timer (assert timer count/timing).
- Stepper tests (extending `CompactStepper`, `FullWidthStepper`, and `ProductCartBar`'s
  existing test files): tapping `+` at `count === maxQuantity` triggers the snackbar's
  `show()` and does **not** call `onAdd`.
