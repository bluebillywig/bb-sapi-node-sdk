export interface PlaylistProps {
  title?: string;
  description?: string;
  status?: string;
  type?: string;
  query?: string;
  mediatype?: string;
  usetype?: string;
  copyright?: string;
  author?: string;
  deeplinkUrl?: string;
  shortTitle?: string;
  externalUrl?: string;
  shuffleOrder?: boolean;
  useSuggest?: boolean;
  extraSuggestQuery?: string;
  allowDatasource?: boolean;
  limit?: number;
  sort?: string;
}
