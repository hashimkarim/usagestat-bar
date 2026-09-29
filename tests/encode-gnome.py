#!/usr/bin/env python3
"""Encode GNOME's native screenshots, preserving their observed wall-clock timing."""
import json
from pathlib import Path
import re
import subprocess
import sys


def encode(output):
    samples = [json.loads(line) for line in (output / 'frame-times.jsonl').read_text().splitlines()]
    if len(samples) < 2:
        raise ValueError('Recording requires at least two timestamped native frames')
    lines = []
    for index, sample in enumerate(samples):
        name = sample['file']
        if not re.fullmatch(r'frames/\d{5,}\.png', name) or not (output / name).is_file():
            raise ValueError(f'Invalid recording frame: {name}')
        duration = samples[index + 1]['seconds'] - sample['seconds'] if index + 1 < len(samples) else .2
        if duration <= 0:
            raise ValueError('Recording timestamps must increase')
        lines += [f"file '{name}'", f'duration {duration:.6f}']
    lines.append(f"file '{samples[-1]['file']}'")
    listing = output / 'frames.ffconcat'
    listing.write_text('\n'.join(lines) + '\n')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '1',
                    '-i', str(listing), '-an', '-vf', 'fps=5', '-c:v', 'libx264', '-preset', 'fast',
                    '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    str(output / 'review.mp4')], check=True)


if __name__ == '__main__':
    encode(Path(sys.argv[1]).resolve())
