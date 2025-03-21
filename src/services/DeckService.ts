/**
 * Deck service implementation
 */
import {
	IDeckService,
	IAnkiConnectService,
	ILanguageService,
} from "../interfaces/services.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * DeckService handles deck-related operations
 */
export class DeckService implements IDeckService {
	/**
	 * Constructor
	 *
	 * @param ankiConnectService AnkiConnect service
	 * @param languageService Language service
	 */
	constructor(
		private ankiConnectService: IAnkiConnectService,
		private languageService: ILanguageService,
	) {}

	/**
	 * List all decks
	 *
	 * 获取所有牌组列表
	 *
	 * @returns Promise resolving to an array of deck names
	 */
	async listDecks(): Promise<string[]> {
		return this.ankiConnectService.invoke<string[]>("deckNames");
	}

	/**
	 * Create a new deck
	 *
	 * 创建新的牌组
	 *
	 * @param name Deck name
	 * @returns Promise resolving to true if successful
	 */
	async createDeck(name: string): Promise<boolean> {
		if (!name) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		// Check if deck already exists
		if (await this.deckExists(name)) {
			// If deck exists, just return true without error
			return true;
		}

		await this.ankiConnectService.invoke("createDeck", { deck: name });
		return true;
	}

	/**
	 * Check if a deck exists
	 *
	 * 检查牌组是否存在
	 *
	 * @param name Deck name
	 * @returns Promise resolving to true if the deck exists
	 */
	async deckExists(name: string): Promise<boolean> {
		const decks = await this.listDecks();
		return decks.includes(name);
	}
}
