import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Modal, ScrollView } from 'react-native';
import { OrderModificationSheet } from '../OrderModificationSheet';
import { VillageBottomSheet } from '../VillageBottomSheet';
import { rupees } from '@/src/shared/utils/currency';
import { useVillageStore } from '@/src/core/store/useVillageStore';

describe('OrderModificationSheet', () => {
  const mockStockInfo = [
    { productId: 'prod1', availableStock: 0 },
    { productId: 'prod2', availableStock: 1 },
  ];

  const mockCartItems = [
    {
      productId: 'prod1',
      name: 'Whole Wheat Bread',
      weight: '400 g pack',
      price: 45,
      image: 'bread.jpg',
      count: 2,
    },
    {
      productId: 'prod2',
      name: 'Farm Fresh Eggs',
      weight: '12 pc tray',
      price: 96,
      image: 'eggs.jpg',
      count: 3,
    },
  ];

  const mockProps = {
    visible: true,
    stockInfo: mockStockInfo,
    cartItems: mockCartItems,
    onClose: jest.fn(),
    onRetryCheckout: jest.fn(),
    onManualAdjustment: jest.fn(),
  };

  it('renders conflicts state when visible', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('A couple of things changed')).toBeTruthy();
    expect(
      screen.getByText('Some items in your cart are sold out or running low. Update your order to continue.')
    ).toBeTruthy();
  });

  it('displays out of stock item with Remove item button', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('Whole Wheat Bread')).toBeTruthy();
    // Routed through the shared `out_of_stock` i18n key as of the L4 i18n pass,
    // which renders "Out of Stock" (Title Case) — the same badge text every
    // other screen already uses for this status, rather than this component's
    // previously one-off "Out of stock".
    expect(screen.getByText('Out of Stock')).toBeTruthy();
    expect(screen.getByText('Remove item')).toBeTruthy();
  });

  it('displays low stock item with quantity stepper', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('Farm Fresh Eggs')).toBeTruthy();
    expect(screen.getByText('Only 1 left')).toBeTruthy();
  });

  it('calculates correct subtotal', () => {
    render(<OrderModificationSheet {...mockProps} />);

    // prod1 out of stock -> 45 * 0 = 0 units
    // prod2 capped at available stock -> 96 * 1 = 96 units
    // subtotal = 96 units, which rupees() renders as 96 * 20.
    expect(screen.getAllByText(rupees(96)).length).toBeGreaterThan(0);
  });

  it('calls onRetryCheckout when Update all tapped without manual changes', async () => {
    const mockRetryCheckout = jest.fn().mockResolvedValue(undefined);
    render(
      <OrderModificationSheet
        {...mockProps}
        onRetryCheckout={mockRetryCheckout}
      />
    );

    const updateAllButton = screen.getByText('Update all');
    fireEvent.press(updateAllButton);

    await waitFor(() => {
      expect(mockRetryCheckout).toHaveBeenCalled();
    });
  });

  // Regression: the pre-seeded quantities (prod1 capped to 0, prod2 to its
  // available 1) must reach the real cart even when the customer never
  // touched a stepper — otherwise "Update all" would retry with the
  // original, too-high quantities and the same conflict would recur.
  it('applies the pre-seeded caps to the cart even without manual changes', async () => {
    const mockManualAdjustment = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        onManualAdjustment={mockManualAdjustment}
        onRetryCheckout={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.press(screen.getByText('Update all'));

    await waitFor(() => {
      expect(mockManualAdjustment).toHaveBeenCalledWith({ prod1: 0, prod2: 1 });
    });
  });

  it('calls onManualAdjustment when user manually adjusts and taps Update all', async () => {
    const mockManualAdjustment = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        onManualAdjustment={mockManualAdjustment}
        onRetryCheckout={jest.fn().mockResolvedValue(undefined)}
      />
    );

    // prod2 is capped at its available stock of 1; stepping it down to 0 is a
    // real manual adjustment, which is what routes "Update all" down this branch.
    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    fireEvent.press(screen.getByText('Update all'));

    await waitFor(() => {
      expect(mockManualAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({ prod2: 0 }),
      );
    });
  });

  // prod2 has 3 of 3 available here so stepping it down leaves the row visible
  // (a row adjusted to 0 is hidden, and zeroing every row auto-closes the sheet).
  const adjustableProps = {
    ...mockProps,
    stockInfo: [
      { productId: 'prod1', availableStock: 0 },
      { productId: 'prod2', availableStock: 3 },
    ],
  };

  it('keeps a manual adjustment when the parent re-renders with equivalent props', () => {
    const { rerender } = render(<OrderModificationSheet {...adjustableProps} />);

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('3');
    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');

    // CartScreen builds `cartItems` inline with .map(), so every parent render
    // hands the sheet a fresh array with identical contents. That must not be
    // read as "new conflicts" and reset what the user just did.
    rerender(
      <OrderModificationSheet
        {...adjustableProps}
        stockInfo={adjustableProps.stockInfo.map(s => ({ ...s }))}
        cartItems={mockCartItems.map(i => ({ ...i }))}
      />
    );

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');
  });

  it('re-initialises when the conflicts themselves actually change', () => {
    const { rerender } = render(<OrderModificationSheet {...adjustableProps} />);

    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');

    // A genuinely different availability is new information from the server and
    // should re-seed the quantities.
    rerender(
      <OrderModificationSheet
        {...adjustableProps}
        stockInfo={[
          { productId: 'prod1', availableStock: 0 },
          { productId: 'prod2', availableStock: 1 },
        ]}
      />
    );

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('1');
  });

  it('renders in Telugu when the locale is te', () => {
    const originalLocale = useVillageStore.getState().locale;
    useVillageStore.setState({ locale: 'te' });
    try {
      render(<OrderModificationSheet {...mockProps} />);
      expect(screen.getByText('కొన్ని విషయాలు మారాయి')).toBeTruthy();
      expect(screen.getByText('ఉప మొత్తం')).toBeTruthy();
    } finally {
      act(() => { useVillageStore.setState({ locale: originalLocale }); });
    }
  });

  it('closes sheet when X button tapped', () => {
    const mockOnClose = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('close-button-conflicts');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error message on retry failure', async () => {
    const mockRetryCheckout = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
    render(
      <OrderModificationSheet
        {...mockProps}
        onRetryCheckout={mockRetryCheckout}
      />
    );

    const updateAllButton = screen.getByText('Update all');
    fireEvent.press(updateAllButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeTruthy();
    });
  });

  it('uses the shared sheet scroll view for rows and footer', () => {
    const view = render(<OrderModificationSheet {...mockProps} />);
    expect(view.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  });

  it('keeps the sheet open and rejects repeated taps and dismissals while retrying', async () => {
    let finishRetry!: () => void;
    const onRetryCheckout = jest.fn(() => new Promise<void>(resolve => {
      finishRetry = resolve;
    }));
    const onClose = jest.fn();
    const onManualAdjustment = jest.fn();
    const view = render(
      <OrderModificationSheet
        {...mockProps}
        onClose={onClose}
        onManualAdjustment={onManualAdjustment}
        onRetryCheckout={onRetryCheckout}
      />,
    );

    fireEvent.press(screen.getByText('Update all'));
    fireEvent.press(screen.getByText('...'));
    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    fireEvent.press(screen.getByTestId('close-button-conflicts'));
    fireEvent.press(screen.getByText('Cancel'));
    // Also exercise the shared sheet's backdrop dismissal callback.
    view.UNSAFE_getByType(VillageBottomSheet).props.onClose();

    expect(onManualAdjustment).toHaveBeenCalledTimes(1);
    expect(onRetryCheckout).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('1');
    expect(view.UNSAFE_getByType(VillageBottomSheet).props.dismissable).toBe(false);

    await act(async () => { finishRetry(); });
    expect(view.UNSAFE_getByType(VillageBottomSheet).props.dismissable).toBe(true);
    fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not let an old retry change a reopened sheet', async () => {
    let failOldRetry!: (error: Error) => void;
    const onRetryCheckout = jest.fn(() => new Promise<void>((_resolve, reject) => {
      failOldRetry = reject;
    }));
    const onClose = jest.fn();
    const view = render(
      <OrderModificationSheet {...mockProps} onClose={onClose} onRetryCheckout={onRetryCheckout} />,
    );
    fireEvent.press(screen.getByText('Update all'));
    view.rerender(
      <OrderModificationSheet {...mockProps} visible={false} onClose={onClose} onRetryCheckout={onRetryCheckout} />,
    );
    // UIKit finishes dismissing the old native modal before the queued reopen.
    act(() => { view.UNSAFE_getByType(Modal).props.onDismiss(); });
    view.rerender(
      <OrderModificationSheet {...mockProps} onClose={onClose} onRetryCheckout={onRetryCheckout} />,
    );

    await act(async () => { failOldRetry(new Error('Old request failed')); });
    expect(screen.queryByText('Old request failed')).toBeNull();
    expect(screen.getByText('Update all')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes a fully unavailable cart without submitting an empty order', () => {
    const onRetryCheckout = jest.fn();
    const onClose = jest.fn();
    const onManualAdjustment = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        stockInfo={[mockStockInfo[0]]}
        cartItems={[mockCartItems[0]]}
        onClose={onClose}
        onManualAdjustment={onManualAdjustment}
        onRetryCheckout={onRetryCheckout}
      />,
    );

    fireEvent.press(screen.getByText('Update all'));
    expect(onManualAdjustment).toHaveBeenCalledWith({ prod1: 0 });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRetryCheckout).not.toHaveBeenCalled();
  });

  it('keeps two variants of one product separate when applying stock caps', async () => {
    const stockInfo = [
      { productId: 'dal', variantId: 'small', availableStock: 2 },
      { productId: 'dal', variantId: 'large', availableStock: 1 },
    ];
    const cartItems = [
      { key: 'dal-v0', productId: 'dal', variantId: 'small', name: 'Dal 500 g', weight: '500 g', price: 40, image: '', count: 4 },
      { key: 'dal-v1', productId: 'dal', variantId: 'large', name: 'Dal 1 kg', weight: '1 kg', price: 70, image: '', count: 3 },
    ];
    const onManualAdjustment = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        stockInfo={stockInfo}
        cartItems={cartItems}
        onManualAdjustment={onManualAdjustment}
        onRetryCheckout={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Dal 500 g')).toBeTruthy();
    expect(screen.getByText('Dal 1 kg')).toBeTruthy();
    expect(screen.getByTestId('stepper-count-dal-v0')).toHaveTextContent('2');
    expect(screen.getByTestId('stepper-count-dal-v1')).toHaveTextContent('1');
    fireEvent.press(screen.getByTestId('stepper-dec-dal-v0'));
    expect(screen.getByTestId('stepper-count-dal-v0')).toHaveTextContent('1');
    expect(screen.getByTestId('stepper-count-dal-v1')).toHaveTextContent('1');
    fireEvent.press(screen.getByText('Update all'));

    await waitFor(() => {
      expect(onManualAdjustment).toHaveBeenCalledWith({ 'dal-v0': 1, 'dal-v1': 1 });
    });
  });
});
