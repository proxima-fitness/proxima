import * as yaml from 'yaml';


export async function discoverSkills(sandbox: ISandbox, directories: string[]): Promise<ISkillMetadata[]> {
    const skills: ISkillMetadata[] = [];
    const seenNames = new Set<string>();

    for (const dir of directories) {
        let entries;
        try {
            entries = await sandbox.readdir(dir, { withFileTypes: true });
        } catch {
            continue; // Skip directories that don't exist
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const skillDir = `${dir}/${entry.name}`;
            const skillFile = `${skillDir}/SKILL.md`;

            try {
                const content = await sandbox.readFile(skillFile, 'utf-8');
                const frontmatter = parseFrontmatter(content);

                // First skill with a given name wins (allows project overrides)
                if (seenNames.has(frontmatter.name)) continue;
                    seenNames.add(frontmatter.name);

                skills.push({
                    name: frontmatter.name,
                    description: frontmatter.description,
                    path: skillDir,
                    allowedTools: frontmatter.allowedTools,
                });
            } catch {
            continue; // Skip skills without valid SKILL.md
            }
        }
    }
    return skills;
  }

function parseFrontmatter(content: string) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match?.[1]) throw new Error('No frontmatter found');
    // Parse YAML using your preferred library
    return yaml.parse(match[1]);
}
