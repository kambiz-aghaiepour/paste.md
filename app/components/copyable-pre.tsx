"use client";

import { useRef, useState, useEffect } from "react";
import { CopyButton } from "@/app/components/copy-button";

interface CopyablePreProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

/**
 * Client Component wrapping a <pre> element with a positioned CopyButton.
 * Uses a ref on the <pre> to extract textContent for clipboard copy.
 *
 * The copy button is hidden by default and revealed on hover (desktop).
 * On touch devices (no hover capability), the button is always visible.
 */
export function CopyablePre({ children, ...props }: CopyablePreProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [codeText, setCodeText] = useState("");

  useEffect(() => {
    if (preRef.current) {
      setCodeText(preRef.current.textContent ?? "");
    }
  }, [children]);

  return (
    <div className="relative group">
      <pre ref={preRef} {...props}>
        {children}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
        <CopyButton textContent={codeText} />
      </div>
    </div>
  );
}
