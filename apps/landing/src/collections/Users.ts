/**
 * @module Users
 *
 * Defines the Payload CMS collection for admin/authenticated users. Payload
 * automatically provides email-based authentication when `auth: true` is set,
 * so this collection serves as the identity store for CMS access control.
 *
 * Depends on: payload (CollectionConfig, built-in auth)
 * Used by: Payload CMS admin panel (login, access control)
 */
import type { CollectionConfig } from 'payload';

/**
 * Authenticated users collection. Uses email as the display title in the
 * admin UI and delegates all auth fields (password, tokens) to Payload's
 * built-in auth system.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
};
