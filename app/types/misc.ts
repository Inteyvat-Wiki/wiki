import type { PageDataTrait } from '~/types/common';
import type { MiscRecord, MiscImageSource, MiscType, MiscRelation as RawMiscRelation } from '~~/shared/misc';

export type { MiscType, MiscSource, MiscSection } from '~~/shared/misc';
export type MiscRelation = Omit<RawMiscRelation, 'source_id'>;
export type MiscImage = MiscImageSource & { url: string | null };
export type MiscItem = Omit<MiscRecord, 'id' | 'order' | 'show' | 'version' | 'images' | 'relations'> & {
    images: MiscImage[]; relations: MiscRelation[];
};
export interface MiscPageData extends PageDataTrait { type: MiscType; description: string; source_id?: string; tutorial_category?: string }
