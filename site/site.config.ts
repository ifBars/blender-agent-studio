export interface NavGroup {
  title: string;
  pages: string[];
}

export interface Feature {
  title: string;
  body: string;
  href: string;
}

export const site = {
  title: "Blender Agent Studio",
  tagline: "Describe what you want to make. Keep the Blender file and the Python that built it.",
  description:
    "A Codex plugin that plans, builds, and checks Blender models, animations, and scenes in your local Blender installation.",
  repo: "https://github.com/ifBars/blender-agent-studio",
  branch: "main",
  install: [
    "codex plugin marketplace add ifBars/blender-agent-studio",
    "codex plugin add blender-agent-studio@blender-agent-studio",
  ],
  nav: [
    { title: "Get started", pages: ["index", "install", "quickstart"] },
    { title: "Using the plugin", pages: ["how-it-works", "skills", "mcp-tools"] },
    { title: "Guides", pages: ["reference-images", "scene-analysis"] },
    { title: "Project", pages: ["comparisons", "results", "contributing"] },
  ] satisfies NavGroup[],
  features: [
    {
      title: "Model from Python",
      body: "Props, environments, characters, and Geometry Nodes, built by a script you can rerun.",
      href: "how-it-works",
    },
    {
      title: "Check before delivery",
      body: "Inspect geometry, reopen exports in a fresh Blender process, and review six fixed views.",
      href: "how-it-works#evidence-renders",
    },
    {
      title: "Match a reference",
      body: "Overlay projected geometry on a reference image and measure silhouette coverage.",
      href: "reference-images",
    },
    {
      title: "Animate and simulate",
      body: "Rigs, mechanical motion, cloth, smoke, and fluids, reviewed at critical frames.",
      href: "skills",
    },
    {
      title: "Render your scene",
      body: "Render through your own cameras and lights with bounded samples and time.",
      href: "how-it-works#beauty-renders",
    },
    {
      title: "Source assets",
      body: "CC0 textures and HDRIs from Poly Haven, plus Mixamo and Pixabay browser handoffs.",
      href: "mcp-tools#assets",
    },
  ] satisfies Feature[],
};
