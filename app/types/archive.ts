import type { ContentPage } from '@inteyvat-wiki/wiki-contracts/registry';
import type { DirectoryCategory } from '@inteyvat-wiki/wiki-contracts/category';
export type * from '@inteyvat-wiki/wiki-contracts/archive';

// Shared presentation consumes either archive or misc pages, not a fictitious archive page.
export type DirectoryPage = ContentPage<DirectoryCategory>;
