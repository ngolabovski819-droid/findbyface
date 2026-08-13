# Workspace instructions

## Video face indexing

- Start catalog batch runs with `scripts/start_video_face_batch.ps1`.
- Use visible Windows Terminal progress tabs; do not launch batch workers hidden.
- Keep one tab and log per shard.
- Default to four shards and two attempts unless the user requests otherwise.
- Preserve Supabase resume/retry behavior and the 20-second intro/outro exclusions.
