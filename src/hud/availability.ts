/** A category exists only while it contains an unlocked or queued production item. */
import { CATALOG, type GameEngine, type ProductionCategory } from '../game';

export const productionTabs: ProductionCategory[] = ['structure','defense','infantry','vehicle'];
export function productionItems(game:GameEngine, category:ProductionCategory) {
  const unlocked=new Set(game.getAvailable(0).map(d=>d.id));
  const queues=game.players[0].queues;
  return Object.values(CATALOG).filter(d=>
    (category==='vehicle'?['vehicle','aircraft','naval'].includes(d.category):d.category===category) &&
    (unlocked.has(d.id)||queues[d.category].some(q=>q.type===d.id)));
}
export function availableTabs(game:GameEngine) {
  return productionTabs.filter(category=>productionItems(game,category).length>0 || category==='defense' && game.getSupport(0).length>0);
}
