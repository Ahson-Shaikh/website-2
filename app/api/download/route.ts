import { type NextRequest, NextResponse } from "next/server";
import { getLatestRelease, getReleaseByTag } from "@/lib/cache";

function extractReleaseTag(filename: string): string | null {
  return (
    filename.match(
      /(?:^|-)(v[^/]+?)-(?:windows|macos|linux|android|ios|qnap)(?:[-.])/i,
    )?.[1] ?? null
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tpl = searchParams.get("tpl");

  if (!tpl) {
    return NextResponse.json(
      { error: "Missing tpl parameter" },
      { status: 400 },
    );
  }

  try {
    if (tpl.includes("$version")) {
      const release = await getLatestRelease();
      const filename = tpl.replaceAll("$version", release.tag_name);
      const asset = release.assets.find((item) => item.name === filename);

      if (asset) {
        return NextResponse.redirect(asset.browser_download_url, {
          status: 302,
        });
      }
    } else {
      // GitHub's /releases/latest endpoint excludes prereleases. When the
      // filename already contains a version (for example v2.0.0-beta.1), load
      // that release by tag and redirect to the exact asset URL.
      const tag = extractReleaseTag(tpl);
      const release = tag ? await getReleaseByTag(tag) : null;
      const asset = release?.assets.find((item) => item.name === tpl);

      if (asset) {
        return NextResponse.redirect(asset.browser_download_url, {
          status: 302,
        });
      }
    }

    return NextResponse.json(
      { error: "Release asset not found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json(
      { error: "Failed to fetch release" },
      { status: 500 },
    );
  }
}
