"""Create or update the Amplify Hosting app for app/ and deploy app/out (static export, manual deploys).

    python scripts/amplify_deploy.py --origin              # ensure app + branch; print the origin
    python scripts/amplify_deploy.py --api-url URL         # zip app/out, deploy, wait, print URL
"""
from __future__ import annotations
import argparse, io, sys, time, urllib.error, urllib.request, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "out"
APP_NAME = "calltree"
BRANCH = "main"
RUNNING = {"PENDING", "PROVISIONING", "RUNNING", "CANCELLING"}
RULES = [
    {"source": "/<*>", "target": "/404.html", "status": "404-200"},
]

def client(profile, region):
    import boto3
    return boto3.Session(profile_name=profile, region_name=region).client("amplify")

def find_app(amplify, name):
    token = None
    while True:
        page = amplify.list_apps(maxResults=100, **({"nextToken": token} if token else {}))
        for app in page.get("apps", []):
            if app["name"] == name: return app
        token = page.get("nextToken")
        if not token: return None

def ensure_app(amplify, name, env):
    app = find_app(amplify, name)
    if app is None:
        app = amplify.create_app(name=name, description="Calltree: static export of app/ (Next.js), manual deploys", platform="WEB", customRules=RULES, environmentVariables=env)["app"]
        print(f"created Amplify app {name} ({app['appId']})", file=sys.stderr)
        return app
    update = {"customRules": RULES}
    if env: update["environmentVariables"] = {**(app.get("environmentVariables") or {}), **env}
    return amplify.update_app(appId=app["appId"], **update)["app"]

def ensure_branch(amplify, app_id, branch, env):
    try:
        current = amplify.get_branch(appId=app_id, branchName=branch)["branch"]
    except amplify.exceptions.NotFoundException:
        amplify.create_branch(appId=app_id, branchName=branch, stage="PRODUCTION", environmentVariables=env)
        print(f"created branch {branch}", file=sys.stderr); return
    if env:
        amplify.update_branch(appId=app_id, branchName=branch, environmentVariables={**(current.get("environmentVariables") or {}), **env})

def zip_dir(folder):
    if not (folder / "index.html").is_file(): raise SystemExit(f"{folder} has no index.html: build the app first")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(folder.rglob("*")):
            if path.is_file(): archive.write(path, path.relative_to(folder).as_posix())
    return buffer.getvalue()

def upload(url, data):
    request = urllib.request.Request(url, data=data, method="PUT", headers={"Content-Type": "application/zip"})
    try:
        with urllib.request.urlopen(request, timeout=300) as resp:
            if resp.status >= 300: raise SystemExit(f"zip upload -> HTTP {resp.status}")
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"zip upload -> HTTP {exc.code}: {exc.read()[:300]!r}") from None

def deploy(amplify, app_id, branch, folder):
    data = zip_dir(folder)
    job = amplify.create_deployment(appId=app_id, branchName=branch)
    upload(job["zipUploadUrl"], data)
    amplify.start_deployment(appId=app_id, branchName=branch, jobId=job["jobId"])
    print(f"deploying {len(data) / 1024:.0f} KiB as job {job['jobId']}", file=sys.stderr)
    deadline = time.monotonic() + 600
    while True:
        status = amplify.get_job(appId=app_id, branchName=branch, jobId=job["jobId"])["job"]["summary"]["status"]
        if status not in RUNNING: break
        if time.monotonic() > deadline: raise SystemExit(f"job {job['jobId']} still {status}")
        time.sleep(4)
    if status != "SUCCEED": raise SystemExit(f"deployment job {job['jobId']} ended {status}")
    return status

def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--origin", action="store_true"); p.add_argument("--api-url")
    p.add_argument("--profile", default="firstcommit"); p.add_argument("--region", default="us-east-1")
    p.add_argument("--app-name", default=APP_NAME); p.add_argument("--branch", default=BRANCH); p.add_argument("--out", type=Path, default=OUT)
    a = p.parse_args(argv)
    amplify = client(a.profile, a.region)
    env = {"NEXT_PUBLIC_API_URL": a.api_url} if a.api_url else {}
    app = ensure_app(amplify, a.app_name, env)
    ensure_branch(amplify, app["appId"], a.branch, env)
    origin = f"https://{a.branch}.{app['defaultDomain']}"
    if a.origin: print(origin); return 0
    deploy(amplify, app["appId"], a.branch, a.out)
    print(origin); return 0

if __name__ == "__main__":
    sys.exit(main())
