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

export default function DynamicForm({ schema }: { schema: Schema }) {
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

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-lg font-semibold mb-4">Dynamic Form</h2>

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
                className="border px-3 py-2 rounded-md"
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === "date" && (
              <input
                type="date"
                required={field.required}
                className="border px-3 py-2 rounded-md"
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === "checkbox" && (
              <input
                type="checkbox"
                className="h-4 w-4"
                onChange={(e) => handleChange(field.name, e.target.checked)}
              />
            )}

            {field.type === "signature" && (
              <input
                type="text"
                placeholder="Signature"
                required={field.required}
                className="border px-3 py-2 rounded-md italic text-gray-500"
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
