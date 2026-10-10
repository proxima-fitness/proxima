import type { MDXComponents } from 'mdx/types';

/**
 * @module mdx-components
 * Helper for configuring MDX component mappings in the Next.js app router.
 *
 * Depends on: `mdx` component typing.
 * Used by: MDX pages to customize how Markdown elements are rendered.
 */

/**
 * Merges the provided MDX components with the default mapping.
 *
 * @param components Component overrides supplied by the MDX page.
 * @returns Combined MDX component mapping.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
