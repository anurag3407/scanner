"""
Craft refined, world-class geometric marks for Credo:
- Concept A: "The Star Counter C" (Bold geometric C with radiant 4-point star inner counter)
- Concept B: "The Shield Monogram" (Fortified Shield silhouette carved into a protective 'C' with center star)
- Concept C: "The Velocity Standee" (Folded precision neo-brutalist C evoking table standee & 10s review beam)
"""
import math

def generate_refined_svgs():
    # -------------------------------------------------------------------------
    # CONCEPT A: The Star-Counter Monogram (Letterform / Monogram)
    # A bold circular letterform C (radius 96) whose inner negative space is a
    # precision radiant 4-point diamond star. The right aperture opens at 45°.
    # -------------------------------------------------------------------------
    # Outer circle from (196, 60) around clockwise to (196, 196) with radius 96.
    # Center = (128, 128).
    # Optical center slightly adjusted.
    concept_a = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">Credo - Concept A: The Star-Counter Monogram</title>
  <!-- Outer bold C arc enclosing a radiant 4-point star in negative space -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 196 60
    A 96 96 0 1 0 196 196
    L 156 156
    C 144 144 136 136 128 136
    C 136 136 144 128 156 116
    L 196 60
    Z
    M 128 64
    C 128 92 112 116 84 116
    C 112 116 128 140 128 168
    C 128 140 144 116 172 116
    C 144 116 128 92 128 64
    Z
  "/>
</svg>"""

    # Let's craft Concept A with exact, sublime curvature:
    # Outer circle: center (124, 128), R=96.
    # Inner aperture opens cleanly on the right:
    # A single continuous path with fill-rule="evenodd"
    concept_a_v2 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">Credo - Concept A: The Radiant Monogram</title>
  <!-- Bold C whose terminals and inner counter form an authentic 5-star diamond -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 192 64
    A 96 96 0 1 0 192 192
    L 152 152
    A 40 40 0 1 1 152 104
    L 192 64
    Z
    M 128 76
    C 128 100 112 116 88 116
    C 112 116 128 132 128 156
    C 128 132 144 116 168 116
    C 144 116 128 100 128 76
    Z
  "/>
</svg>"""

    # Let's craft a completely unified Concept A:
    # The letter C outer contour, with an embedded 4-point star in the aperture!
    concept_a_clean = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">Credo - Concept A: The Star-Core Monogram</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 188 68
    A 92 92 0 1 0 188 188
    L 150 150
    A 38 38 0 1 1 150 106
    Z
    M 196 128
    C 196 142 184 154 170 154
    C 184 154 196 166 196 180
    C 196 166 208 154 222 154
    C 208 154 196 142 196 128
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # CONCEPT B: The Shield Crest (Emblem / Protective Firewall)
    # The ultimate symbol of Credo (trust, protection against review blackmail).
    # A sharp neo-brutalist shield with a 4-point star diamond carved out.
    # Dimensions: width 176 (x from 40 to 216), height 208 (y from 24 to 232).
    # Top chamfer: (128, 24) -> (216, 56) and (40, 56).
    # Vertical wall down to y=136.
    # Converging arcs to bottom point at (128, 232).
    # Inside: 4-pointed diamond star centered at (128, 126).
    # -------------------------------------------------------------------------
    concept_b = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b">
  <title id="title-b">Credo - Concept B: The Reputation Firewall</title>
  <!-- Architectural Shield Crest with negative-space 4-point trust star -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 24
    L 216 56
    V 136
    C 216 188 178 224 128 238
    C 78 224 40 188 40 136
    V 56
    Z
    M 128 72
    C 128 102 108 126 78 126
    C 108 126 128 150 128 180
    C 128 150 148 126 178 126
    C 148 126 128 102 128 72
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # CONCEPT B-ALT: The Fortified Monogram (Shield that IS the letter C)
    # A shield whose right flank is open, creating a heavy protective C,
    # holding a radiant diamond star in its core.
    # -------------------------------------------------------------------------
    concept_b_mono = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b-mono">
  <title id="title-b-mono">Credo - Concept B: The Fortified Monogram</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 28
    L 208 58
    V 102
    L 164 102
    V 84
    L 128 70
    L 76 90
    V 140
    C 76 174 98 200 128 212
    L 164 196
    V 178
    L 208 178
    V 222
    L 128 252
    C 62 232 32 186 32 136
    V 64
    Z
    M 160 114
    C 160 128 148 140 134 140
    C 148 140 160 152 160 166
    C 160 152 172 140 186 140
    C 172 140 160 128 160 114
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # CONCEPT C: The Velocity Standee (Abstract / Modernist Tech)
    # A geometric, precision-folded letter C made of two crisp monolithic
    # chevrons that evoke the 4x6" table tent fold and a forward lightning beam.
    # Pure 45° and 90° angles. Zero curves. Total neo-brutalist punch.
    # -------------------------------------------------------------------------
    concept_c = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-c">
  <title id="title-c">Credo - Concept C: The Standee Velocity Fold</title>
  <!-- Architectural neo-brutalist C formed from folding acrylic standee planes -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 216 48
    H 88
    L 40 96
    V 160
    L 88 208
    H 216
    L 176 168
    H 104
    L 80 144
    V 112
    L 104 88
    H 176
    Z
    M 172 128
    L 194 106
    L 216 128
    L 194 150
    Z
  "/>
</svg>"""

    with open("brand/concept-a-clean.svg", "w") as f: f.write(concept_a_clean)
    with open("brand/concept-b.svg", "w") as f: f.write(concept_b)
    with open("brand/concept-b-mono.svg", "w") as f: f.write(concept_b_mono)
    with open("brand/concept-c.svg", "w") as f: f.write(concept_c)
    print("Crafted concepts.")

if __name__ == "__main__":
    generate_refined_svgs()
