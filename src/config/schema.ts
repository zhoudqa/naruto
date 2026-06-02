import { z } from "zod"

const AgentConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  fallback_models: z.array(z.string()).optional(),
})

export const NarutoConfigSchema = z.object({
  approval_gates: z
    .array(z.enum(["prd", "tech-design"]))
    .default(["prd", "tech-design"]),
  skip_stages: z
    .array(
      z.enum([
        "clarify",
        "explore",
        "prd",
        "tech-design",
        "code",
        "test",
        "review",
      ]),
    )
    .default([]),
  agents: z.record(z.string(), AgentConfigSchema).default({}),
  artifact_dir: z.string().default(".naruto"),
  agents_md_path: z.string().default(".naruto/AGENTS.md"),
  agents_md_auto_export: z.boolean().default(true),
})

export type NarutoConfig = z.infer<typeof NarutoConfigSchema>

export const NARUTO_CONFIG_DEFAULTS: NarutoConfig = {
  approval_gates: ["prd", "tech-design"],
  skip_stages: [],
  agents: {},
  artifact_dir: ".naruto",
  agents_md_path: ".naruto/AGENTS.md",
  agents_md_auto_export: true,
}
