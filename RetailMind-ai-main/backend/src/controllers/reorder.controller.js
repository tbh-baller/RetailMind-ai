import * as reorderService from "../services/reorder.service.js";

export async function getReorderSuggestions(_req, res) {
  const suggestions = await reorderService.getReorderSuggestions();
  res.json(suggestions);
}
