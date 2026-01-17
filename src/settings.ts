import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalReferer from './main';

export interface LocalRefererSettings {
	defaultPath: string;
}

export const DEFAULT_SETTINGS: LocalRefererSettings = {
	defaultPath: ''
}

export class LocalRefererSettingTab extends PluginSettingTab {
	plugin: LocalReferer;

	constructor(app: App, plugin: LocalReferer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default Path')
			.setDesc('The default directory to open when selecting a file. If empty, defaults to your home directory.')
			.addText(text => text
				.setPlaceholder('/path/to/files')
				.setValue(this.plugin.settings.defaultPath)
				.onChange(async (value) => {
					this.plugin.settings.defaultPath = value;
					await this.plugin.saveSettings();
				}));
	}
}

