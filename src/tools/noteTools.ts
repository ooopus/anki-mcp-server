/**
 * Note tool handlers
 */
import { INoteService } from "../interfaces/services.js";
import {
	CreateNoteArgs,
	BatchCreateNotesArgs,
	SearchNotesArgs,
	GetNoteInfoArgs,
	UpdateNoteArgs,
	DeleteNoteArgs,
} from "../interfaces/schemas.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * NoteTools class handles note-related MCP tools
 */
export class NoteTools {
	/**
	 * Constructor
	 *
	 * @param noteService Note service
	 */
	constructor(private noteService: INoteService) {}

	/**
	 * Create a new note
	 *
	 * @param args Note creation arguments
	 * @returns Promise resolving to tool response with creation result
	 */
	async createNote(args: CreateNoteArgs) {
		if (!args) {
			throw new McpError(ErrorCode.InvalidParams, "Arguments are required");
		}

		if (!args.type) {
			throw new McpError(ErrorCode.InvalidParams, "Note type is required");
		}

		if (!args.deck) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		const noteId = await this.noteService.createNote(args);
		return {
			content: [
				{
					type: "text",
					text: `Created note with ID: ${noteId}`,
				},
			],
		};
	}

	/**
	 * Create multiple notes
	 *
	 * @param args Batch note creation arguments
	 * @returns Promise resolving to tool response with creation results
	 */
	async batchCreateNotes(args: BatchCreateNotesArgs) {
		if (!args || !args.notes || !Array.isArray(args.notes)) {
			throw new McpError(ErrorCode.InvalidParams, "Notes array is required");
		}

		const results = await this.noteService.batchCreateNotes(
			args.notes,
			args.stopOnError,
		);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(results, null, 2),
				},
			],
		};
	}

	/**
	 * Search for notes
	 *
	 * @param args Search arguments
	 * @returns Promise resolving to tool response with search results
	 */
	async searchNotes(args: SearchNotesArgs) {
		if (!args || !args.query) {
			throw new McpError(ErrorCode.InvalidParams, "Search query is required");
		}

		const noteIds = await this.noteService.searchNotes(args.query);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(noteIds, null, 2),
				},
			],
		};
	}

	/**
	 * Get note information
	 *
	 * @param args Note info arguments
	 * @returns Promise resolving to tool response with note information
	 */
	async getNoteInfo(args: GetNoteInfoArgs) {
		if (!args || typeof args.noteId !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		const info = await this.noteService.getNoteInfo(args.noteId);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(info, null, 2),
				},
			],
		};
	}

	/**
	 * Update a note
	 *
	 * @param args Note update arguments
	 * @returns Promise resolving to tool response with update result
	 */
	async updateNote(args: UpdateNoteArgs) {
		if (!args || typeof args.id !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		if (!args.fields || Object.keys(args.fields).length === 0) {
			throw new McpError(
				ErrorCode.InvalidParams,
				"Fields are required for update",
			);
		}

		await this.noteService.updateNote(args);
		return {
			content: [
				{
					type: "text",
					text: `Updated note: ${args.id}`,
				},
			],
		};
	}

	/**
	 * Delete a note
	 *
	 * @param args Note deletion arguments
	 * @returns Promise resolving to tool response with deletion result
	 */
	async deleteNote(args: DeleteNoteArgs) {
		if (!args || typeof args.noteId !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		await this.noteService.deleteNote(args.noteId);
		return {
			content: [
				{
					type: "text",
					text: `Deleted note: ${args.noteId}`,
				},
			],
		};
	}
}
