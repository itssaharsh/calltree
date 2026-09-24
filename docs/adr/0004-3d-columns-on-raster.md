# ADR 0004: The town is a 3D map of data columns on a raster basemap

**Status:** accepted, 24 Sep 2026

**Context.** The builder rejected two dashboard-style versions. The product's hero object is the town and the register; judges score what they see in the first 30 seconds. A first attempt used a pitched vector basemap (OpenFreeMap positron) with extruded buildings: under software GL in headless Chromium it blocked the main thread for 50 s and never painted at desktop size, which would also blank the recorded demo.

**Decision.** MapLibre at a 52° pitch, one `fill-extrusion` octagon per resident whose height and colour are the outcome (urgent tallest and red, pending flat and bone), animated over 650 ms when an outcome changes and pulsing while a line is dialing. The basemap is Esri's keyless light-grey raster canvas plus a labels layer. No building extrusions. Amazon Location keys are not creatable on this account (AccessDenied), which is why the basemap is not AWS.

**Consequences.** The 3D element encodes the product's own data and reacts to the demo's actions, which is the only reason to use 3D. Desktop capture paints in under a second. The landing page shows the same component orbiting over fixture data, so the first screen is the real product.
