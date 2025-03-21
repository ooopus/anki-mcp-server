#!/usr/bin/env node
import { ConfigService } from "./services/ConfigService.js";
import { AnkiConnectService } from "./services/AnkiConnectService.js";
import { LanguageService } from "./services/LanguageService.js";
import { DeckService } from "./services/DeckService.js";
import { NoteService } from "./services/NoteService.js";
import { ModelService } from "./services/ModelService.js";
import { AnkiMcpServer } from "./server/AnkiMcpServer.js";

/**
 * Main entry point for the Anki MCP Server
 *
 */
async function main() {
	try {
		// Create services with dependency injection
		const configService = new ConfigService();
		const ankiConnectService = new AnkiConnectService(configService);
		const languageService = new LanguageService(
			ankiConnectService,
			configService,
		);

		// Create domain services
		const deckService = new DeckService(ankiConnectService, languageService);
		const noteService = new NoteService(ankiConnectService, languageService);
		const modelService = new ModelService(ankiConnectService, languageService);

		// Create and run server
		const server = new AnkiMcpServer(
			ankiConnectService,
			languageService,
			deckService,
			noteService,
			modelService,
		);

		await server.run();
	} catch (error) {
		console.error("Failed to start Anki MCP Server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch(console.error);
