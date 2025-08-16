import React, { useState } from "react";

interface Field {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface Schema {
  fields: Field[];
}

export default function DynamicForm({
  schema,
  onAskClarification,
}: {
  schema: Schema;
  onAskClarification?: (fieldName: string, label: string) => void;
}) {
  console.log("DynamicForm received schema:", schema); 
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (!schema || !schema.fields || schema.fields.length === 0) {
    return <p className="text-gray-500">No form fields available.</p>;
  }

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("✅ Submitted form data:", formData);
    alert("Form submitted! Check console for output.");
  };

  // --- AI-assisted fill ---
  const handleFillWithAI = async () => {
    try {
      // Get full chat history from localStorage
      const rawHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");

      // Filter to only what SEA-LION needs
      const filteredHistory = rawHistory.map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("http://localhost:8000/api/fillForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_schema: schema,
          chat_history: filteredHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🤖 AI suggested values:", data);

        const filled: Record<string, any> = {};
        data.fields.forEach((f: any) => {
          if (f.value === "ASK_USER") {
            filled[f.name] = "";
            if (onAskClarification) {
              // Trigger clarifying question into chat
              onAskClarification(f.name, f.label || f.name.replace(/_/g, " "));
            }
          } else {
            filled[f.name] = f.value;
          }
        });
        setFormData(filled);
      } else {
        console.error("Failed to fill form with AI");
      }
    } catch (err) {
      console.error("Error in AI fill:", err);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-lg font-semibold mb-4">Dynamic Form</h2>

      {/* NEW BUTTON */}
      <button
        type="button"
        onClick={handleFillWithAI}
        className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Ask SEA-LION to help
      </button>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {schema.fields.map((field, index) => (
          <div key={index} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === "text" && (
              <input
                type="text"
                placeholder={field.description || ""}
                required={field.required}
                value={formData[field.name] || ""}
                className={`border px-3 py-2 rounded-md ${
                  formData[field.name] === "" ? "bg-yellow-50" : ""
                }`}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === "date" && (
              <input
                type="date"
                required={field.required}
                value={formData[field.name] || ""}
                className={`border px-3 py-2 rounded-md ${
                  formData[field.name] === "" ? "bg-yellow-50" : ""
                }`}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === "checkbox" && (
              <input
                type="checkbox"
                checked={formData[field.name] || false}
                className="h-4 w-4"
                onChange={(e) => handleChange(field.name, e.target.checked)}
              />
            )}

            {field.type === "signature" && (
              <input
                type="text"
                placeholder="Signature"
                required={field.required}
                value={formData[field.name] || ""}
                className={`border px-3 py-2 rounded-md italic text-gray-500 ${
                  formData[field.name] === "" ? "bg-yellow-50" : ""
                }`}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
