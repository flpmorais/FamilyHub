import { useContext } from 'react';
import { RepositoryContext, RepositoryContextValue } from '../repositories/repository.context';

export function useRepository<K extends keyof RepositoryContextValue>(
  name: K
): RepositoryContextValue[K] {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be called inside <RepositoryProvider>');
  }
  return context[name];
}
