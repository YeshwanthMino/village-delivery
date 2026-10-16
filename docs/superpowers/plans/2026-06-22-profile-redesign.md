# Profile Redesign + Address Edit/Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Profile screen as a flat menu list (orders, address book, share, about, WhatsApp, logout, version) and add Edit/Delete to saved delivery addresses.

**Architecture:** A presentational `ProfileRow` drives a rewritten `ProfileScreen` orchestrator with auth-gated rows. A new static `AboutScreen` gets its own route. Edit/Delete are added to the existing shared address manager (`DeliveryAddressScreen` list mode) and its view model, reusing the already-present `updateAddress`/`deleteAddress` API via a small testable `updateExistingAddress` helper.

**Tech Stack:** React Native + Expo Router, NativeWind (Tailwind classes), Zustand stores, lucide-react-native icons, Jest (jest-expo, pure-logic tests only — no RTL in this repo).

---

## File Structure

New files:

- `src/features/profile/views/components/ProfileRow.tsx` — presentational menu row (icon, label, chevron, variants).
- `src/features/profile/views/AboutScreen.tsx` — static about screen.
- `app/about.tsx` — route rendering `AboutScreen`.

Modified files:

- `src/base/constants/translations.ts` — new te/en keys.
- `src/features/profile/views/ProfileScreen.tsx` — full rewrite to flat list.
- `app/_layout.tsx` — register `about` route.
- `src/features/location/data/saveNewAddress.ts` — add `updateExistingAddress` helper.
- `src/features/location/data/__tests__/saveNewAddress.test.ts` — tests for the helper.
- `src/features/location/viewmodel/useAddAddressViewModel.ts` — edit mode (`editingId`, `beginEdit`, `reset`, update-aware `save`).
- `src/features/location/views/DeliveryAddressScreen.tsx` — inline edit/delete row actions + edit entry/seed + delete confirm.

Testing note: this repo has **no** `@testing-library/react-native` / `react-test-renderer`. Existing tests cover pure logic only (`saveNewAddress.test.ts`, `addressSelection.test.ts`). So we TDD the one new pure unit (`updateExistingAddress`) and verify all UI manually. Run the app with the repo's normal dev command to verify UI tasks.

---

## Task 1: Add translation keys

**Files:**
- Modify: `src/base/constants/translations.ts` (insert before the closing `};` at line 226)

- [ ] **Step 1: Add the new keys**

Insert this block just before the final `};` that closes `TRANSLATIONS`:

```ts
  // Profile menu
  profile_orders:         { te: 'నా ఆర్డర్లు',            en: 'Your orders' },
  profile_address_book:   { te: 'చిరునామా పుస్తకం',       en: 'Address book' },
  profile_share_app:      { te: 'యాప్‌ను షేర్ చేయండి',     en: 'Share the app' },
  profile_about:          { te: 'మా గురించి',              en: 'About us' },
  profile_version_label:  { te: 'వెర్షన్',                  en: 'Version' },
  share_message:          { te: 'విలేజ్ డెలివరీ యాప్‌ను డౌన్‌లోడ్ చేసుకోండి: https://village.app', en: 'Check out Village Delivery — fresh groceries to your door: https://village.app' },

  // About screen
  about_title:            { te: 'మా గురించి',              en: 'About us' },
  about_tagline:          { te: 'మీ ఊరికి తాజా డెలివరీ',    en: 'Fresh delivery to your village' },
  about_body:             { te: 'విలేజ్ డెలివరీ మీ స్థానిక దుకాణాల నుండి తాజా కిరాణా సామాగ్రిని మీ ఇంటి వద్దకు వేగంగా, నమ్మకంగా చేరుస్తుంది.', en: 'Village Delivery brings fresh groceries from your local stores straight to your door, fast and reliably.' },
  about_contact_label:    { te: 'మమ్మల్ని సంప్రదించండి',   en: 'Contact us' },

  // Address edit / delete
  edit_address:           { te: 'సవరించు',                 en: 'Edit' },
  delete_address:         { te: 'తొలగించు',                en: 'Delete' },
  delete_address_confirm: { te: 'ఈ చిరునామాను తొలగించాలా?', en: 'Delete this address?' },
  edit_address_title:     { te: 'చిరునామా సవరించండి',       en: 'Edit address' },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `translations.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(i18n): add profile menu, about, and address edit/delete keys"
```

---

## Task 2: ProfileRow component

**Files:**
- Create: `src/features/profile/views/components/ProfileRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

type Variant = 'default' | 'whatsapp' | 'danger';

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: Variant;
  showChevron?: boolean;
}

export const ProfileRow = ({
  icon,
  label,
  onPress,
  variant = 'default',
  showChevron = true,
}: ProfileRowProps) => {
  const { locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  const isWa = variant === 'whatsapp';
  const isDanger = variant === 'danger';

  const containerCls = isWa ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100';
  const iconWrapCls = isDanger ? 'bg-red-50' : isWa ? 'bg-white' : 'bg-green-50';
  const labelCls = isDanger ? 'text-red-600' : isWa ? 'text-green-700' : 'text-slate-900';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 mb-3 border ${containerCls}`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${iconWrapCls}`}>
        {icon}
      </View>
      <Text className={`flex-1 font-semibold text-base ${labelCls}`} style={teFont}>
        {label}
      </Text>
      {showChevron && !isDanger ? <ChevronRight size={20} color="#cbd5e1" /> : null}
    </TouchableOpacity>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `ProfileRow.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/views/components/ProfileRow.tsx
git commit -m "feat(profile): add reusable ProfileRow component"
```

---

## Task 3: Rewrite ProfileScreen as a flat menu

**Files:**
- Modify (full rewrite): `src/features/profile/views/ProfileScreen.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Info, LogOut, MapPin, MessageCircle, Package, Share2, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Support } from '@/src/base/constants/AppConstants';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { ProfileRow } from './components/ProfileRow';

/** Best-effort display name from the (loosely-typed) profile returned by /app/auth/me. */
function displayName(user: any): string | null {
  if (!user) return null;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.name || null;
}

/** Best-effort phone, preferring the profile then the persisted login number. */
function displayPhone(user: any, fallback: string | null): string | null {
  return user?.mobileNumber || user?.phoneNumber || fallback || null;
}

export const ProfileScreen = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const bottomPad = TAB_BAR_CONTENT_HEIGHT + bottom + 24;

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const storeMobile = useAuthStore(s => s.mobileNumber);
  const logout = useAuthStore(s => s.logout);
  const [loginVisible, setLoginVisible] = useState(false);

  const name = displayName(user);
  const phone = displayPhone(user, storeMobile);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const initial = (name?.trim()?.[0] ?? '🙂').toUpperCase();

  const handleLogout = () => {
    Alert.alert(t('profile_logout_btn'), '', [
      { text: 'Cancel', style: 'cancel' },
      { text: t('profile_logout_btn'), style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

  const openWhatsApp = async () => {
    const message = encodeURIComponent('నమస్కారం, నాకు సహాయం కావాలి.');
    const whatsappUrl = `whatsapp://send?phone=${Support.WHATSAPP_NUMBER}&text=${message}`;
    const webUrl = `https://wa.me/${Support.WHATSAPP_NUMBER}?text=${message}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      await Linking.openURL(canOpen ? whatsappUrl : webUrl);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: t('share_message') });
    } catch {
      // user-cancelled share is a no-op
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        {isAuthenticated ? (
          /* Header card */
          <View className="flex-row items-center gap-3 bg-green-600 rounded-2xl px-4 py-5 mb-5">
            <View className="w-14 h-14 rounded-full bg-white/25 items-center justify-center">
              <Text className="text-white font-black text-xl">{initial}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-black text-lg" style={teFont} numberOfLines={1}>
                {name ?? t('profile_greeting')}
              </Text>
              {phone ? (
                <Text className="text-white/80 text-sm" style={teRegular}>{phone}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          /* Sign-in card */
          <View className="bg-white rounded-2xl px-5 py-6 mb-5 border border-slate-100 items-center">
            <View className="w-16 h-16 bg-green-50 rounded-full items-center justify-center mb-4">
              <User size={32} color="#16a34a" />
            </View>
            <Text className="text-slate-900 font-black text-lg mb-1 text-center" style={teFont}>
              {t('sign_in_title')}
            </Text>
            <Text className="text-slate-500 text-sm text-center mb-5" style={teRegular}>
              {t('sign_in_subtitle')}
            </Text>
            <TouchableOpacity
              onPress={() => setLoginVisible(true)}
              className="bg-green-600 rounded-2xl px-10 py-3"
            >
              <Text className="text-white font-bold text-base" style={teFont}>{t('sign_in_btn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account rows (signed-in only) */}
        {isAuthenticated ? (
          <>
            <ProfileRow
              icon={<Package size={20} color="#16a34a" />}
              label={t('profile_orders')}
              onPress={() => router.push('/(dashboard)/orders' as any)}
            />
            <ProfileRow
              icon={<MapPin size={20} color="#16a34a" />}
              label={t('profile_address_book')}
              onPress={() => router.push('/address/add' as any)}
            />
          </>
        ) : null}

        {/* Public rows (always) */}
        <ProfileRow
          icon={<Share2 size={20} color="#16a34a" />}
          label={t('profile_share_app')}
          onPress={handleShare}
        />
        <ProfileRow
          icon={<Info size={20} color="#16a34a" />}
          label={t('profile_about')}
          onPress={() => router.push('/about' as any)}
        />
        <ProfileRow
          icon={<MessageCircle size={20} color="#16a34a" />}
          label={t('whatsapp_chat')}
          onPress={openWhatsApp}
          variant="whatsapp"
        />

        {/* Logout (signed-in only) */}
        {isAuthenticated ? (
          <ProfileRow
            icon={<LogOut size={20} color="#dc2626" />}
            label={t('profile_logout_btn')}
            onPress={handleLogout}
            variant="danger"
          />
        ) : null}

        <Text className="text-slate-400 text-xs text-center mt-4" style={teRegular}>
          {t('profile_version_label')} {appVersion}
        </Text>
      </ScrollView>

      <LoginBottomSheet
        mode="auth"
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onComplete={() => setLoginVisible(false)}
      />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `ProfileScreen.tsx`.

- [ ] **Step 3: Manual verification**

Launch the app, open the Profile tab.
Expected (signed-in): green header with initial/name/phone; rows Your orders, Address book, Share the app, About us, WhatsApp support (green), Logout (red); "Version 1.0.0" footer. Your orders → Orders tab; Address book → address manager; Share → OS share sheet; Logout → confirm alert.
Expected (signed-out): sign-in card; only Share / About us / WhatsApp rows; version footer; no account rows or logout.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/views/ProfileScreen.tsx
git commit -m "feat(profile): rebuild profile screen as flat menu list"
```

---

## Task 4: AboutScreen + route

**Files:**
- Create: `src/features/profile/views/AboutScreen.tsx`
- Create: `app/about.tsx`
- Modify: `app/_layout.tsx` (add `<Stack.Screen name="about" />` after line 46 `address/add`)

- [ ] **Step 1: Create AboutScreen**

```tsx
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const AboutScreen = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-900 font-black text-xl" style={teFont}>{t('about_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-3xl bg-green-600 items-center justify-center mb-3">
            <Text className="text-white font-black text-3xl">V</Text>
          </View>
          <Text className="text-slate-900 font-black text-2xl" style={teFont}>Village</Text>
          <Text className="text-slate-500 text-sm mt-1 text-center" style={teRegular}>{t('about_tagline')}</Text>
        </View>

        <Text className="text-slate-700 text-base leading-6 mb-6" style={teRegular}>{t('about_body')}</Text>

        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3" style={teFont}>
          {t('about_contact_label')}
        </Text>
        <View className="bg-white rounded-2xl px-4 py-4 border border-slate-100 mb-6">
          <Text className="text-slate-900 text-base" style={teRegular}>support@village.app</Text>
        </View>

        <Text className="text-slate-400 text-xs text-center" style={teRegular}>
          {t('profile_version_label')} {appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Create the route**

`app/about.tsx`:

```tsx
import { AboutScreen } from '@/src/features/profile/views/AboutScreen';

export default function AboutRoute() {
  return <AboutScreen />;
}
```

- [ ] **Step 3: Register the route in the root stack**

In `app/_layout.tsx`, add a line immediately after `<Stack.Screen name="address/add" />`:

```tsx
              <Stack.Screen name="about" />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AboutScreen.tsx` / `app/about.tsx`.

- [ ] **Step 5: Manual verification**

From Profile, tap About us. Expected: About screen with Village logo, tagline, body text, contact email, version, and a working back arrow.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/views/AboutScreen.tsx app/about.tsx app/_layout.tsx
git commit -m "feat(profile): add About us screen and route"
```

---

## Task 5: updateExistingAddress helper (TDD)

**Files:**
- Modify: `src/features/location/data/saveNewAddress.ts`
- Test: `src/features/location/data/__tests__/saveNewAddress.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `saveNewAddress.test.ts`:

```ts
import { updateExistingAddress } from '../saveNewAddress';

const updated: Address = {
  id: 'new1',
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: '99 New St',
  tag: 'home',
  isDefault: true,
};

it('updates, selects, refreshes, and returns the updated address in order', async () => {
  const calls: string[] = [];
  const setSelected = jest.fn(async () => { calls.push('setSelected'); });
  const setSaved = jest.fn(() => { calls.push('setSaved'); });

  const result = await updateExistingAddress('new1', input, {
    update: jest.fn(async () => { calls.push('update'); return updated; }),
    list: jest.fn(async () => { calls.push('list'); return [updated]; }),
    setSelected,
    setSaved,
  });

  expect(result).toBe(updated);
  expect(calls).toEqual(['update', 'setSelected', 'list', 'setSaved']);
  expect(setSelected).toHaveBeenCalledWith(updated);
  expect(setSaved).toHaveBeenCalledWith([updated]);
});

it('propagates an update error and does not refresh', async () => {
  const setSaved = jest.fn();
  await expect(
    updateExistingAddress('new1', input, {
      update: jest.fn(async () => { throw new Error('boom'); }),
      list: jest.fn(async () => []),
      setSelected: jest.fn(),
      setSaved,
    }),
  ).rejects.toThrow('boom');
  expect(setSaved).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest saveNewAddress -t "updates, selects"`
Expected: FAIL — `updateExistingAddress` is not exported / not a function.

- [ ] **Step 3: Implement the helper**

Append to `saveNewAddress.ts`:

```ts
export interface UpdateAddressDeps {
  update: (id: string, input: CreateAddressInput) => Promise<Address>;
  list: () => Promise<Address[]>;
  setSelected: (address: Address) => void | Promise<void>;
  setSaved: (addresses: Address[]) => void;
}

/** Update + select + refresh. Returns the updated address. */
export async function updateExistingAddress(
  id: string,
  input: CreateAddressInput,
  deps: UpdateAddressDeps,
): Promise<Address> {
  const updated = await deps.update(id, input);
  await deps.setSelected(updated);
  const fresh = await deps.list();
  deps.setSaved(fresh);
  return updated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest saveNewAddress`
Expected: PASS — all four tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/data/saveNewAddress.ts src/features/location/data/__tests__/saveNewAddress.test.ts
git commit -m "feat(location): add updateExistingAddress helper with tests"
```

---

## Task 6: Edit mode in useAddAddressViewModel

**Files:**
- Modify: `src/features/location/viewmodel/useAddAddressViewModel.ts`

- [ ] **Step 1: Update imports**

Replace the existing locationApi import line:

```ts
import { createAddress, listAddresses, type CreateAddressInput } from '../data/locationApi';
import { saveNewAddress } from '../data/saveNewAddress';
```

with:

```ts
import { createAddress, listAddresses, updateAddress, type CreateAddressInput } from '../data/locationApi';
import { saveNewAddress, updateExistingAddress } from '../data/saveNewAddress';
import { DEFAULT_REGION } from './useMapPickerViewModel';
import type { Address } from '../domain/models';
```

(Keep the existing `import type { AddressTag } from '../domain/models';` line.)

- [ ] **Step 2: Add editingId state**

Immediately after `const [error, setError] = useState<string | null>(null);` add:

```ts
  const [editingId, setEditingId] = useState<string | null>(null);
```

- [ ] **Step 3: Add beginEdit and reset**

Add these just before the `const save = useCallback(...)` declaration:

```ts
  const beginEdit = useCallback((address: Address) => {
    setEditingId(address.id);
    setAddressLine1(address.addressLine1 ?? '');
    setLandmark(address.landmark ?? '');
    setTag(address.tag);
    setIsDefault(address.isDefault);
    setError(null);
    if (address.latitude != null && address.longitude != null) {
      map.onRegionSettled({
        latitude: address.latitude,
        longitude: address.longitude,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      });
    }
  }, [map]);

  const reset = useCallback(() => {
    setEditingId(null);
    setAddressLine1('');
    setLandmark('');
    setTag('home');
    setIsDefault(false);
    setError(null);
  }, []);
```

- [ ] **Step 4: Route save() to update when editing**

In the `save` callback, replace the existing `try { await saveNewAddress(...) ... }` block with:

```ts
    try {
      if (editingId) {
        await updateExistingAddress(editingId, input, {
          update: updateAddress,
          list: listAddresses,
          setSelected: setSelectedAddress,
          setSaved: setSavedAddresses,
        });
      } else {
        await saveNewAddress(input, {
          create: createAddress,
          list: listAddresses,
          setSelected: setSelectedAddress,
          setSaved: setSavedAddresses,
        });
      }
      return true;
    } catch (e: any) {
      setError(e?.fullMessage || e?.message || 'Could not save address. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
```

Then add `editingId` to the `save` callback's dependency array (append it to the existing list).

- [ ] **Step 5: Export the new members**

In the returned object, add `editingId`, `beginEdit`, and `reset`:

```ts
  return {
    map,
    addressLine1, setAddressLine1,
    landmark, setLandmark,
    tag, setTag,
    isDefault, setIsDefault,
    saving, error, canSave, save,
    editingId, beginEdit, reset,
  };
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `useAddAddressViewModel.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/features/location/viewmodel/useAddAddressViewModel.ts
git commit -m "feat(location): add edit mode to add-address view model"
```

---

## Task 7: Edit/Delete row actions in DeliveryAddressScreen

**Files:**
- Modify: `src/features/location/views/DeliveryAddressScreen.tsx`

- [ ] **Step 1: Update imports**

Add `Alert` to the `react-native` import:

```ts
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
```

Add `Pencil` and `Trash2` to the lucide import (keep existing names):

```ts
import { ArrowLeft, Check, LocateFixed, Pencil, Plus, Trash2 } from 'lucide-react-native';
```

Add `deleteAddress` to the locationApi import. If the file does not yet import from locationApi, add:

```ts
import { deleteAddress } from '../data/locationApi';
```

Extend the models type import to include `Address`:

```ts
import type { Address, AddressTag } from '../domain/models';
```

- [ ] **Step 2: Read setSavedAddresses from the store**

After the existing `const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);` line, add:

```ts
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);
```

- [ ] **Step 3: Skip GPS auto-detect when editing**

Change the entering-add-mode effect body from:

```ts
    if (mode === 'add') void map.initialDetect();
```

to:

```ts
    if (mode === 'add' && !vm.editingId) void map.initialDetect();
```

- [ ] **Step 4: Reset edit state on back from add mode**

Change `goBack` to also clear the edit state:

```ts
  const goBack = () => {
    if (mode === 'add') { setMode('list'); setShowForm(false); vm.reset(); return; }
    backToCart();
  };
```

- [ ] **Step 5: Add onEdit, onDelete, and update onSave**

Add these near the other handlers (e.g. after `onSelectExisting`):

```ts
  const onEdit = (a: Address) => {
    vm.beginEdit(a);
    setShowForm(true);
    setMode('add');
  };

  const onDelete = (a: Address) => {
    Alert.alert(t('delete_address_confirm'), '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('delete_address'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddress(a.id);
            setSavedAddresses(savedAddresses.filter((x) => x.id !== a.id));
          } catch {
            Alert.alert('Error', 'Could not delete address.');
          }
        },
      },
    ]);
  };
```

Replace the existing `onSave` with one that returns to the list after an edit:

```ts
  const onSave = async () => {
    const editing = !!vm.editingId;
    if (await vm.save()) {
      if (editing) { setMode('list'); setShowForm(false); vm.reset(); }
      else backToCart();
    }
  };
```

- [ ] **Step 6: Replace the saved-address row with action buttons**

Replace the entire `savedAddresses.map((a) => { ... })` block (the `<TouchableOpacity key={a.id} ...> ... </TouchableOpacity>` returned per address) with:

```tsx
              {savedAddresses.map((a) => {
                const active = a.id === selectedAddressId;
                return (
                  <View
                    key={a.id}
                    className={`flex-row items-center rounded-2xl px-3 py-3 mb-3 border ${active ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-white'}`}
                  >
                    <TouchableOpacity
                      onPress={() => onSelectExisting(a.id)}
                      accessibilityRole="button"
                      className="flex-1 flex-row items-center"
                    >
                      <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                        <Text className="text-xl leading-none">{TAG_EMOJI[a.tag]}</Text>
                      </View>
                      <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={2}>
                        {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                      </Text>
                      {active ? <Check size={18} color="#16a34a" /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onEdit(a)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('edit_address')}
                      className="w-9 h-9 ml-1 rounded-lg bg-slate-100 items-center justify-center"
                    >
                      <Pencil size={15} color="#0f172a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(a)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('delete_address')}
                      className="w-9 h-9 ml-1 rounded-lg bg-red-50 items-center justify-center"
                    >
                      <Trash2 size={15} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
```

- [ ] **Step 7: Show edit title in add-mode header**

In the add-mode header pill, change:

```tsx
            <Text className="text-slate-900 font-bold text-base">{t('add_new_address')}</Text>
```

to:

```tsx
            <Text className="text-slate-900 font-bold text-base">
              {vm.editingId ? t('edit_address_title') : t('add_new_address')}
            </Text>
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `DeliveryAddressScreen.tsx`.

- [ ] **Step 9: Run the full test suite**

Run: `npx jest`
Expected: PASS — all tests green (no regressions).

- [ ] **Step 10: Manual verification**

Open Profile → Address book (signed-in, with ≥1 saved address).
- Tap a row body → selects it as delivery address (returns to caller).
- Tap ✏️ → opens map+form pre-filled (line 1, landmark, tag, default), header reads "Edit address"; Save updates the address and returns to the list.
- Tap 🗑️ → confirm alert; confirming removes the row; if it was selected, selection re-seeds automatically.
- Back arrow from edit returns to the list without saving.

- [ ] **Step 11: Commit**

```bash
git add src/features/location/views/DeliveryAddressScreen.tsx
git commit -m "feat(location): inline edit/delete actions for saved addresses"
```

---

## Self-Review Notes

- **Spec coverage:** flat list (Tasks 2-3), header card + signed-out public rows (Task 3), orders/address/about/share/whatsapp/logout wiring (Task 3), version via expo-constants (Tasks 3-4), AboutScreen + route (Task 4), edit/delete affordance + behavior (Tasks 5-7), i18n keys (Task 1). All covered.
- **No new API needed:** `updateAddress`/`deleteAddress` already exist in `locationApi.ts`.
- **Selection clearing on delete** is handled by the store's `setSavedAddresses` (`seedSelectedId`), so no extra clear call is required.
- **Type consistency:** `beginEdit`, `reset`, `editingId` defined in Task 6 are consumed in Task 7; `updateExistingAddress` + `UpdateAddressDeps` defined in Task 5 are consumed in Task 6.
