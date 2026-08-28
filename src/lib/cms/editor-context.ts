export type EditorContextToken = {
  storeId: string | null;
  generation: number;
};

export function advanceEditorContext(
  current: EditorContextToken,
  storeId: string | null,
): EditorContextToken {
  if (current.storeId === storeId) {
    return current;
  }

  return {
    storeId,
    generation: current.generation + 1,
  };
}

export function editorContextMatches(
  current: EditorContextToken,
  captured: EditorContextToken,
): boolean {
  return current.storeId === captured.storeId && current.generation === captured.generation;
}
