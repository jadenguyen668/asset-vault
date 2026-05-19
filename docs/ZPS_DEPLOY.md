# ZPS Deploy Guide

This guide is the deploy profile for the ZPS portal and the `LiveDeploy` branch.

## Why `LiveDeploy` exists

The current local app still contains Spine version conversion code:

- `src/app/api/convert-spine/route.ts`
- `src/components/library/LibraryView.tsx`
- `src/components/viewer/CharacterViewer.tsx`
- `src/components/viewer/ViewerControls.tsx`

ZPS live deploy cannot run Spine CLI conversion inside the container, so the `LiveDeploy` branch must ship with conversion disabled.

## Files added for ZPS

- `Dockerfile`: Next.js standalone image for ZPS
- `.dockerignore`: keeps the deploy context small
- `.env.zps.example`: template for the `.env.local` file used during build/runtime

## Required env file

1. Copy `.env.zps.example` to `.env.local`
2. Fill in the real secrets
3. Keep `NEXT_PUBLIC_SPINE_CONVERT_ENABLED=false`
4. Keep `SPINE_CLI_PATH=` empty

Minimum envs for this app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
R2_WORKER_URL=
R2_WORKER_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=
NEXT_PUBLIC_SPINE_CONVERT_ENABLED=false
SPINE_CLI_PATH=
```

## Docker build

Build locally:

```powershell
Copy-Item .env.zps.example .env.local
docker build -t asset-vault:zps .
```

Run locally:

```powershell
docker run --rm -p 3000:3000 asset-vault:zps
```

The container exposes port `3000`. From the ZPS deploy guide, the portal reads the app port from `EXPOSE`. If `EXPOSE` is missing, the portal falls back to port `80`.

## ZPS portal flow

Recommended flow for ZPS:

1. Prepare code from branch `LiveDeploy`
2. Create `.env.local` from `.env.zps.example`
3. Build the Docker image from the repo root
4. Push the image or deploy the repository through the ZPS flow your team uses
5. Watch deployment logs until the app reaches `Running`

Useful notes from the saved ZPS guide:

- `Deploying` means the system is still building/deploying
- `Running` means the website is healthy
- `Error` means you should inspect deployment logs
- if the app is Docker-based, keep `EXPOSE 3000` in the Dockerfile

## Convert policy on ZPS

On `LiveDeploy`, Spine version conversion is intentionally disabled:

- client export UI only allows exporting the original version
- `/api/convert-spine` returns a disabled response
- the Dockerfile forces:

```env
NEXT_PUBLIC_SPINE_CONVERT_ENABLED=false
SPINE_CLI_PATH=
```

This prevents live deploys from exposing a feature that the container cannot execute correctly.

## Update checklist

Every time you want to refresh live deploy:

1. Merge the needed app fixes into `LiveDeploy`
2. Verify convert is still disabled
3. Refresh `.env.local` from the secure source
4. Build Docker again
5. Deploy to ZPS
