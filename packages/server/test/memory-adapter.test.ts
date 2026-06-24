import { runStorageAdapterConformance } from './support/conformance.js';
import { InMemoryAdapter } from './support/memory-adapter.js';

runStorageAdapterConformance('InMemoryAdapter', () => new InMemoryAdapter());
