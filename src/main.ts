import { Editor, MarkdownView, Menu, Notice, Plugin, TFile } from 'obsidian';
import { LocalRefererSettings, DEFAULT_SETTINGS, LocalRefererSettingTab } from "./settings";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use window.require to access electron in the renderer process
type NodeRequire = (module: string) => unknown;
declare global {
	interface Window {
		require: NodeRequire;
	}
}

export default class LocalReferer extends Plugin {
	settings: LocalRefererSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new LocalRefererSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				menu.addItem((item) => {
					item
						.setTitle('From local')
						.setIcon('paperclip')
						.onClick(async () => {
							await this.insertLocalFile(editor, view);
						});
				});
			})
		);
	}

	async insertLocalFile(editor: Editor, view: MarkdownView) {
		const filePaths = await this.pickFile();
		if (!filePaths || filePaths.length === 0) return;

		const filePath = filePaths[0];
		if (!filePath) return;

		try {
			const fileName = path.basename(filePath);
			// Validate file existence
			if (!fs.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}

			// Read file asynchronously
			const buffer = await fs.promises.readFile(filePath);

			// Determine destination path
			const newFilePath = await this.app.fileManager.getAvailablePathForAttachment(fileName);

			// Write to vault
			// Convert Buffer to ArrayBuffer for createBinary
			const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
			await this.app.vault.createBinary(newFilePath, arrayBuffer);

			// Insert link using Obsidian's standard link generation
			// This respects user settings for relative/absolute links and attachment folders
			const file = this.app.vault.getAbstractFileByPath(newFilePath);
			if (file instanceof TFile) {
				const sourcePath = view.file?.path || '';
				let linkText = this.app.fileManager.generateMarkdownLink(file, sourcePath);

				// Check if the file should be embedded (images, audio, video, pdf)
				const EMBED_EXTENSIONS = [
					// Images
					'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
					// Audio
					'mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac',
					// Video
					'mp4', 'webm', 'ogv', 'mov', 'mkv',
					// PDF
					'pdf'
				];
				
				if (EMBED_EXTENSIONS.includes(file.extension.toLowerCase()) && !linkText.startsWith('!')) {
					linkText = '!' + linkText;
				}

				editor.replaceSelection(linkText);
				new Notice(`Inserted: ${fileName}`);
			}

		} catch (error) {
			console.error(error);
			let message = 'Unknown error';
			if (error instanceof Error) message = error.message;
			else if (typeof error === 'string') message = error;
			
			new Notice(`Error inserting file: ${message}`);
		}
	}

	async pickFile(): Promise<string[] | undefined> {
		try {
			// Electron dialog approach (Preferred for desktop)
			// Accessing electron via window.require which works in Obsidian's renderer
			const electron = window.require('electron') as {
				remote?: {
					dialog: {
						showOpenDialog: (window: unknown, options: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>;
					};
					getCurrentWindow: () => unknown;
				};
				dialog?: {
					showOpenDialog: (window: unknown, options: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>;
				};
				BrowserWindow?: {
					getFocusedWindow: () => unknown;
				};
			};
			const dialog = electron.remote?.dialog || electron.dialog;
			
			// Note: In very recent Electron versions used by Obsidian, 'remote' might be unavailable directly.
			// However, for many plugin environments this is still the standard way to access system dialogs.
			// If remote is missing, we might need a workaround or check if strict sandbox is enabled.
			
			if (dialog) {
				const options = {
					title: 'Select a file to insert',
					defaultPath: this.settings.defaultPath || os.homedir(),
					properties: ['openFile']
				};
				
				// Need a browser window instance for modal dialog
				const currentWindow = electron.remote?.getCurrentWindow() || electron.BrowserWindow?.getFocusedWindow();
				
				const result = await dialog.showOpenDialog(currentWindow, options);
				
				if (result.canceled) return undefined;
				return result.filePaths;
			} else {
				throw new Error("Electron dialog not available");
			}

		} catch (e) {
			console.warn("Electron dialog failed, falling back to HTML input", e);

			// Fallback approach: HTML Input element
			// Note: This cannot respect 'defaultPath' due to browser security restrictions.
			return new Promise((resolve) => {
				const input = document.createElement('input');
				input.type = 'file';
				input.addClass('local-referer-hidden-input');
				document.body.appendChild(input);

				input.onchange = () => {
					if (input.files && input.files.length > 0) {
						// The 'path' property is available on File objects in Electron/Obsidian
						interface ElectronFile extends File {
							path: string;
						}
						const paths = Array.from(input.files).map((f) => (f as ElectronFile).path);
						resolve(paths);
					} else {
						resolve(undefined);
					}
					document.body.removeChild(input);
				};

				input.oncancel = () => { // fires on ESC or cancel
					resolve(undefined);
					document.body.removeChild(input);
				}

				input.click();
			});
		}
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LocalRefererSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

