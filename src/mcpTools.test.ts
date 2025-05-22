import { McpToolHandler } from './mcpTools';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AnkiClient } from './utils'; // Import the actual class for type checking, mocking is separate

// Mock AnkiClient
// We cast to jest.Mocked<AnkiClient> to get type safety on mocks
let mockAnkiClientInstance: jest.Mocked<AnkiClient>;

jest.mock('./utils', () => ({
    AnkiClient: jest.fn().mockImplementation(() => {
        mockAnkiClientInstance = {
            getDeckNames: jest.fn().mockResolvedValue(['Default', '日本語']),
            createDeck: jest.fn().mockResolvedValue(1234567890),
            getModelNames: jest.fn().mockResolvedValue(['Basic', 'Cloze', 'MyCustomType']),
            getModelFieldNames: jest.fn(async (modelName: string) => {
                if (modelName === 'Basic') return ['Front', 'Back'];
                if (modelName === 'Cloze') return ['Text', 'Back Extra'];
                if (modelName === 'MyCustomType') return ['Question', 'Answer', 'OptionalField'];
                throw new Error(`Mock: Unknown model name ${modelName} in getModelFieldNames`);
            }),
            addNote: jest.fn().mockResolvedValue(9876543210),
            checkConnection: jest.fn().mockResolvedValue(undefined), // ensure checkConnection is mocked
            notesInfo: jest.fn(), // Add other methods if they get called, even if not directly by batchCreateNotes
            updateNoteFields: jest.fn(),
            deleteNotes: jest.fn(),
            findNotes: jest.fn(),
            createModel: jest.fn(),
            getModelTemplates: jest.fn(),
            getModelStyling: jest.fn(),
        } as jest.Mocked<AnkiClient>;
        return mockAnkiClientInstance;
    })
}));

describe('McpToolHandler - batchCreateNotes', () => {
    let toolHandler: McpToolHandler;

    beforeEach(() => {
        // Create a new instance of McpToolHandler before each test.
        // This ensures that a fresh mockAnkiClientInstance is created and used.
        toolHandler = new McpToolHandler();
        // Clear mock calls but not implementations, as implementations are set up per test or globally here.
        if (mockAnkiClientInstance) {
            // Reset calls for all mocked methods on the instance
            (Object.values(mockAnkiClientInstance) as jest.Mock[]).forEach(mockFn => {
                if (jest.isMockFunction(mockFn)) {
                    mockFn.mockClear();
                }
            });
            // Re-establish default mock implementations if they were changed in a test
            mockAnkiClientInstance.getDeckNames.mockResolvedValue(['Default', '日本語']);
            mockAnkiClientInstance.createDeck.mockResolvedValue(1234567890);
            mockAnkiClientInstance.getModelNames.mockResolvedValue(['Basic', 'Cloze', 'MyCustomType']);
            mockAnkiClientInstance.getModelFieldNames.mockImplementation(async (modelName: string) => {
                if (modelName === 'Basic') return ['Front', 'Back'];
                if (modelName === 'Cloze') return ['Text', 'Back Extra'];
                if (modelName === 'MyCustomType') return ['Question', 'Answer', 'OptionalField'];
                throw new Error(`Mock: Unknown model name ${modelName} in getModelFieldNames`);
            });
            mockAnkiClientInstance.addNote.mockResolvedValue(9876543210);
        }
    });

    describe('Initial Argument Validation', () => {
        it('should throw McpError if args is null', async () => {
            await expect(toolHandler.executeTool('batch_create_notes', null))
                .rejects.toThrow(new McpError(ErrorCode.InvalidParams, "Invalid arguments: Input must be a JSON object."));
        });

        it('should throw McpError if args is undefined', async () => {
            await expect(toolHandler.executeTool('batch_create_notes', undefined))
                .rejects.toThrow(new McpError(ErrorCode.InvalidParams, "Invalid arguments: Input must be a JSON object."));
        });

        it('should throw McpError if args.notes is missing', async () => {
            await expect(toolHandler.executeTool('batch_create_notes', {}))
                .rejects.toThrow(new McpError(ErrorCode.InvalidParams, "Invalid arguments: 'notes' property must be an array."));
        });

        it('should throw McpError if args.notes is not an array', async () => {
            await expect(toolHandler.executeTool('batch_create_notes', { notes: "not an array" }))
                .rejects.toThrow(new McpError(ErrorCode.InvalidParams, "Invalid arguments: 'notes' property must be an array."));
        });

        it('should throw McpError if args.notes is an empty array', async () => {
            await expect(toolHandler.executeTool('batch_create_notes', { notes: [] }))
                .rejects.toThrow(new McpError(ErrorCode.InvalidParams, "Invalid arguments: 'notes' array cannot be empty."));
        });
    });

    describe('Per-Note Structure Validation', () => {
        const runTest = async (note: any, expectedErrorMessage: string) => {
            const args = { notes: [note], stopOnError: false };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe(expectedErrorMessage);
        };

        it('should report error if a note item is not an object', async () => {
            await runTest("not an object", "Note at index 0 must be an object.");
        });
        it('should report error if note.type is missing', async () => {
            await runTest({ deck: 'Default', fields: {} }, "Invalid note at index 0: 'type' must be a non-empty string.");
        });
        it('should report error if note.type is not a string', async () => {
            await runTest({ type: 123, deck: 'Default', fields: {} }, "Invalid note at index 0: 'type' must be a non-empty string.");
        });
        it('should report error if note.type is an empty string', async () => {
            await runTest({ type: "", deck: 'Default', fields: {} }, "Invalid note at index 0: 'type' must be a non-empty string.");
        });

        it('should report error if note.deck is missing', async () => {
            await runTest({ type: 'Basic', fields: {} }, "Invalid note at index 0: 'deck' must be a non-empty string.");
        });
        it('should report error if note.deck is not a string', async () => {
            await runTest({ type: 'Basic', deck: 123, fields: {} }, "Invalid note at index 0: 'deck' must be a non-empty string.");
        });
        it('should report error if note.deck is an empty string', async () => {
            await runTest({ type: 'Basic', deck: "", fields: {} }, "Invalid note at index 0: 'deck' must be a non-empty string.");
        });

        it('should report error if note.fields is missing', async () => {
            await runTest({ type: 'Basic', deck: 'Default' }, "Invalid note at index 0: 'fields' must be an object.");
        });
        it('should report error if note.fields is not an object', async () => {
            await runTest({ type: 'Basic', deck: 'Default', fields: "not an object" }, "Invalid note at index 0: 'fields' must be an object.");
        });

        it('should report error if note.tags is present but not an array', async () => {
            await runTest({ type: 'Basic', deck: 'Default', fields: {Front:'f',Back:'b'}, tags: "not an array" }, "Invalid note at index 0: 'tags' must be an array if provided.");
        });
        it('should report error if note.tags contains non-string elements', async () => {
            await runTest({ type: 'Basic', deck: 'Default', fields: {Front:'f',Back:'b'}, tags: ["valid", 123] }, "Invalid note at index 0: All 'tags' must be strings.");
        });
         it('should report error if note type from note.type does not exist', async () => {
            await runTest({ type: 'NonExistentType', deck: 'Default', fields: { Front: 'F', Back: 'B'} }, "Note type 'NonExistentType' not found (for note at index 0).");
        });
    });

    describe('note.fields Content Validation', () => {
        it('should report error for missing required field (e.g. Back for Basic)', async () => {
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q1' } }], // Missing 'Back'
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args as any);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Invalid note at index 0: Missing required field 'Back' for note type 'Basic'.");
        });

        it('should report error for a field value in note.fields not being a string', async () => {
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q1', Back: 123 } }], // Back is number
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args as any);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Invalid note at index 0: Field 'Back' for note type 'Basic' must be a string. Received type number.");
        });
    });

    describe('Error Message Hinting', () => {
        const hintText = " Hint: If this error relates to a field with HTML/MathJax, ensure special characters are correctly escaped (e.g., use '&lt;' for '<', '&amp;' for '&', and ensure backslashes in MathJax are appropriate for JSON strings, often requiring double backslashes like '\\\\').";

        it('should include hint if field contains "<" and addNote fails', async () => {
            mockAnkiClientInstance.addNote.mockRejectedValueOnce(new Error("Simulated Anki Connect error"));
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q<1', Back: 'A1' } }],
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Simulated Anki Connect error" + hintText);
        });

        it('should include hint if field contains "&" and addNote fails', async () => {
            mockAnkiClientInstance.addNote.mockRejectedValueOnce(new Error("Simulated Anki Connect error"));
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q&A', Back: 'A1' } }],
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Simulated Anki Connect error" + hintText);
        });
        
        it('should include hint if field contains unescaped single "\\" and addNote fails', async () => {
            mockAnkiClientInstance.addNote.mockRejectedValueOnce(new Error("Simulated Anki Connect error"));
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Math: \\(', Back: 'A1' } }],
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Simulated Anki Connect error" + hintText);
        });

        it('should NOT include hint if field contains "\\\\" (escaped backslash) and addNote fails', async () => {
            mockAnkiClientInstance.addNote.mockRejectedValueOnce(new Error("Simulated Anki Connect error"));
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Math: \\\\(', Back: 'A1' } }], // Escaped backslash
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Simulated Anki Connect error"); // No hint
        });

        it('should not include hint if no problematic characters exist and addNote fails', async () => {
            mockAnkiClientInstance.addNote.mockRejectedValueOnce(new Error("Simulated Anki Connect error"));
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q1', Back: 'A1' } }],
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toBe("Simulated Anki Connect error"); // No hint
        });

        it('should include hint if validation error occurs (missing field) and other field has problematic chars', async () => {
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q<1' } }], // Missing 'Back', Front has '<'
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args as any);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(false);
            const expectedError = "Invalid note at index 0: Missing required field 'Back' for note type 'Basic'." + hintText;
            expect(parsedContent.results[0].error).toBe(expectedError);
        });
    });

    describe('Valid Batch Processing', () => {
        it('should process a single valid note successfully', async () => {
            const args = {
                notes: [{ type: 'Basic', deck: 'Default', fields: { Front: 'Q1', Back: 'A1' }, tags: ['t1'] }]
            };
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results[0].success).toBe(true);
            expect(parsedContent.results[0].noteId).toBe(9876543210);
            expect(parsedContent.successful).toBe(1);
            expect(mockAnkiClientInstance.addNote).toHaveBeenCalledWith(expect.objectContaining({
                deckName: 'Default',
                modelName: 'Basic',
                fields: { Front: 'Q1', Back: 'A1' },
                tags: ['t1']
            }));
        });

        it('should process multiple valid notes successfully', async () => {
            const args = {
                notes: [
                    { type: 'Basic', deck: 'Default', fields: { Front: 'Q1', Back: 'A1' } },
                    { type: 'Cloze', deck: '日本語', fields: { Text: '{{c1::Cloze}} text', 'Back Extra': 'Extra' } }
                ]
            };
            mockAnkiClientInstance.addNote.mockResolvedValueOnce(111).mockResolvedValueOnce(222);
            const result = await toolHandler.executeTool('batch_create_notes', args);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.successful).toBe(2);
            expect(parsedContent.results[0].success).toBe(true);
            expect(parsedContent.results[0].noteId).toBe(111);
            expect(parsedContent.results[1].success).toBe(true);
            expect(parsedContent.results[1].noteId).toBe(222);
            expect(mockAnkiClientInstance.addNote).toHaveBeenCalledTimes(2);
        });

        it('should create new deck if a note specifies a non-existent deck', async () => {
             mockAnkiClientInstance.getDeckNames.mockResolvedValueOnce(['Default']); // First call for deck check
             mockAnkiClientInstance.createDeck.mockResolvedValueOnce(123); // Deck creation
             mockAnkiClientInstance.getDeckNames.mockResolvedValueOnce(['Default', 'New Deck']); // Subsequent calls see new deck

            const args = {
                notes: [{ type: 'Basic', deck: 'New Deck', fields: { Front: 'Q1', Back: 'A1' } }]
            };
            await toolHandler.executeTool('batch_create_notes', args);
            expect(mockAnkiClientInstance.createDeck).toHaveBeenCalledWith('New Deck');
            expect(mockAnkiClientInstance.addNote).toHaveBeenCalledWith(expect.objectContaining({ deckName: 'New Deck' }));
        });
    });

    describe('stopOnError Behavior', () => {
        it('should stop on first error if stopOnError is true (default)', async () => {
            const args = {
                notes: [
                    { type: 'InvalidType', deck: 'Default', fields: { F: 'Q1' } }, // Error here
                    { type: 'Basic', deck: 'Default', fields: { Front: 'Q2', Back: 'A2' } }
                ]
                // stopOnError is implicitly true
            };
            const result = await toolHandler.executeTool('batch_create_notes', args as any);
            const parsedContent = JSON.parse(result.content[0].text);
            expect(parsedContent.results.length).toBe(1);
            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toContain("Note type 'InvalidType' not found");
            expect(parsedContent.failed).toBe(1);
            expect(parsedContent.successful).toBe(0);
            expect(mockAnkiClientInstance.addNote).not.toHaveBeenCalled();
        });

        it('should process all notes if stopOnError is false, reporting all errors and successes', async () => {
            mockAnkiClientInstance.addNote.mockResolvedValueOnce(111); // For the second note

            const args = {
                notes: [
                    { type: 'InvalidType', deck: 'Default', fields: { F: 'Q1' } }, // Error 1
                    { type: 'Basic', deck: 'Default', fields: { Front: 'Q2', Back: 'A2' } }, // Success
                    { type: 'Basic', deck: 'Default', fields: { Front: 'Q3' } } // Error 2 (missing Back)
                ],
                stopOnError: false
            };
            const result = await toolHandler.executeTool('batch_create_notes', args as any);
            const parsedContent = JSON.parse(result.content[0].text);
            
            expect(parsedContent.results.length).toBe(3);
            expect(parsedContent.failed).toBe(2);
            expect(parsedContent.successful).toBe(1);

            expect(parsedContent.results[0].success).toBe(false);
            expect(parsedContent.results[0].error).toContain("Note type 'InvalidType' not found");

            expect(parsedContent.results[1].success).toBe(true);
            expect(parsedContent.results[1].noteId).toBe(111);
            
            expect(parsedContent.results[2].success).toBe(false);
            expect(parsedContent.results[2].error).toContain("Missing required field 'Back'");

            expect(mockAnkiClientInstance.addNote).toHaveBeenCalledTimes(1); // Only for the valid note
        });
    });
});
```
