import { useSnackbarStore } from '../useSnackbarStore';

const reset = () => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 });

describe('useSnackbarStore', () => {
  beforeEach(reset);

  it('starts with no message', () => {
    expect(useSnackbarStore.getState().message).toBeNull();
  });

  it('show() sets the message and bottomOffset', () => {
    useSnackbarStore.getState().show('We only have 1 left in stock', 56);

    const state = useSnackbarStore.getState();
    expect(state.message).toBe('We only have 1 left in stock');
    expect(state.bottomOffset).toBe(56);
  });

  it('show() defaults bottomOffset to 0 when omitted', () => {
    useSnackbarStore.getState().show('Capped out');
    expect(useSnackbarStore.getState().bottomOffset).toBe(0);
  });

  it('show() increments key every call, even with the same message', () => {
    useSnackbarStore.getState().show('Capped out');
    const firstKey = useSnackbarStore.getState().key;

    useSnackbarStore.getState().show('Capped out');
    expect(useSnackbarStore.getState().key).toBe(firstKey + 1);
  });

  it('hide() clears the message', () => {
    useSnackbarStore.getState().show('Capped out');
    useSnackbarStore.getState().hide();
    expect(useSnackbarStore.getState().message).toBeNull();
  });
});
