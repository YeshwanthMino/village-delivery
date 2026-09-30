import React, { useContext, type MutableRefObject } from 'react';
import { NavigationContext, usePreventRemove } from '@react-navigation/native';

interface Props {
  enabled: boolean;
  leaving: MutableRefObject<boolean>;
  onBack: () => void;
}

/** Native-stack swipe/pop must respect the same address steps as the arrow. */
export function AddressBackGuard(props: Props) {
  const navigation = useContext(NavigationContext);
  // Also allow rendering the address view outside a navigator (previews/tests).
  return navigation ? <NativeGuard {...props} navigation={navigation} /> : null;
}

function NativeGuard({ enabled, leaving, onBack, navigation }: Props & {
  navigation: NonNullable<React.ContextType<typeof NavigationContext>>;
}) {
  usePreventRemove(enabled, ({ data }) => {
    if (!leaving.current && ['GO_BACK', 'POP', 'POP_TO_TOP'].includes(data.action.type)) onBack();
    else navigation.dispatch(data.action);
  });
  return null;
}
