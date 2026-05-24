import { z } from "zod";
import {
  allPermissionKeys,
  editableRoles,
  sanitizeRolePermissions,
} from "@/lib/permissions";

export const editableRoleSchema = z.enum(editableRoles);

export const permissionsPayloadSchema = z
  .object({
    role: editableRoleSchema,
    permissions: z.record(z.string(), z.boolean()),
  })
  .transform((value) => ({
    role: value.role,
    permissions: sanitizeRolePermissions(value.role, value.permissions),
  }))
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value.permissions)) {
      if (!allPermissionKeys.includes(key as never)) {
        ctx.addIssue({
          code: "custom",
          message: `Permissão desconhecida: ${key}`,
          path: ["permissions", key],
        });
      }
    }
  });
