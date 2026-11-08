#!/usr/bin/env python3
"""Build the compact anatomical mannequin asset used by the app.

Source: MakeHuman hm08 base mesh + MPFB2 morph targets, CC0.
Vendored via naver/anny and three.ws. See docs/DATA.md and README.

The output is a generated TypeScript module containing:
  - baked base positions (bodyFeminine = 0.7)
  - body triangle indices
  - a per-vertex bodysuit mask
  - a curated set of sparse morph targets used for measurement fitting
  - landmark heights and base measurements
"""
import base64
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "parametric-base.glb"
OUT = ROOT / "src" / "three" / "bodyData.ts"
FEMININE = 0.7
ASIAN_FACE = 0.38
MORPH_NAMES = [
    "shouldersWider",
    "shouldersNarrower",
    "bustBigger",
    "bustSmaller",
    "waistWider",
    "waistNarrower",
    "bellyBigger",
    "bellySmaller",
    "hipsCircWider",
    "hipsCircNarrower",
    "gluteusBigger",
    "gluteusSmaller",
    "thighsThicker",
    "thighsThinner",
    "calvesThicker",
    "calvesThinner",
    "armsThicker",
    "armsThinner",
    "bodyHeavier",
    "bodyThinner",
    "bodySofter",
    "bodyMuscular",
]
# Landmark heights in the source mesh's original space.
Y_BUST = 1.20
Y_WAIST = 1.04
Y_HIP = 0.88
Y_THIGH = 0.70
Y_CALF = 0.35


def read_glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67 and version == 2
    off = 12
    doc = None
    binary = None
    while off < len(data):
        chunk_len, chunk_type = struct.unpack_from("<II", data, off)
        off += 8
        chunk = data[off : off + chunk_len]
        off += chunk_len
        if chunk_type == 0x4E4F534A:
            doc = json.loads(chunk.rstrip(b"\x00").decode())
        elif chunk_type == 0x004E4942:
            binary = chunk
    return doc, binary


def read_attribute(doc, binary, accessor_index, components, fmt, component_size):
    accessor = doc["accessors"][accessor_index]
    view = doc["bufferViews"][accessor["bufferView"]]
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", components * component_size)
    values = []
    for i in range(accessor["count"]):
        values.append(
            struct.unpack_from(
                "<" + fmt * components, binary, start + i * stride
            )
        )
    return values


def read_indices(doc, binary, accessor_index):
    accessor = doc["accessors"][accessor_index]
    view = doc["bufferViews"][accessor["bufferView"]]
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    if accessor["componentType"] == 5125:
        return list(struct.unpack_from("<%dI" % accessor["count"], binary, start))
    return list(struct.unpack_from("<%dH" % accessor["count"], binary, start))


def read_sparse(doc, binary, target):
    accessor = doc["accessors"][target["POSITION"]]
    sparse = accessor["sparse"]
    ibv = doc["bufferViews"][sparse["indices"]["bufferView"]]
    istart = ibv.get("byteOffset", 0) + sparse["indices"].get("byteOffset", 0)
    vbv = doc["bufferViews"][sparse["values"]["bufferView"]]
    vstart = vbv.get("byteOffset", 0) + sparse["values"].get("byteOffset", 0)
    if sparse["indices"]["componentType"] == 5123:
        fmt, size = "<H", 2
    else:
        fmt, size = "<I", 4
    indices = [
        struct.unpack_from(fmt, binary, istart + i * size)[0]
        for i in range(sparse["count"])
    ]
    values = [
        struct.unpack_from("<fff", binary, vstart + i * 12)
        for i in range(sparse["count"])
    ]
    return list(zip(indices, values))


def hull(points):
    pts = sorted(set(points))
    if len(pts) <= 1:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def perimeter(points):
    h = hull(points)
    if len(h) < 3:
        return 0.0
    return sum(
        math.dist(h[i], h[(i + 1) % len(h)]) for i in range(len(h))
    )


def slice_girth(positions, triangles, y):
    points = []
    for tri in triangles:
        vertices = [positions[i] for i in tri]
        above = [v[1] >= y for v in vertices]
        if all(above) or not any(above):
            continue
        for i in range(3):
            a = vertices[i]
            c = vertices[(i + 1) % 3]
            if (a[1] - y) * (c[1] - y) <= 0 and abs(a[1] - c[1]) > 1e-9:
                t = (y - a[1]) / (c[1] - a[1])
                points.append(
                    (
                        round(a[0] + (c[0] - a[0]) * t, 4),
                        round(a[2] + (c[2] - a[2]) * t, 4),
                    )
                )
    return perimeter(points) * 100


def main():
    doc, binary = read_glb(SRC)
    primitive = doc["meshes"][0]["primitives"][0]
    target_names = doc["meshes"][0]["extras"]["targetNames"]
    positions = [
        list(v)
        for v in read_attribute(
            doc, binary, primitive["attributes"]["POSITION"], 3, "f", 4
        )
    ]
    indices = read_indices(doc, binary, primitive["indices"])
    triangles = [
        (indices[i], indices[i + 1], indices[i + 2])
        for i in range(0, len(indices), 3)
    ]
    joints = read_attribute(
        doc, binary, primitive["attributes"]["JOINTS_0"], 4, "H", 2
    )
    weights = read_attribute(
        doc, binary, primitive["attributes"]["WEIGHTS_0"], 4, "f", 4
    )
    joint_nodes = doc["skins"][0]["joints"]
    bone_names = [doc["nodes"][i]["name"] for i in joint_nodes]

    regions = []
    for indexes, ww in zip(joints, weights):
        dominant = bone_names[indexes[max(range(4), key=lambda k: ww[k])]]
        if any(part in dominant for part in ("Hips", "Spine")):
            regions.append(0)  # torso / suit
        elif "Head" in dominant or "Neck" in dominant:
            regions.append(1)  # head
        elif any(part in dominant for part in ("Arm", "Hand", "Shoulder")):
            regions.append(2)  # arm
        elif any(part in dominant for part in ("Leg", "Foot", "Toe")):
            regions.append(3)  # leg
        else:
            regions.append(4)

    torso_triangles = [
        tri for tri in triangles if all(regions[i] == 0 for i in tri)
    ]

    body_feminine = read_sparse(
        doc,
        binary,
        primitive["targets"][target_names.index("bodyFeminine")],
    )
    for index, (dx, dy, dz) in body_feminine:
        positions[index][0] += dx * FEMININE
        positions[index][1] += dy * FEMININE
        positions[index][2] += dz * FEMININE

    if ASIAN_FACE > 0:
        body_asian = read_sparse(
            doc,
            binary,
            primitive["targets"][target_names.index("bodyAsian")],
        )
        for index, (dx, dy, dz) in body_asian:
            if regions[index] == 1:  # head and neck only
                positions[index][0] += dx * ASIAN_FACE
                positions[index][1] += dy * ASIAN_FACE
                positions[index][2] += dz * ASIAN_FACE

    min_y = min(p[1] for p in positions)
    for p in positions:
        p[1] -= min_y

    base_height = max(p[1] for p in positions)
    base_bust = slice_girth(positions, torso_triangles, Y_BUST - min_y)
    base_waist = slice_girth(positions, torso_triangles, Y_WAIST - min_y)
    base_hip = slice_girth(positions, torso_triangles, Y_HIP - min_y)

    left_leg_triangles = [
        tri
        for tri in triangles
        if all(regions[i] == 3 for i in tri)
        and all(positions[i][0] > 0.02 for i in tri)
    ]
    base_thigh = slice_girth(positions, left_leg_triangles, Y_THIGH - min_y)
    base_calf = slice_girth(positions, left_leg_triangles, Y_CALF - min_y)
    crotch_y = min(p[1] for i, p in enumerate(positions) if regions[i] == 0)

    # Cover the torso and the small pubic area where a few vertices are
    # leg-dominant; this is material grouping only, not a geometry change.
    suit = []
    for i, p in enumerate(positions):
        pelvis = (
            (Y_HIP - min_y - 0.16) < p[1] < (Y_HIP - min_y + 0.04)
            and abs(p[0]) < 0.11
        )
        suit.append(1 if regions[i] == 0 or pelvis else 0)

    # Per-vertex weights for simple pose deformation. These are sums of the
    # original glTF skin weights in each anatomical chain, quantised to bytes.
    chain_sets = {
        "armLeft": ("LeftArm", "LeftForeArm", "LeftHand", "LeftShoulder"),
        "armRight": ("RightArm", "RightForeArm", "RightHand", "RightShoulder"),
        "legLeft": ("LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase"),
        "legRight": ("RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"),
        "footLeft": ("LeftFoot", "LeftToeBase"),
        "footRight": ("RightFoot", "RightToeBase"),
    }
    pose_weights = {key: [] for key in chain_sets}
    for joint_row, weight_row in zip(joints, weights):
        for key, prefixes in chain_sets.items():
            total = 0.0
            for joint_index, weight in zip(joint_row, weight_row):
                bone = bone_names[joint_index].split(':')[-1]
                if any(bone.startswith(prefix) for prefix in prefixes):
                    total += weight
            pose_weights[key].append(min(255, max(0, int(round(total * 255)))))

    pos_scale = 18000.0
    quantized_positions = []
    for p in positions:
        for v in p:
            q = int(round(v * pos_scale))
            quantized_positions.append(max(-32768, min(32767, q)))

    morph_payload = []
    gains = {}
    for name in MORPH_NAMES:
        sparse = read_sparse(
            doc,
            binary,
            primitive["targets"][target_names.index(name)],
        )
        trial = [p[:] for p in positions]
        for index, (dx, dy, dz) in sparse:
            trial[index][0] += dx
            trial[index][1] += dy
            trial[index][2] += dz
        gain = {
            "bust": slice_girth(trial, torso_triangles, Y_BUST - min_y)
            - base_bust,
            "waist": slice_girth(trial, torso_triangles, Y_WAIST - min_y)
            - base_waist,
            "hip": slice_girth(trial, torso_triangles, Y_HIP - min_y)
            - base_hip,
        }
        gains[name] = {k: round(v, 3) for k, v in gain.items()}
        max_delta = max(
            max(abs(v[0]), abs(v[1]), abs(v[2])) for _, v in sparse
        )
        delta_scale = 32000.0 / max(max_delta, 1e-8)
        morph_payload.append(
            (
                name,
                delta_scale,
                [
                    (
                        idx,
                        max(-32768, min(32767, int(round(dx * delta_scale)))),
                        max(-32768, min(32767, int(round(dy * delta_scale)))),
                        max(-32768, min(32767, int(round(dz * delta_scale)))),
                    )
                    for idx, (dx, dy, dz) in sparse
                ],
            )
        )

    out = bytearray()
    out += struct.pack("<4sIIIHH", b"SCHB", 1, len(positions), len(indices), len(morph_payload), 0)
    out += struct.pack("<f", base_height)
    landmarks = [
        Y_HIP - min_y,
        Y_WAIST - min_y,
        Y_BUST - min_y,
        Y_CALF - min_y,
        Y_THIGH - min_y,
        Y_BUST - min_y,
        Y_WAIST - min_y,
        Y_HIP - min_y,
    ]
    out += struct.pack("<8f", *landmarks)
    out += struct.pack(
        "<7f",
        base_bust,
        base_waist,
        base_hip,
        base_thigh,
        base_calf,
        38.8,
        27.5,
    )
    out += struct.pack("<f", pos_scale)
    out += struct.pack("<%dh" % len(quantized_positions), *quantized_positions)
    out += struct.pack("<%dH" % len(indices), *indices)
    out += bytes(suit)
    for key in ('armLeft', 'armRight', 'legLeft', 'legRight', 'footLeft', 'footRight'):
        out += bytes(pose_weights[key])
    for name, delta_scale, entries in morph_payload:
        encoded = name.encode("ascii")
        out += struct.pack("<B", len(encoded)) + encoded
        out += struct.pack("<fH", delta_scale, len(entries))
        for idx, dx, dy, dz in entries:
            out += struct.pack("<Hhhh", idx, dx, dy, dz)

    meta = {
        "version": 1,
        "source": "MakeHuman hm08 / MPFB2 via naver/anny, CC0",
        "feminine": FEMININE,
        "asianFace": ASIAN_FACE,
        "vertexCount": len(positions),
        "indexCount": len(indices),
        "baseHeight": round(base_height, 6),
        "baseMeasures": {
            "bust": round(base_bust, 3),
            "waist": round(base_waist, 3),
            "hip": round(base_hip, 3),
            "thigh": round(base_thigh, 3),
            "calf": round(base_calf, 3),
            "shoulder": 38.8,
            "arm": 27.5,
        },
        "landmarks": {
            "hip": round(Y_HIP - min_y, 6),
            "waist": round(Y_WAIST - min_y, 6),
            "bust": round(Y_BUST - min_y, 6),
            "thigh": round(Y_THIGH - min_y, 6),
            "calf": round(Y_CALF - min_y, 6),
            "crotch": round(crotch_y, 6),
        },
        "gains": gains,
    }

    b64 = base64.b64encode(out).decode("ascii")
    chunks = [b64[i : i + 4000] for i in range(0, len(b64), 4000)]
    lines = [
        "/* eslint-disable */",
        "// AUTO-GENERATED by scripts/build_body_asset.py. Do not edit by hand.",
        "// Base mesh: MakeHuman hm08 / MPFB2, CC0. See docs/DATA.md.",
        "",
        "export const BODY_META = "
        + json.dumps(meta, indent=2, ensure_ascii=False)
        + " as const;",
        "",
        "export const BODY_BINARY_BASE64 = [",
    ]
    lines += [f"  '{chunk}'," for chunk in chunks]
    lines += ["]", ".join('');", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size/1024:.1f} KiB, binary {len(out)/1024:.1f} KiB)")
    print(json.dumps(meta, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
