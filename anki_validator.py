import jsonschema
from jsonschema import validate

# Define the JSON schema for the 'arguments' object
# For the purpose of testing the new hint, let's add a pattern to a field
# that would typically contain user-provided string content.
ANKI_BATCH_CREATE_NOTES_SCHEMA = {
    "type": "object",
    "properties": {
        "notes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": { "type": "string" },
                    "deck": { "type": "string" },
                    "fields": { 
                        "type": "object",
                        "properties": {
                            "Front": {"type": "string"},
                            "Back": {"type": "string"},
                            "Explanation": {
                                "type": "string",
                                # Add a pattern that problematic strings might violate
                                # For example, let's say Explanation should not contain raw '<'
                                "pattern": "^[^<]*$" 
                            }
                        },
                        "required": ["Front", "Back"] # Example required fields
                    },
                    "tags": { 
                        "type": "array", 
                        "items": { "type": "string" }
                    }
                },
                "required": ["type", "deck", "fields"]
            },
            "minItems": 1
        }
    },
    "required": ["notes"]
}

def anki_batch_create_notes(arguments):
    """
    Validates the input type and schema for a hypothetical anki-batch_create_notes function.

    Args:
        arguments: The input to validate. Expected to be a dictionary
                   conforming to ANKI_BATCH_CREATE_NOTES_SCHEMA.

    Raises:
        TypeError: If 'arguments' is not a dictionary.
        ValueError: If 'arguments' does not conform to the JSON schema.
    """
    if not isinstance(arguments, dict):
        raise TypeError(f"Invalid argument type: 'arguments' must be a JSON object (dictionary), but received {type(arguments).__name__}.")

    try:
        validate(instance=arguments, schema=ANKI_BATCH_CREATE_NOTES_SCHEMA)
    except jsonschema.exceptions.ValidationError as e:
        error_path_list = list(e.path)
        error_path_str = "->".join(map(str, e.path)) if e.path else "root"
        
        basic_error_message = f"JSON schema validation failed: {e.message} on instance path '{error_path_str}'."
        enhanced_message = basic_error_message

        # Check if the error occurred within a 'fields' sub-property and the instance is a string
        # e.path is a deque, convert to list for easier checking.
        # Example e.path for a field error: ['notes', 0, 'fields', 'Explanation']
        is_in_fields = False
        if 'fields' in error_path_list:
            try:
                fields_index = error_path_list.index('fields')
                # Ensure 'fields' is not the last element and there's a field name after it
                if fields_index < len(error_path_list) - 1: 
                    is_in_fields = True
            except ValueError: # 'fields' not in path
                pass

        if is_in_fields and isinstance(e.instance, str):
            hint = " Hint: If this error is on a string field containing HTML or MathJax, please ensure all special characters (like '<', '>', '\\', '\"') are correctly escaped or handled."
            enhanced_message += hint
        
        raise ValueError(enhanced_message)
    
    print("Input validation successful: 'arguments' is a dictionary and conforms to the schema.")

# Test cases
if __name__ == '__main__':
    # Test case 1: Invalid type (string instead of dict)
    try:
        print("\n--- Test Case 1: Invalid type ---")
        anki_batch_create_notes("this is a string")
    except TypeError as e:
        print(f"Caught expected error: {e}")
    except ValueError as e:
        print(f"Caught unexpected ValueError: {e}")

    # Test case 2: Valid input
    valid_args = {
        "notes": [
            {
                "type": "EJU-知识点",
                "deck": "EJU化学",
                "fields": {"Front": "value1", "Back": "value2", "Explanation": "All good here."},
                "tags": ["tag1", "tag2"]
            }
        ]
    }
    try:
        print("\n--- Test Case 2: Valid input ---")
        anki_batch_create_notes(valid_args)
    except (TypeError, ValueError) as e:
        print(f"Caught unexpected error: {e}")

    # Test case 3: Invalid input - missing 'notes'
    invalid_args_missing_notes = {"some_other_key": "value"}
    try:
        print("\n--- Test Case 3: Missing 'notes' key ---")
        anki_batch_create_notes(invalid_args_missing_notes)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 4: Invalid input - 'notes' is not an array
    invalid_args_notes_not_array = {"notes": "not an array"}
    try:
        print("\n--- Test Case 4: 'notes' is not an array ---")
        anki_batch_create_notes(invalid_args_notes_not_array)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 5: Item in 'notes' is missing required 'deck'
    invalid_args_missing_deck = {
        "notes": [
            {
                "type": "EJU-知识点",
                "fields": {"Front": "f", "Back": "b"}
            }
        ]
    }
    try:
        print("\n--- Test Case 5: Item in 'notes' missing 'deck' ---")
        anki_batch_create_notes(invalid_args_missing_deck)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 6: Invalid input - 'fields' is not an object
    invalid_args_fields_not_object = {
        "notes": [
            {
                "type": "EJU-知识点",
                "deck": "EJU化学",
                "fields": "not an object" 
            }
        ]
    }
    try:
        print("\n--- Test Case 6: 'fields' is not an object ---")
        anki_batch_create_notes(invalid_args_fields_not_object)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")
    
    # Test case 7: 'tags' item not a string
    invalid_args_tags_not_array_of_strings = {
        "notes": [
            {
                "type": "EJU-知识点",
                "deck": "EJU化学",
                "fields": {"Front": "f1", "Back": "v1"},
                "tags": ["tag1", 123] 
            }
        ]
    }
    try:
        print("\n--- Test Case 7: 'tags' item not a string ---")
        anki_batch_create_notes(invalid_args_tags_not_array_of_strings)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 8: Valid input - 'tags' is optional
    valid_args_no_tags = {
        "notes": [
            {
                "type": "EJU-知识点",
                "deck": "EJU化学",
                "fields": {"Front": "value1", "Back": "value2"}
            }
        ]
    }
    try:
        print("\n--- Test Case 8: Valid input, 'tags' is optional ---")
        anki_batch_create_notes(valid_args_no_tags)
    except (TypeError, ValueError) as e:
        print(f"Caught unexpected error: {e}")

    # Test case 9: 'notes' array is empty
    invalid_args_empty_notes_array = {"notes": []}
    try:
        print("\n--- Test Case 9: 'notes' array is empty ---")
        anki_batch_create_notes(invalid_args_empty_notes_array)
    except ValueError as e:
        print(f"Caught expected error: {e}") 
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 10: 'type' in note is not a string
    invalid_args_type_not_string = {
        "notes": [
            {
                "type": 123, 
                "deck": "EJU化学",
                "fields": {"Front": "f", "Back": "b"}
            }
        ]
    }
    try:
        print("\n--- Test Case 10: 'type' in note is not a string ---")
        anki_batch_create_notes(invalid_args_type_not_string)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 11: String field ('Explanation') violates pattern (contains '<') - should trigger hint
    invalid_args_field_violates_pattern = {
        "notes": [
            {
                "type": "Basic",
                "deck": "MyDeck",
                "fields": {
                    "Front": "Question",
                    "Back": "Answer",
                    "Explanation": "This <should> trigger the hint."
                }
            }
        ]
    }
    try:
        print("\n--- Test Case 11: String field violates pattern, should trigger hint ---")
        anki_batch_create_notes(invalid_args_field_violates_pattern)
    except ValueError as e:
        print(f"Caught expected error: {e}")
        if "Hint: If this error is on a string field" not in str(e):
            print("ERROR: Hint was NOT found in the error message!")
        else:
            print("SUCCESS: Hint was found in the error message.")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 12: 'fields' is missing a required property ('Back')
    # This should NOT trigger the specific hint for string *content* issues
    invalid_args_missing_required_field = {
        "notes": [
            {
                "type": "Basic",
                "deck": "MyDeck",
                "fields": {
                    "Front": "Question Only"
                    # "Back" is missing
                }
            }
        ]
    }
    try:
        print("\n--- Test Case 12: Missing required field in 'fields', should NOT trigger hint ---")
        anki_batch_create_notes(invalid_args_missing_required_field)
    except ValueError as e:
        print(f"Caught expected error: {e}")
        if "Hint: If this error is on a string field" in str(e):
            print("ERROR: Hint was found, but should NOT have been triggered!")
        else:
            print("SUCCESS: Hint was correctly NOT found in the error message.")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

    # Test case 13: A non-string field (e.g. if 'fields' itself was wrong type) - should not trigger hint
    # To test this, we'd need to change schema for 'fields' to be string, and pass object.
    # For now, an error on 'fields' not being an object (Test case 6) already covers this implicitly.
    # Test case 6 is: invalid_args_fields_not_object = {"notes": [{"type": "T", "deck": "D", "fields": "not an object"}]}
    # This error is e.g. "'not an object' is not of type 'object' on instance path 'notes->0->fields'"
    # The e.instance is "not an object" (a string), and 'fields' is in path.
    # The current logic will add the hint. Let's refine the logic to only add hint if the error is *within* a field,
    # i.e. 'fields' is in the path, but not the last element of the path.
    # The logic was updated to:
    #   is_in_fields = False
    #   if 'fields' in error_path_list:
    #       try:
    #           fields_index = error_path_list.index('fields')
    #           if fields_index < len(error_path_list) - 1: # Ensure 'fields' is not the last element
    #               is_in_fields = True
    #       except ValueError: pass
    # This ensures the error is on a property *of* fields, not on 'fields' itself.
    print("\n--- Test Case 6 (re-check with new hint logic): 'fields' is not an object ---")
    try:
        anki_batch_create_notes(invalid_args_fields_not_object) # From Test Case 6
    except ValueError as e:
        print(f"Caught expected error: {e}")
        if "Hint: If this error is on a string field" in str(e):
            print("ERROR: Hint was found, but should NOT have been triggered as error is on 'fields' itself!")
        else:
            print("SUCCESS: Hint was correctly NOT found in the error message.")
    except TypeError as e:
        print(f"Caught unexpected TypeError: {e}")

```
