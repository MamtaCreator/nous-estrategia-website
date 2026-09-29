import { IconName } from './site';

export type PillarMedia =
  | { type: 'video'; src: string; poster: string }
  | { type: 'image'; src: string };

export interface Pillar {
  slug: string;
  num: number;
  color: string;
  icon: IconName;
  media: PillarMedia;
}

export const PILLARS: Pillar[] = [
  {
    slug: 'finance',
    num: 1,
    color: '#2E74C9',
    icon: 'chart',
    media: {
      type: 'video',
      src: 'videos/finance-docs.mp4',
      poster: 'images/finance-docs-poster.jpg'
    }
  },
  {
    slug: 'marketing',
    num: 2,
    color: '#6EC6E0',
    icon: 'megaphone',
    media: {
      type: 'video',
      src: 'videos/office.mp4',
      poster: 'images/office-poster.jpg'
    }
  },
  {
    slug: 'process',
    num: 3,
    color: '#4A4FA0',
    icon: 'process',
    media: {
      type: 'image',
      src: 'images/pillar-process.jpg'
    }
  },
  {
    slug: 'ai',
    num: 4,
    color: '#7C5AA6',
    icon: 'chip',
    media: {
      type: 'video',
      src: 'videos/team-laptop.mp4',
      poster: 'images/team-laptop-poster.jpg'
    }
  }
];

export const pillarBySlug = (slug: string | null | undefined): Pillar | undefined =>
  PILLARS.find((p) => p.slug === slug);
