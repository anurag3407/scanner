"""
Explore several geometric variations for Credo logo concepts:
- Concept A: Monogram with integrated negative-space star/shield
- Concept B: Reputation Shield / Trust Crest (firewall + star)
- Concept C: 10-Second Velocity Scan / Precision Geometric C
"""
import math

def build_concepts():
    # -------------------------------------------------------------------------
    # Concept A1: The Star Aperture Monogram
    # A bold circular C where the terminals themselves form the facets of a
    # 4-pointed radiant star in the aperture opening.
    # The top terminal cuts at 45 deg, the bottom terminal cuts at 45 deg,
    # and a central diamond is carved or framed by the terminals.
    # -------------------------------------------------------------------------
    # Let's create an integrated negative-space star inside a solid C:
    # Outer radius 96, inner radius 48.
    # At the right opening (around y=128), a diamond notch is carved into
    # the inner wall, while the outer terminals form a shield-like bevel.
    a1_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">Credo - Concept A: The Radiant Monogram</title>
  <!-- Single unified path: bold C framing a 4-point diamond star in its aperture -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 172 40
    A 104 104 0 1 0 172 216
    L 172 166
    A 56 56 0 1 1 172 90
    L 172 40
    Z
    M 172 88
    L 194 128
    L 234 128
    L 202 148
    L 214 186
    L 182 162
    L 172 166
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # Concept A2: Pure Negative-Space Star C
    # The C has a central 4-pointed star carved directly out of the thick spine
    # or aperture. Let's do a pure, mathematically balanced geometric C
    # with an internal radiant star cutout (negative space).
    # -------------------------------------------------------------------------
    a2_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a2">
  <title id="title-a2">Credo - Concept A: The Negative-Space Star Monogram</title>
  <!-- Bold C with an iconic 4-point star cut out of the solid left crescent -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 184 48
    A 96 96 0 1 0 184 208
    L 184 156
    A 48 48 0 1 1 184 100
    L 184 48
    Z
    M 78 128
    C 88 128 94 122 94 112
    C 94 122 100 128 110 128
    C 100 128 94 134 94 144
    C 94 134 88 128 78 128
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # Concept B1: The Reputation Firewall Shield (Trust Crest)
    # A sleek, modern shield silhouette (the firewall) with a bold geometric 'C'
    # and radiant review star carved in negative space.
    # -------------------------------------------------------------------------
    b1_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b1">
  <title id="title-b1">Credo - Concept B: The Reputation Firewall</title>
  <!-- Protective Shield enclosing a 5-star diamond / C core via negative space -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 24
    L 216 56
    V 136
    C 216 188 178 224 128 240
    C 78 224 40 188 40 136
    V 56
    Z
    M 128 68
    C 161 68 184 91 184 124
    H 146
    C 146 112 138 104 128 104
    C 114 104 104 114 104 128
    C 104 142 114 152 128 152
    C 138 152 146 144 146 132
    H 184
    C 184 165 161 188 128 188
    C 95 188 68 161 68 128
    C 68 95 95 68 128 68
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # Concept B2: The Crest with Center Star Diamond Cutout
    # Majestic neo-brutalist shield with a 4-point star and checkmark geometry
    # -------------------------------------------------------------------------
    b2_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b2">
  <title id="title-b2">Credo - Concept B2: The Trust Shield</title>
  <!-- Shield perimeter with 4-point diamond star in negative space -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 24
    L 216 56
    V 136
    C 216 188 178 224 128 240
    C 78 224 40 188 40 136
    V 56
    Z
    M 128 72
    C 128 102 110 128 80 128
    C 110 128 128 154 128 184
    C 128 154 146 128 176 128
    C 146 128 128 102 128 72
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # Concept C1: The 10-Second Velocity Scan
    # Two precision interlocking sweeps creating an energetic, forward-leaning C
    # with an electric diamond core.
    # -------------------------------------------------------------------------
    c1_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-c1">
  <title id="title-c1">Credo - Concept C: The 10-Second Velocity Pulse</title>
  <!-- Dynamic dual-arc C: physical scan arc + digital 5-star trajectory -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 144 32
    C 80 32 32 80 32 144
    C 32 196 68 232 120 232
    C 160 232 192 208 204 176
    L 164 164
    C 156 184 140 196 120 196
    C 88 196 68 172 68 144
    C 68 104 100 68 144 68
    C 172 68 196 84 208 108
    L 240 84
    C 220 52 184 32 144 32
    Z
    M 188 128
    L 216 100
    L 244 128
    L 216 156
    Z
  "/>
</svg>"""

    with open("brand/concept-a1.svg", "w") as f: f.write(a1_svg)
    with open("brand/concept-a2.svg", "w") as f: f.write(a2_svg)
    with open("brand/concept-b1.svg", "w") as f: f.write(b1_svg)
    with open("brand/concept-b2.svg", "w") as f: f.write(b2_svg)
    with open("brand/concept-c1.svg", "w") as f: f.write(c1_svg)
    print("Built concept candidates.")

if __name__ == "__main__":
    build_concepts()
