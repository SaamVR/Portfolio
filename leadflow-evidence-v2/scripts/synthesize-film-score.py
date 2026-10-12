#!/usr/bin/env python3
"""Deterministic, original LeadFlow cinematic sound score.

No external sample packs, voice recordings, soundtrack assets or APIs.
Produces mono 24kHz PCM for the authored 25.4-second film.
Cue locations: arrival, validation, decision, handoff, review, ending.
The timeout variant adds two retrospective, synthetic setback cues.
"""
import math
import random
import struct
import sys
import wave
from pathlib import Path

variant = sys.argv[1] if len(sys.argv) > 1 else "qualified"
destination = Path(sys.argv[2] if len(sys.argv) > 2 else f"{variant}-score.wav")
assert variant in ("qualified","timeout"), "Only synthetic qualified/timeout variants allowed"
R = 24000
DURATION = 25.4
N = int(R * DURATION)
TWO_PI = math.tau
random.seed(72391 if variant == "qualified" else 72392)
samples = [0.0] * N
noise = 0.0

# Unobtrusive, low sustained harmonic bed with a slow emotional swell.
for i in range(N):
    t = i / R
    fade = max(0.0, min(1.0, t / 1.1, (DURATION - t) / 1.05))
    breath = 0.84 + 0.16 * math.sin(TWO_PI * 0.16 * t)
    background = (0.030 * math.sin(TWO_PI * 110.0 * t)
                 +0.016 * math.sin(TWO_PI * 164.81 * t)
                 +0.012 * math.sin(TWO_PI * 219.98 * t))
    noise = noise * 0.985 + random.uniform(-1, 1) * 0.015
    samples[i] = fade * breath * (background + noise * 0.014)

def bell(at, pitch, gain=0.07, length=1.2):
    begin = int(at * R)
    for i in range(min(int(length * R), N - begin)):
        t = i / R
        envelope = (1 - math.exp(-t * 65)) * math.exp(-t * 4.2)
        voice = (math.sin(TWO_PI * pitch * t)
                 + 0.23 * math.sin(TWO_PI * pitch * 2.003 * t)
                 + 0.09 * math.sin(TWO_PI * pitch * 3.01 * t))
        samples[begin + i] += gain * envelope * voice

def movement(at, seconds=0.72, gain=0.033):
    begin = int(at * R)
    for i in range(min(int(seconds * R), N - begin)):
        t = i / R
        x = t / seconds
        envelope = math.sin(math.pi * x) ** 2
        chirp = 130 * t + (240 / (3 * seconds * seconds)) * t ** 3
        samples[begin + i] += gain * envelope * (
            math.sin(TWO_PI * chirp) + 0.25 * math.sin(TWO_PI * chirp * 0.49)
        )

def setback(at, gain=0.12):
    begin = int(at * R)
    for i in range(min(int(0.45 * R), N - begin)):
        t = i / R
        envelope = math.exp(-t * 15)
        low = math.sin(TWO_PI * (220 * t - 140 * t * t))
        samples[begin + i] += gain * envelope * (low + 0.1 * random.uniform(-1,1))

# Five-act story architecture; each sound is tied to a legible visual beat.
for time, frequency in [(0.9,392),(4.55,440),(8.98,523.25),
                         (13.92,493.88),(19.6,587.33),(22.63,659.25)]:
    bell(time, frequency)
for cue in (3.53, 8.20, 13.12, 18.97):
    movement(cue)

if variant == "timeout":
    setback(16.40, 0.13)
    setback(17.42, 0.12)
    bell(18.55, 392, 0.065)

# Human-resolution chord: settle, breathe, end cleanly.
for time, frequency, amplitude in [(22.89,261.63,0.048),(23.10,329.63,0.044),(23.32,392,0.041)]:
    begin = int(time * R)
    for i in range(min(int(1.38 * R), N - begin)):
        t = i / R
        samples[begin + i] += amplitude * (1-math.exp(-t*18)) * math.exp(-t*2.2) * math.sin(TWO_PI*frequency*t)

peak = max(abs(s) for s in samples)
gain = min(1.0, 0.55 / peak) if peak else 1
destination.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(destination), "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(R)
    for offset in range(0, N, 4096):
        wav.writeframes(b"".join(struct.pack("<h", int(max(-1,min(1,s*gain))*32767))
                                 for s in samples[offset:offset+4096]))
print("SCORE", str(destination), "seconds", DURATION, "bytes", destination.stat().st_size, "variant", variant)
