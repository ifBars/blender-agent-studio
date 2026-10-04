Keep the desktop responsive throughout this task. Run only one Blender command
at a time. Pass `--threads 2` to Blender and set each scene's
`render.threads_mode = 'FIXED'` and `render.threads = 2`.

Prefer GPU rendering. For Cycles, discover supported GPU devices, prefer OptiX
then CUDA on NVIDIA, enable only the selected GPU devices, and set
`scene.cycles.device = 'GPU'`. Verify the selected backend and device in output;
do not assume a GPU was used just because one is installed. Keep Eevee on its
normal GPU path. If GPU initialization fails, report the failure and use the
same two-thread CPU limit. Avoid launching concurrent renders or build scripts.

These resource limits apply equally to both comparison conditions. They do not
change the requested modeling detail, materials, deliverables or quality.
