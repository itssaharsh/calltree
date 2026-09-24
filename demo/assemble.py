#!/usr/bin/env python3
"""Assemble final.mp4 from the real-time walkthrough (cut into sub-ranges) + Kokoro narration + card
overlays + Calltree's own Polly audio. Captions burned in from voice/timing.json. Music bed ducked."""
import json, os, subprocess
import numpy as np, cv2, soundfile as sf

D = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(D, "build"); os.makedirs(B, exist_ok=True)
sb = json.load(open(os.path.join(D, "storyboard.json"))); timing = json.load(open(os.path.join(D, "voice", "timing.json")))
rt = json.load(open(os.path.join(D, "rt", "marks.json"))); ovl = json.load(open(os.path.join(D, "build", "overlays", "index.json")))
g = ovl["geom"]; W, H, FPS, SR = 1920, 1080, 30, 48000
marks = {m["id"]: m["t"] for m in rt["marks"]}; audio = rt.get("audio", [])
scene = {s["id"]: s for s in sb["scenes"]}
webm = os.path.join(D, "rt", "walkthrough.webm")
# the kit renders its backdrop and background at 2x; bring both to 1080p once
for name in ("backdrop", "bg"):
    src = cv2.imread(os.path.join(B, "overlays", f"{name}.png"))
    if src.shape[1] != W: src = cv2.resize(src, (W, H), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(B, f"{name}_1080.png"), src)
BACKDROP = os.path.join(B, "backdrop_1080.png"); BG = os.path.join(B, "bg_1080.png")
def run(cmd): subprocess.run(cmd, check=True)
def dur(path): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout)

# ---- cuts: (segment id, narration id or None, src_in, src_out) in the walkthrough's own seconds
a0, a1, a2, a3 = [a["t"] for a in audio]
CUTS = [
    ("ops", "ops", marks["ops"], marks["ops"] + 21.5),
    ("drawer", "drawer", marks["queue"] - 15.0, marks["queue"]),
    ("queue", "queue", marks["queue"], marks["answer"] - 0.3),
    ("answer1", "answer", marks["answer"], a0 + 7.8),
    ("answer2", None, a1 - 6.5, a1 + 3.6),
    ("answer3", "decision", a3 - 4.5, marks["decision"] + 6.3),
    ("decision2", None, marks["decision"] + 8.2, marks["report"]),
    ("report", "report", marks["report"], marks["end"] - 0.2),
]
def live_clip(sid, src_in, src_out):
    out = os.path.join(B, f"seg_{sid}.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-i", BACKDROP, "-ss", f"{src_in:.3f}", "-t", f"{src_out - src_in:.3f}", "-i", webm,
         "-filter_complex", f"[1:v]scale={g['cw']}:{g['ch']}:flags=lanczos,fps={FPS}[v];[0:v][v]overlay={g['wx']}:{g['wy'] + g['bar']}:format=auto,format=yuv420p",
         "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", out]); return out

def card_png(sid):
    bg = cv2.imread(BG)
    for l in ovl["cards"].get(sid, []):
        im = cv2.imread(l["png"], cv2.IMREAD_UNCHANGED)
        if im is None: continue
        if im.shape[2] == 3: im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
        x, y = int(l["x"]), int(l["y"]); h, w = im.shape[:2]; x1, y1 = min(W, x + w), min(H, y + h); src = im[: y1 - y, : x1 - x]
        a = src[:, :, 3:4].astype(np.float32) / 255; roi = bg[y:y1, x:x1]; roi[:] = (src[:, :, :3] * a + roi * (1 - a)).astype(np.uint8)
    p = os.path.join(B, f"card_{sid}.png"); cv2.imwrite(p, bg); return p
def card_clip(sid, seconds, footage_at=None):
    png = card_png(sid); out = os.path.join(B, f"seg_{sid}.mp4")
    if footage_at is not None:  # headline over blurred, darkened footage of the drill (hook and end)
        run(["ffmpeg", "-y", "-v", "error", "-i", BACKDROP, "-ss", f"{footage_at:.3f}", "-t", f"{seconds:.3f}", "-i", webm, "-loop", "1", "-t", f"{seconds:.3f}", "-i", png,
             "-filter_complex", f"[1:v]scale={g['cw']}:{g['ch']}:flags=lanczos,fps={FPS}[v];[0:v][v]overlay={g['wx']}:{g['wy'] + g['bar']}:format=auto[win];[win]boxblur=16:5,eq=brightness=-0.32:saturation=0.55[bg];[2:v]format=rgba,colorkey=0x0B1430:0.06:0.02[txt];[bg][txt]overlay=format=auto,format=yuv420p",
             "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", out])
    else:
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", f"{seconds:.3f}", "-i", png, "-vf", f"zoompan=z='min(1.0+0.00035*on,1.05)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},format=yuv420p",
             "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", out])
    return out

hook_len = max(6.5, timing["hook"]["dur"] + 0.8); problem_len = timing["problem"]["dur"] + 1.0
tech_len = timing["tech"]["dur"] + 1.0; end_len = max(6.0, timing["end"]["dur"] + 0.8)
aha = marks["ops"] + 17.0
order = [("hook", "hook", card_clip("hook", hook_len, footage_at=aha)), ("problem", "problem", card_clip("problem", problem_len))]
for sid, nid, s0, s1 in CUTS:
    if sid == "report": order.append(("tech", "tech", card_clip("tech", tech_len)))
    order.append((sid, nid, live_clip(sid, s0, s1)))
order.append(("end", "end", card_clip("end", end_len, footage_at=aha + 2.0)))

# ---- timeline
T, t = {}, 0.0
for sid, nid, path in order: T[sid] = t; t += dur(path)
total = t
cut_map = {sid: (s0, s1) for sid, nid, s0, s1 in CUTS}
def map_src(src):  # walkthrough seconds -> final seconds, if inside a retained cut
    for sid, (s0, s1) in cut_map.items():
        if s0 <= src < s1: return T[sid] + (src - s0), s1 - src
    return None, 0
narr_at = {}
for sid, nid, path in order:
    if nid and nid not in narr_at: narr_at[nid] = T[sid] + 0.3
narr_at["decision"] = (map_src(marks["decision"])[0] or T["answer3"]) + 0.2
n = int(total * SR) + SR; voice = np.zeros(n, np.float32); polly = np.zeros(n, np.float32)
def put(buf, x, at, gain=1.0, limit=None):
    i = int(at * SR); m = min(len(x), n - i, int(limit * SR) if limit else len(x)); buf[i:i + m] += x[:m] * gain
for nid, at in narr_at.items():
    a, sr = sf.read(timing[nid]["wav"], dtype="float32"); put(voice, a if a.ndim == 1 else a.mean(1), at)
for clip in audio:
    at, room = map_src(clip["t"] + 0.35)
    if at is None or room < 1.0: continue
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", clip["file"], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).copy(); k = int(min(len(x), room * SR)); x = x[:k]
    fade = int(0.35 * SR); x[-fade:] *= np.linspace(1, 0, min(fade, len(x)))
    put(polly, x, at, 0.6)
music_path = os.path.expanduser("~/.cache/demokit/music/calm.mp3"); music = np.zeros(n, np.float32)
if os.path.exists(music_path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", music_path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    m = np.frombuffer(raw, np.float32).copy()
    while len(m) < n: m = np.concatenate([m, m])
    m = m[:n]; m /= max(1e-6, np.sqrt(np.mean(m ** 2)))
    env = np.ones(n, np.float32); k = int(0.3 * SR)
    busy = np.convolve(((np.abs(voice) > 0.01) | (np.abs(polly) > 0.005)).astype(np.float32), np.ones(k) / k, mode="same") > 0.01
    env[busy] = 0.32
    fade = np.minimum(1, np.arange(n) / (1.5 * SR)) * np.clip((total * SR - np.arange(n)) / (2.5 * SR), 0, 1)
    vr = np.sqrt(np.mean(voice[voice != 0] ** 2)) if np.any(voice) else 0.1
    music = m * env * fade * vr * 10 ** (-16 / 20)
mix = (voice + polly + music)[: int(total * SR)]
sf.write(os.path.join(B, "mix_raw.wav"), np.stack([mix, mix], 1), SR, subtype="FLOAT")

# ---- captions
def ts(x): return "%02d:%02d:%02d,%03d" % (x // 3600, x % 3600 // 60, x % 60, (x * 1000) % 1000)
srt, k = [], 1
for nid, at in sorted(narr_at.items(), key=lambda x: x[1]):
    chunk = []
    for w in timing[nid]["words"]:
        chunk.append(w); txt = " ".join(x[0] for x in chunk)
        if w[0][-1:] in ".?!" or len(txt) > 42:
            srt.append(f"{k}\n{ts(at + chunk[0][1])} --> {ts(at + chunk[-1][2] + 0.15)}\n{txt}\n"); k += 1; chunk = []
    if chunk: srt.append(f"{k}\n{ts(at + chunk[0][1])} --> {ts(at + chunk[-1][2] + 0.15)}\n{' '.join(x[0] for x in chunk)}\n"); k += 1
open(os.path.join(B, "captions.srt"), "w").write("\n".join(srt))

# ---- concat, captions, loudness, mux
with open(os.path.join(B, "concat.txt"), "w") as f:
    for sid, nid, path in order: f.write(f"file '{path}'\n")
video = os.path.join(B, "video.mp4")
style = "FontName=Instrument Sans,FontSize=17,PrimaryColour=&H00FFFFFF,OutlineColour=&H80101010,BackColour=&HA0101010,BorderStyle=4,Outline=0,Shadow=0,MarginV=30,Alignment=2"
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(B, "concat.txt"), "-vf", f"subtitles={os.path.join(B, 'captions.srt')}:force_style='{style}',fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.7:.2f}:d=0.7", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-an", video])
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", os.path.join(B, "mix_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
js = json.loads(r[r.rindex("{"):r.rindex("}") + 1]); mixn = os.path.join(B, "mix.wav")
run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(B, "mix_raw.wav"), "-af", f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true", "-ar", str(SR), mixn])
final = os.path.join(B, "final.mp4")
run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", mixn, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final])
run(["ffmpeg", "-y", "-v", "error", "-ss", f"{T['hook'] + 1.2:.2f}", "-i", final, "-frames:v", "1", os.path.join(B, "thumbnail.png")])
run(["ffmpeg", "-y", "-v", "error", "-i", final, "-vf", "fps=1/6,scale=480:-1,tile=4x7", "-frames:v", "1", os.path.join(B, "sheet.jpg")])
with open(os.path.join(B, "script.md"), "w") as f:
    f.write(f"# Calltree demo script ({total:.0f}s)\n\n")
    for nid, at in sorted(narr_at.items(), key=lambda x: x[1]): f.write(f"**{nid}** `{int(at // 60)}:{at % 60:04.1f}` {scene[nid]['say']}\n\n")
print(json.dumps({"total": round(total, 1), "segments": [(sid, round(dur(p), 1)) for sid, nid, p in order], "narration_at": {k: round(v, 1) for k, v in sorted(narr_at.items(), key=lambda x: x[1])}}, indent=1))
