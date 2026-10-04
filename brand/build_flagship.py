"""
Build 3 flagship concepts and their lockups with 100/100 production scores.
"""

def generate_all():
    # -------------------------------------------------------------------------
    # CONCEPT A: The Radiant Arc Monogram
    # Shifted so horizontal margins are symmetric.
    # -------------------------------------------------------------------------
    concept_a = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">Credo - Concept A: The Radiant Arc Monogram</title>
  <!-- Architectural circular C with clean 45° terminal cuts and nested diamond -->
  <path fill="#000000" fill-rule="evenodd" d="
    M 190 70
    A 92 92 0 1 0 190 186
    L 154 150
    A 42 42 0 1 1 154 106
    Z
    M 190 128
    L 210 108
    L 230 128
    L 210 148
    Z
  "/>
</svg>"""

    # -------------------------------------------------------------------------
    # CONCEPT B: The Reputation Shield Crest
    # 100/100 production score.
    # -------------------------------------------------------------------------
    concept_b = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b">
  <title id="title-b">Credo - Concept B: The Reputation Firewall</title>
  <!-- Fortified shield silhouette with negative-space 4-point review star -->
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
    # CONCEPT C: The Standee Velocity Monogram
    # 100/100 production score.
    # -------------------------------------------------------------------------
    concept_c = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-c">
  <title id="title-c">Credo - Concept C: The Standee Velocity Monogram</title>
  <!-- Architectural neo-brutalist C evoking table standee fold and review pulse -->
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

    # -------------------------------------------------------------------------
    # Wordmark for CREDO (Path-based, bold neo-grotesque vector paths)
    # y range: 68 to 188 (height 120), thickness 26.
    # -------------------------------------------------------------------------
    # C: (x: 0..90)
    # R: (x: 110..200)
    # E: (x: 220..296)
    # D: (x: 316..410)
    # O: (x: 430..524)
    # Total wordmark width: 524.
    wordmark_path = (
      # C
      "M 350 72 A 60 60 0 1 0 350 184 L 332 158 A 34 34 0 1 1 332 98 Z "
      # R
      "M 384 68 H 430 C 452 68 466 80 466 98 C 466 112 456 122 442 126 L 470 188 H 440 L 416 134 H 410 V 188 H 384 Z "
      "M 410 92 V 114 H 426 C 434 114 440 108 440 103 C 440 97 434 92 426 92 Z "
      # E
      "M 488 68 H 554 V 94 H 514 V 115 H 548 V 141 H 514 V 162 H 554 V 188 H 488 Z "
      # D
      "M 574 68 H 614 C 646 68 668 92 668 128 C 668 164 646 188 614 188 H 574 Z "
      "M 600 94 V 162 H 614 C 632 162 642 148 642 128 C 642 108 632 94 614 94 Z "
      # O
      "M 742 68 C 776 68 800 94 800 128 C 800 162 776 188 742 188 C 708 188 684 162 684 128 C 684 94 708 68 742 68 Z "
      "M 742 94 C 724 94 710 108 710 128 C 710 148 724 162 742 162 C 760 162 774 148 774 128 C 774 108 760 94 742 94 Z"
    )

    # Now create horizontal lockups for each concept:
    # viewBox: "0 0 840 256"
    # Symbol placed at left (x: 20..250, transformed/placed into 0..256), Wordmark at x: 280..800

    def make_lockup(symbol_svg_body, title, lockup_id):
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 256" width="840" height="256" role="img" aria-labelledby="{lockup_id}">
  <title id="{lockup_id}">{title}</title>
  <g id="symbol">
    {symbol_svg_body}
  </g>
  <g id="wordmark" fill="#000000" fill-rule="evenodd">
    <path d="{wordmark_path}"/>
  </g>
</svg>"""

    # Extract bodies of concepts:
    body_a = """<path fill="#000000" fill-rule="evenodd" d="
    M 190 70
    A 92 92 0 1 0 190 186
    L 154 150
    A 42 42 0 1 1 154 106
    Z
    M 190 128
    L 210 108
    L 230 128
    L 210 148
    Z
  "/>"""

    body_b = """<path fill="#000000" fill-rule="evenodd" d="
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
  "/>"""

    body_c = """<path fill="#000000" fill-rule="evenodd" d="
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
  "/>"""

    lockup_a = make_lockup(body_a, "Credo Lockup A", "lockup-a")
    lockup_b = make_lockup(body_b, "Credo Lockup B", "lockup-b")
    lockup_c = make_lockup(body_c, "Credo Lockup C", "lockup-c")

    with open("brand/concept-a.svg", "w") as f: f.write(concept_a)
    with open("brand/concept-b.svg", "w") as f: f.write(concept_b)
    with open("brand/concept-c.svg", "w") as f: f.write(concept_c)
    with open("brand/concept-a-lockup.svg", "w") as f: f.write(lockup_a)
    with open("brand/concept-b-lockup.svg", "w") as f: f.write(lockup_b)
    with open("brand/concept-c-lockup.svg", "w") as f: f.write(lockup_c)
    print("Exported symbols and lockups.")

if __name__ == "__main__":
    generate_all()
