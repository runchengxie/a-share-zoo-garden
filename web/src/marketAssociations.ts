import publication from "../../published/data/association_publication.json";
import snapshot from '../../published/data/market_associations.json';
import type { Locale } from './i18n';

export type AssociationStatus = 'pending' | 'confirmed' | 'expired';
export type AssociationTheme = 'animal' | 'plant';
export type AssociationRelation = 'homophone' | 'character_split' | 'zodiac' | 'narrative';
export type AssociationEvidence = 'media_explicit' | 'community_narrative';
interface Association {
  id: string;
  ts_code: string;
  name_at_source: string;
  theme: AssociationTheme;
  target_term: string;
  name_term: string;
  relation: AssociationRelation;
  evidence: AssociationEvidence;
  catalyst: 'zodiac_2027' | null;
  status: AssociationStatus;
  source_ids: string[];
  source_first_known_at: string;
  recorded_at: string;
  reviewed_at: string;
  review_due_at: string;
  summary: Record<Locale, string>;
  events: { at: string; status: AssociationStatus; reason: 'source_review'; reviewer: string }[];
  tracking_start: null;
}

// Reviewed static records are shipped with the site; daily index jobs do not own them.
export const associations = snapshot.entries as Association[];
export const associationSources = new Map(snapshot.sources.map(source => [source.id, source]));

export function formatAssociationTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Shanghai', timeZoneName: 'short',
  }).format(new Date(value));
}

export const associationPublication = publication;
