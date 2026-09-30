import { create } from 'zustand';

interface SnackbarState {
  message: string | null;
  /** Bumped on every show() call, including repeats — StockSnackbar keys its
   *  auto-dismiss effect on this so a repeat tap restarts the countdown. */
  key: number;
  /** Px to float above whatever bar occupies the bottom of the current screen. */
  bottomOffset: number;
}

interface SnackbarActions {
  show: (message: string, bottomOffset?: number) => void;
  hide: () => void;
}

type SnackbarStore = SnackbarState & SnackbarActions;

export const useSnackbarStore = create<SnackbarStore>((set, get) => ({
  message: null,
  key: 0,
  bottomOffset: 0,

  show: (message, bottomOffset = 0) => {
    set({ message, bottomOffset, key: get().key + 1 });
  },

  hide: () => set({ message: null }),
}));
