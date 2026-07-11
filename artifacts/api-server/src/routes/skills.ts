import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Skills dir is at repo root (next to package.json)
const SKILLS_ROOT = path.resolve(process.cwd(), "skills");

function getSkillMeta(name: string) {
  const skillDir = path.join(SKILLS_ROOT, name);
  const skillMd = path.join(skillDir, "SKILL.md");
  const composioMd = path.join(SKILLS_ROOT, `${name}.md`);
  const osintMd = path.join(SKILLS_ROOT, `${name}.md`);

  let description = "";
  let tags: string[] = [];
  let content = "";

  const readmePath = fs.existsSync(skillMd) ? skillMd : fs.existsSync(composioMd) ? composioMd : null;

  if (readmePath) {
    content = fs.readFileSync(readmePath, "utf-8").slice(0, 8000);
    const firstLine = content.split("\n").find(l => l.trim().startsWith("#"));
    description = firstLine?.replace(/^#+\s*/, "").trim() || name;
    const tagMatch = content.match(/<!--\s*tags:(.*?)\s*-->/i);
    if (tagMatch) tags = tagMatch[1].split(",").map(t => t.trim()).filter(Boolean);
  }

  return { name, description, tags, content };
}

// GET /api/skills — list all skills
router.get("/", (_req, res) => {
  if (!fs.existsSync(SKILLS_ROOT)) {
    return res.json({ count: 0, skills: [] });
  }

  const names = fs.readdirSync(SKILLS_ROOT).filter(name => {
    try {
      const stat = fs.statSync(path.join(SKILLS_ROOT, name));
      if (stat.isDirectory()) {
        const hasSkill = fs.existsSync(path.join(SKILLS_ROOT, name, "SKILL.md"));
        return hasSkill;
      }
      // Also include .md files (catalogs like voltagent, composiohq)
      return name.endsWith("-catalog.md") || name.endsWith("-index.md");
    } catch { return false; }
  });

  const skills = names.map(name => {
    const meta = getSkillMeta(name);
    return { name, description: meta.description, tags: meta.tags };
  });

  res.json({ count: skills.length, skills });
});

// GET /api/skills/:name — skill detail
router.get("/:name", (req, res) => {
  const meta = getSkillMeta(req.params.name);
  if (!meta.content) {
    return res.status(404).json({ error: `Skill '${req.params.name}' not found` });
  }
  res.json(meta);
});

export default router;
