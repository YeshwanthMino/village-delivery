import { AppViewModel } from '../../features/initialization/viewmodels/AppViewModel';

export class Container {
  private static _appViewModel: AppViewModel | null = null;

  static appViewModel = (): AppViewModel => {
    if (!Container._appViewModel) {
      Container._appViewModel = new AppViewModel();
    }
    return Container._appViewModel;
  };

  static resetSession = (): void => {
    Container._appViewModel = null;
  };
}
