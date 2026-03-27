export interface IOtaRepository {
  checkForUpdate(): Promise<boolean>;
  applyUpdate(): Promise<void>;
}
