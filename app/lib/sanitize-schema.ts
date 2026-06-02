import { defaultSchema, type Options } from "rehype-sanitize";

export const sanitizeSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      [
        "className",
        /^language-./,
        "math-inline",
        "math-display",
      ],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", /^markdown-alert/],
    ],
    p: [["className", "markdown-alert-title"]],
  },
};
