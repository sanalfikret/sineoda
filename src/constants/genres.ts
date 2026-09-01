export {
  BROWSE_GENRES,
  BROWSE_GENRES_EXTRA,
  BROWSE_GENRES_PRIORITY,
  CONTENT_GENRES,
  genreToCategoryId,
  type BrowseGenre,
} from '../../shared/catalog/genres'

export { editorialCategoryLabels } from '../../shared/catalog/editorialRows'

export const STREAM_PROVIDERS = [
  { id: 'mux', label: 'Mux' },
  { id: 'cloudflare', label: 'Cloudflare Stream' },
  { id: 'bunny', label: 'Bunny.net' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'custom', label: 'Özel URL / CDN' },
] as const

export type StreamProvider = (typeof STREAM_PROVIDERS)[number]['id']
