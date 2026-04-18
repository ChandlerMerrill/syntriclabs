// Re-export barrel so runtime handlers share the exact schemas the agent was
// registered with. Can't move the schemas into src/ yet because
// scripts/managed-agent/{setup-agent,update-system-prompt}.ts import via
// relative paths that don't resolve once the file crosses into src/ (Phase 6
// will revisit module organization).
export * from '../../../scripts/managed-agent/custom-tool-schemas'
