import { Kbd } from "../components/Kbd.tsx";
import { registry } from "../commands/index.ts";

/** Every bound shortcut, grouped by command category. Rendered from the command
 * registry so the list can never drift from the real keymap. */
export function ShortcutsTab() {
  const groups = new Map<string, { id: string; title: string; chord: string }[]>();
  for (const command of registry.getAll()) {
    const chord = command.defaultKeys?.[0];
    if (!chord) continue;
    const list = groups.get(command.category) ?? [];
    list.push({ id: command.id, title: command.title, chord });
    groups.set(command.category, list);
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Keyboard shortcuts</h3>
      <p className="settings-section__desc">
        Every command is also reachable from the command palette.
      </p>
      {[...groups.entries()].map(([category, commands]) => (
        <section key={category} className="shortcut-group">
          <h4 className="shortcut-group__title">{category}</h4>
          <div className="shortcut-list">
            {commands.map((command) => (
              <div key={command.id} className="shortcut-item">
                <span>{command.title}</span>
                <Kbd chord={command.chord} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
