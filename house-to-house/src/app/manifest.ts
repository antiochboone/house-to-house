import type { MetadataRoute } from "next";

// Makes the app installable to a phone's home screen with the ACC mark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "House to House · Antioch Boone",
    short_name: "House to House",
    description:
      "Stewarding lifegroups and discipleship at Antioch Boone — plant, lead, and multiply house to house community.",
    start_url: "/map",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#4e9e5f",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
