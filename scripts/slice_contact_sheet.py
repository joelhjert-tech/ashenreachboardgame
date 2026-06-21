from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    if len(sys.argv) != 7:
        print(
            "usage: slice_contact_sheet.py <input> <rows> <cols> <outer_margin> <gutter> <outputs_json>",
            file=sys.stderr,
        )
        return 1

    input_path = Path(sys.argv[1])
    rows = int(sys.argv[2])
    cols = int(sys.argv[3])
    outer_margin = int(sys.argv[4])
    gutter = int(sys.argv[5])
    outputs = json.loads(Path(sys.argv[6]).read_text(encoding="utf-8"))

    image = Image.open(input_path)
    cell_width = (image.width - (outer_margin * 2) - (gutter * (cols - 1))) // cols
    cell_height = (image.height - (outer_margin * 2) - (gutter * (rows - 1))) // rows

    for index, output in enumerate(outputs):
        if not output:
            continue

        row = index // cols
        col = index % cols
        left = outer_margin + col * (cell_width + gutter)
        top = outer_margin + row * (cell_height + gutter)
        cropped = image.crop((left, top, left + cell_width, top + cell_height))
        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
