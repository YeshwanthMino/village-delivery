import { AppViewModel } from '../../features/initialization/viewmodels/AppViewModel';
import { Container } from './Container';

export const inject = <T>(factory: () => T): T => factory();
export const useInject = <T>(factory: () => T): T => factory();
export const useAppViewModel = (): AppViewModel => Container.appViewModel();
