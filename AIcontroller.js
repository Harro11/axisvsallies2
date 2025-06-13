import { UNIT_STATS } from './UnitStats';
import { UnitPurchaseSystem } from './UnitPurchaseSystem';
import { GameStateManager } from './GameStateManager';

export class AIController {
  constructor(gameState) {
    this.gameState = gameState;
  }

  takeTurn() {
    const player = this.gameState.getCurrentPlayer();
    if (player.type !== 'computer') return;

    console.log(`AI (${player.name}) is taking its turn...`);

    this.purchaseUnits(player);
    this.deployUnits(player);
    this.moveAndAttack(player);

    this.gameState.endTurn();
  }

  purchaseUnits(player) {
    const purchaseSystem = new UnitPurchaseSystem(this.gameState);
    const affordableUnits = Object.entries(UNIT_STATS)
      .filter(([unitName, data]) => data.cost <= player.ipc)
      .sort((a, b) => b[1].cost - a[1].cost); // Buy most expensive affordable units first

    for (let [unitName, data] of affordableUnits) {
      while (player.ipc >= data.cost) {
        const success = purchaseSystem.purchaseUnit(unitName, player);
        if (!success) break;
      }
    }

    console.log(`AI (${player.name}) purchased units.`);
  }

  deployUnits(player) {
    const purchaseSystem = new UnitPurchaseSystem(this.gameState);
    const capital = this.gameState.getCapitalTerritory(player.name);
    if (!capital) return;

    for (let unit of player.unitsToDeploy) {
      purchaseSystem.deployUnit(unit, capital);
    }

    console.log(`AI (${player.name}) deployed units to ${capital.name}`);
  }

  moveAndAttack(player) {
    const territories = this.gameState.getTerritoriesByOwner(player.name);

    for (let territory of territories) {
      for (let unit of territory.units) {
        const target = this.gameState.findNearestEnemyTerritory(territory, player.name);
        if (target && this.isAdvantageousAttack(unit, territory, target)) {
          this.gameState.moveUnit(unit, territory, target);
          console.log(`AI moved ${unit.name} from ${territory.name} to attack ${target.name}`);
        }
      }
    }
  }

  isAdvantageousAttack(unit, fromTerritory, toTerritory) {
    // Basic logic: attack if enemy is weaker or empty
    const enemyPower = toTerritory.units
      .filter(u => u.owner !== unit.owner)
      .reduce((sum, u) => sum + (UNIT_STATS[u.name]?.attack || 1), 0);

    const ownPower = fromTerritory.units
      .filter(u => u.owner === unit.owner)
      .reduce((sum, u) => sum + (UNIT_STATS[u.name]?.attack || 1), 0);

    return enemyPower === 0 || ownPower > enemyPower;
  }
}
