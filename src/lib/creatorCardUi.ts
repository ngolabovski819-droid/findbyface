export interface CreatorCardUiData {
  username?: string;
  avatar?: string;
  header?: string;
  sponsored?: boolean;
  tags?: string[];
  additionalTagCount?: number;
  galleryImages?: string[];
  isVerified?: boolean;
  isverified?: boolean;
}

export function creatorCardImages(creator: CreatorCardUiData): string[] {
  return Array.from(new Set([
    creator.avatar,
    creator.header,
    ...(creator.galleryImages ?? []),
  ].map(value => value?.trim()).filter((value): value is string => Boolean(value))));
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Attributes consumed by the global creator-card enhancement layer. */
export function creatorCardDataAttributes(creator: CreatorCardUiData): string {
  const username = creator.username ?? '';
  const images = creatorCardImages(creator);
  const tags = creator.tags ?? [];
  const verified = creator.isVerified ?? creator.isverified ?? false;

  return [
    `data-card-username="${escapeAttribute(username)}"`,
    `data-card-images="${escapeAttribute(JSON.stringify(images))}"`,
    `data-card-sponsored="${creator.sponsored ? 'true' : 'false'}"`,
    `data-card-tags="${escapeAttribute(JSON.stringify(tags))}"`,
    `data-card-extra-tags="${creator.additionalTagCount ?? 0}"`,
    `data-card-verified="${verified ? 'true' : 'false'}"`,
  ].join(' ');
}
