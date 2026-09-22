// Per-match debug controls; Bootcamp production rules are enforced by the engine.
import type { GameEngine } from './game';
import type { SoundSystem } from './assets';
import { localizeElement, registerTranslations } from './i18n';

registerTranslations({
  '调试面板': 'Debug Panel',
  '我方': 'Friendly side',
  '敌方': 'Enemy side',
  '增加 10,000 资金': 'Add 10,000 credits',
  '减少 10,000 资金': 'Remove 10,000 credits',
  '地图全开': 'Reveal entire map',
  '瞬间建造和雇佣': 'Instant construction & recruitment',
  '关闭所有声音': 'Mute all audio',
  '本场战斗已结束，开始新游戏后可使用调试选项。': 'This battle has ended. Start a new game to use the debug options.',
});

type DebugSide = 'friendly' | 'enemy';

function sideControls(side: DebugSide, title: string, game: GameEngine): string {
  const playerIds = game.players.filter(player => game.isAllied(game.localPlayerId, player.id) === (side === 'friendly')).map(player => player.id);
  const reveal = playerIds.length > 0 && playerIds.every(playerId => game.getDebugMapReveal(playerId));
  const instant = playerIds.length > 0 && playerIds.every(playerId => game.getDebugInstantProduction(playerId));
  const disabled = playerIds.length === 0 ? 'disabled' : '';
  return `<fieldset class="debug-side" data-debug-side="${side}"><legend>${title}</legend>
    <div class="debug-money">
      <button type="button" data-debug="credits" data-amount="10000" ${disabled}>增加 10,000 资金</button>
      <button type="button" data-debug="credits" data-amount="-10000" ${disabled}>减少 10,000 资金</button>
    </div>
    <label><input type="checkbox" data-debug="reveal" ${disabled} ${reveal ? 'checked' : ''}>地图全开</label>
    <label><input type="checkbox" data-debug="instant" ${disabled} ${instant ? 'checked' : ''}>瞬间建造和雇佣</label>
  </fieldset>`;
}

export function mountDebugPanel(root: HTMLElement, game: GameEngine, sound: SoundSystem, onChange: () => void): HTMLElement {
  const panel = document.createElement('details');
  panel.className = 'debug-panel';
  panel.innerHTML = `<summary>调试面板</summary><div class="debug-controls">
    ${sideControls('friendly', '我方', game)}
    ${sideControls('enemy', '敌方', game)}
    <label><input type="checkbox" data-debug="mute" ${sound.muted ? 'checked' : ''}>关闭所有声音</label>
    <p data-debug-status role="status" hidden></p>
  </div>`;
  root.append(panel);
  const active = () => {
    if (game.status === 'playing' && !game.getPlayer()?.defeated) return true;
    const status = panel.querySelector<HTMLElement>('[data-debug-status]')!;
    status.hidden = false;
    status.textContent = '本场战斗已结束，开始新游戏后可使用调试选项。';
    localizeElement(panel);
    return false;
  };
  const playerIds = (control: HTMLElement) => {
    const side = control.closest<HTMLElement>('[data-debug-side]')?.dataset.debugSide as DebugSide;
    return game.players.filter(player => game.isAllied(game.localPlayerId, player.id) === (side === 'friendly')).map(player => player.id);
  };
  panel.querySelectorAll<HTMLButtonElement>('[data-debug="credits"]').forEach(button => {
    button.onclick = () => {
      if (!active()) return;
      for (const playerId of playerIds(button)) game.adjustDebugCredits(Number(button.dataset.amount), playerId);
      onChange();
    };
  });
  panel.querySelectorAll<HTMLInputElement>('input[data-debug]').forEach(input => {
    input.onchange = () => {
      if (input.dataset.debug === 'mute') sound.setMuted(input.checked);
      else if (!active()) { input.checked = !input.checked; return; }
      else if (input.dataset.debug === 'reveal') {
        for (const playerId of playerIds(input)) game.setDebugMapReveal(input.checked, playerId);
      } else {
        for (const playerId of playerIds(input)) game.setDebugInstantProduction(input.checked, playerId);
      }
      onChange();
    };
  });
  // Controls retain normal keyboard navigation without issuing battlefield shortcuts.
  panel.addEventListener('keydown', event => event.stopPropagation());
  panel.addEventListener('keyup', event => event.stopPropagation());
  localizeElement(panel);
  return panel.querySelector<HTMLElement>('.debug-controls')!;
}
