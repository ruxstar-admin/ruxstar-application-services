import { BusinessService } from '@/services/business-service';
import { TeamShopService } from '@/services/team-service';

/**
 * The shop screens for the owner, by business id in the vendor portal, or for someone on the team, by their place id in Work.
 * The calls are the same; only the routes differ.
 */
export function shopDesk(team: boolean) {
  const base = team ? '/(customer)/work/shop/[id]' : '/(vendor)/businesses/[id]';
  return {
    team,
    service: team ? TeamShopService : BusinessService,
    routes: {
      products: `${base}/products`,
      prices: `${base}/prices`,
      price: `${base}/prices/[product]`,
      details: `${base}/details`,
    },
  } as const;
}
