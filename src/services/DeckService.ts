/**
 * Deck service implementation
 */
import { IDeckService, IAnkiConnectService } from "../interfaces/services.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export class DeckService implements IDeckService {
	constructor(private ankiConnectService: IAnkiConnectService) {}

	/** Get the currently selected deck name from Anki */
	async getCurrentDeck(): Promise<string> {
		try {
			const deckName =
				await this.ankiConnectService.invoke<string>("guiCurrentDeck");
			return deckName || "Default";
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				"获取当前牌组失败，请确保Anki已打开并选中牌组",
			);
		}
	}

	/** List all deck names */
	async listDecks(): Promise<string[]> {
		return this.ankiConnectService.invoke<string[]>("deckNames");
	}

	/** Create deck if it doesn't exist */
	async createDeck(name: string): Promise<boolean> {
		if (!name) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		if (await this.deckExists(name)) {
			return true;
		}

		await this.ankiConnectService.invoke("createDeck", { deck: name });
		return true;
	}

	/** Check deck existence */
	async deckExists(name: string): Promise<boolean> {
		const decks = await this.listDecks();
		return decks.includes(name);
	}
}
