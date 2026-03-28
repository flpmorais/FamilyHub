export interface IOtaRepository {
  checkForUpdate(onUpdateReady?: () => void): Promise<boolean>;
  applyUpdate(): Promise<void>;
}
