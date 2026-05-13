import { BehaviorSubject } from 'rxjs';
import { AppState } from '../domain/models/AppState';

export class AppViewModel {
  appState = new BehaviorSubject<AppState>(AppState.Initializing);

  async initialize(): Promise<void> {
    // Village Delivery always goes to Initialized — no auth screens
    this.appState.next(AppState.Initialized);
  }

  getCurrentAppState(): AppState {
    return this.appState.value;
  }
}
