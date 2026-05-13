import { AppViewModel } from '@/src/features/initialization/viewmodels/AppViewModel';
import { Container } from './Container';

export const useInject = <T>(factory: () => T): T => factory();
export const useAppViewModel = (): AppViewModel => Container.appViewModel();
