import { COUNTRIES } from '../game/data';
import { decodeSaveGame, encodeSaveGame, MAX_SAVE_BYTES, type SaveGame } from '../save-game';
import { deleteSave, listSaves, readSave, writeSave, type SaveSummary } from '../save-storage';
import { languageControl, bindLanguageControl, localizeElement, registerTranslations, t } from '../i18n';
import './save-menu.css';

registerTranslations({
  '存档':'Save Game', '取档':'Load Game', '存档名称':'Save name', '新建存档':'New Save', '覆盖存档':'Overwrite',
  '删除存档':'Delete', '导出存档':'Export', '导入存档':'Import', '导出当前对局':'Export Current Game',
  '暂无存档。':'No saved games.', '正在读取存档…':'Reading saved games…', '正在处理存档…':'Processing save…',
  '存档成功。':'Game saved.', '存档已删除。':'Save deleted.', '存档已导入。':'Save imported.', '存档已导出。':'Save exported.',
  '请填写存档名称。':'Enter a save name.', '请先选择存档。':'Select a saved game.',
  '覆盖选中的存档？':'Overwrite the selected save?', '删除选中的存档？':'Delete the selected save?',
  '载入存档将替换当前对局。继续？':'Loading replaces the current game. Continue?', '确认':'Confirm', '取消':'Cancel', '返回':'Back',
  '存档数据无效。':'The save contains invalid data.', '存档版本不兼容。':'This save version is incompatible.',
  '存档文件超过 32 MB。':'Save files must not exceed 32 MB.',
  '浏览器存储空间不足。请导出存档后删除旧存档。':'Browser storage is full. Export saves before deleting old saves.',
  '浏览器无法保存或读取存档。请检查网站存储权限。':'The browser cannot access saves. Check site storage permissions.',
  '请关闭其他游戏页面后重试存档。':'Close other game pages and try again.',
  '存档已不存在。请刷新存档列表。':'This save no longer exists. Refresh the save list.',
  '请先准备游戏素材。':'Prepare the game assets first.',
});

interface SaveMenuContext {
  saving: boolean; playing: boolean;
  capture(name: string): SaveGame;
  load(save: SaveGame): Promise<void>;
  modal(title: string, body: string, actions: string): HTMLElement;
  back(): void;
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

function download(save: SaveGame) {
  const blob = new Blob([encodeSaveGame(save)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${save.name.replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 60) || 'game'}.rustalarm-save`;
  anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function showSaveMenu(context: SaveMenuContext): void {
  const { saving, playing } = context;
  const root = context.modal(saving ? '存档' : '取档', `
    <div class="save-menu">
      ${saving ? '<label class="save-name-label" for="save-name">存档名称</label><input type="text" id="save-name" maxlength="80" autocomplete="off"/>' : ''}
      <div id="save-list" class="save-list" aria-label="${t('取档')}"></div>
      <p id="save-status" role="status" aria-live="polite"></p>
      <div id="save-confirmation" hidden><p id="save-confirm-text"></p><button id="save-confirm">确认</button><button id="save-cancel">取消</button></div>
      <input id="save-file" type="file" accept=".rustalarm-save,.json" hidden/>
      <div class="save-actions">
        ${saving ? '<button id="save-new" class="primary">新建存档</button><button id="save-overwrite">覆盖存档</button>' : '<button id="save-load" class="primary">取档</button>'}
        <button id="save-delete">删除存档</button><button id="save-export">导出存档</button><button id="save-import">导入存档</button>
        ${saving ? '<button id="save-export-current">导出当前对局</button>' : ''}
      </div>
    </div>`, `<button id="saves-back">返回</button>${languageControl()}`);
  root.querySelector('.modal')!.classList.add('save-dialog');
  const get = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  let selected: SaveSummary | undefined, busy = false, rows: SaveSummary[] = [], statusMessage = '', confirmationMessage = '';
  let confirmation: (() => Promise<void>) | undefined;
  const name = () => {
    const value = get<HTMLInputElement>('save-name').value.trim();
    if (!value) throw new Error('请填写存档名称。');
    return value;
  };
  const status = (message: string) => { statusMessage = message; if (root.isConnected) get('save-status').textContent = t(message); };
  const buttons = () => {
    root.querySelectorAll<HTMLButtonElement>('.save-actions button, [data-save-id]').forEach(button => {
      button.disabled = busy || !!confirmation || (['save-overwrite','save-load','save-delete','save-export'].includes(button.id) && !selected);
    });
    if (saving) get<HTMLInputElement>('save-name').disabled = busy || !!confirmation;
  };
  const renderRows = () => {
    const container = get('save-list'); container.replaceChildren();
    if (!rows.length) { const empty = document.createElement('p'); empty.textContent = t('暂无存档。'); container.append(empty); }
    for (const row of rows) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.saveId = row.id;
      button.setAttribute('aria-pressed', String(selected?.id === row.id));
      const country = COUNTRIES.find(country => country.id === row.country);
      const elapsed = `${Math.floor(row.elapsed / 60)}:${String(Math.floor(row.elapsed % 60)).padStart(2, '0')}`;
      button.innerHTML = `<strong>${escape(row.name)}</strong><span>${escape(t(row.mapName))} · ${t(row.mode === 'bootcamp' ? '新兵训练营' : '遭遇战')} · ${escape(t(country?.name ?? row.country))}</span><span>${escape(new Date(row.savedAt).toLocaleString())} · ${elapsed}</span>`;
      button.onclick = () => { selected = row; if (saving) get<HTMLInputElement>('save-name').value = row.name; renderRows(); get<HTMLButtonElement>('save-' + (saving ? 'overwrite' : 'load')).focus(); };
      container.append(button);
    }
    buttons();
  };
  const refresh = async () => {
    rows = await listSaves();
    if (!root.isConnected) return;
    selected = rows.find(row => row.id === selected?.id); renderRows();
  };
  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    busy = true; buttons(); status('正在处理存档…');
    try { await operation(); } catch (error) { status(error instanceof Error ? error.message : '存档数据无效。'); }
    finally { busy = false; if (root.isConnected) buttons(); }
  };
  const confirm = (message: string, operation: () => Promise<void>) => {
    confirmation = operation; confirmationMessage = message; get('save-confirmation').hidden = false;
    get('save-confirm-text').textContent = t(message); buttons(); get('save-confirm').focus();
  };
  const dismissConfirmation = () => { confirmation = undefined; get('save-confirmation').hidden = true; buttons(); };
  get('save-confirm').onclick = () => { const action = confirmation; dismissConfirmation(); if (action) void run(action); };
  get('save-cancel').onclick = () => { dismissConfirmation(); get('saves-back').focus(); };
  get('saves-back').onclick = context.back;
  if (saving) {
    get<HTMLInputElement>('save-name').value = new Date().toLocaleString();
    get('save-new').onclick = () => void run(async () => { selected = await writeSave(context.capture(name())); await refresh(); status('存档成功。'); });
    get('save-overwrite').onclick = () => { const id = selected?.id; if (id) confirm('覆盖选中的存档？', async () => { selected = await writeSave(context.capture(name()), id); await refresh(); status('存档成功。'); }); };
    get('save-export-current').onclick = () => void run(async () => { download(context.capture(name())); status('存档已导出。'); });
  } else get('save-load').onclick = () => {
    const id = selected?.id; if (!id) return;
    const load = async () => { const data = await readSave(id); if (root.isConnected) await context.load(data); };
    if (playing) confirm('载入存档将替换当前对局。继续？', load); else void run(load);
  };
  get('save-delete').onclick = () => { const id = selected?.id; if (id) confirm('删除选中的存档？', async () => { await deleteSave(id); await refresh(); status('存档已删除。'); }); };
  get('save-export').onclick = () => { const id = selected?.id; if (id) void run(async () => { download(await readSave(id)); status('存档已导出。'); }); };
  get('save-import').onclick = () => get('save-file').click();
  get<HTMLInputElement>('save-file').onchange = () => {
    const input = get<HTMLInputElement>('save-file'), file = input.files?.[0]; input.value = '';
    if (!file) return;
    void run(async () => {
      if (file.size > MAX_SAVE_BYTES) throw new Error('存档文件超过 32 MB。');
      const save = decodeSaveGame(await file.text());
      if (!root.isConnected) return;
      selected = await writeSave(save); await refresh(); status('存档已导入。');
    });
  };
  bindLanguageControl(root, () => {
    localizeElement(root); renderRows(); status(statusMessage);
    if (confirmation) get('save-confirm-text').textContent = t(confirmationMessage);
  });
  buttons(); void run(async () => { status('正在读取存档…'); await refresh(); status(''); });
}
