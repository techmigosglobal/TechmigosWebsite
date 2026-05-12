'use client';

import { useEffect } from 'react';

interface SchemaInjectorProps {
  schemas: Record<string, object>;
}

export default function SchemaInjector({ schemas }: SchemaInjectorProps) {
  useEffect(() => {
    // Inject schemas into the document head
    Object.entries(schemas).forEach(([id, schema]) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `schema-${id}`;
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);

      return () => {
        const existingScript = document.getElementById(`schema-${id}`);
        if (existingScript) {
          existingScript.remove();
        }
      };
    });
  }, [schemas]);

  return null;
}
