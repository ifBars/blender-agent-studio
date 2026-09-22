# Mixamo animation workflow

Use Mixamo for humanoid motion search, browser previews and FBX downloads.
This integration uses the website through the host's browser tools and a bounded
local Blender importer. It is not a direct Mixamo catalog API client.

## Search and download

1. Call `blender_prepare_mixamo_search` with a short motion query such as
   `walking`, `sitting down` or `idle`. Open the returned URL with the available
   browser connector. In skills-only installations, open
   `https://www.mixamo.com/`, select Animations, and use its search field.
2. Inspect actual result cards and preview candidate motions on the selected
   character. Return observed names and relevant differences to the user.
   A search URL alone is not search results. If the catalog is empty or fails
   to load, report that limitation rather than inventing clips.
3. Use the user's signed-in browser session. If sign-in is necessary, let the
   user complete it. Do not request passwords, extract tokens, or copy cookies
   into tool arguments, files or logs. If no browser connector is available,
   provide the URL and ask for the downloaded FBX.
4. Choose a stock character or the user's already uploaded character. Upload a
   local character only when the user has authorized sharing it with Adobe.
5. Preview and choose animation settings. Record the visible animation name,
   selected character, frame rate, trim, mirror and in-place settings when
   available. In-place availability varies by clip.
6. Download FBX, normally at 30 fps. Choose **With Skin** for a standalone
   animated character, or **Without Skin** when the skeleton and motion alone
   are intended. Wait for completion and obtain the actual local file path.

## Import and use

Call `blender_import_mixamo_animation` with `fbxPath`, a **new** `outputDir`,
`clipName` and the downloaded `fps` (24, 30 or 60). The tool creates:

- `animation.blend`: the imported skeleton, any downloaded mesh and its actions;
- `mixamo-import.json`: source path and SHA-256, Blender version, armature/bone
  counts, action names and frame ranges.

This starts a standalone scene and preserves the original FBX. It does not edit
an existing character or retarget animation. The FBX is user-supplied; the tool
cannot authenticate its origin as Mixamo. A failed attempt can leave an output
directory for diagnosis; choose a new directory for a retry.

For skills-only use, run the bundled script in a clean Blender process:

```bash
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python /path/to/blender-animation-workflow/scripts/import_mixamo.py -- --input /path/to/walk.fbx --output-dir /path/to/new-output --clip-name Walk --fps 30
```

Open the new file or inspect it using `blender_inspect_asset`. Review start,
midpoint, contact and end poses, then playback. For a mesh-free download, inspect
the skeleton; do not claim character deformation has been reviewed. Render with
the asset-validation workflow after adding appropriate cameras as necessary.

For use on an existing character, first compare skeleton names, hierarchy, rest
pose, bone axes and proportions. Matching names alone do not establish action
compatibility. Prefer downloading the animation for that same Mixamo character;
otherwise perform an explicit retarget/bake workflow using the host's Blender
tools, with deformation and foot-contact review. General retargeting is not
implemented by this connector.

Keep downloaded assets and generated files local and out of source control.
Consult the current [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
for usage terms; do not treat these assets as Poly Haven CC0 downloads.
Adobe documents website search, preview and download in
[Animate 3D characters](https://helpx.adobe.com/creative-cloud/help/animate-characters-mixamo.html).

## Evidence limits

The website search route was checked through its visible search field on
2026-09-21. Automated tests use a generated animated FBX, not a redistributed
Mixamo asset. They verify import, saved-file motion, source preservation and
failure handling. Authenticated Mixamo download and a real character's visual
motion quality require a separate live check.
