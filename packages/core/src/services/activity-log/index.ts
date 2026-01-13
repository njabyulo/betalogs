import type {
  ISearchAdapter,
  ISearchAdapterExactSearchArgs,
  ISearchAdapterExactSearchResult,
} from "../../adapters/interfaces";
import { createSearchAdapter } from "../../adapters/open-search";

export interface IActivityLogService {
  searchExact(
    args: ISearchAdapterExactSearchArgs
  ): Promise<ISearchAdapterExactSearchResult[]>;
}

export interface IActivityLogServiceOptions {
  searchAdapter: ISearchAdapter;
}

export interface ICreateActivityLogServiceOptions {
  embedding: {
    provider: "google";
    model: "gemini-embedding-001";
    dimension: 3072;
  };
  opensearch: {
    node: string;
    index: string;
    username?: string;
    password?: string;
  };
}

class ActivityLogService implements IActivityLogService {
  private searchAdapter: ISearchAdapter;

  constructor(options: IActivityLogServiceOptions) {
    this.searchAdapter = options.searchAdapter;
  }

  async searchExact(
    args: ISearchAdapterExactSearchArgs
  ): Promise<ISearchAdapterExactSearchResult[]> {
    return await this.searchAdapter.exactSearch(args);
  }
}

export function createActivityLogService(
  options: ICreateActivityLogServiceOptions
): IActivityLogService {
  // Service factory can import adapter factories (per architecture rules)
  const searchAdapter = createSearchAdapter({
    embedding: options.embedding,
    opensearch: options.opensearch,
  });

  return new ActivityLogService({
    searchAdapter,
  });
}
