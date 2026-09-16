import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { logger } from '@/src/base/services/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for render-phase throws.
 *
 * Without this a single bad value — most plausibly a malformed API payload
 * reaching render through one of the untyped mappers — unmounts the entire app
 * to a white screen with no way back. Resetting re-mounts the subtree, which is
 * enough to recover when the cause was transient data rather than corrupt state.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Unhandled render error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Text className="text-slate-900 font-black text-xl text-center">
          Something went wrong
        </Text>
        <Text className="text-slate-500 text-sm text-center mt-2">
          The app hit an unexpected problem. Try again — your cart and address are
          saved.
        </Text>
        {__DEV__ && (
          <Text className="text-red-600 text-xs text-center mt-4">{error.message}</Text>
        )}
        <TouchableOpacity
          onPress={this.reset}
          testID="error-boundary-retry"
          className="bg-green-600 rounded-xl px-6 py-3 mt-6"
        >
          <Text className="text-white font-bold">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
