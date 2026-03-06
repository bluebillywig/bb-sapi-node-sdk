export interface ChannelDetailPageConfig {
  playerAlignment?: string;
  withinBorder?: boolean;
  backgroundColor?: string;
  showThumbnailAsBackground?: boolean;
  enableBackgroundBlur?: boolean;
  showRelatedItems?: boolean;
  relatedItemsLayout?: string;
}

export interface ChannelConfig {
  playIn?: string;
  detailPageConfig?: ChannelDetailPageConfig;
  blocks?: unknown[];
}

export interface ChannelProps {
  config?: ChannelConfig;
}
