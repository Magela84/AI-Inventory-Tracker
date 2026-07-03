// ReorderSuggestions — AI-generated reorder recommendations
import React from 'react';

export default function ReorderSuggestions({ suggestions = [] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Reorder Suggestions</h2>
      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-400">No suggestions right now.</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={s.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{s.name}</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  +{s.suggestedReorderQuantity}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Current: {s.currentQuantity} · {s.rationale}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
