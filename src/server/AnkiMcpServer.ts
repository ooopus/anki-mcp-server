/**
 * Anki MCP Server implementation
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";

import {
	IAnkiConnectService,
	IDeckService,
	ILanguageService,
	IModelService,
	INoteService,
} from "../interfaces/services.js";
import { DeckTools } from "../tools/deckTools.js";
import { NoteTools } from "../tools/noteTools.js";
import { ModelTools } from "../tools/modelTools.js";

/**
 * AnkiMcpServer is the main server class that handles MCP protocol communication
 */
export class AnkiMcpServer {
	private server: Server;
	private deckTools: DeckTools;
	private noteTools: NoteTools;
	private modelTools: ModelTools;

	/**
	 * Constructor
	 *
	 * @param ankiConnectService AnkiConnect service
	 * @param languageService Language service
	 * @param deckService Deck service
	 * @param noteService Note service
	 * @param modelService Model service
	 */
	constructor(
		private ankiConnectService: IAnkiConnectService,
		private languageService: ILanguageService,
		private deckService: IDeckService,
		private noteService: INoteService,
		private modelService: IModelService,
	) {
		this.server = new Server(
			{
				name: "anki-connect-server",
				version: "0.1.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		// Initialize tool handlers
		this.deckTools = new DeckTools(deckService);
		this.noteTools = new NoteTools(noteService);
		this.modelTools = new ModelTools(modelService);

		this.setupToolHandlers();

		// Error handling
		this.server.onerror = (error) => console.error("[MCP Error]", error);
		process.on("SIGINT", async () => {
			await this.server.close();
			process.exit(0);
		});
	}

	/**
	 * Set up tool handlers
	 */
	private setupToolHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "list_decks",
					description: "List all available Anki decks",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_deck",
					description: "Create a new Anki deck",
					inputSchema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "Name of the deck to create",
							},
						},
						required: ["name"],
					},
				},
				{
					name: "get_note_type_info",
					description: "Get detailed structure of a note type",
					inputSchema: {
						type: "object",
						properties: {
							modelName: {
								type: "string",
								description: "Name of the note type/model",
							},
						},
						required: ["modelName"],
					},
				},
				{
					name: "create_note",
					description: "Create a new note (Basic or Cloze)",
					inputSchema: {
						type: "object",
						properties: {
							type: {
								type: "string",
								enum: ["Basic", "Cloze"],
								description: "Type of note to create",
							},
							deck: {
								type: "string",
								description: "Deck name",
							},
							front: {
								type: "string",
								description: "Front content (for Basic notes)",
							},
							back: {
								type: "string",
								description: "Back content (for Basic notes)",
							},
							text: {
								type: "string",
								description: "Cloze text (for Cloze notes)",
							},
							backExtra: {
								type: "string",
								description: "Additional back content (for Cloze notes)",
							},
							fields: {
								type: "object",
								description: "Custom fields for the note",
								additionalProperties: true,
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "Tags for the note",
							},
						},
						required: ["type", "deck"],
					},
				},
				{
					name: "batch_create_notes",
					description: "Create multiple notes at once",
					inputSchema: {
						type: "object",
						properties: {
							notes: {
								type: "array",
								items: {
									type: "object",
									properties: {
										type: {
											type: "string",
											enum: ["Basic", "Cloze"],
										},
										deck: {
											type: "string",
										},
										front: {
											type: "string",
										},
										back: {
											type: "string",
										},
										text: {
											type: "string",
										},
										backExtra: {
											type: "string",
										},
										fields: {
											type: "object",
											additionalProperties: true,
										},
										tags: {
											type: "array",
											items: {
												type: "string",
											},
										},
									},
									required: ["type", "deck"],
								},
							},
							stopOnError: {
								type: "boolean",
								description: "Whether to stop on first error",
							},
						},
						required: ["notes"],
					},
				},
				{
					name: "search_notes",
					description: "Search for notes using Anki query syntax",
					inputSchema: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Anki search query",
							},
						},
						required: ["query"],
					},
				},
				{
					name: "get_note_info",
					description: "Get detailed information about a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "update_note",
					description: "Update an existing note",
					inputSchema: {
						type: "object",
						properties: {
							id: {
								type: "number",
								description: "Note ID",
							},
							fields: {
								type: "object",
								description: "Fields to update",
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "New tags for the note",
							},
						},
						required: ["id", "fields"],
					},
				},
				{
					name: "delete_note",
					description: "Delete a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID to delete",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "list_note_types",
					description: "List all available note types",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_note_type",
					description: "Create a new note type",
					inputSchema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "Name of the new note type",
							},
							fields: {
								type: "array",
								items: {
									type: "string",
								},
								description: "Field names for the note type",
							},
							css: {
								type: "string",
								description: "CSS styling for the note type",
							},
							templates: {
								type: "array",
								items: {
									type: "object",
									properties: {
										name: {
											type: "string",
										},
										front: {
											type: "string",
										},
										back: {
											type: "string",
										},
									},
									required: ["name", "front", "back"],
								},
								description: "Card templates",
							},
						},
						required: ["name", "fields", "templates"],
					},
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			await this.checkConnection();

			switch (request.params.name) {
				// Deck tools
				case "list_decks":
					return this.deckTools.listDecks(request.params.arguments as any);

				case "create_deck":
					return this.deckTools.createDeck(request.params.arguments as any);

				// Note tools
				case "create_note":
					return this.noteTools.createNote(request.params.arguments as any);

				case "batch_create_notes":
					return this.noteTools.batchCreateNotes(
						request.params.arguments as any,
					);

				case "search_notes":
					return this.noteTools.searchNotes(request.params.arguments as any);

				case "get_note_info":
					return this.noteTools.getNoteInfo(request.params.arguments as any);

				case "update_note":
					return this.noteTools.updateNote(request.params.arguments as any);

				case "delete_note":
					return this.noteTools.deleteNote(request.params.arguments as any);

				// Model tools
				case "list_note_types":
					return this.modelTools.listNoteTypes(request.params.arguments as any);

				case "create_note_type":
					return this.modelTools.createNoteType(
						request.params.arguments as any,
					);

				case "get_note_type_info":
					return this.modelTools.getNoteTypeInfo(
						request.params.arguments as any,
					);

				default:
					throw new McpError(
						ErrorCode.MethodNotFound,
						`Unknown tool: ${request.params.name}`,
					);
			}
		});
	}

	/**
	 * Check connection to Anki
	 */
	private async checkConnection(): Promise<void> {
		try {
			await this.ankiConnectService.checkConnection();
			// Detect Anki language if not already detected
			if (this.languageService.getLanguage() === "en") {
				await this.languageService.detectLanguage();
			}
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to connect to Anki. Please make sure Anki is running and the AnkiConnect plugin is enabled.",
			);
		}
	}

	/**
	 * Run the server
	 */
	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("Anki MCP server running on stdio");
	}
}
